/**
 * Canonical customer-facing names for Kapioo product lines.
 * Use helpers or PRODUCT_LINE_LABELS in UI, emails, and admin copy—do not duplicate literals.
 */
export type ProductLineId = "daily" | "weekly"

export type ProductLineLanguage = "zh" | "en"

export const PRODUCT_LINE_LABELS: Record<ProductLineId, { zh: string; en: string }> = {
  daily: { zh: "每日Bento", en: "Daily Bento" },
  weekly: { zh: "周次 Meal Box", en: "Weekly Meal Box" },
} as const

/** Short product name for a given language (nav, tabs, titles). */
export function productLineLabel(line: ProductLineId, lang: ProductLineLanguage): string {
  return PRODUCT_LINE_LABELS[line][lang]
}

/** Marketing “series” line e.g. 每日Bento系列 / Daily Bento Series */
export function productLineSeriesName(line: ProductLineId, lang: ProductLineLanguage): string {
  if (lang === "en") {
    return line === "daily" ? "Daily Bento Series" : "Weekly Meal Box Series"
  }
  return line === "daily" ? "每日Bento系列" : "周次 Meal Box系列"
}

/** Chinese bracket form for emphasis, e.g. in hero or FAQ: 【每日Bento】 */
export function productLineBracketZh(line: ProductLineId): string {
  return line === "daily" ? "【每日Bento】" : "【周次 Meal Box】"
}

/** “Choose series A or B” style — Chinese (matches prior homepage copy). */
export function productLineChooseSeriesSentenceZh(): string {
  return `根据你的日程和配送区域，选择${productLineBracketZh("daily")}系列或${productLineBracketZh("weekly")}系列。`
}

/** English parallel for {@link productLineChooseSeriesSentenceZh}. */
export function productLineChooseSeriesSentenceEn(): string {
  return "Based on your schedule and delivery area, choose the Daily Bento series or the Weekly Meal Box series."
}
