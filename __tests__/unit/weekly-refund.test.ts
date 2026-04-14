import {
  describeWeeklyRefundTarget,
  resolveWeeklyRefundTarget,
  toWeeklyRefundBalanceMutation,
} from "@/lib/orders/weekly-refund"

describe("lib/orders/weekly-refund", () => {
  describe("resolveWeeklyRefundTarget", () => {
    it("returns none when no voucher was deducted", () => {
      expect(
        resolveWeeklyRefundTarget({
          voucherDeducted: false,
          mealPlanType: "6aweek",
          creditCost: 6,
        })
      ).toEqual({ kind: "none", amount: 0 })
    })

    it("returns legacy credit refunds when mealPlanType is legacy or missing", () => {
      expect(
        resolveWeeklyRefundTarget({
          voucherDeducted: true,
          mealPlanType: "legacy",
          creditCost: 8,
        })
      ).toEqual({ kind: "credits", amount: 8 })

      expect(
        resolveWeeklyRefundTarget({
          voucherDeducted: true,
          creditCost: 3,
        })
      ).toEqual({ kind: "credits", amount: 3 })
    })

    it("returns weekly-plan refunds for modern weekly plans", () => {
      expect(
        resolveWeeklyRefundTarget({
          voucherDeducted: true,
          mealPlanType: "6aweek",
          creditCost: 6,
        })
      ).toEqual({
        kind: "weekly-plan",
        amount: 1,
        planId: "weekly-6x1",
      })
    })

    it("falls back to credits for malformed modern meal plan types", () => {
      expect(
        resolveWeeklyRefundTarget({
          voucherDeducted: true,
          mealPlanType: "banana-aweek",
          creditCost: 5,
        })
      ).toEqual({
        kind: "credits",
        amount: 5,
      })
    })
  })

  describe("toWeeklyRefundBalanceMutation", () => {
    it("maps legacy credit refunds to balance mutations", () => {
      expect(
        toWeeklyRefundBalanceMutation({
          kind: "credits",
          amount: 3,
        })
      ).toEqual({
        field: "credits",
        amount: 3,
        operation: "add",
      })
    })

    it("maps modern weekly-plan refunds to canonical weekly balance fields", () => {
      expect(
        toWeeklyRefundBalanceMutation({
          kind: "weekly-plan",
          amount: 1,
          planId: "weekly-6x1",
        })
      ).toEqual({
        field: "weeklySIXmeals",
        amount: 1,
        operation: "add",
      })
    })

    it("returns null when there is nothing to restore or the legacy credit amount is zero", () => {
      expect(toWeeklyRefundBalanceMutation({ kind: "none", amount: 0 })).toBeNull()
      expect(
        toWeeklyRefundBalanceMutation({
          kind: "credits",
          amount: 0,
        })
      ).toBeNull()
    })

    it("throws for unsupported weekly plan ids", () => {
      expect(() =>
        toWeeklyRefundBalanceMutation({
          kind: "weekly-plan",
          amount: 1,
          planId: "weekly-999x1",
        })
      ).toThrow("Unsupported weekly refund planId: weekly-999x1")
    })
  })

  describe("describeWeeklyRefundTarget", () => {
    it("returns readable descriptions for each refund target kind", () => {
      expect(describeWeeklyRefundTarget({ kind: "none", amount: 0 })).toBe(
        "no entitlement was restored"
      )
      expect(describeWeeklyRefundTarget({ kind: "credits", amount: 4 })).toBe(
        "4 credits restored"
      )
      expect(
        describeWeeklyRefundTarget({
          kind: "weekly-plan",
          amount: 1,
          planId: "weekly-8x1",
        })
      ).toBe("1 weekly voucher restored (weekly-8x1)")
    })
  })
})
