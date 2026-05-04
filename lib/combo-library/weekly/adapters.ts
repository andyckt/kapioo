import type { WeeklyComboLibraryItem } from "@/lib/combo-library/weekly/types"

type WeeklyMealOptionSnapshot = {
  name: string
  nameEn?: string
  tags: string[]
  active: true
  imageUrl?: string
  imageKey?: string
  calories?: number
  allergens?: string[]
  description?: string
  sourceComboLibraryId: string
  sourceComboLibraryUpdatedAt?: string | Date
}

type WeeklyMealOptionLike = {
  name: string
  nameEn?: string
  tags?: string[]
  imageUrl?: string
  imageKey?: string
  calories?: number
  allergens?: string[]
  description?: string
}

export function mapWeeklyLibraryComboToWeeklyMenuOption(
  item: WeeklyComboLibraryItem
): WeeklyMealOptionSnapshot {
  return {
    name: item.name || "Dish",
    ...(item.nameEn ? { nameEn: item.nameEn } : {}),
    tags: item.tags ?? [],
    active: true,
    ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    ...(item.imageKey ? { imageKey: item.imageKey } : {}),
    ...(typeof item.calories === "number" ? { calories: item.calories } : {}),
    ...(item.allergens.length > 0 ? { allergens: item.allergens } : {}),
    ...(item.description ? { description: item.description } : {}),
    sourceComboLibraryId: item.weeklyComboLibraryId,
    sourceComboLibraryUpdatedAt: item.updatedAt,
  }
}

export function mapWeeklyMenuOptionToWeeklyLibraryDraft(
  option: WeeklyMealOptionLike
): Partial<WeeklyComboLibraryItem> {
  return {
    name: option.name,
    nameEn: option.nameEn,
    internalName: option.name,
    tags: option.tags ?? [],
    ...(option.imageUrl ? { imageUrl: option.imageUrl } : {}),
    ...(option.imageKey ? { imageKey: option.imageKey } : {}),
    calories: option.calories,
    allergens: option.allergens ?? [],
    description: option.description,
  }
}
