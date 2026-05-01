import {
  formatDeliveryDatesList,
  getStandardDeliveryWindow,
  uniqueDeliveryDatesFromOrderItems,
} from "@/lib/user-order-delivery-display"

describe("lib/user-order-delivery-display", () => {
  it("returns standardized windows", () => {
    expect(getStandardDeliveryWindow("daily", "en")).toBe("11am – 1pm")
    expect(getStandardDeliveryWindow("daily", "zh")).toBe("11:00–13:00")
    expect(getStandardDeliveryWindow("weekly", "en")).toBe("6pm – 10pm")
    expect(getStandardDeliveryWindow("weekly", "zh")).toBe("18:00–22:00")
  })

  it("collects unique dates in first-seen order", () => {
    expect(
      uniqueDeliveryDatesFromOrderItems([
        { date: "May 2" },
        { date: "May 1" },
        { date: "May 2" },
        { date: "May 1" },
      ])
    ).toEqual(["May 2", "May 1"])
  })

  it("formats list with locale separator", () => {
    expect(formatDeliveryDatesList(["A", "B"], "zh")).toBe("A、B")
    expect(formatDeliveryDatesList(["A", "B"], "en")).toBe("A, B")
    expect(formatDeliveryDatesList([], "en")).toBe("—")
  })
})
