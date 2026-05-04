import { coerceWeeklyImportRow, splitArrayCell } from "@/lib/combo-library/weekly/csv"
import { weeklyComboLibraryItemBodySchema } from "@/lib/contracts/weekly-combo-library"

describe("weekly combo library csv helpers", () => {
  it("splits array cells", () => {
    expect(splitArrayCell("鸡肉; 花菜; 米饭")).toEqual(["鸡肉", "花菜", "米饭"])
  })

  it("coerces a valid weekly row without A/B fields", () => {
    const row = coerceWeeklyImportRow(
      {
        name: "周餐A",
        dishes: "鸡肉;花菜;米饭",
        calories: "650",
        tags: "高蛋白;鸡肉",
        allergens: "soy;sesame",
      },
      2
    )

    expect(row.status).toBe("valid")
    expect(row.data?.dishes).toEqual(["鸡肉", "花菜", "米饭"])
    expect(row.data?.calories).toBe(650)
  })

  it("only requires name in the weekly contract", () => {
    const parsed = weeklyComboLibraryItemBodySchema.parse({ name: "周餐B" })

    expect(parsed.name).toBe("周餐B")
    expect(parsed.dishes).toEqual([])
    expect(parsed.calories).toBeUndefined()
  })

  it("returns invalid rows when name is missing", () => {
    const row = coerceWeeklyImportRow({ dishes: "A;B" }, 3)

    expect(row.status).toBe("invalid")
    expect(row.errors.length).toBeGreaterThan(0)
  })
})
