import {
  calculatePromoBreakdown,
  normalizePhone,
  normalizePromoCode,
  roundMoney,
} from "@/lib/promo-code-shared"

describe("lib/promo-code-shared", () => {
  describe("normalizePromoCode", () => {
    it("trims and uppercases promo codes", () => {
      expect(normalizePromoCode("  spring-25 ")).toBe("SPRING-25")
    })

    it("returns an empty string for empty input", () => {
      expect(normalizePromoCode("")).toBe("")
    })
  })

  describe("normalizePhone", () => {
    it("strips all non-digit characters", () => {
      expect(normalizePhone("(416) 555-0199")).toBe("4165550199")
    })

    it("returns an empty string for missing input", () => {
      expect(normalizePhone()).toBe("")
    })
  })

  describe("roundMoney", () => {
    it("rounds to two decimal places", () => {
      expect(roundMoney(1.005)).toBe(1)
      expect(roundMoney(1.335)).toBe(1.33)
      expect(roundMoney(10.999)).toBe(11)
    })

    it("normalizes invalid values to zero", () => {
      expect(roundMoney(Number.NaN)).toBe(0)
    })
  })

  describe("calculatePromoBreakdown", () => {
    it("applies percentage discounts to meal subtotal only", () => {
      expect(
        calculatePromoBreakdown({
          mealSubtotal: 100,
          deliveryFeeTotal: 10,
          taxRate: 0.13,
          discountType: "percentage",
          discountValue: 20,
        })
      ).toEqual({
        currency: "CAD",
        originalSubtotal: 110,
        discountAmount: 20,
        discountedSubtotal: 90,
        taxRate: 0.13,
        taxAmount: 11.7,
        finalTotal: 101.7,
      })
    })

    it("caps fixed discounts at the meal subtotal", () => {
      expect(
        calculatePromoBreakdown({
          mealSubtotal: 20,
          deliveryFeeTotal: 5,
          taxRate: 0.13,
          discountType: "fixed",
          discountValue: 50,
        })
      ).toEqual({
        currency: "CAD",
        originalSubtotal: 25,
        discountAmount: 20,
        discountedSubtotal: 5,
        taxRate: 0.13,
        taxAmount: 0.65,
        finalTotal: 5.65,
      })
    })

    it("handles zero and negative inputs safely", () => {
      expect(
        calculatePromoBreakdown({
          mealSubtotal: -5,
          deliveryFeeTotal: -10,
          taxRate: 0.13,
          discountType: "fixed",
          discountValue: -2,
        })
      ).toEqual({
        currency: "CAD",
        originalSubtotal: 0,
        discountAmount: 0,
        discountedSubtotal: 0,
        taxRate: 0.13,
        taxAmount: 0,
        finalTotal: 0,
      })
    })
  })
})
