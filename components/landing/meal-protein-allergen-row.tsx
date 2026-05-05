"use client"

type MealMetaLanguage = "en" | "zh"

export type MealProteinAllergenRowProps = {
  language: MealMetaLanguage
  proteinGrams?: number
  allergens: readonly string[]
  /** Default: roomy cards & dialogs; `carousel` trims padding for landing tiles */
  variant?: "panel" | "carousel"
  /** When set (e.g. compact carousel cards), limit allergen fragments shown */
  maxAllergens?: number
}

/** Compact single-line row for protein grams + allergens (weekly & daily menus, carousels). */
export function MealProteinAllergenRow({
  language,
  proteinGrams,
  allergens,
  variant = "panel",
  maxAllergens,
}: MealProteinAllergenRowProps) {
  const trimmed = typeof maxAllergens === "number" ? allergens.slice(0, maxAllergens) : [...allergens]
  const hasProtein =
    typeof proteinGrams === "number" && Number.isFinite(proteinGrams) && proteinGrams >= 0
  const hasAllergens = trimmed.length > 0

  if (!hasProtein && !hasAllergens) {
    return null
  }

  const isCarousel = variant === "carousel"
  const boxClass = isCarousel
    ? "mt-2 rounded-md border border-[#E8D8C7]/85 bg-[#FBF7F2]/65 px-1.5 py-1 text-[9px] leading-snug text-[#7A684D]"
    : "rounded-md border border-[#E8D8C7]/85 bg-[#FBF7F2]/60 px-2 py-1 text-[9px] leading-snug text-[#7A684D] sm:text-[10px]"

  const label =
    language === "zh"
      ? "过敏原:"
      : "Allergens:"
  const proteinLabel =
    language === "zh"
      ? "蛋白质"
      : "Protein"

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${boxClass}`}>
      {hasProtein ? (
        <span className="shrink-0 font-medium tabular-nums text-[#6B5F53]">
          {proteinLabel} · {proteinGrams}g
        </span>
      ) : null}
      {hasProtein && hasAllergens ? (
        <span className="shrink-0 text-[#C2884E]/35" aria-hidden="true">
          ·
        </span>
      ) : null}
      {hasAllergens ? (
        <span className="min-w-0 break-words">
          <span className="font-semibold text-[#5C5248]">{label}</span>{" "}
          {trimmed.join(" / ")}
        </span>
      ) : null}
    </div>
  )
}
