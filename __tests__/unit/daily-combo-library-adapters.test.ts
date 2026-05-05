import {
  evaluateDailyInsertGuards,
  mapDailyLibraryComboToDailyMenuCombo,
  mapDailyMenuComboToDailyLibraryDraft,
} from "@/lib/combo-library/daily/adapters"
import type { DailyComboLibraryItem } from "@/lib/combo-library/daily/types"

const baseItem: DailyComboLibraryItem = {
  dailyComboLibraryId: "daily-combo-1",
  name: "鸡肉素材",
  internalName: "鸡肉素材",
  typeADishes: ["鸡肉", "花菜"],
  typeADishesEn: ["Chicken", "Cauliflower"],
  typeBDishes: ["鸡肉", "花菜", "米饭"],
  typeBDishesEn: ["Chicken", "Cauliflower", "Rice"],
  tags: ["高蛋白"],
  tagsEn: ["High protein"],
  allergensZh: ["大豆"],
  allergensEn: ["Soy"],
  proteinGrams: 32,
  descriptionZh: "清爽高蛋白组合。",
  descriptionEn: "A light high-protein combo.",
  calories: 650,
  imageUrl: "https://example.com/image.jpg",
  imageKey: "daily-combo-library-images/combo-1/image.jpg",
  updatedAt: "2026-05-03T00:00:00.000Z",
}

describe("daily combo library adapters", () => {
  it("maps daily dish lists one-to-one into typeA/typeB", () => {
    const mapped = mapDailyLibraryComboToDailyMenuCombo(baseItem)

    expect(mapped.typeA.dishes).toEqual(["鸡肉", "花菜"])
    expect(mapped.typeA.dishesEn).toEqual(["Chicken", "Cauliflower"])
    expect(mapped.typeB.dishes).toEqual(["鸡肉", "花菜", "米饭"])
    expect(mapped.tagsEn).toEqual(["High protein"])
    expect(mapped.allergensEn).toEqual(["Soy"])
    expect(mapped.proteinGrams).toBe(32)
    expect(mapped.descriptionEn).toBe("A light high-protein combo.")
    expect(mapped.name).toBe("套餐 1")
    expect(mapped.sourceComboLibraryId).toBe("daily-combo-1")
  })

  it("hydrates library drafts with saved dish translations from the daily admin map", () => {
    const draft = mapDailyMenuComboToDailyLibraryDraft(
      {
        name: "套餐 1",
        calories: 582,
        typeA: {
          dishes: ["双椒碎牛肉", "番茄花菜", "紫米饭"],
        },
        typeB: {
          dishes: ["双椒碎牛肉", "番茄花菜", "紫米饭", "家常番茄炒蛋"],
        },
      },
      {
        双椒碎牛肉: "Double-Pepper Minced Beef",
        番茄花菜: "Stir-Fry Tomato & Cauliflower",
        紫米饭: "Purple Rice",
        家常番茄炒蛋: "Tomato & Scrambled Eggs",
      }
    )

    expect(draft.typeADishesEn).toEqual([
      "Double-Pepper Minced Beef",
      "Stir-Fry Tomato & Cauliflower",
      "Purple Rice",
    ])
    expect(draft.typeBDishesEn).toEqual([
      "Double-Pepper Minced Beef",
      "Stir-Fry Tomato & Cauliflower",
      "Purple Rice",
      "Tomato & Scrambled Eggs",
    ])
  })

  it("does not shift translated dish names when a translation is missing", () => {
    const draft = mapDailyMenuComboToDailyLibraryDraft(
      {
        name: "套餐 1",
        calories: 582,
        typeB: {
          dishes: ["双椒碎牛肉", "番茄花菜", "紫米饭"],
        },
      },
      {
        双椒碎牛肉: "Double-Pepper Minced Beef",
        紫米饭: "Purple Rice",
      }
    )

    expect(draft.typeBDishesEn).toEqual(["Double-Pepper Minced Beef"])
  })

  it("evaluates daily insert guard states", () => {
    expect(evaluateDailyInsertGuards({ typeADishes: [], typeBDishes: [] }).level).toBe("block")
    expect(evaluateDailyInsertGuards({ typeADishes: [], typeBDishes: ["B"] }).level).toBe("confirm")
    expect(evaluateDailyInsertGuards({ typeADishes: ["A"], typeBDishes: [] }).level).toBe("warn")
    expect(evaluateDailyInsertGuards({ typeADishes: ["A"], typeBDishes: ["B"] }).level).toBe("ok")
  })
})
