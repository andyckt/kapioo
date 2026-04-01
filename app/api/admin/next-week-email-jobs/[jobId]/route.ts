import { errorJson, successJson, type RouteContext } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import NextWeekMenuEmailJob from "@/models/NextWeekMenuEmailJob";

export async function GET(
  _request: Request,
  { params }: RouteContext<{ jobId: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(_request);
    if (!actor || response) {
      return response;
    }

    const { jobId } = await params;
    await connectToDatabase();

    const job = await NextWeekMenuEmailJob.findById(jobId).lean();

    if (!job) {
      return errorJson("Email job not found", 404);
    }

    const progress =
      job.totalUsers > 0
        ? Math.round(((job.sentCount + job.failedCount) / job.totalUsers) * 100)
        : 0;

    return successJson({
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
      lastProcessedAt: job.lastProcessedAt,
    });
  } catch (error: unknown) {
    console.error("Error fetching next-week email job status:", error);
    return errorJson("Failed to fetch email job status", 500);
  }
}
