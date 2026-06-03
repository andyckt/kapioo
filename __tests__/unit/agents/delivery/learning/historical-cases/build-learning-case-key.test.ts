import { buildDeliveryAgentLearningCaseKey } from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-key";

describe("buildDeliveryAgentLearningCaseKey", () => {
  it("builds the expected key format", () => {
    expect(
      buildDeliveryAgentLearningCaseKey({
        deliveryDate: "2026-05-31",
        profileId: "daily-default",
      })
    ).toBe("delivery-agent-learning-case:2026-05-31:daily-default");
  });

  it("trims deliveryDate and profileId", () => {
    expect(
      buildDeliveryAgentLearningCaseKey({
        deliveryDate: " 2026-05-31 ",
        profileId: " daily-default ",
      })
    ).toBe("delivery-agent-learning-case:2026-05-31:daily-default");
  });

  it("throws when deliveryDate is empty", () => {
    expect(() =>
      buildDeliveryAgentLearningCaseKey({
        deliveryDate: "   ",
        profileId: "daily-default",
      })
    ).toThrow("deliveryDate is required for learning case key");
  });

  it("throws when profileId is empty", () => {
    expect(() =>
      buildDeliveryAgentLearningCaseKey({
        deliveryDate: "2026-05-31",
        profileId: "",
      })
    ).toThrow("profileId is required for learning case key");
  });
});
