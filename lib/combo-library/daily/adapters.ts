import type { DailyComboLibraryItem } from "@/lib/combo-library/daily/types"

type DailyComboSnapshot = {
  name: string
  calories: number
  tags: string[]
  typeA: {
    dishes: string[]
    voucherType: "twoDish"
  }
  typeB: {
    dishes: string[]
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
  tags?: string[]
  typeA?: { dishes?: string[] }
  typeB?: { dishes?: string[] }
  imageUrl?: string
  imageKey?: string
}

export function mapDailyLibraryComboToDailyMenuCombo(item: DailyComboLibraryItem): DailyComboSnapshot {
  return {
    name: item.name,
    calories: item.calories,
    tags: item.tags ?? [],
    typeA: {
      dishes: item.typeADishes ?? [],
      voucherType: "twoDish",
    },
    typeB: {
      dishes: item.typeBDishes ?? [],
      voucherType: "threeDish",
    },
    ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    ...(item.imageKey ? { imageKey: item.imageKey } : {}),
    sourceComboLibraryId: item.dailyComboLibraryId,
    sourceComboLibraryUpdatedAt: item.updatedAt,
  }
}

export function mapDailyMenuComboToDailyLibraryDraft(
  combo: DailyMenuComboLike
): Partial<DailyComboLibraryItem> {
  return {
    name: combo.name,
    typeADishes: combo.typeA?.dishes ?? [],
    typeBDishes: combo.typeB?.dishes ?? [],
    calories: combo.calories ?? 0,
    tags: combo.tags ?? [],
    ...(combo.imageUrl ? { imageUrl: combo.imageUrl } : {}),
    ...(combo.imageKey ? { imageKey: combo.imageKey } : {}),
    status: "draft",
    vegetables: [],
    allergens: [],
    dietaryTags: [],
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
