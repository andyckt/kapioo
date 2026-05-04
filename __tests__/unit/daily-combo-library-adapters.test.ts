import {
  evaluateDailyInsertGuards,
  mapDailyLibraryComboToDailyMenuCombo,
} from "@/lib/combo-library/daily/adapters"
import type { DailyComboLibraryItem } from "@/lib/combo-library/daily/types"

const baseItem: DailyComboLibraryItem = {
  dailyComboLibraryId: "daily-combo-1",
  name: "套餐 1",
  typeADishes: ["鸡肉", "花菜"],
  typeBDishes: ["鸡肉", "花菜", "米饭"],
  vegetables: [],
  tags: ["高蛋白"],
  allergens: ["soy"],
  dietaryTags: [],
  status: "active",
  calories: 650,
  imageUrl: "https://example.com/image.jpg",
  imageKey: "daily-combo-library-images/combo-1/image.jpg",
  updatedAt: "2026-05-03T00:00:00.000Z",
}

describe("daily combo library adapters", () => {
  it("maps daily dish lists one-to-one into typeA/typeB", () => {
    const mapped = mapDailyLibraryComboToDailyMenuCombo(baseItem)

    expect(mapped.typeA.dishes).toEqual(["鸡肉", "花菜"])
    expect(mapped.typeB.dishes).toEqual(["鸡肉", "花菜", "米饭"])
    expect(mapped.sourceComboLibraryId).toBe("daily-combo-1")
  })

  it("evaluates daily insert guard states", () => {
    expect(evaluateDailyInsertGuards({ typeADishes: [], typeBDishes: [] }).level).toBe("block")
    expect(evaluateDailyInsertGuards({ typeADishes: [], typeBDishes: ["B"] }).level).toBe("confirm")
    expect(evaluateDailyInsertGuards({ typeADishes: ["A"], typeBDishes: [] }).level).toBe("warn")
    expect(evaluateDailyInsertGuards({ typeADishes: ["A"], typeBDishes: ["B"] }).level).toBe("ok")
  })
})
