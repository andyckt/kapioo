import mongoose from "mongoose";

import {
  errorJson,
  parseSearchParams,
  successJson,
  type RouteContext,
} from "@/lib/api";
import { adminPromoRedemptionsQuerySchema } from "@/lib/contracts/admin-routes";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import PromoCode from "@/models/PromoCode";
import PromoCodeRedemption from "@/models/PromoCodeRedemption";
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";

export async function GET(
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

    const promo = await PromoCode.findById(id).lean();
    if (!promo) {
      return errorJson("Promo code not found", 404);
    }

    const queryParsed = parseSearchParams(request.url, adminPromoRedemptionsQuerySchema);
    if (queryParsed.error) {
      return queryParsed.error;
    }
    const limit = queryParsed.data.limit ?? 100;

    const redemptions = await PromoCodeRedemption.find({ promoCodeId: promo._id })
      .sort({ consumedAt: -1 })
      .limit(limit)
      .lean();

    const weeklyRequestIds = redemptions
      .filter((item) => item.purchaseType === "weekly_topup")
      .map((item) => item.requestId);
    const dailyRequestIds = redemptions
      .filter((item) => item.purchaseType === "daily_topup")
      .map((item) => item.requestId);

    const [weeklyRequests, dailyRequests] = await Promise.all([
      weeklyRequestIds.length
        ? CreditPurchaseRequest.find({ requestId: { $in: weeklyRequestIds } })
            .populate("userId", "name email userID")
            .lean()
        : [],
      dailyRequestIds.length
        ? VoucherPurchaseRequest.find({ requestId: { $in: dailyRequestIds } })
            .populate("userId", "name email")
            .lean()
        : [],
    ]);

    const weeklyMap = new Map(
      weeklyRequests.map((item: { requestId: string }) => [item.requestId, item])
    );
    const dailyMap = new Map(
      dailyRequests.map((item: { requestId: string }) => [item.requestId, item])
    );

    const items = redemptions.map((redemption) => {
      const requestDoc =
        redemption.purchaseType === "weekly_topup"
          ? weeklyMap.get(redemption.requestId)
          : dailyMap.get(redemption.requestId);

      return {
        _id: redemption._id,
        requestId: redemption.requestId,
        purchaseType: redemption.purchaseType,
        consumedAt: redemption.consumedAt,
        discountAmount: redemption.discountAmount,
        originalSubtotal: redemption.originalSubtotal,
        finalTotal: redemption.finalTotal,
        request: requestDoc || null,
      };
    });

    return successJson({
      promoCode: {
        _id: promo._id,
        code: promo.code,
      },
      items,
    });
  } catch (error: unknown) {
    console.error("Error fetching promo redemptions:", error);
    return errorJson("Failed to fetch promo redemptions", 500);
  }
}
