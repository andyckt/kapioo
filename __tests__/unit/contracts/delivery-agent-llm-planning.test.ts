import {
  DELIVERY_AGENT_LLM_CACHE_KEY_VERSION,
  DELIVERY_AGENT_LLM_EVALUATION_REPORT_VERSION,
  DELIVERY_AGENT_LLM_MODEL_APPROVAL_DECISIONS,
  DELIVERY_AGENT_LLM_PLANNING_FINGERPRINT_VERSION,
  DELIVERY_AGENT_LLM_PLANNING_SCOPES,
  deliveryAgentLlmEvaluationReportSchema,
  deliveryAgentLlmModelApprovalDecisionSchema,
  deliveryAgentLlmCacheKeySchema,
  deliveryAgentLlmPlanningScopeSchema,
  deliveryAgentPlanningFingerprintInputSchema,
} from "@/lib/contracts/delivery-agent-llm-planning";

describe("lib/contracts/delivery-agent-llm-planning", () => {
  it("defines versioned fingerprint and cache contracts", () => {
    expect(DELIVERY_AGENT_LLM_PLANNING_FINGERPRINT_VERSION).toBe(
      "delivery-agent-llm-planning-fingerprint-v1"
    );
    expect(DELIVERY_AGENT_LLM_CACHE_KEY_VERSION).toBe("delivery-agent-llm-cache-key-v1");
  });

  it("defines the supported LLM planning scopes", () => {
    expect(DELIVERY_AGENT_LLM_PLANNING_SCOPES).toEqual([
      "daily_generation",
      "rejection_regeneration",
      "candidate_critique",
      "rescue_planning",
      "recommendation_explanation",
    ]);
    expect(deliveryAgentLlmPlanningScopeSchema.parse("rejection_regeneration")).toBe(
      "rejection_regeneration"
    );
    expect(() => deliveryAgentLlmPlanningScopeSchema.parse("open_chat")).toThrow();
  });

  it("requires exact order facts for a planning fingerprint input", () => {
    expect(() =>
      deliveryAgentPlanningFingerprintInputSchema.parse({
        scope: "daily_generation",
        deliveryDate: "2026-06-09",
        promptVersion: "prompt-v1",
        costPolicyVersion: "cost-v1",
        modelRoutingPolicyVersion: "routing-v1",
        profile: {
          profileId: "default",
          profileVersion: "profile-v1",
        },
        orders: [],
      })
    ).toThrow();

    expect(
      deliveryAgentPlanningFingerprintInputSchema.parse({
        scope: "daily_generation",
        deliveryDate: "2026-06-09",
        promptVersion: "prompt-v1",
        costPolicyVersion: "cost-v1",
        modelRoutingPolicyVersion: "routing-v1",
        profile: {
          profileId: "default",
          profileVersion: "profile-v1",
        },
        orders: [
          {
            orderId: "order-1",
            status: "confirmed",
            formattedAddress: "1 King St",
          },
        ],
      }).orders
    ).toHaveLength(1);
  });

  it("validates an LLM cache key shape", () => {
    expect(
      deliveryAgentLlmCacheKeySchema.parse({
        cacheKeyVersion: DELIVERY_AGENT_LLM_CACHE_KEY_VERSION,
        cacheKey: "delivery-agent:llm-plan:daily_generation:abc",
        planningFingerprint: "abc",
        callType: "daily_candidate_generation",
        modelProvider: "openai",
        modelId: "model-1",
        outputSchemaVersion: "candidate-json-v1",
      }).callType
    ).toBe("daily_candidate_generation");
  });

  it("defines model evaluation report and approval decisions", () => {
    expect(DELIVERY_AGENT_LLM_EVALUATION_REPORT_VERSION).toBe(
      "delivery-agent-llm-evaluation-report-v1"
    );
    expect(DELIVERY_AGENT_LLM_MODEL_APPROVAL_DECISIONS).toEqual(
      expect.arrayContaining([
        "not_approved",
        "approved_for_easy_days",
        "approved_as_strong_baseline",
      ])
    );
    expect(deliveryAgentLlmModelApprovalDecisionSchema.parse("not_approved")).toBe(
      "not_approved"
    );
    expect(
      deliveryAgentLlmEvaluationReportSchema.parse({
        reportVersion: DELIVERY_AGENT_LLM_EVALUATION_REPORT_VERSION,
        evaluatedAt: "2026-06-05T10:00:00.000Z",
        policyVersion: "policy-v1",
        modelRoutingPolicyVersion: "routing-v1",
        scenarioCount: 0,
        usableScenarioCount: 0,
        summaries: [],
        warnings: ["No usable historical scenarios were available for LLM model evaluation."],
      }).scenarioCount
    ).toBe(0);
  });
});
