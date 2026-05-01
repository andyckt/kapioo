/** Shared labels for daily order / checkout display (zh vs en). */

export function translateDailyComboDisplayName(name: string, language: string): string {
  if (language === "zh" || !name) return name;
  return name.includes("套餐") ? name.replace(/套餐/g, "Combo") : name;
}

/** e.g. 2菜 / 2-dish */
export function dailyMealTypeShortLabel(type: string | undefined, language: string): string {
  const isTwo = type === "A";
  if (language === "zh") return isTwo ? "2菜" : "3菜";
  return isTwo ? "2-dish" : "3-dish";
}

/** Voucher summary line prefix: 2菜: / 2-dish: */
export function dailyVoucherTypeCountLabel(kind: "two" | "three", language: string): string {
  if (language === "zh") return kind === "two" ? "2菜" : "3菜";
  return kind === "two" ? "2-dish" : "3-dish";
}

export function translateHistoryDishName(
  dishName: string,
  dishTranslations: Record<string, string>,
  language: string
): string {
  if (language === "zh" || !dishTranslations[dishName]) return dishName;
  return dishTranslations[dishName] || dishName;
}
