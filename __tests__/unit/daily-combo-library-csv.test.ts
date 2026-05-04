import { coerceDailyImportRow, splitArrayCell } from "@/lib/combo-library/daily/csv"
import { DAILY_COMBO_LIBRARY_FIELDS } from "@/lib/combo-library/daily/fields"
import { buildCsvTemplate, getCsvHeaders } from "@/lib/combo-library/shared/fields"

describe("daily combo library csv helpers", () => {
  it("builds the template from the shared daily field definition", () => {
    const csv = buildCsvTemplate(DAILY_COMBO_LIBRARY_FIELDS)

    expect(csv).toContain(getCsvHeaders(DAILY_COMBO_LIBRARY_FIELDS).join(","))
    expect(csv).toContain("typeADishes")
    expect(csv).toContain("typeBDishes")
  })

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
        internalName: "套餐A",
        typeADishes: "鸡肉;花菜",
        typeBDishes: "鸡肉;花菜;米饭",
        calories: "650",
        tags: "高蛋白;鸡肉",
      },
      2
    )

    expect(row.status).toBe("valid")
    expect(row.data?.typeADishes).toEqual(["鸡肉", "花菜"])
    expect(row.data?.typeBDishes).toEqual(["鸡肉", "花菜", "米饭"])
    expect(row.data?.calories).toBe(650)
    expect(row.data?.name).toBe("套餐A")
  })

  it("repairs common UTF-8 mojibake from CSV editors", () => {
    const mojibake = (value: string) => Buffer.from(value, "utf8").toString("latin1")
    const row = coerceDailyImportRow(
      {
        internalName: mojibake("鸡肉套餐素材"),
        typeADishes: mojibake("鸡肉;花菜"),
        typeBDishes: mojibake("鸡肉;花菜;米饭"),
        calories: "650",
        tags: mojibake("高蛋白;鸡肉"),
      },
      2
    )

    expect(row.status).toBe("valid")
    expect(row.data?.internalName).toBe("鸡肉套餐素材")
    expect(row.data?.typeADishes).toEqual(["鸡肉", "花菜"])
    expect(row.data?.tags).toEqual(["高蛋白", "鸡肉"])
  })

  it("falls back from legacy dishes column with a warning", () => {
    const row = coerceDailyImportRow({ internalName: "Legacy", dishes: "A;B;C", calories: "600" }, 3)

    expect(row.status).toBe("valid")
    expect(row.data?.typeADishes).toEqual(["A", "B", "C"])
    expect(row.data?.typeBDishes).toEqual(["A", "B", "C"])
    expect(row.warnings.join(" ")).toContain("Auto-filled")
  })

  it("returns invalid rows when required daily fields are missing", () => {
    const row = coerceDailyImportRow({ internalName: "Missing dishes" }, 4)

    expect(row.status).toBe("invalid")
    expect(row.errors.length).toBeGreaterThan(0)
  })
})
