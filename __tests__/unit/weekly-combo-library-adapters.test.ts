import {
  mapWeeklyLibraryComboToWeeklyMenuOption,
  mapWeeklyMenuOptionToWeeklyLibraryDraft,
} from "@/lib/combo-library/weekly/adapters"
import type { WeeklyComboLibraryItem } from "@/lib/combo-library/weekly/types"

const baseItem: WeeklyComboLibraryItem = {
  weeklyComboLibraryId: "weekly-combo-1",
  name: "周餐素材",
  nameEn: "Weekly Combo",
  internalName: "周餐素材",
  tags: ["高蛋白"],
  allergens: ["soy"],
  calories: 650,
  imageUrl: "https://example.com/image.jpg",
  imageKey: "weekly-combo-library-images/combo-1/image.jpg",
  updatedAt: "2026-05-03T00:00:00.000Z",
}

describe("weekly combo library adapters", () => {
  it("maps weekly combo content into a weekly menu option snapshot", () => {
    const mapped = mapWeeklyLibraryComboToWeeklyMenuOption(baseItem)

    expect(mapped.name).toBe("周餐素材")
    expect(mapped.nameEn).toBe("Weekly Combo")
    expect(mapped.active).toBe(true)
    expect(mapped.sourceComboLibraryId).toBe("weekly-combo-1")
  })

  it("prefills weekly library drafts from a weekly option", () => {
    const draft = mapWeeklyMenuOptionToWeeklyLibraryDraft({
      name: "红烧肉",
      nameEn: "Braised Pork",
      tags: ["人气"],
    })

    expect(draft.internalName).toBe("红烧肉")
    expect(draft.nameEn).toBe("Braised Pork")
    expect(draft.tags).toEqual(["人气"])
  })
})
