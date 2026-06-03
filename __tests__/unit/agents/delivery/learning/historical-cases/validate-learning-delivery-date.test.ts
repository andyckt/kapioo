import { validateLearningDeliveryDate } from "@/lib/agents/delivery/learning/historical-cases/validate-learning-delivery-date";
import { OrderDataError } from "@/lib/order-data/errors";

describe("validateLearningDeliveryDate", () => {
  it("accepts valid YYYY-MM-DD", () => {
    expect(validateLearningDeliveryDate("2026-05-31")).toBe("2026-05-31");
  });

  it("trims whitespace", () => {
    expect(validateLearningDeliveryDate(" 2026-05-31 ")).toBe("2026-05-31");
  });

  it("rejects empty date", () => {
    expect(() => validateLearningDeliveryDate("")).toThrow(OrderDataError);
  });

  it("rejects invalid date format", () => {
    expect(() => validateLearningDeliveryDate("05-31-2026")).toThrow(OrderDataError);
  });
});
