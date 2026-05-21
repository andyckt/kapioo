import {
  errorJson,
  parseJsonBody,
  parseSearchParams,
  successJson,
} from "@/lib/api";
import { handleRouteError, isApiError } from "@/lib/api/errors";
import {
  adminCreatePromoCodeBodySchema,
  adminPromoCodesListQuerySchema,
} from "@/lib/contracts/admin-routes";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { createAdminPromoCode } from "@/lib/promo-codes/create-admin-promo-code";
import PromoCode from "@/models/PromoCode";
import PromoCodeRedemption from "@/models/PromoCodeRedemption";

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
    const promoCode = await createAdminPromoCode(body);

    return successJson(promoCode);
  } catch (error: unknown) {
    if (isApiError(error)) {
      return errorJson(error.message, error.status, {
        details: error.details,
        errorCode: error.code,
      });
    }

    return handleRouteError(error, "POST /api/admin/promo-codes");
  }
}
