import { ApiError } from "@/lib/api/errors";
import type { AdminCreatePromoCodeBody } from "@/lib/contracts/admin-routes";
import {
  assertPublicEmailBaseUrl,
  resolvePublicEmailBaseUrl,
} from "@/lib/email/resolve-public-email-base-url";
import type { Language } from "@/lib/email-translations";
import { normalizePromoCode } from "@/lib/promo-code";
import {
  formatPromoDiscountLabel,
  formatPromoDiscountNote,
} from "@/lib/promo-codes/format-discount-label";
import { getUserDisplayName } from "@/lib/users/display";
import PromoCode, { type IPromoCode, type PromoAppliesTo } from "@/models/PromoCode";
import User from "@/models/User";

function resolveLanguage(value: unknown): Language {
  return value === "en" ? "en" : "zh";
}

function buildPromoPayload(body: AdminCreatePromoCodeBody, code: string, discountType: "percentage" | "fixed", discountValue: number) {
  return {
    code,
    description: body.description || "",
    discountType,
    discountValue,
    currency: "CAD" as const,
    active: body.active !== false,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    maxUses: body.maxUses ? Number(body.maxUses) : undefined,
    usageCount: 0,
    oneUsePerUser: body.oneUsePerUser !== false,
    promoOnlyEmt: body.promoOnlyEmt === true,
    appliesTo: (body.appliesTo || "all") as PromoAppliesTo,
  };
}

function validateDiscount(discountType: "percentage" | "fixed", discountValue: number) {
  if (discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
    throw new ApiError("Percentage discount must be between 0 and 100", { status: 400 });
  }

  if (discountType === "fixed" && discountValue <= 0) {
    throw new ApiError("Fixed discount must be greater than 0", { status: 400 });
  }
}

async function loadReferralUsers(referrerUserId: string, refereeUserId: string) {
  const [referrer, referee] = await Promise.all([
    User.findById(referrerUserId).lean(),
    User.findById(refereeUserId).lean(),
  ]);

  if (!referrer) {
    throw new ApiError("Referrer account not found", { status: 400 });
  }

  if (!referee) {
    throw new ApiError("Referee account not found", { status: 400 });
  }

  const referrerEmail = typeof referrer.email === "string" ? referrer.email.trim() : "";
  if (!referrerEmail) {
    throw new ApiError("Referrer account must have an email address", { status: 400 });
  }

  return {
    referrer,
    referee,
    referrerEmail,
    referrerName: getUserDisplayName(referrer),
    refereeName: getUserDisplayName(referee),
    language: resolveLanguage(referrer.languagePreference),
  };
}

export async function createAdminPromoCode(body: AdminCreatePromoCodeBody): Promise<IPromoCode> {
  const code = normalizePromoCode(body.code);
  const discountType = body.discountType;
  const discountValue = Number(body.discountValue);

  if (!code || !discountType || Number.isNaN(discountValue)) {
    throw new ApiError("Missing required fields", { status: 400 });
  }

  if (!["percentage", "fixed"].includes(discountType)) {
    throw new ApiError("Invalid discount type", { status: 400 });
  }

  validateDiscount(discountType, discountValue);

  const existing = await PromoCode.findOne({ code });
  if (existing) {
    throw new ApiError("Promo code already exists", { status: 409 });
  }

  const promoPayload = buildPromoPayload(body, code, discountType, discountValue);

  if (!body.isReferralPromo) {
    return PromoCode.create(promoPayload);
  }

  const referrerUserId = body.referrerUserId!.trim();
  const refereeUserId = body.refereeUserId!.trim();

  if (referrerUserId === refereeUserId) {
    throw new ApiError("Referrer and referee must be different users", { status: 400 });
  }

  const referralUsers = await loadReferralUsers(referrerUserId, refereeUserId);

  const promoCode = await PromoCode.create({
    ...promoPayload,
    referral: {
      referrerUserId,
      refereeUserId,
      referrerEmail: referralUsers.referrerEmail,
      referrerName: referralUsers.referrerName,
      refereeName: referralUsers.refereeName,
    },
  });

  try {
    const baseUrl = resolvePublicEmailBaseUrl();
    assertPublicEmailBaseUrl(baseUrl);

    const discountLabel = formatPromoDiscountLabel(
      discountType,
      discountValue,
      referralUsers.language
    );
    const discountNote = formatPromoDiscountNote(
      discountType,
      discountValue,
      referralUsers.language
    );

    const { sendReferralRewardEmail } = await import("@/lib/services/email");
    await sendReferralRewardEmail(referralUsers.referrerEmail, {
      name: referralUsers.referrerName,
      promoCode: code,
      referredFriendName: referralUsers.refereeName,
      discountLabel,
      discountNote,
      language: referralUsers.language,
      baseUrl,
    });

    promoCode.referral = {
      ...promoCode.referral!,
      rewardEmailSentAt: new Date(),
    };
    await promoCode.save();

    return promoCode;
  } catch (error) {
    await PromoCode.findByIdAndDelete(promoCode._id);

    if (error instanceof ApiError) {
      throw error;
    }

    console.error("Referral reward email failed after promo create:", error);
    throw new ApiError(
      "Promo code was not created because the referral reward email failed to send.",
      { status: 500 }
    );
  }
}
