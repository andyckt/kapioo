import {
  errorJson,
  parseJsonBody,
  parseSearchParams,
  successJson,
} from "@/lib/api";
import {
  adminCreatePromoCodeBodySchema,
  adminPromoCodesListQuerySchema,
} from "@/lib/contracts/admin-routes";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import PromoCode from "@/models/PromoCode";
import PromoCodeRedemption from "@/models/PromoCodeRedemption";
import { normalizePromoCode } from "@/lib/promo-code";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const queryParsed = parseSearchParams(request.url, adminPromoCodesListQuerySchema);
    if (queryParsed.error) {
      return queryParsed.error;
    }
    const { active } = queryParsed.data;
    const query: Record<string, unknown> = {};

    if (active === "true") query.active = true;
    if (active === "false") query.active = false;

    const promoCodes = await PromoCode.find(query).sort({ createdAt: -1 }).lean();

    const promoIds = promoCodes.map((promo) => promo._id);
    const usageRows = await PromoCodeRedemption.aggregate([
      { $match: { promoCodeId: { $in: promoIds } } },
      { $group: { _id: "$promoCodeId", count: { $sum: 1 } } },
    ]);

    const usageMap = new Map<string, number>(
      usageRows.map((row) => [String(row._id), row.count as number])
    );

    const data = promoCodes.map((promo) => ({
      ...promo,
      usageCountFromRedemptions: usageMap.get(String(promo._id)) || 0,
    }));

    return successJson(data);
  } catch (error: unknown) {
    console.error("Error fetching promo codes:", error);
    return errorJson("Failed to fetch promo codes", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const bodyParsed = await parseJsonBody(request, adminCreatePromoCodeBodySchema);
    if (bodyParsed.error) {
      return bodyParsed.error;
    }
    const body = bodyParsed.data;

    const code = normalizePromoCode(body.code);
    const discountType = body.discountType;
    const discountValue = Number(body.discountValue);

    if (!code || !discountType || Number.isNaN(discountValue)) {
      return errorJson("Missing required fields", 400);
    }

    if (!["percentage", "fixed"].includes(discountType)) {
      return errorJson("Invalid discount type", 400);
    }

    if (discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
      return errorJson("Percentage discount must be between 0 and 100", 400);
    }

    if (discountType === "fixed" && discountValue <= 0) {
      return errorJson("Fixed discount must be greater than 0", 400);
    }

    const existing = await PromoCode.findOne({ code });
    if (existing) {
      return errorJson("Promo code already exists", 409);
    }

    const promoCode = new PromoCode({
      code,
      description: body.description || "",
      discountType,
      discountValue,
      currency: "CAD",
      active: body.active !== false,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      maxUses: body.maxUses ? Number(body.maxUses) : undefined,
      usageCount: 0,
      oneUsePerUser: body.oneUsePerUser !== false,
      promoOnlyEmt: body.promoOnlyEmt === true,
      appliesTo: body.appliesTo || "all",
    });

    await promoCode.save();

    return successJson(promoCode);
  } catch (error: unknown) {
    console.error("Error creating promo code:", error);
    return errorJson("Failed to create promo code", 500);
  }
}
