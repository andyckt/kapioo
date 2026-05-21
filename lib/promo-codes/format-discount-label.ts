import type { Language } from "@/lib/email-translations";
import type { PromoDiscountType } from "@/models/PromoCode";

function formatDiscountAmount(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatPromoDiscountLabel(
  discountType: PromoDiscountType,
  discountValue: number,
  language: Language = "zh"
): string {
  if (discountType === "percentage") {
    return language === "zh" ? `立减 ${discountValue}%` : `${discountValue}% off`;
  }

  const amount = formatDiscountAmount(discountValue);
  return language === "zh" ? `立减 $${amount}` : `$${amount} off`;
}

export function formatPromoDiscountNote(
  discountType: PromoDiscountType,
  discountValue: number,
  language: Language = "zh"
): string {
  const label = formatPromoDiscountLabel(discountType, discountValue, language);
  return language === "zh" ? `${label} · 仅限使用一次` : `${label} · one-time use`;
}
