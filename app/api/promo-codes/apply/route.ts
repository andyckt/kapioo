import { errorJson, parseJsonBody, successJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { applyPromoCodePreviewBodySchema } from "@/lib/contracts/promo";
import {
  PromoErrorCode,
  normalizePromoCode,
  validatePromoForPreview,
  type PromoPaymentMethod,
  type PromoPurchaseType,
} from "@/lib/promo-code";
import PromoCode from "@/models/PromoCode";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const parsed = await parseJsonBody(request, applyPromoCodePreviewBodySchema);
    if (parsed.error) {
      return parsed.error;
    }
    const body = parsed.data;

    await connectToDatabase();

    const code = normalizePromoCode(body.code);
    const userId = body.userId || String(actor.user._id);
    if (
      actor.role !== "admin" &&
      String(userId) !== String(actor.user._id) &&
      String(userId) !== String(actor.user.userID)
    ) {
      return errorJson("You cannot preview a promo code for another user", 403, {
        errorCode: PromoErrorCode.INTERNAL_VALIDATION_ERROR,
      });
    }

    const purchaseType = body.purchaseType as PromoPurchaseType;
    const paymentMethod = body.paymentMethod as PromoPaymentMethod;
    const { mealSubtotal, deliveryFeeTotal, taxRate } = body;

    if (!code || !userId || !purchaseType || !paymentMethod) {
      return errorJson("Missing required fields", 400, {
        errorCode: PromoErrorCode.INTERNAL_VALIDATION_ERROR,
      });
    }

    const user = (await User.findById(userId).select("phone").lean()) as {
      phone?: string;
    } | null;
    if (!user) {
      return errorJson("User not found", 404, {
        errorCode: PromoErrorCode.INTERNAL_VALIDATION_ERROR,
      });
    }

    const promo = await PromoCode.findOne({ code });
    const result = await validatePromoForPreview({
      promo,
      input: {
        code,
        userPhone: user.phone,
        purchaseType,
        paymentMethod,
        mealSubtotal,
        deliveryFeeTotal,
      },
      taxRate,
    });

    if (!result.ok) {
      return errorJson(result.message || "Promo code is not valid", 400, {
        errorCode: result.errorCode || PromoErrorCode.INTERNAL_VALIDATION_ERROR,
      });
    }

    return successJson({
      code,
      breakdown: result.breakdown,
    });
  } catch (error: unknown) {
    console.error("Error applying promo code:", error);
    return errorJson("Failed to apply promo code", 500, {
      errorCode: PromoErrorCode.INTERNAL_VALIDATION_ERROR,
    });
  }
}
