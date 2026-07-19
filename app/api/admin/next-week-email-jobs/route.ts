import {
  errorJson,
  parseJsonBody,
  successJson,
} from "@/lib/api";
import { adminNextWeekEmailJobPostBodySchema } from "@/lib/contracts/admin-routes";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { resolveNextWeekMenuRecipients } from "@/lib/next-week-menu-email/recipients";
import NextWeekMenuEmailJob from "@/models/NextWeekMenuEmailJob";

function formatSkippedSummary(skipped: {
  invalidFormat: string[];
  notRegistered: string[];
  unsubscribed: string[];
  bounced: string[];
  unverified: string[];
  invalid: string[];
  duplicateCount: number;
}) {
  return {
    invalidFormat: skipped.invalidFormat.length,
    notRegistered: skipped.notRegistered.length,
    unsubscribed: skipped.unsubscribed.length,
    bounced: skipped.bounced.length,
    unverified: skipped.unverified.length,
    invalid: skipped.invalid.length,
    duplicates: skipped.duplicateCount,
    details: skipped,
  };
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const bodyParsed = await parseJsonBody(request, adminNextWeekEmailJobPostBodySchema);
    if (bodyParsed.error) {
      return bodyParsed.error;
    }

    const { userIds, emails, createdBy, dryRun } = bodyParsed.data;

    const resolved = await resolveNextWeekMenuRecipients({ userIds, emails });

    if (dryRun) {
      return successJson({
        criteriaType: resolved.criteriaType,
        eligibleCount: resolved.eligibleUserIds.length,
        skipped: formatSkippedSummary(resolved.skipped),
      });
    }

    if (resolved.eligibleUserIds.length === 0) {
      return errorJson("No eligible users found for this job", 400, {
        extra: { skipped: formatSkippedSummary(resolved.skipped) },
      });
    }

    await connectToDatabase();

    const job = await NextWeekMenuEmailJob.create({
      status: "pending",
      criteriaType: resolved.criteriaType,
      userIds: resolved.eligibleUserIds,
      totalUsers: resolved.eligibleUserIds.length,
      cursor: 0,
      sentCount: 0,
      failedCount: 0,
      failedEmails: [],
      createdBy,
    });
    console.info(
      `[NextWeekEmailJobCreate] jobId=${String(job._id)} criteria=${job.criteriaType} total=${job.totalUsers} inputUsers=${userIds.length} inputEmails=${emails.length}`
    );

    return successJson({
      jobId: String(job._id),
      status: job.status,
      criteriaType: job.criteriaType,
      totalUsers: job.totalUsers,
      sentCount: job.sentCount,
      failedCount: job.failedCount,
      progress: 0,
      skipped: formatSkippedSummary(resolved.skipped),
    });
  } catch (error: unknown) {
    console.error("Error creating next-week email job:", error);
    return errorJson("Failed to create email job", 500);
  }
}

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const jobs = await NextWeekMenuEmailJob.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return successJson(
      jobs.map(
        (job: {
          _id: unknown;
          status: string;
          criteriaType: string;
          totalUsers: number;
          sentCount: number;
          failedCount: number;
          cursor: number;
          createdAt?: Date;
          startedAt?: Date;
          completedAt?: Date;
        }) => ({
          jobId: String(job._id),
          status: job.status,
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
          completedAt: job.completedAt,
        })
      )
    );
  } catch (error: unknown) {
    console.error("Error listing next-week email jobs:", error);
    return errorJson("Failed to list email jobs", 500);
  }
}
