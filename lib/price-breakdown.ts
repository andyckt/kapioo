type RequestType = 'weekly' | 'daily';
type PaymentMethod = 'emt' | 'wechat' | string | undefined;

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickPositive = (primary: unknown, fallback: number) => {
  const parsed = Number(primary);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export interface CanonicalBreakdownInput {
  requestType: RequestType;
  paymentMethod?: PaymentMethod;
  amount?: unknown;
  originalPrice?: unknown;
  originalSubtotal?: unknown;
  finalTotal?: unknown;
  promoDiscountAmount?: unknown;
  taxAmount?: unknown;
  mealSubtotal?: unknown;
  deliveryFeePerWeek?: unknown;
  deliveryFeeTotal?: unknown;
  mealPlanQuantity?: unknown;
}

export interface CanonicalBreakdown {
  requestType: RequestType;
  mealSubtotal: number;
  deliveryFeePerWeek: number;
  deliveryFeeTotal: number;
  subtotalBeforeTax: number;
  promoDiscount: number;
  taxAmount: number;
  finalTotal: number;
}

export const buildCanonicalBreakdown = (input: CanonicalBreakdownInput): CanonicalBreakdown => {
  const amount = toNumber(input.amount);
  let combinedSubtotal = pickPositive(input.originalSubtotal, pickPositive(input.originalPrice, amount));
  const finalTotal = pickPositive(input.finalTotal, amount);
  const promoDiscount = Math.max(0, toNumber(input.promoDiscountAmount));
  let taxableBase = Math.max(0, combinedSubtotal - promoDiscount);

  if (input.requestType === 'weekly') {
    const rawTaxAmount = Math.max(0, toNumber(input.taxAmount));
    const looksLikeTaxIncludedLegacy =
      input.paymentMethod === 'emt' &&
      rawTaxAmount <= 0 &&
      finalTotal > 0 &&
      Math.abs(finalTotal - combinedSubtotal) < 0.01;
    if (looksLikeTaxIncludedLegacy) {
      taxableBase = Number((finalTotal / 1.13).toFixed(2));
      combinedSubtotal = Number((taxableBase + promoDiscount).toFixed(2));
    }

    const mealPlanQuantity = Math.max(0, toNumber(input.mealPlanQuantity));
    let deliveryFeePerWeek = Math.max(0, toNumber(input.deliveryFeePerWeek));
    let deliveryFeeTotal = Math.max(0, toNumber(input.deliveryFeeTotal));
    if (deliveryFeeTotal <= 0 && mealPlanQuantity > 0) {
      if (deliveryFeePerWeek <= 0) {
        deliveryFeePerWeek = 11.99;
      }
      deliveryFeeTotal = Number((deliveryFeePerWeek * mealPlanQuantity).toFixed(2));
      if (deliveryFeeTotal > combinedSubtotal) {
        deliveryFeeTotal = 0;
      }
    }
    const mealSubtotal = pickPositive(input.mealSubtotal, Math.max(0, combinedSubtotal - deliveryFeeTotal));
    const taxAmount =
      input.paymentMethod === 'emt'
        ? (looksLikeTaxIncludedLegacy
            ? Math.max(0, Number((finalTotal - taxableBase).toFixed(2)))
            : pickPositive(input.taxAmount, Math.max(0, Number((finalTotal - taxableBase).toFixed(2)))))
        : 0;

    return {
      requestType: 'weekly',
      mealSubtotal,
      deliveryFeePerWeek,
      deliveryFeeTotal,
      subtotalBeforeTax: combinedSubtotal,
      promoDiscount,
      taxAmount,
      finalTotal
    };
  }

  const taxAmount = pickPositive(input.taxAmount, Math.max(0, Number((finalTotal - taxableBase).toFixed(2))));
  return {
    requestType: 'daily',
    mealSubtotal: combinedSubtotal,
    deliveryFeePerWeek: 0,
    deliveryFeeTotal: 0,
    subtotalBeforeTax: combinedSubtotal,
    promoDiscount,
    taxAmount,
    finalTotal
  };
};
