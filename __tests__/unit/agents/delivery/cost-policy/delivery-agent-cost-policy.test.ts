import {
  createDefaultDeliveryAgentCostPolicy,
  DEFAULT_DELIVERY_AGENT_COST_TARGETS,
  getDeliveryAgentLlmCallPolicy,
  resolveDeliveryAgentModelForCall,
  validateDeliveryAgentCostPolicy,
} from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import {
  DELIVERY_AGENT_LLM_CALL_TYPES,
  deliveryAgentCostPolicySchema,
} from "@/lib/contracts/delivery-agent-cost-policy";
import type {
  DeliveryAgentCostPolicy,
  DeliveryAgentLlmCallType,
} from "@/lib/contracts/delivery-agent-cost-policy";

describe("delivery-agent-cost-policy", () => {
  it("uses Donald's current cost targets by default", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();

    expect(policy.costTargets).toEqual(DEFAULT_DELIVERY_AGENT_COST_TARGETS);
    expect(policy.costTargets.normalDailyTargetCents).toBe(50);
    expect(policy.costTargets.rescueDailyTargetCents).toBe(100);
    expect(policy.costTargets.monthlyWarningCents).toBe(2000);
  });

  it("creates one call policy for every declared LLM call type", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();

    expect(Object.keys(policy.callPolicies).sort()).toEqual(
      [...DELIVERY_AGENT_LLM_CALL_TYPES].sort()
    );

    for (const callType of DELIVERY_AGENT_LLM_CALL_TYPES) {
      expect(policy.callPolicies[callType].callType).toBe(callType);
    }
  });

  it("requires reject reasons and uses strong reasoning for early rejection feedback", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();
    const rejectionPolicy = getDeliveryAgentLlmCallPolicy(
      policy,
      "rejection_feedback_interpretation"
    );

    expect(policy.rejectionLoop.requireRejectReason).toBe(true);
    expect(policy.rejectionLoop.rejectReasonMinLength).toBeGreaterThanOrEqual(8);
    expect(policy.rejectionLoop.maxLlmCallsPerRejectionAttempt).toBe(2);
    expect(policy.rejectionLoop.preferLocalRepairBeforeFullRegeneration).toBe(true);
    expect(rejectionPolicy.modelTier).toBe("strong");
    expect(rejectionPolicy.required).toBe(true);
    expect(rejectionPolicy.countsTowardHighValuePlanningCalls).toBe(true);
  });

  it("keeps raw historical cases out of prompts by default", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();

    expect(policy.historicalPrompt.maxDetailedHistoricalCases).toBe(3);
    expect(policy.historicalPrompt.maxCompactHistoricalLessons).toBe(12);
    expect(policy.historicalPrompt.maxRawHistoricalCasesInPrompt).toBe(0);
  });

  it("requires historical evaluation before cheap candidate generation can be trusted", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();

    expect(policy.evaluationRequiredBeforeCheapCandidateGeneration).toBe(true);
    expect(policy.evaluationGate).toEqual(
      expect.objectContaining({
        minHistoricalScenarioCount: 10,
        minHardRulePassRatePercent: 98,
        minQualifiedRecommendationRatePercent: 90,
        maxCriticalFailureCount: 0,
        requireStrongBaselineForCheapCandidateGeneration: true,
      })
    );
  });

  it("resolves default models without marking a provider as configured", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();
    const resolution = resolveDeliveryAgentModelForCall(policy, "daily_candidate_generation");

    expect(resolution.modelTier).toBe("strong");
    expect(resolution.model).toEqual(
      expect.objectContaining({
        tier: "strong",
        provider: "unconfigured",
        configured: false,
      })
    );
  });

  it("blocks all model resolution when LLM mode is disabled", () => {
    const policy = createDefaultDeliveryAgentCostPolicy({ mode: "llm_disabled" });
    const resolution = resolveDeliveryAgentModelForCall(policy, "rejection_feedback_interpretation");

    expect(resolution.model).toBeNull();
    expect(resolution.disabledReason).toBe("llm_disabled");
  });

  it("blocks paid model resolution in dry-run mode", () => {
    const policy = createDefaultDeliveryAgentCostPolicy({ mode: "dry_run" });
    const resolution = resolveDeliveryAgentModelForCall(policy, "daily_candidate_generation");

    expect(resolution.model).toBeNull();
    expect(resolution.disabledReason).toBe("dry_run");
  });

  it("validates the default policy", () => {
    const validation = validateDeliveryAgentCostPolicy(createDefaultDeliveryAgentCostPolicy());

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("parses the default policy through the persisted contract schema", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();

    expect(deliveryAgentCostPolicySchema.parse(policy)).toEqual(policy);
  });

  it("warns when overrides exceed Donald's cost and prompt preferences", () => {
    const policy = createDefaultDeliveryAgentCostPolicy({
      costTargets: {
        normalDailyTargetCents: 75,
        rescueDailyTargetCents: 150,
        monthlyWarningCents: 2500,
      },
      historicalPrompt: {
        maxDetailedHistoricalCases: 4,
        maxRawHistoricalCasesInPrompt: 1,
      },
    });

    const validation = validateDeliveryAgentCostPolicy(policy);

    expect(validation.valid).toBe(true);
    expect(validation.warnings).toEqual(
      expect.arrayContaining([
        "Normal daily cost target is above Donald's $0.50/day preference.",
        "Rescue daily cost target is above Donald's $1.00/day preference.",
        "Monthly warning threshold is above Donald's $20/month preference.",
        "Prompt policy allows more than 3 detailed historical cases.",
        "Prompt policy allows raw historical cases in prompts.",
      ])
    );
  });

  it("rejects policies that remove the required rejection reason", () => {
    const policy = createDefaultDeliveryAgentCostPolicy({
      rejectionLoop: {
        requireRejectReason: false,
      },
    });

    const validation = validateDeliveryAgentCostPolicy(policy);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      "Reject reason must be required for the approve/reject loop."
    );
  });

  it("rejects missing call policies", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();
    const brokenPolicy: DeliveryAgentCostPolicy = {
      ...policy,
      callPolicies: { ...policy.callPolicies },
    };
    delete (brokenPolicy.callPolicies as Partial<Record<DeliveryAgentLlmCallType, unknown>>)
      .schema_repair;

    const validation = validateDeliveryAgentCostPolicy(brokenPolicy);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Missing LLM call policy for schema_repair.");
  });
});
