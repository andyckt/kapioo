import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import NextWeekMenuEmailJob from '@/models/NextWeekMenuEmailJob';

const ELIGIBLE_USER_QUERY = {
  isVerified: true,
  emailStatus: { $ne: 'bounced' },
  email: { $exists: true, $ne: '', $ne: null },
  'emailPreferences.nextWeekMenuUpdates': { $ne: false }
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userIds = Array.isArray(body?.userIds) ? body.userIds : [];
    const createdBy = typeof body?.createdBy === 'string' ? body.createdBy : undefined;

    await connectToDatabase();

    const query: Record<string, unknown> = { ...ELIGIBLE_USER_QUERY };
    const criteriaType = userIds.length > 0 ? 'selected' : 'all';

    if (criteriaType === 'selected') {
      query._id = { $in: userIds };
    }

    const users = await User.find(query).select('_id').lean();
    const eligibleUserIds = users.map((user: any) => String(user._id));

    if (eligibleUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No eligible users found for this job' },
        { status: 400 }
      );
    }

    const job = await NextWeekMenuEmailJob.create({
      status: 'pending',
      criteriaType,
      userIds: eligibleUserIds,
      totalUsers: eligibleUserIds.length,
      cursor: 0,
      sentCount: 0,
      failedCount: 0,
      failedEmails: [],
      createdBy
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId: String(job._id),
        status: job.status,
        isTerminal: false,
        criteriaType: job.criteriaType,
        totalUsers: job.totalUsers,
        sentCount: job.sentCount,
        failedCount: job.failedCount,
        progress: 0
      }
    });
  } catch (error) {
    console.error('Error creating next-week email job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create email job' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const jobs = await NextWeekMenuEmailJob.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      data: jobs.map((job: any) => ({
        jobId: String(job._id),
        status: job.status,
        isTerminal: job.status === 'completed' || job.status === 'failed',
        criteriaType: job.criteriaType,
        totalUsers: job.totalUsers,
        sentCount: job.sentCount,
        failedCount: job.failedCount,
        cursor: job.cursor,
        progress:
          job.totalUsers > 0
            ? Math.round(((job.sentCount + job.failedCount) / job.totalUsers) * 100)
            : 0,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      }))
    });
  } catch (error) {
    console.error('Error listing next-week email jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list email jobs' },
      { status: 500 }
    );
  }
}
