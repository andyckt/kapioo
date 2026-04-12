export type PromoPurchaseType = "daily_topup" | "weekly_topup"
export type PromoPaymentMethod = "emt" | "wechat"

export interface PricingBreakdown {
  currency: "CAD"
  originalSubtotal: number
  discountAmount: number
  discountedSubtotal: number
  taxRate: number
  taxAmount: number
  finalTotal: number
}

export interface PromoValidationInput {
  code: string
  purchaseType: PromoPurchaseType
  paymentMethod: PromoPaymentMethod
  userPhone?: string
  mealSubtotal: number
  deliveryFeeTotal?: number
  subtotal?: number
  now?: Date
}

export function normalizePromoCode(code: string): string {
  return (code || "").trim().toUpperCase()
}

export function normalizePhone(phone?: string): string {
  return (phone || "").replace(/\D+/g, "")
}

export function roundMoney(value: number): number {
  return parseFloat((Number(value) || 0).toFixed(2))
}

export function calculatePromoBreakdown(params: {
  mealSubtotal: number
  deliveryFeeTotal?: number
  taxRate: number
  discountType: "percentage" | "fixed"
  discountValue: number
}): PricingBreakdown {
  const mealSubtotal = roundMoney(Math.max(0, params.mealSubtotal))
  const deliveryFeeTotal = roundMoney(Math.max(0, params.deliveryFeeTotal || 0))
  const originalSubtotal = roundMoney(mealSubtotal + deliveryFeeTotal)
  const taxRate = params.taxRate

  let rawDiscount = 0
  if (params.discountType === "percentage") {
    rawDiscount = (mealSubtotal * params.discountValue) / 100
  } else {
    rawDiscount = params.discountValue
  }

  const discountAmount = roundMoney(Math.min(Math.max(rawDiscount, 0), mealSubtotal))
  const discountedSubtotal = roundMoney(Math.max(originalSubtotal - discountAmount, 0))
  const taxAmount = roundMoney(discountedSubtotal * taxRate)
  const finalTotal = roundMoney(discountedSubtotal + taxAmount)

  return {
    currency: "CAD",
    originalSubtotal,
    discountAmount,
    discountedSubtotal,
    taxRate,
    taxAmount,
    finalTotal,
  }
}
