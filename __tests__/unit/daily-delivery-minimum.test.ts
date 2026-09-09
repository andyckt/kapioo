import {
  addDaysToDateKey,
  getDailyDeliveryMinimum,
  getDailyDeliveryMinimumStatus,
  isValidDateKey,
  normalizeDeliveryDateKey,
} from "@/lib/orders/daily-delivery-minimum"

const NOW = new Date("2026-09-10T16:00:00.000Z")
const OVERRIDE = {
  minimumMeals: 1,
  startsOn: "2026-09-14",
  endsOn: "2026-09-20",
} as const

describe("daily delivery minimum", () => {
  it("uses one meal only for delivery dates inside the exception", () => {
    expect(getDailyDeliveryMinimum(OVERRIDE, "Sep 14", NOW)).toBe(1)
    expect(getDailyDeliveryMinimum(OVERRIDE, "2026-09-20", NOW)).toBe(1)
    expect(getDailyDeliveryMinimum(OVERRIDE, "Sep 21", NOW)).toBe(2)
  })

  it("fails closed when the date or override is malformed", () => {
    expect(getDailyDeliveryMinimum(OVERRIDE, "Monday", NOW)).toBe(2)
    expect(getDailyDeliveryMinimum({ ...OVERRIDE, endsOn: "not-a-date" }, "Sep 14", NOW)).toBe(2)
    expect(isValidDateKey("2026-02-29")).toBe(false)
  })

  it("handles yearless menu dates across New Year", () => {
    const decemberNow = new Date("2026-12-20T17:00:00.000Z")
    expect(normalizeDeliveryDateKey("Jan 3", decemberNow)).toBe("2027-01-03")
  })

  it("uses inclusive seven-day defaults and clear statuses", () => {
    expect(addDaysToDateKey("2026-09-10", 6)).toBe("2026-09-16")
    expect(getDailyDeliveryMinimumStatus(OVERRIDE, "2026-09-10")).toBe("scheduled")
    expect(getDailyDeliveryMinimumStatus(OVERRIDE, "2026-09-14")).toBe("active")
    expect(getDailyDeliveryMinimumStatus(OVERRIDE, "2026-09-21")).toBe("expired")
    expect(getDailyDeliveryMinimum(OVERRIDE, "2026-09-14", new Date("2026-09-21T16:00:00Z"))).toBe(2)
  })
})
