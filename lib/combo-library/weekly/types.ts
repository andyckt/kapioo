import type { ComboLibraryStatus } from "@/lib/combo-library/shared/constants"

export type WeeklyComboLibraryItem = {
  _id?: string
  weeklyComboLibraryId: string
  name: string
  nameEn?: string
  internalName?: string
  description?: string
  dishes: string[]
  imageUrl?: string
  imageKey?: string
  calories?: number
  tags: string[]
  allergens: string[]
  dietaryTags: string[]
  status: ComboLibraryStatus
  notesForAdmin?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  createdBy?: string
  updatedBy?: string
}

export type ComboLibraryImportDuplicatePolicy = "skip" | "create" | "update"
