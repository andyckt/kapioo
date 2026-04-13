import {
  getAllowedWeeklyStatusTransitions,
  isWeeklyOperatorOrderStatus,
  isWeeklyOrderStatus,
  resolveWeeklyStatusTransition,
} from "@/lib/orders/weekly-status"

describe("lib/orders/weekly-status", () => {
  describe("type guards", () => {
    it("recognizes valid weekly order statuses", () => {
      expect(isWeeklyOrderStatus("pending")).toBe(true)
      expect(isWeeklyOrderStatus("refunded")).toBe(true)
      expect(isWeeklyOrderStatus("not-a-status")).toBe(false)
      expect(isWeeklyOrderStatus(123)).toBe(false)
    })

    it("recognizes valid operator statuses and excludes refunded", () => {
      expect(isWeeklyOperatorOrderStatus("delivery")).toBe(true)
      expect(isWeeklyOperatorOrderStatus("refunded")).toBe(false)
      expect(isWeeklyOperatorOrderStatus(null)).toBe(false)
    })
  })

  describe("getAllowedWeeklyStatusTransitions", () => {
    it("returns the expected next statuses for every known state", () => {
      expect(getAllowedWeeklyStatusTransitions("pending")).toEqual(["confirmed", "cancelled"])
      expect(getAllowedWeeklyStatusTransitions("confirmed")).toEqual([
        "pending",
        "delivery",
        "delivered",
        "cancelled",
      ])
      expect(getAllowedWeeklyStatusTransitions("delivery")).toEqual([
        "confirmed",
        "delivered",
        "cancelled",
      ])
      expect(getAllowedWeeklyStatusTransitions("delivered")).toEqual(["delivery"])
      expect(getAllowedWeeklyStatusTransitions("cancelled")).toEqual(["pending"])
      expect(getAllowedWeeklyStatusTransitions("refunded")).toEqual([])
    })

    it("normalizes unknown current statuses to pending", () => {
      expect(getAllowedWeeklyStatusTransitions("weird-status")).toEqual([
        "confirmed",
        "cancelled",
      ])
    })
  })

  describe("resolveWeeklyStatusTransition", () => {
    const now = new Date("2026-04-12T18:00:00.000Z")

    it.each([
      {
        currentStatus: "pending",
        nextStatus: "confirmed",
        expectedPatch: {
          status: "confirmed",
          confirmedAt: now,
          deliveredAt: null,
          refundedAt: null,
        },
      },
      {
        currentStatus: "confirmed",
        nextStatus: "pending",
        expectedPatch: {
          status: "pending",
          confirmedAt: null,
          deliveredAt: null,
          refundedAt: null,
        },
      },
      {
        currentStatus: "confirmed",
        nextStatus: "delivery",
        expectedPatch: {
          status: "delivery",
          confirmedAt: now,
          deliveredAt: null,
          refundedAt: null,
        },
      },
      {
        currentStatus: "delivery",
        nextStatus: "delivered",
        expectedPatch: {
          status: "delivered",
          confirmedAt: now,
          deliveredAt: now,
          refundedAt: null,
        },
      },
      {
        currentStatus: "pending",
        nextStatus: "cancelled",
        expectedPatch: {
          status: "cancelled",
          deliveredAt: null,
          refundedAt: null,
        },
      },
      {
        currentStatus: "delivered",
        nextStatus: "delivery",
        expectedPatch: {
          status: "delivery",
          confirmedAt: now,
          deliveredAt: null,
          refundedAt: null,
        },
      },
      {
        currentStatus: "cancelled",
        nextStatus: "pending",
        expectedPatch: {
          status: "pending",
          confirmedAt: null,
          deliveredAt: null,
          refundedAt: null,
        },
      },
    ])("allows $currentStatus -> $nextStatus", ({ currentStatus, nextStatus, expectedPatch }) => {
      const result = resolveWeeklyStatusTransition({ status: currentStatus }, nextStatus, now)

      expect(result.ok).toBe(true)
      expect(result.noOp).toBe(false)
      expect(result.currentStatus).toBe(currentStatus)
      expect(result.nextStatus).toBe(nextStatus)
      expect(result.patch).toEqual(expectedPatch)
    })

    it("returns a no-op result for the same status", () => {
      const result = resolveWeeklyStatusTransition({ status: "confirmed" }, "confirmed", now)

      expect(result).toMatchObject({
        ok: true,
        noOp: true,
        currentStatus: "confirmed",
        nextStatus: "confirmed",
        patch: {
          status: "confirmed",
        },
      })
    })

    it("preserves an existing confirmedAt timestamp when moving forward", () => {
      const confirmedAt = new Date("2026-04-10T12:00:00.000Z")

      const result = resolveWeeklyStatusTransition(
        {
          status: "confirmed",
          confirmedAt,
        },
        "delivery",
        now
      )

      expect(result.ok).toBe(true)
      expect(result.patch?.confirmedAt).toEqual(confirmedAt)
      expect(result.patch?.deliveredAt).toBeNull()
    })

    it("rejects invalid transitions with allowed-next metadata", () => {
      const result = resolveWeeklyStatusTransition({ status: "pending" }, "delivered", now)

      expect(result).toMatchObject({
        ok: false,
        noOp: false,
        currentStatus: "pending",
        nextStatus: "delivered",
        allowedNextStatuses: ["confirmed", "cancelled"],
        error: "Cannot move weekly order from pending to delivered",
      })
    })

    it("rejects refunded as an operator flow status", () => {
      const result = resolveWeeklyStatusTransition({ status: "pending" }, "refunded", now)

      expect(result).toMatchObject({
        ok: false,
        noOp: false,
        currentStatus: "pending",
        nextStatus: "pending",
        allowedNextStatuses: ["confirmed", "cancelled"],
        error: "Refunded is not available in the weekly child-order status flow",
      })
    })

    it("normalizes an unknown current status to pending before evaluating", () => {
      const result = resolveWeeklyStatusTransition({ status: "mystery" }, "confirmed", now)

      expect(result).toMatchObject({
        ok: true,
        currentStatus: "pending",
        nextStatus: "confirmed",
      })
    })
  })
})
