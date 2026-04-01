import { NextResponse } from "next/server";

import { parseJsonBody } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { mealRatingActiveDatePutBodySchema } from "@/lib/contracts/meal-rating";
import Settings from "@/models/Settings";

export async function PUT(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const parsed = await parseJsonBody(request, mealRatingActiveDatePutBodySchema);
    if (parsed.error) {
      return parsed.error;
    }
    const { date } = parsed.data;

    await connectToDatabase();
    await Settings.findOneAndUpdate(
      { key: "mealRatingActiveDate" },
      {
        key: "mealRatingActiveDate",
        value: date,
        description: "Date shown on meal rating form (admin-selected)",
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, date });
  } catch (error: unknown) {
    console.error("[admin/meal-rating/active-date] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update active date" },
      { status: 500 }
    );
  }
}
