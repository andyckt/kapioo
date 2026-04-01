import { NextResponse } from "next/server";

import { parseSearchParams } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { adminMealRatingsQuerySchema } from "@/lib/contracts/meal-rating";
import MealRating from "@/models/MealRating";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const queryParsed = parseSearchParams(request.url, adminMealRatingsQuerySchema);
    if (queryParsed.error) {
      return queryParsed.error;
    }
    const { startDate, endDate } = queryParsed.data;
    const page = queryParsed.data.page ?? 1;
    const limit = queryParsed.data.limit ?? 20;
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (startDate || endDate) {
      filter.deliveryDate = {};
      if (startDate) {
        (filter.deliveryDate as Record<string, string>).$gte = startDate;
      }
      if (endDate) {
        (filter.deliveryDate as Record<string, string>).$lte = endDate;
      }
    }

    const [items, total] = await Promise.all([
      MealRating.find(filter)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MealRating.countDocuments(filter),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("[admin/meal-rating] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
