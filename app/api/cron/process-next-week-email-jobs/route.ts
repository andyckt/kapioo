import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import NextWeekMenuEmailJob from '@/models/NextWeekMenuEmailJob';
import User from '@/models/User';
import { buildNextWeekMenuUpdateEmail } from '@/lib/services/email';
import { sendBatchEmailsWithResend } from '@/lib/services/resend-email';

const LOCK_TTL_MS = 5 * 60_000;
const CHUNK_SIZE = 60; // Process up to 60 users per run
const RESEND_BATCH_SIZE = 60; // Use Resend batch API with 60 recipients/request
const BATCH_INTERVAL_MS = 500; // Small pause only when multiple batch requests are needed

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isAuthorizedCronCall = (request: Request) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
};

const acquireJobLock = async (lockOwner: string) => {
  const now = new Date();
  return NextWeekMenuEmailJob.findOneAndUpdate(
    {
      status: { $in: ['pending', 'processing'] },
      $expr: { $lt: ['$cursor', '$totalUsers'] },
      $or: [{ lockExpiresAt: null }, { lockExpiresAt: { $lte: now } }]
    },
    {
      $set: {
        status: 'processing',
        lockOwner,
        lockExpiresAt: new Date(now.getTime() + LOCK_TTL_MS),
        startedAt: now
      }
    },
    {
      sort: { createdAt: 1 },
      new: true
    }
  );
};

async function processJobs(request: Request) {
  try {
    if (!isAuthorizedCronCall(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron call' }, { status: 401 });
    }

    await connectToDatabase();
    const lockOwner = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job = await acquireJobLock(lockOwner);

    if (!job) {
      return NextResponse.json({
        success: true,
        message: 'No pending next-week email jobs to process'
      });
    }

    const startCursor = job.cursor;
    const targetCursor = Math.min(startCursor + CHUNK_SIZE, job.totalUsers);
    const targetUserIds = job.userIds.slice(startCursor, targetCursor);
    console.info(
      `[NextWeekEmailWorker] acquired jobId=${String(job._id)} status=${job.status} startCursor=${startCursor} targetCursor=${targetCursor} total=${job.totalUsers}`
    );

    const users = await User.find({ _id: { $in: targetUserIds } })
      .select('_id name email languagePreference')
      .lean();
    const userMap = new Map(users.map((user: any) => [String(user._id), user]));

    let sentDelta = 0;
    let failedDelta = 0;
    const failedEntries: Array<{
      userId?: string;
      email?: string;
      name?: string;
      error: string;
      occurredAt: Date;
    }> = [];

    const batchPayloads: Array<{ to: string; subject: string; html: string; from?: string }> = [];
    const batchMetadata: Array<{ userId: string; email: string; name?: string }> = [];

    for (let i = 0; i < targetUserIds.length; i++) {
      const userId = String(targetUserIds[i]);
      const user = userMap.get(String(userId));

      if (!user || !user.email) {
        failedDelta++;
        failedEntries.push({
          userId,
          name: user?.name,
          email: user?.email,
          error: 'User missing or has invalid email',
          occurredAt: new Date()
        });
      } else {
        batchPayloads.push(
          buildNextWeekMenuUpdateEmail(
            user.email,
            user.name || 'Kapioo User',
            String(user._id),
            user.languagePreference || 'zh'
          )
        );
        batchMetadata.push({
          userId: String(user._id),
          email: user.email,
          name: user.name
        });
      }
    }
    console.info(
      `[NextWeekEmailWorker] prepared jobId=${String(job._id)} candidates=${targetUserIds.length} sendable=${batchPayloads.length} immediateFailures=${failedDelta}`
    );

    for (let start = 0; start < batchPayloads.length; start += RESEND_BATCH_SIZE) {
      const payloadSlice = batchPayloads.slice(start, start + RESEND_BATCH_SIZE);
      const metadataSlice = batchMetadata.slice(start, start + RESEND_BATCH_SIZE);
      console.info(
        `[NextWeekEmailWorker] sending batch jobId=${String(job._id)} batchStart=${start} batchSize=${payloadSlice.length}`
      );
      const sendResults = await sendBatchEmailsWithResend(payloadSlice);

      for (let i = 0; i < metadataSlice.length; i++) {
        const metadata = metadataSlice[i];
        const result = sendResults[i];

        if (result?.success) {
          sentDelta++;
        } else {
          failedDelta++;
          failedEntries.push({
            userId: metadata.userId,
            email: metadata.email,
            name: metadata.name,
            error: result?.error || 'Unknown batch send error',
            occurredAt: new Date()
          });
        }
      }
      const batchFailed = sendResults.filter((result) => !result?.success).length;
      const batchSent = sendResults.length - batchFailed;
      console.info(
        `[NextWeekEmailWorker] batch complete jobId=${String(job._id)} batchStart=${start} sent=${batchSent} failed=${batchFailed}`
      );

      if (start + RESEND_BATCH_SIZE < batchPayloads.length) {
        await sleep(BATCH_INTERVAL_MS);
      }
    }

    const nextCursor = targetCursor;
    const isComplete = nextCursor >= job.totalUsers;

    const updateQuery: any = { _id: job._id, lockOwner };
    const updatePayload: any = {
      $set: {
        cursor: nextCursor,
        sentCount: job.sentCount + sentDelta,
        failedCount: job.failedCount + failedDelta,
        status: isComplete ? 'completed' : 'processing',
        lastProcessedAt: new Date(),
        lockOwner: null,
        lockExpiresAt: null
      }
    };

    if (failedEntries.length > 0) {
      updatePayload.$push = { failedEmails: { $each: failedEntries } };
    }

    if (isComplete) {
      updatePayload.$set.completedAt = new Date();
    }

    const updatedJob = await NextWeekMenuEmailJob.findOneAndUpdate(
      updateQuery,
      updatePayload,
      { new: true }
    );

    if (!updatedJob) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job lock lost before final update'
        },
        { status: 409 }
      );
    }

    console.info(
      `[NextWeekEmailWorker] checkpoint jobId=${String(job._id)} cursor=${updatedJob.cursor}/${updatedJob.totalUsers} sent=${updatedJob.sentCount} failed=${updatedJob.failedCount} status=${updatedJob.status}`
    );

    return NextResponse.json({
      success: true,
      data: {
        jobId: String(updatedJob._id),
        processedThisRun: targetUserIds.length,
        sentDelta,
        failedDelta,
        status: updatedJob.status,
        cursor: updatedJob.cursor,
        totalUsers: updatedJob.totalUsers,
        progress:
          updatedJob.totalUsers > 0
            ? Math.round(
                ((updatedJob.sentCount + updatedJob.failedCount) / updatedJob.totalUsers) *
                  100
              )
            : 0
      }
    });
  } catch (error) {
    console.error('Error processing next-week email jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process next-week email jobs' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return processJobs(request);
}

export async function POST(request: Request) {
  return processJobs(request);
}
