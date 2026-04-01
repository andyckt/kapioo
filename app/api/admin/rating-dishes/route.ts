import { NextResponse } from "next/server";

import { parseJsonBody, parseSearchParams } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import {
  ratingDishCreateBodySchema,
  ratingDishDeleteQuerySchema,
} from "@/lib/contracts/meal-rating";
import RatingDish from "@/models/RatingDish";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const dishes = await RatingDish.find()
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    return NextResponse.json(dishes);
  } catch (error: unknown) {
    console.error("[admin/rating-dishes] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dishes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const parsed = await parseJsonBody(request, ratingDishCreateBodySchema);
    if (parsed.error) {
      return parsed.error;
    }
    const body = parsed.data;

    await connectToDatabase();

    const doc = await RatingDish.create({
      name: body.name,
      nameEn:
        typeof body.nameEn === "string" ? body.nameEn.trim() || undefined : undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      active: true,
    });

    return NextResponse.json(doc);
  } catch (error: unknown) {
    console.error("[admin/rating-dishes] POST error:", error);
    return NextResponse.json(
      { error: "Failed to add dish" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const queryParsed = parseSearchParams(request.url, ratingDishDeleteQuerySchema);
    if (queryParsed.error) {
      return queryParsed.error;
    }
    const { id } = queryParsed.data;

    await connectToDatabase();

    const doc = await RatingDish.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );
    if (!doc) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[admin/rating-dishes] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete dish" },
      { status: 500 }
    );
  }
}
