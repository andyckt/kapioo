import {
  countUpcomingOrders,
  orderHasUpcomingDelivery,
  parseOrderItemDeliveryDate,
} from "@/lib/orders/upcoming-order-count"

describe("upcoming order count", () => {
  const now = new Date("2026-05-02T16:00:00.000Z")

  it("does not count active orders when every delivery item is in the past", () => {
    expect(
      orderHasUpcomingDelivery(
        {
          status: "confirmed",
          createdAt: "2026-04-01T12:00:00.000Z",
          items: [{ date: "April 14" }],
        },
        now
      )
    ).toBe(false)
  })

  it("counts only active orders with at least one current or future delivery item", () => {
    const orders = [
      {
        status: "pending",
        createdAt: "2026-05-01T12:00:00.000Z",
        items: [{ date: "May 1" }],
      },
      {
        status: "confirmed",
        createdAt: "2026-05-01T12:00:00.000Z",
        items: [{ date: "May 2" }],
      },
      {
        status: "delivery",
        createdAt: "2026-05-01T12:00:00.000Z",
        items: [{ date: "May 3" }],
      },
      {
        status: "cancelled",
        createdAt: "2026-05-01T12:00:00.000Z",
        items: [{ date: "May 3" }],
      },
      {
        status: "delivered",
        createdAt: "2026-05-01T12:00:00.000Z",
        items: [{ date: "May 3" }],
      },
    ]

    expect(countUpcomingOrders(orders, now)).toBe(2)
  })

  it("infers the next year for no-year dates created across the year boundary", () => {
    const parsed = parseOrderItemDeliveryDate(
      "Jan 5",
      "2025-12-20T12:00:00.000Z",
      new Date("2025-12-20T16:00:00.000Z")
    )

    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(0)
    expect(parsed?.getDate()).toBe(5)
  })
})
