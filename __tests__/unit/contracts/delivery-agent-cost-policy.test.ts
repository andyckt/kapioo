import {
  DELIVERY_AGENT_COST_POLICY_MODES,
  DELIVERY_AGENT_COST_POLICY_VERSION,
  DELIVERY_AGENT_LLM_CALL_TYPES,
  DELIVERY_AGENT_LLM_MODEL_TIERS,
  deliveryAgentCostPolicyModeSchema,
  deliveryAgentLlmCallTypeSchema,
  deliveryAgentLlmModelTierSchema,
} from "@/lib/contracts/delivery-agent-cost-policy";

describe("lib/contracts/delivery-agent-cost-policy", () => {
  it("uses the expected cost policy version", () => {
    expect(DELIVERY_AGENT_COST_POLICY_VERSION).toBe("delivery-agent-cost-policy-v1");
  });

  it("defines cost policy modes", () => {
    expect(DELIVERY_AGENT_COST_POLICY_MODES).toEqual([
      "normal",
      "dry_run",
      "llm_disabled",
    ]);
    expect(deliveryAgentCostPolicyModeSchema.parse("normal")).toBe("normal");
    expect(() => deliveryAgentCostPolicyModeSchema.parse("paid_live")).toThrow();
  });

  it("defines model tiers without provider-specific model IDs", () => {
    expect(DELIVERY_AGENT_LLM_MODEL_TIERS).toEqual([
      "none",
      "cheap",
      "strong",
      "rescue",
      "embedding",
    ]);
    expect(deliveryAgentLlmModelTierSchema.parse("strong")).toBe("strong");
  });

  it("includes the approve/reject loop LLM call types", () => {
    expect(DELIVERY_AGENT_LLM_CALL_TYPES).toEqual(
      expect.arrayContaining([
        "daily_candidate_generation",
        "rejection_feedback_interpretation",
        "rejection_candidate_regeneration",
        "rescue_support_planner",
        "schema_repair",
      ])
    );
    expect(deliveryAgentLlmCallTypeSchema.parse("rejection_feedback_interpretation")).toBe(
      "rejection_feedback_interpretation"
    );
    expect(() => deliveryAgentLlmCallTypeSchema.parse("freeform_chat")).toThrow();
  });
});
