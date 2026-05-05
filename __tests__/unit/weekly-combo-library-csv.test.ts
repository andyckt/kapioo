import { coerceWeeklyImportRow, splitArrayCell } from "@/lib/combo-library/weekly/csv"
import { WEEKLY_COMBO_LIBRARY_FIELDS } from "@/lib/combo-library/weekly/fields"
import { buildCsvTemplate, getCsvHeaders } from "@/lib/combo-library/shared/fields"
import { weeklyComboLibraryItemBodySchema } from "@/lib/contracts/weekly-combo-library"

describe("weekly combo library csv helpers", () => {
  it("builds the template from the shared weekly field definition", () => {
    const csv = buildCsvTemplate(WEEKLY_COMBO_LIBRARY_FIELDS)

    expect(csv).toContain(getCsvHeaders(WEEKLY_COMBO_LIBRARY_FIELDS).join(","))
    expect(csv).toContain("name,nameEn")
    expect(csv).not.toContain("typeADishes")
    expect(csv).not.toContain("typeBDishes")
    expect(csv).toContain("tagsEn (optional)")
    expect(csv).toContain("proteinGrams (optional)")
    expect(csv).toContain("allergensEn (optional)")
    expect(csv).toContain("descriptionEn (optional)")
  })

  it("splits array cells", () => {
    expect(splitArrayCell("鸡肉; 花菜; 米饭")).toEqual(["鸡肉", "花菜", "米饭"])
  })

  it("coerces a valid weekly row without A/B fields", () => {
    const row = coerceWeeklyImportRow(
      {
        internalName: "周餐A",
        name: "橄榄菜肉末豆角",
        nameEn: "Green Beans with Minced Pork",
        calories: "650",
        "proteinGrams (optional)": "32",
        "tags (optional)": "高蛋白;鸡肉",
        "tagsEn (optional)": "High protein;Chicken",
        "allergens (optional)": "大豆;芝麻",
        "allergensEn (optional)": "soy;sesame",
        "description (optional)": "这份餐包含三道菜",
        "descriptionEn (optional)": "A weekly combo with three dishes.",
      },
      2
    )

    expect(row.status).toBe("valid")
    expect(row.data?.name).toBe("橄榄菜肉末豆角")
    expect(row.data?.nameEn).toBe("Green Beans with Minced Pork")
    expect(row.data?.calories).toBe(650)
    expect(row.data?.proteinGrams).toBe(32)
    expect(row.data?.tagsEn).toEqual(["High protein", "Chicken"])
    expect(row.data?.allergensEn).toEqual(["soy", "sesame"])
    expect(row.data?.descriptionEn).toBe("A weekly combo with three dishes.")
  })

  it("repairs common UTF-8 mojibake from CSV editors", () => {
    const mojibake = (value: string) => Buffer.from(value, "utf8").toString("latin1")
    const row = coerceWeeklyImportRow(
      {
        internalName: mojibake("周餐素材A"),
        name: mojibake("橄榄菜肉末豆角"),
        nameEn: "Green Beans with Minced Pork",
        calories: "650",
        tags: mojibake("高蛋白"),
        "description (optional)": mojibake("这份餐包含三道菜"),
      },
      2
    )

    expect(row.status).toBe("valid")
    expect(row.data?.internalName).toBe("周餐素材A")
    expect(row.data?.name).toBe("橄榄菜肉末豆角")
    expect(row.data?.nameEn).toBe("Green Beans with Minced Pork")
    expect(row.data?.description).toBe("这份餐包含三道菜")
  })

  it("requires internalName but not a customer-facing name in the weekly contract", () => {
    const parsed = weeklyComboLibraryItemBodySchema.parse({ internalName: "周餐B" })

    expect(parsed.internalName).toBe("周餐B")
    expect(parsed.calories).toBeUndefined()
  })

  it("returns invalid rows when internalName is missing", () => {
    const row = coerceWeeklyImportRow({ tags: "A;B" }, 3)

    expect(row.status).toBe("invalid")
    expect(row.errors.length).toBeGreaterThan(0)
  })
})
