import {
  formatDeliveryDatesList,
  formatOrderHistoryDeliveryDate,
  formatOrderHistoryDeliveryDateWithWeekday,
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

  it("formats a single delivery date for order history by locale", () => {
    expect(formatOrderHistoryDeliveryDate("2026-05-05", "zh")).toBe("2026年5月5日")
    expect(formatOrderHistoryDeliveryDate("2026-05-05", "en")).toBe("May 5, 2026")
    expect(formatOrderHistoryDeliveryDate("May 5, 2026", "zh")).toBe("2026年5月5日")
    expect(formatOrderHistoryDeliveryDate("May 5, 2026", "en")).toBe("May 5, 2026")
  })

  it("appends weekday for delivery meta display", () => {
    expect(formatOrderHistoryDeliveryDateWithWeekday("2026-05-05", "zh")).toBe("2026年5月5日（周二）")
    expect(formatOrderHistoryDeliveryDateWithWeekday("2026-05-05", "en")).toBe("May 5, 2026 (Tuesday)")
  })

  it("formats list with locale separator, weekdays, and formatted dates", () => {
    expect(formatDeliveryDatesList(["2026-05-01", "2026-05-02"], "zh")).toBe(
      "2026年5月1日（周五）、2026年5月2日（周六）"
    )
    expect(formatDeliveryDatesList(["2026-05-01", "2026-05-02"], "en")).toBe(
      "May 1, 2026 (Friday), May 2, 2026 (Saturday)"
    )
    expect(formatDeliveryDatesList([], "en")).toBe("—")
  })
})
