import mongoose from "mongoose";

import {
  errorJson,
  parseJsonBody,
  successJson,
  type RouteContext,
} from "@/lib/api";
import { adminPatchPromoCodeBodySchema } from "@/lib/contracts/admin-routes";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import PromoCode from "@/models/PromoCode";

export async function GET(
  _request: Request,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(_request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { id } = await params;
    const promo = await PromoCode.findById(id).lean();

    if (!promo) {
      return errorJson("Promo code not found", 404);
    }

    return successJson(promo);
  } catch (error: unknown) {
    console.error("Error fetching promo code:", error);
    return errorJson("Failed to fetch promo code", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorJson("Invalid promo code id", 400);
    }

    const bodyParsed = await parseJsonBody(request, adminPatchPromoCodeBodySchema);
    if (bodyParsed.error) {
      return bodyParsed.error;
    }
    const body = bodyParsed.data as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};

    const allowedFields = [
      "description",
      "active",
      "discountType",
      "discountValue",
      "startsAt",
      "expiresAt",
      "maxUses",
      "oneUsePerUser",
      "promoOnlyEmt",
      "appliesTo",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (updateData.startsAt) updateData.startsAt = new Date(updateData.startsAt as string);
    if (updateData.expiresAt) updateData.expiresAt = new Date(updateData.expiresAt as string);
    if (updateData.maxUses !== undefined && updateData.maxUses !== null) {
      updateData.maxUses = Number(updateData.maxUses);
    }
    if (updateData.discountValue !== undefined) {
      updateData.discountValue = Number(updateData.discountValue);
    }

    const updated = await PromoCode.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    if (!updated) {
      return errorJson("Promo code not found", 404);
    }

    return successJson(updated);
  } catch (error: unknown) {
    console.error("Error updating promo code:", error);
    return errorJson("Failed to update promo code", 500);
  }
}
