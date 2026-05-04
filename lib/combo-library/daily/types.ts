import type { ComboLibraryStatus } from "@/lib/combo-library/shared/constants"

export type DailyComboLibrarySpiceLevel = "none" | "mild" | "medium" | "hot" | "extra_hot"

export type DailyComboLibraryItem = {
  _id?: string
  dailyComboLibraryId: string
  name: string
  nameEn?: string
  internalName?: string
  description?: string
  typeADishes: string[]
  typeBDishes: string[]
  mainProtein?: string
  carb?: string
  vegetables: string[]
  sauce?: string
  imageUrl?: string
  imageKey?: string
  calories: number
  proteinGrams?: number
  carbsGrams?: number
  fatGrams?: number
  tags: string[]
  allergens: string[]
  dietaryTags: string[]
  cuisineType?: string
  spiceLevel?: DailyComboLibrarySpiceLevel
  portionSize?: string
  status: ComboLibraryStatus
  notesForAdmin?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  createdBy?: string
  updatedBy?: string
}

export type ComboLibraryImportDuplicatePolicy = "skip" | "create" | "update"
