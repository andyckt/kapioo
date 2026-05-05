import type { WeeklyComboLibraryItem } from "@/lib/combo-library/weekly/types"

type WeeklyMealOptionSnapshot = {
  name: string
  nameEn?: string
  tags: string[]
  tagsEn?: string[]
  active: true
  imageUrl?: string
  imageKey?: string
  calories?: number
  proteinGrams?: number
  allergens?: string[]
  allergensEn?: string[]
  description?: string
  descriptionEn?: string
  sourceComboLibraryId: string
  sourceComboLibraryUpdatedAt?: string | Date
}

type WeeklyMealOptionLike = {
  name: string
  nameEn?: string
  tags?: string[]
  tagsEn?: string[]
  imageUrl?: string
  imageKey?: string
  calories?: number
  proteinGrams?: number
  allergens?: string[]
  allergensEn?: string[]
  description?: string
  descriptionEn?: string
}

export function mapWeeklyLibraryComboToWeeklyMenuOption(
  item: WeeklyComboLibraryItem
): WeeklyMealOptionSnapshot {
  return {
    name: item.name || "Dish",
    ...(item.nameEn ? { nameEn: item.nameEn } : {}),
    tags: item.tags ?? [],
    ...(item.tagsEn?.length ? { tagsEn: item.tagsEn } : {}),
    active: true,
    ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    ...(item.imageKey ? { imageKey: item.imageKey } : {}),
    ...(typeof item.calories === "number" ? { calories: item.calories } : {}),
    ...(typeof item.proteinGrams === "number" ? { proteinGrams: item.proteinGrams } : {}),
    ...(item.allergens.length > 0 ? { allergens: item.allergens } : {}),
    ...(item.allergensEn?.length ? { allergensEn: item.allergensEn } : {}),
    ...(item.description ? { description: item.description } : {}),
    ...(item.descriptionEn ? { descriptionEn: item.descriptionEn } : {}),
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
    tagsEn: option.tagsEn ?? [],
    ...(option.imageUrl ? { imageUrl: option.imageUrl } : {}),
    ...(option.imageKey ? { imageKey: option.imageKey } : {}),
    calories: option.calories,
    proteinGrams: option.proteinGrams,
    allergens: option.allergens ?? [],
    allergensEn: option.allergensEn ?? [],
    description: option.description,
    descriptionEn: option.descriptionEn,
  }
}
