import { IPromoCode } from '@/models/PromoCode';
import PromoCodeRedemption from '@/models/PromoCodeRedemption';

export type PromoPurchaseType = 'daily_topup' | 'weekly_topup';
export type PromoPaymentMethod = 'emt' | 'wechat';

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

export interface PromoValidationInput {
  code: string;
  purchaseType: PromoPurchaseType;
  paymentMethod: PromoPaymentMethod;
  userPhone?: string;
  mealSubtotal: number;
  deliveryFeeTotal?: number;
  // Backward compatibility for older callers; maps to mealSubtotal when provided.
  subtotal?: number;
  now?: Date;
}

export interface PricingBreakdown {
  currency: 'CAD';
  originalSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  taxRate: number;
  taxAmount: number;
  finalTotal: number;
}

export interface PromoValidationResult {
  ok: boolean;
  errorCode?: PromoErrorCode;
  message?: string;
  breakdown?: PricingBreakdown;
}

export function normalizePromoCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

export function normalizePhone(phone?: string): string {
  return (phone || '').replace(/\D+/g, '');
}

export function roundMoney(value: number): number {
  return parseFloat((Number(value) || 0).toFixed(2));
}

export function calculatePromoBreakdown(params: {
  mealSubtotal: number;
  deliveryFeeTotal?: number;
  taxRate: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}): PricingBreakdown {
  const mealSubtotal = roundMoney(Math.max(0, params.mealSubtotal));
  const deliveryFeeTotal = roundMoney(Math.max(0, params.deliveryFeeTotal || 0));
  const originalSubtotal = roundMoney(mealSubtotal + deliveryFeeTotal);
  const taxRate = params.taxRate;

  let rawDiscount = 0;
  if (params.discountType === 'percentage') {
    rawDiscount = (mealSubtotal * params.discountValue) / 100;
  } else {
    rawDiscount = params.discountValue;
  }

  const discountAmount = roundMoney(Math.min(Math.max(rawDiscount, 0), mealSubtotal));
  const discountedSubtotal = roundMoney(Math.max(originalSubtotal - discountAmount, 0));
  const taxAmount = roundMoney(discountedSubtotal * taxRate);
  const finalTotal = roundMoney(discountedSubtotal + taxAmount);

  return {
    currency: 'CAD',
    originalSubtotal,
    discountAmount,
    discountedSubtotal,
    taxRate,
    taxAmount,
    finalTotal
  };
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
