import { HISTORICAL_LEARNING_ORDER_STATUSES } from "@/lib/agents/delivery/learning/historical-cases/historical-learning-statuses";

describe("lib/agents/delivery/learning/historical-cases/historical-learning-statuses", () => {
  it("equals confirmed and delivered", () => {
    expect([...HISTORICAL_LEARNING_ORDER_STATUSES]).toEqual(["confirmed", "delivered"]);
  });

  it("does not include pending", () => {
    expect(HISTORICAL_LEARNING_ORDER_STATUSES).not.toContain("pending");
  });
});
