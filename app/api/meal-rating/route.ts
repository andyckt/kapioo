import { NextResponse } from "next/server";

import { parseJsonBody } from "@/lib/api";
import connectToDatabase from "@/lib/db";
import { mealRatingSubmitBodySchema } from "@/lib/contracts/meal-rating";
import MealRating from "@/models/MealRating";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, mealRatingSubmitBodySchema);
    if (parsed.error) {
      return parsed.error;
    }
    const body = parsed.data;

    const validDishRatings = Array.isArray(body.dishRatings)
      ? body.dishRatings
          .filter(
            (r: unknown) =>
              r &&
              typeof r === "object" &&
              typeof (r as { dishId?: unknown }).dishId === "string" &&
              typeof (r as { dishName?: unknown }).dishName === "string" &&
              typeof (r as { rating?: unknown }).rating === "number" &&
              (r as { rating: number }).rating >= 1 &&
              (r as { rating: number }).rating <= 5
          )
          .map((r) => {
            const row = r as {
              dishId: string;
              dishName: string;
              rating: number;
              comment?: unknown;
            };
            return {
              dishId: row.dishId,
              dishName: row.dishName,
              rating: row.rating,
              comment:
                typeof row.comment === "string" && row.comment.trim()
                  ? row.comment.trim()
                  : undefined,
            };
          })
      : [];

    await connectToDatabase();

    let storedUserEmail: string | undefined;
    if (typeof body.userEmail === "string") {
      const trimmed = body.userEmail.trim();
      if (
        trimmed &&
        trimmed.length <= EMAIL_MAX_LENGTH &&
        EMAIL_REGEX.test(trimmed)
      ) {
        storedUserEmail = trimmed;
      }
    }

    const doc = await MealRating.create({
      overallRating: body.overallRating,
      deliveryDate: body.deliveryDate,
      dishRatings: validDishRatings,
      comment:
        typeof body.comment === "string"
          ? body.comment.trim() || undefined
          : undefined,
      userEmail: storedUserEmail,
      submittedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      id: doc._id,
    });
  } catch (error: unknown) {
    console.error("[meal-rating] POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 }
    );
  }
}
