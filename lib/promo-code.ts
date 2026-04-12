import { IPromoCode } from '@/models/PromoCode';
import PromoCodeRedemption from '@/models/PromoCodeRedemption';
import {
  calculatePromoBreakdown,
  normalizePhone,
  normalizePromoCode,
  type PricingBreakdown,
  type PromoPaymentMethod,
  type PromoPurchaseType,
  type PromoValidationInput,
} from '@/lib/promo-code-shared';

export {
  calculatePromoBreakdown,
  normalizePhone,
  normalizePromoCode,
  type PricingBreakdown,
  type PromoPaymentMethod,
  type PromoPurchaseType,
  type PromoValidationInput,
} from '@/lib/promo-code-shared';

export enum PromoErrorCode {
  INVALID_CODE = 'INVALID_CODE',
  EXPIRED = 'EXPIRED',
  INACTIVE = 'INACTIVE',
  MAX_USES_REACHED = 'MAX_USES_REACHED',
  ALREADY_USED = 'ALREADY_USED',
  PAYMENT_METHOD_NOT_ELIGIBLE = 'PAYMENT_METHOD_NOT_ELIGIBLE',
  MIN_SPEND_NOT_MET = 'MIN_SPEND_NOT_MET',
  PHONE_REQUIRED_FOR_PROMO = 'PHONE_REQUIRED_FOR_PROMO',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  INTERNAL_VALIDATION_ERROR = 'INTERNAL_VALIDATION_ERROR'
}

export interface PromoValidationResult {
  ok: boolean;
  errorCode?: PromoErrorCode;
  message?: string;
  breakdown?: PricingBreakdown;
}

export async function validatePromoForPreview(params: {
  promo: IPromoCode | null;
  input: PromoValidationInput;
  taxRate: number;
}): Promise<PromoValidationResult> {
  const { promo, input, taxRate } = params;
  const now = input.now || new Date();
  const normalizedPhone = normalizePhone(input.userPhone);

  if (!promo || normalizePromoCode(input.code) !== promo.code) {
    return {
      ok: false,
      errorCode: PromoErrorCode.INVALID_CODE,
      message: 'Promo code is invalid.'
    };
  }

  if (!promo.active) {
    return {
      ok: false,
      errorCode: PromoErrorCode.INACTIVE,
      message: 'Promo code is inactive.'
    };
  }

  if (promo.startsAt && now < promo.startsAt) {
    return {
      ok: false,
      errorCode: PromoErrorCode.INACTIVE,
      message: 'Promo code is not active yet.'
    };
  }

  if (promo.expiresAt && now > promo.expiresAt) {
    return {
      ok: false,
      errorCode: PromoErrorCode.EXPIRED,
      message: 'Promo code has expired.'
    };
  }

  if (promo.maxUses !== undefined && promo.maxUses !== null && promo.usageCount >= promo.maxUses) {
    return {
      ok: false,
      errorCode: PromoErrorCode.MAX_USES_REACHED,
      message: 'Promo code has reached max uses.'
    };
  }

  if (promo.promoOnlyEmt && input.paymentMethod !== 'emt') {
    return {
      ok: false,
      errorCode: PromoErrorCode.PAYMENT_METHOD_NOT_ELIGIBLE,
      message: 'Promo code is only valid for EMT payment.'
    };
  }

  if (promo.appliesTo !== 'all' && promo.appliesTo !== input.purchaseType) {
    return {
      ok: false,
      errorCode: PromoErrorCode.NOT_APPLICABLE,
      message: 'Promo code is not applicable to this purchase.'
    };
  }

  if (promo.oneUsePerUser) {
    if (!normalizedPhone) {
      return {
        ok: false,
        errorCode: PromoErrorCode.PHONE_REQUIRED_FOR_PROMO,
        message: 'Phone number is required for this promo code.'
      };
    }

    const alreadyUsed = await PromoCodeRedemption.exists({
      promoCodeId: promo._id,
      userPhoneNormalized: normalizedPhone
    });

    if (alreadyUsed) {
      return {
        ok: false,
        errorCode: PromoErrorCode.ALREADY_USED,
        message: 'This promo code is already used for this phone number.'
      };
    }
  }

  return {
    ok: true,
    breakdown: calculatePromoBreakdown({
      mealSubtotal: Math.max(0, Number(input.mealSubtotal ?? input.subtotal ?? 0)),
      deliveryFeeTotal: Math.max(0, Number(input.deliveryFeeTotal || 0)),
      taxRate,
      discountType: promo.discountType,
      discountValue: promo.discountValue
    })
  };
}
