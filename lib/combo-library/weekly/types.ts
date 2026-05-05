export type WeeklyComboLibraryItem = {
  _id?: string
  weeklyComboLibraryId: string
  name: string
  nameEn?: string
  internalName: string
  description?: string
  descriptionEn?: string
  imageUrl?: string
  imageKey?: string
  calories?: number
  proteinGrams?: number
  tags: string[]
  tagsEn?: string[]
  allergens: string[]
  allergensEn?: string[]
  createdAt?: string | Date
  updatedAt?: string | Date
  createdBy?: string
  updatedBy?: string
}

export type ComboLibraryImportDuplicatePolicy = "skip" | "create" | "update"
