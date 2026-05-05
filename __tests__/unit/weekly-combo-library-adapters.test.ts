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
  tagsEn: ["High protein"],
  allergens: ["大豆"],
  allergensEn: ["soy"],
  description: "这份餐包含三道菜",
  descriptionEn: "A weekly combo with three dishes.",
  calories: 650,
  proteinGrams: 32,
  imageUrl: "https://example.com/image.jpg",
  imageKey: "weekly-combo-library-images/combo-1/image.jpg",
  updatedAt: "2026-05-03T00:00:00.000Z",
}

describe("weekly combo library adapters", () => {
  it("maps weekly combo content into a weekly menu option snapshot", () => {
    const mapped = mapWeeklyLibraryComboToWeeklyMenuOption(baseItem)

    expect(mapped.name).toBe("周餐素材")
    expect(mapped.nameEn).toBe("Weekly Combo")
    expect(mapped.tagsEn).toEqual(["High protein"])
    expect(mapped.allergensEn).toEqual(["soy"])
    expect(mapped.descriptionEn).toBe("A weekly combo with three dishes.")
    expect(mapped.proteinGrams).toBe(32)
    expect(mapped.active).toBe(true)
    expect(mapped.sourceComboLibraryId).toBe("weekly-combo-1")
  })

  it("prefills weekly library drafts from a weekly option", () => {
    const draft = mapWeeklyMenuOptionToWeeklyLibraryDraft({
      name: "红烧肉",
      nameEn: "Braised Pork",
      tags: ["人气"],
      tagsEn: ["Popular"],
      proteinGrams: 30,
      allergens: ["大豆"],
      allergensEn: ["soy"],
      description: "红烧肉套餐",
      descriptionEn: "Braised pork combo",
    })

    expect(draft.internalName).toBe("红烧肉")
    expect(draft.nameEn).toBe("Braised Pork")
    expect(draft.tags).toEqual(["人气"])
    expect(draft.tagsEn).toEqual(["Popular"])
    expect(draft.proteinGrams).toBe(30)
    expect(draft.allergensEn).toEqual(["soy"])
    expect(draft.descriptionEn).toBe("Braised pork combo")
  })
})
