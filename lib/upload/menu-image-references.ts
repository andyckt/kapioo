import { deleteMenuImageFromS3 } from "@/lib/upload/menu-image"
import Combo from "@/models/Combo"
import DailyComboLibraryItem from "@/models/DailyComboLibraryItem"
import WeeklyComboLibraryItem from "@/models/WeeklyComboLibraryItem"
import WeeklyMealOption from "@/models/WeeklyMealOption"

type DailyImageExclusion = {
  comboId?: string
  dailyComboLibraryId?: string
}

type WeeklyImageExclusion = {
  mealOptionId?: string
  weeklyComboLibraryId?: string
}

export async function isDailyMenuImageKeyInUse(
  imageKey: string,
  exclude: DailyImageExclusion = {}
) {
  const [comboReference, libraryReference] = await Promise.all([
    Combo.exists({
      imageKey,
      ...(exclude.comboId ? { comboId: { $ne: exclude.comboId } } : {}),
    }),
    DailyComboLibraryItem.exists({
      imageKey,
      ...(exclude.dailyComboLibraryId
        ? { dailyComboLibraryId: { $ne: exclude.dailyComboLibraryId } }
        : {}),
    }),
  ])

  return Boolean(comboReference || libraryReference)
}

export async function isWeeklyMenuImageKeyInUse(
  imageKey: string,
  exclude: WeeklyImageExclusion = {}
) {
  const [mealOptionReference, libraryReference] = await Promise.all([
    WeeklyMealOption.exists({
      imageKey,
      ...(exclude.mealOptionId ? { _id: { $ne: exclude.mealOptionId } } : {}),
    }),
    WeeklyComboLibraryItem.exists({
      imageKey,
      ...(exclude.weeklyComboLibraryId
        ? { weeklyComboLibraryId: { $ne: exclude.weeklyComboLibraryId } }
        : {}),
    }),
  ])

  return Boolean(mealOptionReference || libraryReference)
}

export async function deleteDailyMenuImageFromS3IfUnused(
  imageKey?: string,
  exclude?: DailyImageExclusion
) {
  if (!imageKey) return

  try {
    if (!(await isDailyMenuImageKeyInUse(imageKey, exclude))) {
      await deleteMenuImageFromS3(imageKey)
    }
  } catch (error) {
    console.warn("Skipped daily menu image cleanup:", error)
  }
}

export async function deleteWeeklyMenuImageFromS3IfUnused(
  imageKey?: string,
  exclude?: WeeklyImageExclusion
) {
  if (!imageKey) return

  try {
    if (!(await isWeeklyMenuImageKeyInUse(imageKey, exclude))) {
      await deleteMenuImageFromS3(imageKey)
    }
  } catch (error) {
    console.warn("Skipped weekly menu image cleanup:", error)
  }
}
