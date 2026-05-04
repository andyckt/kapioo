import type { ComboLibraryStatus } from "@/lib/combo-library/shared/constants"

export type DailyComboLibraryItem = {
  _id?: string
  dailyComboLibraryId: string
  name: string
  internalName: string
  typeADishes: string[]
  typeBDishes: string[]
  imageUrl?: string
  imageKey?: string
  calories: number
  tags: string[]
  status: ComboLibraryStatus
  createdAt?: string | Date
  updatedAt?: string | Date
  createdBy?: string
  updatedBy?: string
}

export type ComboLibraryImportDuplicatePolicy = "skip" | "create" | "update"
