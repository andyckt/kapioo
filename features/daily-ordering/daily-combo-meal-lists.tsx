"use client"

import { MealProteinAllergenRow } from "@/components/landing/meal-protein-allergen-row"
import {
  dishesBeyondTwoDishSet,
  getDailyComboAllergens,
  getDailyComboDescription,
  getDailyComboDishName,
  getDailyComboTags,
  type ComboItem,
} from "@/lib/daily-delivery"

type DailyComboLang = "en" | "zh"

export function DailyComboMealOptionDivider() {
  return (
    <div className="my-3">
      <div className="w-full border-t border-dashed border-[#6B5F53]/20" />
    </div>
  )
}

export function DailyComboTwoDishDishList({
  combo,
  language,
  translateDishName,
}: {
  combo: ComboItem
  language: DailyComboLang
  translateDishName: (name: string) => string
}) {
  return (
    <div className="mt-3">
      <ul className="grid grid-cols-1 gap-2">
        {combo.typeA.dishes.map((dish, index) => (
          <li key={index} className="flex items-center">
            <span className="w-full rounded-md bg-[#F5EDE4] px-3 py-1.5 text-sm font-medium tracking-wide text-[#6B5F53]">
              {getDailyComboDishName(combo, "typeA", index, dish, language, translateDishName)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DailyComboThreeDishExtraDishes({
  combo,
  language,
  translateDishName,
}: {
  combo: ComboItem
  language: DailyComboLang
  translateDishName: (name: string) => string
}) {
  const extraSet = new Set(dishesBeyondTwoDishSet(combo.typeA.dishes, combo.typeB.dishes))
  const extras = combo.typeB.dishes
    .map((dish, index) => ({ dish, index }))
    .filter(({ dish }) => extraSet.has(dish))

  return (
    <div className="mt-3">
      <div className="mb-2 text-xs font-medium italic text-[#6B5F53]/80">
        {language === "zh"
          ? "包含以上的所有菜品，再加:"
          : "Includes all dishes above, plus:"}
      </div>
      <ul className="grid grid-cols-1 gap-2">
        {extras.map(({ dish, index }) => (
          <li key={index} className="flex items-center">
            <span className="w-full rounded-md border-l-2 border-[#C2884E] bg-[#F5EDE4]/80 px-3 py-1.5 text-sm font-medium tracking-wide text-[#6B5F53]">
              {getDailyComboDishName(combo, "typeB", index, dish, language, translateDishName)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DailyComboMetadata({
  combo,
  language,
  compact = false,
}: {
  combo: ComboItem
  language: DailyComboLang
  compact?: boolean
}) {
  const description = getDailyComboDescription(combo, language)
  const tags = getDailyComboTags(combo, language)
  const allergens = getDailyComboAllergens(combo, language)

  const hasCaloriePill = typeof combo.calories === "number"
  const hasTagRow = hasCaloriePill || tags.length > 0
  const hasProteinAllergenRow =
    (typeof combo.proteinGrams === "number" && Number.isFinite(combo.proteinGrams)) ||
    allergens.length > 0

  if (
    !description &&
    !hasTagRow &&
    !hasProteinAllergenRow
  ) {
    return null
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {description ? (
        <p className={compact ? "line-clamp-2 text-xs leading-relaxed text-[#6B5F53]/70" : "text-sm leading-relaxed text-[#6B5F53]/75"}>
          {description}
        </p>
      ) : null}
      {hasTagRow ? (
        <div
          className={
            compact
              ? "flex flex-wrap gap-1.5"
              : "flex flex-wrap gap-1.5 sm:gap-2"
          }
        >
          {hasCaloriePill ? (
            <span
              className={`rounded-full bg-[#C2884E]/10 px-2 py-0.5 font-semibold text-[#C2884E] ${
                compact ? "text-[10px]" : "text-[10px] sm:text-xs sm:py-1"
              }`}
            >
              {combo.calories} KCAL
            </span>
          ) : null}
          {tags.slice(0, compact ? 3 : undefined).map((tag, tagIndex) => (
            <span
              key={`${tag}-${tagIndex}`}
              className={`rounded-full bg-[#F5EDE4]/70 px-2 py-0.5 font-medium text-[#6B5F53] ${
                compact ? "text-[10px]" : "text-[10px] sm:text-xs sm:py-1"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {hasProteinAllergenRow ? (
        <MealProteinAllergenRow
          language={language}
          variant={compact ? "carousel" : "panel"}
          maxAllergens={compact ? 3 : undefined}
          proteinGrams={combo.proteinGrams}
          allergens={allergens}
        />
      ) : null}
    </div>
  )
}
