import { coerceDailyImportRow, splitArrayCell } from "@/lib/combo-library/daily/csv"

describe("daily combo library csv helpers", () => {
  it("splits semicolon-delimited array cells before comma fallback", () => {
    expect(splitArrayCell("双椒牛肉; 番茄花菜; 紫米饭")).toEqual([
      "双椒牛肉",
      "番茄花菜",
      "紫米饭",
    ])
    expect(splitArrayCell("高蛋白,牛肉")).toEqual(["高蛋白", "牛肉"])
  })

  it("coerces a valid daily row with A/B dishes and calories", () => {
    const row = coerceDailyImportRow(
      {
        name: "套餐A",
        typeADishes: "鸡肉;花菜",
        typeBDishes: "鸡肉;花菜;米饭",
        calories: "650",
        tags: "高蛋白;鸡肉",
        allergens: "soy;sesame",
      },
      2
    )

    expect(row.status).toBe("valid")
    expect(row.data?.typeADishes).toEqual(["鸡肉", "花菜"])
    expect(row.data?.typeBDishes).toEqual(["鸡肉", "花菜", "米饭"])
    expect(row.data?.calories).toBe(650)
  })

  it("falls back from legacy dishes column with a warning", () => {
    const row = coerceDailyImportRow({ name: "Legacy", dishes: "A;B;C", calories: "600" }, 3)

    expect(row.status).toBe("valid")
    expect(row.data?.typeADishes).toEqual(["A", "B", "C"])
    expect(row.data?.typeBDishes).toEqual(["A", "B", "C"])
    expect(row.warnings.join(" ")).toContain("Auto-filled")
  })

  it("returns invalid rows when required daily fields are missing", () => {
    const row = coerceDailyImportRow({ name: "Missing dishes" }, 4)

    expect(row.status).toBe("invalid")
    expect(row.errors.length).toBeGreaterThan(0)
  })
})
