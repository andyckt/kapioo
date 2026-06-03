import {
  createEmptyDeliveryAgentLearningCaseContract,
  DELIVERY_AGENT_HISTORICAL_RUN_ROLES,
  DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION,
  DELIVERY_AGENT_LEARNING_COORDINATE_SOURCES,
  DELIVERY_AGENT_LEARNING_LABELS,
  DELIVERY_AGENT_LEARNING_LATENESS_ATTRIBUTIONS,
  DELIVERY_AGENT_PROFILE_COMPATIBILITY_VALUES,
  deliveryAgentLearningLabelSchema,
  ROUTE_OPTIMIZER_HISTORICAL_ETA_BASIS_VALUES,
} from "@/lib/contracts/delivery-agent-learning";

describe("lib/contracts/delivery-agent-learning", () => {
  it("uses the expected schema version", () => {
    expect(DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION).toBe("learning-case-v1");
  });

  it("includes all learning labels", () => {
    expect(DELIVERY_AGENT_LEARNING_LABELS).toEqual(
      expect.arrayContaining([
        "positive",
        "weak_positive",
        "negative",
        "avoid_pattern",
        "uncertain",
        "excluded",
      ])
    );
  });

  it("includes coordinate source values", () => {
    expect(DELIVERY_AGENT_LEARNING_COORDINATE_SOURCES).toEqual(
      expect.arrayContaining([
        "route_optimizer_historical",
        "order_data",
        "delivery_agent_cache",
        "route_optimizer_geocode",
        "address_only",
        "unavailable",
      ])
    );
  });

  it("includes run role values", () => {
    expect(DELIVERY_AGENT_HISTORICAL_RUN_ROLES).toEqual(
      expect.arrayContaining([
        "kitchen_start_provider",
        "handoff_start_receiver",
        "independent_driver",
        "support_rescue",
        "unknown",
      ])
    );
  });

  it("includes profile compatibility values", () => {
    expect(DELIVERY_AGENT_PROFILE_COMPATIBILITY_VALUES).toEqual(
      expect.arrayContaining([
        "same_profile",
        "transferable_profile",
        "different_profile",
        "unknown",
      ])
    );
  });

  it("re-exports RO eta basis values without duplication", () => {
    expect(ROUTE_OPTIMIZER_HISTORICAL_ETA_BASIS_VALUES).toEqual([
      "post_start",
      "planned",
      "unknown",
    ]);
  });

  it("validates learning labels with zod schema", () => {
    expect(deliveryAgentLearningLabelSchema.parse("positive")).toBe("positive");
    expect(() => deliveryAgentLearningLabelSchema.parse("invalid")).toThrow();
  });

  it("includes lateness attribution values", () => {
    expect(DELIVERY_AGENT_LEARNING_LATENESS_ATTRIBUTIONS).toEqual(
      expect.arrayContaining([
        "on_time",
        "route_problem",
        "driver_start_delay",
        "handoff_delay",
        "mixed",
        "unknown",
      ])
    );
  });

  it("creates an empty learning case contract with defaults", () => {
    const learningCase = createEmptyDeliveryAgentLearningCaseContract({
      deliveryDate: "2026-05-31",
      profileId: "daily-default",
    });

    expect(learningCase.schemaVersion).toBe("learning-case-v1");
    expect(learningCase.caseKey).toBe("delivery-agent-learning-case:2026-05-31:daily-default");
    expect(learningCase.reviewStatus).toBe("none");
    expect(learningCase.quality.learningLabel).toBe("uncertain");
    expect(learningCase.adminOrdersSnapshot).toEqual([]);
    expect(learningCase.geoFeatures.dynamicOutliers).toEqual([]);
    expect(learningCase.resourceProfileFeatures.profileId).toBe("daily-default");
  });
});
