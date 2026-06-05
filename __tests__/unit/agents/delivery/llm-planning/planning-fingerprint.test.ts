import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import {
  buildDeliveryAgentLlmCacheKey,
  buildDeliveryAgentPlanningFingerprint,
  DeliveryAgentPlanningFingerprintError,
  resolveDeliveryAgentLlmCacheDecision,
  stableStringify,
} from "@/lib/agents/delivery/llm-planning/planning-fingerprint";
import {
  DELIVERY_AGENT_COST_POLICY_VERSION,
  DELIVERY_AGENT_MODEL_ROUTING_POLICY_VERSION,
} from "@/lib/contracts/delivery-agent-cost-policy";
import type { DeliveryAgentPlanningFingerprintInput } from "@/lib/contracts/delivery-agent-llm-planning";

function buildInput(
  overrides: Partial<DeliveryAgentPlanningFingerprintInput> = {}
): DeliveryAgentPlanningFingerprintInput {
  return {
    scope: "daily_generation",
    deliveryDate: "2026-06-09",
    promptVersion: "daily-candidate-prompt-v1",
    hardRulesVersion: "hard-rules-v1",
    costPolicyVersion: DELIVERY_AGENT_COST_POLICY_VERSION,
    modelRoutingPolicyVersion: DELIVERY_AGENT_MODEL_ROUTING_POLICY_VERSION,
    profile: {
      profileId: "default",
      profileVersion: "profile-v1",
      resourceProfileVersion: "resource-v1",
      planningRulesVersion: "planning-v1",
    },
    orders: [
      {
        orderId: "order-b",
        status: "confirmed",
        area: "North York",
        formattedAddress: "  5180 Yonge Street, Toronto  ",
        totalMealQuantity: 3,
        lat: 43.768123456,
        lng: -79.412987654,
        coordinateStatus: "verified",
        coordinateSource: "route_optimizer",
        coordinateConfidence: "high",
        planningTags: ["handoff-candidate", "NY"],
      },
      {
        orderId: "order-a",
        status: "confirmed",
        area: "Downtown Toronto",
        formattedAddress: "100 King St W, Toronto",
        totalMealQuantity: 2,
        lat: 43.649,
        lng: -79.382,
        coordinateStatus: "verified",
        coordinateSource: "route_optimizer",
        coordinateConfidence: "high",
      },
    ],
    historicalPackage: {
      packageVersion: "history-package-v1",
      retrievalHash: "history-hash-1",
      selectedCaseIds: ["case-2", "case-1"],
      compactLessonHash: "lesson-hash-1",
    },
    localCandidateSeedHash: "seed-hash-1",
    ...overrides,
  };
}

describe("delivery-agent LLM planning fingerprint", () => {
  it("stableStringify ignores object key order", () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });

  it("builds a stable fingerprint when the same orders arrive in a different order", () => {
    const base = buildInput();
    const reordered = buildInput({
      orders: [...base.orders].reverse().map((order) => ({
        ...order,
        formattedAddress: order.formattedAddress?.replace(/\s+/g, " ").trim(),
        planningTags: order.planningTags ? [...order.planningTags].reverse() : undefined,
      })),
      historicalPackage: {
        ...base.historicalPackage!,
        selectedCaseIds: [...base.historicalPackage!.selectedCaseIds!].reverse(),
      },
    });

    const left = buildDeliveryAgentPlanningFingerprint(base);
    const right = buildDeliveryAgentPlanningFingerprint(reordered);

    expect(right.orderSetHash).toBe(left.orderSetHash);
    expect(right.promptInputHash).toBe(left.promptInputHash);
    expect(right.planningFingerprint).toBe(left.planningFingerprint);
  });

  it("changes the order hash when an order location changes", () => {
    const base = buildInput();
    const changed = buildInput({
      orders: base.orders.map((order) =>
        order.orderId === "order-b" ? { ...order, lat: 43.77 } : order
      ),
    });

    expect(buildDeliveryAgentPlanningFingerprint(changed).orderSetHash).not.toBe(
      buildDeliveryAgentPlanningFingerprint(base).orderSetHash
    );
  });

  it("rejects duplicate order IDs before a planning cache key can be created", () => {
    const base = buildInput();

    expect(() =>
      buildDeliveryAgentPlanningFingerprint({
        ...base,
        orders: [base.orders[0]!, { ...base.orders[0]!, formattedAddress: "Different place" }],
      })
    ).toThrow(DeliveryAgentPlanningFingerprintError);
  });

  it("changes the planning fingerprint when Donald rejection feedback changes", () => {
    const base = buildDeliveryAgentPlanningFingerprint(
      buildInput({ scope: "rejection_regeneration" })
    );
    const rejected = buildDeliveryAgentPlanningFingerprint(
      buildInput({
        scope: "rejection_regeneration",
        feedback: {
          rejectionAttemptNumber: 1,
          rejectedCandidateId: "baseline_two_run:2026-06-09",
          rejectedPlanHash: "rejected-plan-hash",
          feedbackText: "North York meetup is too far. Try closer to 5180 Yonge.",
          feedbackTags: ["meetup_too_far_for_provider"],
          sourceFeedbackReviewedAt: "2026-06-09T13:05:00.000Z",
        },
      })
    );

    expect(rejected.orderSetHash).toBe(base.orderSetHash);
    expect(rejected.planningFingerprint).not.toBe(base.planningFingerprint);
  });

  it("changes the planning fingerprint when profile or prompt version changes", () => {
    const base = buildDeliveryAgentPlanningFingerprint(buildInput());
    const profileChanged = buildDeliveryAgentPlanningFingerprint(
      buildInput({
        profile: {
          profileId: "default",
          profileVersion: "profile-v2",
        },
      })
    );
    const promptChanged = buildDeliveryAgentPlanningFingerprint(
      buildInput({ promptVersion: "daily-candidate-prompt-v2" })
    );

    expect(profileChanged.orderSetHash).toBe(base.orderSetHash);
    expect(profileChanged.planningFingerprint).not.toBe(base.planningFingerprint);
    expect(promptChanged.planningFingerprint).not.toBe(base.planningFingerprint);
  });

  it("builds model-aware LLM cache keys", () => {
    const fingerprint = buildDeliveryAgentPlanningFingerprint(buildInput());
    const strong = buildDeliveryAgentLlmCacheKey({
      fingerprint,
      callType: "daily_candidate_generation",
      modelProvider: "openai",
      modelId: "strong-model",
      outputSchemaVersion: "candidate-plan-output-v1",
    });
    const cheap = buildDeliveryAgentLlmCacheKey({
      fingerprint,
      callType: "daily_candidate_generation",
      modelProvider: "openai",
      modelId: "cheap-model",
      outputSchemaVersion: "candidate-plan-output-v1",
    });

    expect(strong.cacheKey).toContain("daily_candidate_generation");
    expect(strong.cacheKey).not.toBe(cheap.cacheKey);
  });

  it("enables cache only for normal cacheable calls", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();

    expect(
      resolveDeliveryAgentLlmCacheDecision({
        policy,
        callType: "daily_candidate_generation",
      })
    ).toEqual({
      status: "enabled",
      ttlHours: 24,
      reasons: [],
    });

    expect(
      resolveDeliveryAgentLlmCacheDecision({
        policy,
        callType: "schema_repair",
      })
    ).toEqual({
      status: "disabled",
      ttlHours: 24,
      reasons: ["call_not_cacheable"],
    });
  });

  it("disables cache for dry-run, disabled, and force refresh modes", () => {
    expect(
      resolveDeliveryAgentLlmCacheDecision({
        policy: createDefaultDeliveryAgentCostPolicy({ mode: "dry_run" }),
        callType: "daily_candidate_generation",
      }).reasons
    ).toContain("dry_run");

    expect(
      resolveDeliveryAgentLlmCacheDecision({
        policy: createDefaultDeliveryAgentCostPolicy({ mode: "llm_disabled" }),
        callType: "daily_candidate_generation",
      }).reasons
    ).toContain("llm_disabled");

    expect(
      resolveDeliveryAgentLlmCacheDecision({
        policy: createDefaultDeliveryAgentCostPolicy(),
        callType: "daily_candidate_generation",
        forceRefresh: true,
      }).reasons
    ).toContain("force_refresh_requested");
  });
});
