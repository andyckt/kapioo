import {
  errorJson,
  parseJsonBody,
  successJson,
} from "@/lib/api";
import { adminNextWeekEmailJobPostBodySchema } from "@/lib/contracts/admin-routes";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import NextWeekMenuEmailJob from "@/models/NextWeekMenuEmailJob";

const ELIGIBLE_USER_QUERY = {
  isVerified: true,
  emailStatus: { $ne: "bounced" },
  email: { $exists: true, $nin: ["", null] },
  "emailPreferences.nextWeekMenuUpdates": { $ne: false },
};

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
    const { userIds: rawUserIds, createdBy } = bodyParsed.data;
    const userIds = rawUserIds ?? [];

    await connectToDatabase();

    const query: Record<string, unknown> = { ...ELIGIBLE_USER_QUERY };
    const criteriaType = userIds.length > 0 ? "selected" : "all";

    if (criteriaType === "selected") {
      query._id = { $in: userIds };
    }

    const users = await User.find(query).select("_id").lean();
    const eligibleUserIds = users.map((user: { _id: unknown }) => String(user._id));

    if (eligibleUserIds.length === 0) {
      return errorJson("No eligible users found for this job", 400);
    }

    const job = await NextWeekMenuEmailJob.create({
      status: "pending",
      criteriaType,
      userIds: eligibleUserIds,
      totalUsers: eligibleUserIds.length,
      cursor: 0,
      sentCount: 0,
      failedCount: 0,
      failedEmails: [],
      createdBy,
    });
    console.info(
      `[NextWeekEmailJobCreate] jobId=${String(job._id)} criteria=${job.criteriaType} total=${job.totalUsers} selectedInput=${userIds.length}`
    );

    return successJson({
      jobId: String(job._id),
      status: job.status,
      criteriaType: job.criteriaType,
      totalUsers: job.totalUsers,
      sentCount: job.sentCount,
      failedCount: job.failedCount,
      progress: 0,
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
