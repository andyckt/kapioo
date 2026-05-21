import {
  formatPromoDiscountLabel,
  formatPromoDiscountNote,
} from "@/lib/promo-codes/format-discount-label";

describe("lib/promo-codes/format-discount-label", () => {
  describe("formatPromoDiscountLabel", () => {
    it("formats fixed CAD discounts in English", () => {
      expect(formatPromoDiscountLabel("fixed", 10, "en")).toBe("$10 off");
    });

    it("formats fixed CAD discounts in Chinese", () => {
      expect(formatPromoDiscountLabel("fixed", 10, "zh")).toBe("立减 $10");
    });

    it("formats percentage discounts in English", () => {
      expect(formatPromoDiscountLabel("percentage", 15, "en")).toBe("15% off");
    });

    it("formats percentage discounts in Chinese", () => {
      expect(formatPromoDiscountLabel("percentage", 15, "zh")).toBe("立减 15%");
    });
  });

  describe("formatPromoDiscountNote", () => {
    it("appends one-time-use copy in English", () => {
      expect(formatPromoDiscountNote("fixed", 10, "en")).toBe("$10 off · one-time use");
    });

    it("appends one-time-use copy in Chinese", () => {
      expect(formatPromoDiscountNote("fixed", 10, "zh")).toBe("立减 $10 · 仅限使用一次");
    });
  });
});
