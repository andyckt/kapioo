import type { z } from "zod";

import { errorJson, parseSearchParams, successJson } from "@/lib/api";
import {
  adminEligibleUsersQuerySchema,
  type AdminEligibleUsersQuery,
} from "@/lib/contracts/admin-routes";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

// GET handler - get list of eligible users for email sending
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const queryParsed = parseSearchParams(
      request.url,
      adminEligibleUsersQuerySchema as unknown as z.ZodType<AdminEligibleUsersQuery>
    );
    if (queryParsed.error) {
      return queryParsed.error;
    }
    const { page, limit, search, idsOnly } = queryParsed.data;
    const skip = (page - 1) * limit;

    await connectToDatabase();

    // Build query for eligible users
    const query: Record<string, unknown> = {
      isVerified: true,
      emailStatus: { $ne: "bounced" },
      email: { $exists: true, $nin: ["", null] },
      "emailPreferences.nextWeekMenuUpdates": { $ne: false },
    };

    // Add search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [{ userID: searchRegex }, { name: searchRegex }, { email: searchRegex }];
    }

    // If idsOnly requested, return all IDs without pagination
    if (idsOnly) {
      const allUserIds = await User.find(query).select("_id").lean();

      return successJson({
        ids: allUserIds.map((u) => String(u._id)),
        total: allUserIds.length,
      });
    }

    // Fetch users with pagination
    const users = await User.find(query)
      .select("_id userID name email")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);

    return successJson({
      users,
      page,
      limit,
      total: totalUsers,
      pages: Math.ceil(totalUsers / limit),
    });
  } catch (error: unknown) {
    console.error("Error fetching eligible users:", error);
    return errorJson("Failed to fetch users", 500);
  }
}
