import type { DailyComboLibraryItem } from "@/lib/combo-library/daily/types"

type DailyComboSnapshot = {
  name: string
  calories: number
  proteinGrams?: number
  tags: string[]
  tagsEn?: string[]
  allergensZh?: string[]
  allergensEn?: string[]
  descriptionZh?: string
  descriptionEn?: string
  typeA: {
    dishes: string[]
    dishesEn?: string[]
    voucherType: "twoDish"
  }
  typeB: {
    dishes: string[]
    dishesEn?: string[]
    voucherType: "threeDish"
  }
  imageUrl?: string
  imageKey?: string
  sourceComboLibraryId: string
  sourceComboLibraryUpdatedAt?: string | Date
}

type DailyMenuComboLike = {
  name: string
  calories?: number
  proteinGrams?: number
  tags?: string[]
  tagsEn?: string[]
  allergensZh?: string[]
  allergensEn?: string[]
  descriptionZh?: string
  descriptionEn?: string
  typeA?: { dishes?: string[]; dishesEn?: string[] }
  typeB?: { dishes?: string[]; dishesEn?: string[] }
  imageUrl?: string
  imageKey?: string
}

function resolveDishTranslations(
  dishes: string[] | undefined,
  existingTranslations: string[] | undefined,
  dishTranslations?: Record<string, string>
) {
  if (!dishes?.length) {
    return []
  }

  const resolved = dishes.map((dish, index) => {
    const existingTranslation = existingTranslations?.[index]?.trim()
    if (existingTranslation) return existingTranslation

    return dishTranslations?.[dish]?.trim() ?? ""
  })

  const firstMissing = resolved.findIndex((translation) => !translation)
  if (firstMissing === -1) {
    return resolved
  }

  // Avoid saving shifted English names when only later dishes are translated.
  return resolved.slice(0, firstMissing)
}

export function mapDailyLibraryComboToDailyMenuCombo(item: DailyComboLibraryItem): DailyComboSnapshot {
  return {
    name: "套餐 1",
    calories: item.calories,
    ...(typeof item.proteinGrams === "number" ? { proteinGrams: item.proteinGrams } : {}),
    tags: item.tags ?? [],
    ...(item.tagsEn?.length ? { tagsEn: item.tagsEn } : {}),
    ...(item.allergensZh?.length ? { allergensZh: item.allergensZh } : {}),
    ...(item.allergensEn?.length ? { allergensEn: item.allergensEn } : {}),
    ...(item.descriptionZh ? { descriptionZh: item.descriptionZh } : {}),
    ...(item.descriptionEn ? { descriptionEn: item.descriptionEn } : {}),
    typeA: {
      dishes: item.typeADishes ?? [],
      ...(item.typeADishesEn?.length ? { dishesEn: item.typeADishesEn } : {}),
      voucherType: "twoDish",
    },
    typeB: {
      dishes: item.typeBDishes ?? [],
      ...(item.typeBDishesEn?.length ? { dishesEn: item.typeBDishesEn } : {}),
      voucherType: "threeDish",
    },
    ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    ...(item.imageKey ? { imageKey: item.imageKey } : {}),
    sourceComboLibraryId: item.dailyComboLibraryId,
    sourceComboLibraryUpdatedAt: item.updatedAt,
  }
}

export function mapDailyMenuComboToDailyLibraryDraft(
  combo: DailyMenuComboLike,
  dishTranslations?: Record<string, string>
): Partial<DailyComboLibraryItem> {
  return {
    name: combo.name,
    internalName: combo.name,
    typeADishes: combo.typeA?.dishes ?? [],
    typeADishesEn: resolveDishTranslations(
      combo.typeA?.dishes,
      combo.typeA?.dishesEn,
      dishTranslations
    ),
    typeBDishes: combo.typeB?.dishes ?? [],
    typeBDishesEn: resolveDishTranslations(
      combo.typeB?.dishes,
      combo.typeB?.dishesEn,
      dishTranslations
    ),
    calories: combo.calories ?? 0,
    proteinGrams: combo.proteinGrams,
    tags: combo.tags ?? [],
    tagsEn: combo.tagsEn ?? [],
    allergensZh: combo.allergensZh ?? [],
    allergensEn: combo.allergensEn ?? [],
    descriptionZh: combo.descriptionZh,
    descriptionEn: combo.descriptionEn,
    ...(combo.imageUrl ? { imageUrl: combo.imageUrl } : {}),
    ...(combo.imageKey ? { imageKey: combo.imageKey } : {}),
  }
}

export function evaluateDailyInsertGuards(
  item: Pick<DailyComboLibraryItem, "typeADishes" | "typeBDishes">
) {
  const hasA = item.typeADishes.length > 0
  const hasB = item.typeBDishes.length > 0

  if (!hasA && !hasB) {
    return {
      canInsert: false,
      level: "block" as const,
      message: "Library combo has no dishes; edit it first.",
    }
  }

  if (!hasA && hasB) {
    return {
      canInsert: true,
      level: "confirm" as const,
      message:
        "This combo has no 2-dish list; the 2-dish voucher option will be empty until you fill it in. Continue?",
    }
  }

  if (hasA && !hasB) {
    return {
      canInsert: true,
      level: "warn" as const,
      message: "3-dish voucher option will be empty; you can copy A to B in the next screen.",
    }
  }

  return {
    canInsert: true,
    level: "ok" as const,
  }
}
