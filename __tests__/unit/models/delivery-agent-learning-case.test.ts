import {
  DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION,
} from "@/lib/contracts/delivery-agent-learning";
import DeliveryAgentLearningCase from "@/models/DeliveryAgentLearningCase";

describe("models/DeliveryAgentLearningCase", () => {
  it("defaults schemaVersion to learning-case-v1", () => {
    expect(DeliveryAgentLearningCase.schema.path("schemaVersion")?.defaultValue).toBe(
      DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION
    );
  });

  it("defaults reviewStatus to none", () => {
    expect(DeliveryAgentLearningCase.schema.path("reviewStatus")?.defaultValue).toBe("none");
  });

  it("declares required indexes", () => {
    const indexes = DeliveryAgentLearningCase.schema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ caseKey: 1 }, { unique: true, background: true }],
        [{ deliveryDate: 1, profileId: 1 }, { unique: true, background: true }],
        [{ "quality.learningLabel": 1, deliveryDate: -1 }, { background: true }],
        [{ "quality.dataQualityScore": -1 }, { background: true }],
        [{ reviewStatus: 1, deliveryDate: -1 }, { background: true }],
        [{ deliveryAgentRunId: 1 }, { sparse: true, background: true }],
      ])
    );
  });

  it("does not export runtime RO client functions", async () => {
    const modelModule = await import("@/models/DeliveryAgentLearningCase");

    expect(modelModule.default).toBeDefined();
    expect(Object.keys(modelModule)).not.toContain("fetchRouteOptimizerRunsByDate");
  });
});
