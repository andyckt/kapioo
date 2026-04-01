import { NextResponse } from "next/server";

import { errorJson, parseJsonBody, successJson } from "@/lib/api";
import { adminNotifyNextWeekMenuPostBodySchema } from "@/lib/contracts/admin-routes";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import NextWeekMenuEmailJob from "@/models/NextWeekMenuEmailJob";
import {
  buildNextWeekMenuUpdateEmail,
  sendNextWeekMenuUpdateEmail,
} from "@/lib/services/email";
import { sendBatchEmailsWithResend } from "@/lib/services/resend-email";

export const dynamic = "force-dynamic";

const ELIGIBLE_USER_QUERY = {
  isVerified: true,
  emailStatus: { $ne: "bounced" },
  email: { $exists: true, $nin: ["", null] },
  "emailPreferences.nextWeekMenuUpdates": { $ne: false },
};

// POST handler - enqueue next week menu update job
// (test mode remains immediate for convenience)
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const bodyParsed = await parseJsonBody(request, adminNotifyNextWeekMenuPostBodySchema);
    if (bodyParsed.error) {
      return bodyParsed.error;
    }
    const { userIds, testMode, testEmail, testBatchMode } = bodyParsed.data;

    // Single test email still sends immediately.
    if (testMode && testEmail) {
      await sendNextWeekMenuUpdateEmail(
        testEmail,
        "Test User",
        "test-user-id",
        "zh"
      );

      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
      });
    }

    // Test batch mode still runs immediately and returns summary.
    if (testBatchMode) {
      const testUsers: Array<{
        email: string;
        name: string;
        _id: string;
        languagePreference: "en" | "zh";
      }> = Array.from({ length: 15 }, (_, idx) => ({
        email: "kapioomeal@gmail.com",
        name: `Test User ${idx + 1}`,
        _id: `test-${idx + 1}`,
        languagePreference: idx % 3 === 0 ? "en" : "zh",
      }));

      let emailsSent = 0;
      let emailsFailed = 0;
      const failedEmails: Array<{ email: string; name: string; error: string }> = [];

      const payloads = testUsers.map((user) =>
        buildNextWeekMenuUpdateEmail(
          user.email,
          user.name,
          user._id,
          user.languagePreference
        )
      );
      const sendResults = await sendBatchEmailsWithResend(payloads);

      for (let i = 0; i < testUsers.length; i++) {
        const user = testUsers[i];
        const result = sendResults[i];
        if (result?.success) {
          emailsSent++;
        } else {
          emailsFailed++;
          failedEmails.push({
            email: user.email,
            name: user.name,
            error: result?.error || "Unknown error",
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Test batch completed",
        data: {
          totalUsers: testUsers.length,
          emailsSent,
          emailsFailed,
          failedEmails,
        },
      });
    }

    await connectToDatabase();

    const query: Record<string, unknown> = { ...ELIGIBLE_USER_QUERY };
    const selectedIds = Array.isArray(userIds) ? userIds : [];
    const criteriaType = selectedIds.length > 0 ? "selected" : "all";

    if (criteriaType === "selected") {
      query._id = { $in: selectedIds };
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
    });

    return NextResponse.json({
      success: true,
      message: "Email job queued",
      data: {
        jobId: String(job._id),
        status: job.status,
        totalUsers: job.totalUsers,
        progress: 0,
      },
    });
  } catch (error: unknown) {
    console.error("Error in notify-next-week-menu route:", error);
    return errorJson("Failed to create email job", 500);
  }
}

// GET handler - get summary of eligible users
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const totalUsers = await User.countDocuments();

    const eligibleUsers = await User.countDocuments(ELIGIBLE_USER_QUERY);

    const unsubscribed = await User.countDocuments({
      "emailPreferences.nextWeekMenuUpdates": false,
    });

    const bounced = await User.countDocuments({
      emailStatus: "bounced",
    });

    const invalid = await User.countDocuments({
      $or: [{ email: { $exists: false } }, { email: "" }, { email: null }],
    });

    const unverified = await User.countDocuments({
      isVerified: false,
    });

    return successJson({
      totalUsers,
      eligibleUsers,
      excluded: {
        unsubscribed,
        bounced,
        invalid,
        unverified,
        total: totalUsers - eligibleUsers,
      },
    });
  } catch (error: unknown) {
    console.error("Error getting user summary:", error);
    return errorJson("Failed to get user summary", 500);
  }
}
