import { NextResponse } from "next/server";

import { handleRouteError, parseSearchParams } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import { usersQuerySchema } from "@/lib/contracts/user";
import connectToDatabase from "@/lib/db";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import User from "@/models/User";
import WeeklyOrder from "@/models/WeeklyOrder";

/**
 * Optimized endpoint that fetches users with their order counts in a single request
 * This eliminates the N+1 query problem and reduces loading time significantly
 */
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: query, error: queryError } = parseSearchParams(request, usersQuerySchema);
    if (queryError) {
      return queryError;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { search, searchType } = query;

    await connectToDatabase();

    let mongoQuery: Record<string, unknown> = {};

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      if (searchType === "all") {
        mongoQuery.$or = [
          { name: { $regex: trimmedSearch, $options: "i" } },
          { email: { $regex: trimmedSearch, $options: "i" } },
          { userID: { $regex: trimmedSearch, $options: "i" } },
        ];
      } else if (searchType === "name") {
        mongoQuery.name = { $regex: trimmedSearch, $options: "i" };
      } else if (searchType === "email") {
        mongoQuery.email = { $regex: trimmedSearch, $options: "i" };
      } else if (searchType === "userID") {
        mongoQuery.userID = { $regex: trimmedSearch, $options: "i" };
      } else if (searchType === "phone") {
        mongoQuery.phone = { $regex: trimmedSearch, $options: "i" };
      }
    }

    const total = await User.countDocuments(mongoQuery);

    const users = await User.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
      });
    }

    const userIds = users.map((user) => user._id);

    const [dailyOrderCounts, weeklyOrderCounts] = await Promise.all([
      DailyDeliveryOrder.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
      WeeklyOrder.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
    ]);

    const dailyOrderMap = new Map(
      dailyOrderCounts.map((item) => [item._id.toString(), item.count])
    );
    const weeklyOrderMap = new Map(
      weeklyOrderCounts.map((item) => [item._id.toString(), item.count])
    );

    const usersWithCounts = users
      .map((user) => ({
        ...user,
        dailyOrdersCount: dailyOrderMap.get(String(user._id)) || 0,
        weeklyOrdersCount: weeklyOrderMap.get(String(user._id)) || 0,
      }))
      .map((user) => ({
        ...user,
        totalOrders: (user.dailyOrdersCount || 0) + (user.weeklyOrdersCount || 0),
      }));

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: usersWithCounts,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/users/with-order-counts");
  }
}
