import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import NextWeekMenuEmailJob from '@/models/NextWeekMenuEmailJob';
import User from '@/models/User';
import { sendNextWeekMenuUpdateEmail } from '@/lib/services/email';

const LOCK_TTL_MS = 5 * 60_000;
const CHUNK_SIZE = 10; // Keep conservative for timeout-safe runs on Hobby.
const SEND_INTERVAL_MS = 250; // 4 req/s baseline, below 6 req/s limit
const HEARTBEAT_EVERY = 3; // Refresh lock while processing to avoid overlap takeover.

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
    [
      {
        $set: {
          status: 'processing',
          lockOwner,
          lockExpiresAt: new Date(now.getTime() + LOCK_TTL_MS),
          startedAt: { $ifNull: ['$startedAt', now] }
        }
      }
    ],
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

    const users = await User.find({ _id: { $in: targetUserIds } })
      .select('_id name email languagePreference')
      .lean();
    const userMap = new Map(users.map((user: any) => [String(user._id), user]));

    let processedCount = 0;
    let lockLost = false;
    for (let i = 0; i < targetUserIds.length; i++) {
      const userId = targetUserIds[i];
      const user = userMap.get(String(userId));
      let recipientUpdate: Record<string, any> = {
        $inc: {},
        $set: {
          cursor: startCursor + i + 1,
          lastProcessedAt: new Date()
        }
      };
      let sendFailedEntry: {
        userId?: string;
        email?: string;
        name?: string;
        error: string;
        occurredAt: Date;
      } | null = null;

      if (!user || !user.email) {
        recipientUpdate.$inc.failedCount = 1;
        sendFailedEntry = {
          userId: String(userId),
          name: user?.name,
          email: user?.email,
          error: 'User missing or has invalid email',
          occurredAt: new Date()
        };
      } else {
        try {
          await sendNextWeekMenuUpdateEmail(
            user.email,
            user.name || 'Kapioo User',
            String(user._id),
            user.languagePreference || 'zh'
          );
          recipientUpdate.$inc.sentCount = 1;
        } catch (error) {
          recipientUpdate.$inc.failedCount = 1;
          sendFailedEntry = {
            userId: String(user._id),
            email: user.email,
            name: user.name,
            error: error instanceof Error ? error.message : 'Unknown send error',
            occurredAt: new Date()
          };
        }
      }

      if (sendFailedEntry) {
        recipientUpdate.$push = { failedEmails: sendFailedEntry };
      }

      // Heartbeat lock renewal while processing recipients.
      if ((i + 1) % HEARTBEAT_EVERY === 0 || i === targetUserIds.length - 1) {
        recipientUpdate.$set.lockExpiresAt = new Date(Date.now() + LOCK_TTL_MS);
      }

      const checkpointed = await NextWeekMenuEmailJob.findOneAndUpdate(
        { _id: job._id, lockOwner },
        recipientUpdate,
        { new: true }
      );

      if (!checkpointed) {
        lockLost = true;
        break;
      }

      processedCount++;

      if (i < targetUserIds.length - 1) {
        await sleep(SEND_INTERVAL_MS);
      }
    }

    if (lockLost) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job lock lost during recipient checkpointing'
        },
        { status: 409 }
      );
    }

    const refreshedJob = await NextWeekMenuEmailJob.findById(job._id).lean();
    if (!refreshedJob) {
      return NextResponse.json(
        { success: false, error: 'Email job not found after processing' },
        { status: 404 }
      );
    }

    const isComplete = refreshedJob.cursor >= refreshedJob.totalUsers;

    const updateQuery: any = { _id: job._id, lockOwner };
    const updatePayload: any = {
      $set: {
        status: isComplete ? 'completed' : 'processing',
        lastProcessedAt: new Date(),
        lockOwner: null,
        lockExpiresAt: null
      }
    };

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

    return NextResponse.json({
      success: true,
      data: {
        jobId: String(updatedJob._id),
        processedThisRun: processedCount,
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
