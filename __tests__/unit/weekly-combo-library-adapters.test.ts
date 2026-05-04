import {
  mapWeeklyLibraryComboToWeeklyMenuOption,
  mapWeeklyMenuOptionToWeeklyLibraryDraft,
} from "@/lib/combo-library/weekly/adapters"
import type { WeeklyComboLibraryItem } from "@/lib/combo-library/weekly/types"

const baseItem: WeeklyComboLibraryItem = {
  weeklyComboLibraryId: "weekly-combo-1",
  name: "周餐 1",
  dishes: ["鸡肉", "花菜", "米饭"],
  tags: ["高蛋白"],
  allergens: ["soy"],
  dietaryTags: [],
  status: "active",
  calories: 650,
  imageUrl: "https://example.com/image.jpg",
  imageKey: "weekly-combo-library-images/combo-1/image.jpg",
  updatedAt: "2026-05-03T00:00:00.000Z",
}

describe("weekly combo library adapters", () => {
  it("maps weekly dishes directly into a weekly menu option snapshot", () => {
    const mapped = mapWeeklyLibraryComboToWeeklyMenuOption(baseItem)

    expect(mapped.dishes).toEqual(["鸡肉", "花菜", "米饭"])
    expect(mapped.active).toBe(true)
    expect(mapped.sourceComboLibraryId).toBe("weekly-combo-1")
  })

  it("prefills weekly library drafts from a weekly option", () => {
    const draft = mapWeeklyMenuOptionToWeeklyLibraryDraft({
      name: "红烧肉",
      dishes: ["肉", "饭"],
      tags: ["人气"],
    })

    expect(draft.dishes).toEqual(["肉", "饭"])
    expect(draft.tags).toEqual(["人气"])
  })
})
