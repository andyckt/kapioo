import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import NextWeekMenuEmailJob from '@/models/NextWeekMenuEmailJob';

type Params = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { jobId } = await params;
    await connectToDatabase();

    const job = await NextWeekMenuEmailJob.findById(jobId).lean();

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Email job not found' },
        { status: 404 }
      );
    }

    const progress =
      job.totalUsers > 0
        ? Math.round(((job.sentCount + job.failedCount) / job.totalUsers) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        jobId: String(job._id),
        status: job.status,
        criteriaType: job.criteriaType,
        totalUsers: job.totalUsers,
        sentCount: job.sentCount,
        failedCount: job.failedCount,
        cursor: job.cursor,
        progress,
        failedEmails: job.failedEmails || [],
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        lastProcessedAt: job.lastProcessedAt
      }
    });
  } catch (error) {
    console.error('Error fetching next-week email job status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email job status' },
      { status: 500 }
    );
  }
}
