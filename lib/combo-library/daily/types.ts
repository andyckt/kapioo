export type DailyComboLibraryItem = {
  _id?: string
  dailyComboLibraryId: string
  name: string
  internalName: string
  typeADishes: string[]
  typeADishesEn?: string[]
  typeBDishes: string[]
  typeBDishesEn?: string[]
  imageUrl?: string
  imageKey?: string
  calories: number
  proteinGrams?: number
  tags: string[]
  tagsEn?: string[]
  allergensZh?: string[]
  allergensEn?: string[]
  descriptionZh?: string
  descriptionEn?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  createdBy?: string
  updatedBy?: string
}

export type ComboLibraryImportDuplicatePolicy = "skip" | "create" | "update"
