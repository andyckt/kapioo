import {
  describeWeeklyRefundTarget,
  resolveWeeklyRefundTarget,
  restoreWeeklyOrderEntitlement,
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

  describe("restoreWeeklyOrderEntitlement", () => {
    it("adds credits back for legacy refunds", () => {
      const user = { credits: 4 }

      const refundTarget = restoreWeeklyOrderEntitlement(user, {
        voucherDeducted: true,
        mealPlanType: "legacy",
        creditCost: 3,
      })

      expect(refundTarget).toEqual({ kind: "credits", amount: 3 })
      expect(user.credits).toBe(7)
    })

    it("restores weekly plan balances and legacy fields for modern plans", () => {
      const user = {
        weeklySIXmeals: 0,
      }

      const refundTarget = restoreWeeklyOrderEntitlement(user, {
        voucherDeducted: true,
        mealPlanType: "6aweek",
        creditCost: 6,
      })

      expect(refundTarget).toEqual({
        kind: "weekly-plan",
        amount: 1,
        planId: "weekly-6x1",
      })
      expect(user).toMatchObject({
        weeklySIXmeals: 1,
        planBalances: {
          "weekly-6x1": 1,
        },
      })
    })

    it("does nothing when there is nothing to restore", () => {
      const user = { credits: 10, weeklyEIGHTmeals: 2 }

      const refundTarget = restoreWeeklyOrderEntitlement(user, {
        voucherDeducted: false,
        mealPlanType: "8aweek",
        creditCost: 8,
      })

      expect(refundTarget).toEqual({ kind: "none", amount: 0 })
      expect(user).toEqual({ credits: 10, weeklyEIGHTmeals: 2 })
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
