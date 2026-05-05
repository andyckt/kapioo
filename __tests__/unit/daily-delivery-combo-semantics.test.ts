import { applyDailyMenuPreviewCuration, dishesBeyondTwoDishSet } from "@/lib/daily-delivery"

describe("dishesBeyondTwoDishSet", () => {
  it("returns only dishes in 3-dish option that are absent from the 2-dish set", () => {
    const two = ["A", "B"]
    const three = ["A", "B", "C"]
    expect(dishesBeyondTwoDishSet(two, three)).toEqual(["C"])
  })

  it("drops every dish that appears in the 2-dish set, including duplicates", () => {
    expect(dishesBeyondTwoDishSet(["A"], ["A", "A", "B"])).toEqual(["B"])
  })
})

describe("applyDailyMenuPreviewCuration", () => {
  const rows = [
    { id: "combo-1", combo: {} },
    { id: "combo-2", combo: { featuredInMenuPreview: true } },
    { id: "combo-3", combo: {} },
  ]

  it("keeps legacy carousel behavior when no combo is featured", () => {
    expect(
      applyDailyMenuPreviewCuration([
        { id: "combo-1", combo: {} },
        { id: "combo-2", combo: {} },
      ]).map((row) => row.id)
    ).toEqual(["combo-1", "combo-2"])
  })

  it("shows only featured combos once admin curates the daily carousel", () => {
    expect(applyDailyMenuPreviewCuration(rows).map((row) => row.id)).toEqual(["combo-2"])
  })
})
