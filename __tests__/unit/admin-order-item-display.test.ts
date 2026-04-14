import {
  getAdminOrderItemDisplay,
  getDailyComboTypeLabel,
} from "@/lib/orders/admin-order-item-display"

describe("lib/orders/admin-order-item-display", () => {
  it("builds full daily item details from combo, type, schedule, quantity, and dishes", () => {
    expect(
      getAdminOrderItemDisplay({
        comboName: "套餐 1",
        type: "A",
        date: "Apr 14",
        day: "tuesday-1",
        quantity: 2,
        dishes: ["Braised Pork", { name: "Seasonal Greens" }],
      })
    ).toEqual({
      title: "套餐 1",
      typeLabel: "2 dishes",
      scheduleLabel: "Apr 14 (Tuesday)",
      quantity: 2,
      dishes: ["Braised Pork", "Seasonal Greens"],
    })
  })

  it("uses weekly optionName and day/date fields for weekly order items", () => {
    expect(
      getAdminOrderItemDisplay({
        optionName: "Black Pepper Beef",
        dayId: "sunday",
        date: "Apr 16",
        quantity: 3,
      })
    ).toEqual({
      title: "Black Pepper Beef",
      typeLabel: undefined,
      scheduleLabel: "Apr 16 (Sunday)",
      quantity: 3,
      dishes: [],
    })
  })

  it("falls back to dish names when legacy items are missing explicit titles", () => {
    expect(
      getAdminOrderItemDisplay({
        quantity: 1,
        dishes: [{ name: "Maple Soy Salmon" }],
      })
    ).toEqual({
      title: "Maple Soy Salmon",
      typeLabel: undefined,
      scheduleLabel: undefined,
      quantity: 1,
      dishes: ["Maple Soy Salmon"],
    })
  })

  it("maps known daily combo types to stable labels", () => {
    expect(getDailyComboTypeLabel("A")).toBe("2 dishes")
    expect(getDailyComboTypeLabel("B")).toBe("3 dishes")
    expect(getDailyComboTypeLabel("custom")).toBe("custom")
  })
})
