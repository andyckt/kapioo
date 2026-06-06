import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import { clearDeliveryAgentLlmCandidateOutputCacheForTests } from "@/lib/agents/delivery/llm-planning/candidate-output-cache";
import { resolveDeliveryAgentLlmProviderRuntimeConfig } from "@/lib/agents/delivery/llm-planning/provider-readiness";
import {
  runDeliveryAgentLlmCandidateProviderAdapter,
  type DeliveryAgentLlmCandidateProviderExecutor,
} from "@/lib/agents/delivery/llm-planning/candidate-provider-adapter";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import type { PlanningStop } from "@/lib/agents/delivery/candidate-plans/types";
import type {
  DeliveryAgentLlmCandidateOutput,
  DeliveryAgentLlmCandidateOutputCandidate,
  DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";
import { DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION } from "@/lib/contracts/delivery-agent-llm-planning";

const NOW_MS = Date.parse("2026-06-15T10:00:00.000Z");

const ORDER_FACTS: DeliveryAgentPlanningFingerprintOrderFact[] = [
  {
    orderId: "DD-8001",
    status: "confirmed",
    area: "Downtown Toronto",
    formattedAddress: "100 King St W, Toronto",
    totalMealQuantity: 1,
    lat: 43.6487,
    lng: -79.3817,
    coordinateConfidence: "high",
    coordinateSource: "delivery_agent_cache",
    planningTags: ["core_dt"],
  },
  {
    orderId: "DD-8002",
    status: "confirmed",
    area: "North York",
    formattedAddress: "5000 Yonge St, Toronto",
    totalMealQuantity: 2,
    lat: 43.7661,
    lng: -79.4149,
    coordinateConfidence: "high",
    coordinateSource: "delivery_agent_cache",
    planningTags: ["flexible_north_york"],
  },
  {
    orderId: "DD-8003",
    status: "confirmed",
    area: "Richmond Hill",
    formattedAddress: "30 High Tech Rd, Richmond Hill",
    totalMealQuantity: 1,
    lat: 43.8432,
    lng: -79.3867,
    coordinateConfidence: "high",
    coordinateSource: "delivery_agent_cache",
    planningTags: ["core_uptown"],
  },
  {
    orderId: "DD-8004",
    status: "confirmed",
    area: "Markham",
    formattedAddress: "101 Town Centre Blvd, Markham",
    totalMealQuantity: 1,
    lat: 43.8561,
    lng: -79.337,
    coordinateConfidence: "high",
    coordinateSource: "delivery_agent_cache",
    planningTags: ["core_uptown"],
  },
];

const PLANNING_STOPS: PlanningStop[] = [
  {
    orderId: "DD-8001",
    customerName: "Customer A",
    area: "Downtown Toronto",
    formattedAddress: "100 King St W, Toronto",
    lat: 43.6487,
    lng: -79.3817,
    totalMealQuantity: 1,
    planningTags: ["core_dt"],
    areaBucket: "core_dt",
    defaultRunLean: "dt",
  },
  {
    orderId: "DD-8002",
    customerName: "Customer B",
    area: "North York",
    formattedAddress: "5000 Yonge St, Toronto",
    lat: 43.7661,
    lng: -79.4149,
    totalMealQuantity: 2,
    planningTags: ["flexible_north_york"],
    areaBucket: "flexible_north_york",
    defaultRunLean: "dt",
  },
  {
    orderId: "DD-8003",
    customerName: "Customer C",
    area: "Richmond Hill",
    formattedAddress: "30 High Tech Rd, Richmond Hill",
    lat: 43.8432,
    lng: -79.3867,
    totalMealQuantity: 1,
    planningTags: ["core_uptown"],
    areaBucket: "core_uptown",
    defaultRunLean: "marco",
  },
  {
    orderId: "DD-8004",
    customerName: "Customer D",
    area: "Markham",
    formattedAddress: "101 Town Centre Blvd, Markham",
    lat: 43.8561,
    lng: -79.337,
    totalMealQuantity: 1,
    planningTags: ["core_uptown"],
    areaBucket: "core_uptown",
    defaultRunLean: "marco",
  },
];

function buildPolicy(
  overrides: Parameters<typeof createDefaultDeliveryAgentCostPolicy>[0] = {}
) {
  return createDefaultDeliveryAgentCostPolicy({
    models: {
      strong: {
        tier: "strong",
        provider: "test-provider",
        modelId: "strong-v1",
        configured: true,
      },
    },
    ...overrides,
  });
}

function buildCandidate(input: {
  candidateId: string;
  runA: string[];
  runB: string[];
}): DeliveryAgentLlmCandidateOutputCandidate {
  return {
    candidateId: input.candidateId,
    strategyName: input.candidateId.replace(/-/g, " "),
    reasoningSummary: "Create a safe exact split for provider adapter tests.",
    runs: [
      { runSlot: "A", orderIds: input.runA },
      { runSlot: "B", orderIds: input.runB },
    ],
    handoffPlan: {
      required: true,
      providerRunSlot: "A",
      receiverRunSlot: "B",
      strategy: "Use Central North York handoff source hint.",
      sourceOrderIds: ["DD-8002"],
    },
    selfUse: {
      used: false,
      orderIds: [],
    },
    risks: ["Needs local and paid proof before recommendation."],
    historicalCaseIdsUsed: ["case-positive"],
    expectedStrengths: ["Keeps Markham and Richmond Hill together."],
    warnings: [],
  };
}

function buildOutput(
  candidates: DeliveryAgentLlmCandidateOutputCandidate[] = [
    buildCandidate({
      candidateId: "balanced-provider",
      runA: ["DD-8001", "DD-8002"],
      runB: ["DD-8003", "DD-8004"],
    }),
  ]
): DeliveryAgentLlmCandidateOutput {
  return {
    schemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    summary: {
      planningSummary: "Mock LLM candidate output for provider adapter tests.",
      candidateCount: candidates.length,
      assumptions: ["No paid route proof has been used."],
    },
    candidates,
    unprovenIdeas: [],
    hardRuleChecklist: {
      allOrdersAssignedExactlyOnce: true,
      noDuplicateOrderIds: true,
      noInventedOrderIds: true,
      selfUsedOnlyAsBackup: true,
      routeOptimizerNotUsedAsSearch: true,
      unprovenIdeasNotRecommended: true,
    },
    warnings: [],
  };
}

async function runAdapter(
  overrides: Partial<Parameters<typeof runDeliveryAgentLlmCandidateProviderAdapter>[0]> = {}
) {
  return runDeliveryAgentLlmCandidateProviderAdapter({
    deliveryDate: "2026-06-15",
    profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    policy: buildPolicy(),
    orders: ORDER_FACTS,
    planningStops: PLANNING_STOPS,
    nowMs: NOW_MS,
    ...overrides,
  });
}

describe("runDeliveryAgentLlmCandidateProviderAdapter", () => {
  beforeEach(() => {
    clearDeliveryAgentLlmCandidateOutputCacheForTests();
  });

  it("stops after prompt and cache preparation by default without calling a provider", async () => {
    const provider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: buildOutput(),
    }));

    const result = await runAdapter({ provider });

    expect(result.status).toBe("ready_for_provider");
    expect(result.providerCall.status).toBe("not_allowed");
    expect(result.providerCall.reason).toBe("allow_provider_call_false");
    expect(result.cacheRead?.status).toBe("miss");
    expect(result.dryRunResult?.status).toBe("prompt_ready");
    expect(provider).not.toHaveBeenCalled();
  });

  it("calls an injected provider only when explicitly allowed and writes valid output to cache", async () => {
    const provider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>((request) => ({
      rawCandidateOutput: buildOutput(),
      providerRequestId: "llm-request-1",
      usage: {
        inputTokens: request.estimatedInputTokens,
        outputTokens: 700,
        totalTokens: request.estimatedInputTokens + 700,
      },
    }));

    const result = await runAdapter({
      allowProviderCall: true,
      provider,
    });

    expect(result.status).toBe("provider_completed");
    expect(result.providerCall.status).toBe("called");
    expect(result.providerCall.providerRequestId).toBe("llm-request-1");
    expect(result.cacheWrite?.status).toBe("written");
    expect(result.dryRunResult?.status).toBe("ranked");
    expect(result.candidateIds?.finalistCandidateIds).toEqual([
      "llm:2026-06-15:balanced-provider",
    ]);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(provider.mock.calls[0][0]).toMatchObject({
      callType: "daily_candidate_generation",
      modelProvider: "test-provider",
      modelId: "strong-v1",
      responseFormat: "json_object",
      maxOutputTokens: 5000,
    });
  });

  it("reuses cached valid output and does not call the provider again", async () => {
    const provider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: buildOutput(),
      providerRequestId: "first-provider-call",
    }));

    await runAdapter({
      allowProviderCall: true,
      provider,
    });
    provider.mockClear();

    const cached = await runAdapter({
      allowProviderCall: true,
      provider,
      nowMs: NOW_MS + 1000,
    });

    expect(cached.status).toBe("cache_hit");
    expect(cached.providerCall.status).toBe("not_needed_cache_hit");
    expect(cached.cacheRead?.status).toBe("hit");
    expect(cached.dryRunResult?.status).toBe("ranked");
    expect(provider).not.toHaveBeenCalled();
  });

  it("force refresh bypasses cache and still keeps cache writes disabled for that action", async () => {
    const firstProvider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: buildOutput(),
      providerRequestId: "first-provider-call",
    }));
    const refreshProvider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: buildOutput([
        buildCandidate({
          candidateId: "refresh-provider",
          runA: ["DD-8001", "DD-8002"],
          runB: ["DD-8003", "DD-8004"],
        }),
      ]),
      providerRequestId: "refresh-provider-call",
    }));

    await runAdapter({
      allowProviderCall: true,
      provider: firstProvider,
    });
    const refreshed = await runAdapter({
      allowProviderCall: true,
      provider: refreshProvider,
      forceRefresh: true,
      nowMs: NOW_MS + 1000,
    });

    expect(refreshed.status).toBe("provider_completed_not_cached");
    expect(refreshed.cacheRead?.status).toBe("disabled");
    expect(refreshed.cacheWrite?.status).toBe("disabled");
    expect(refreshed.providerCall.status).toBe("called");
    expect(refreshed.providerCall.providerRequestId).toBe("refresh-provider-call");
    expect(refreshProvider).toHaveBeenCalledTimes(1);
  });

  it("blocks provider calls when policy disables LLM usage", async () => {
    const provider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: buildOutput(),
    }));

    const result = await runAdapter({
      allowProviderCall: true,
      provider,
      policy: buildPolicy({ mode: "llm_disabled" }),
    });

    expect(result.status).toBe("blocked");
    expect(result.providerCall.status).toBe("blocked_by_policy");
    expect(result.providerCall.reason).toBe("llm_disabled");
    expect(provider).not.toHaveBeenCalled();
  });

  it("blocks provider calls when the selected model is not configured", async () => {
    const provider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: buildOutput(),
    }));

    const result = await runAdapter({
      allowProviderCall: true,
      provider,
      policy: createDefaultDeliveryAgentCostPolicy(),
    });

    expect(result.status).toBe("blocked");
    expect(result.providerCall.status).toBe("not_configured");
    expect(result.providerCall.reason).toBe("model_not_configured");
    expect(provider).not.toHaveBeenCalled();
  });

  it("still prepares a provider-free request when the selected model is not configured", async () => {
    const provider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: buildOutput(),
    }));

    const result = await runAdapter({
      provider,
      policy: createDefaultDeliveryAgentCostPolicy(),
    });

    expect(result.status).toBe("ready_for_provider");
    expect(result.providerCall.status).toBe("not_allowed");
    expect(result.providerCall.reason).toBe("allow_provider_call_false");
    expect(result.providerCall.modelResolution.model?.configured).toBe(false);
    expect(result.warnings.join(" ")).toContain("model is not configured");
    expect(provider).not.toHaveBeenCalled();
  });

  it("gets ready for a future provider when the model is configured but no executor is supplied", async () => {
    const result = await runAdapter({
      allowProviderCall: true,
    });

    expect(result.status).toBe("ready_for_provider");
    expect(result.providerCall.status).toBe("not_configured");
    expect(result.providerCall.reason).toBe("provider_executor_not_supplied");
    expect(result.dryRunResult?.status).toBe("prompt_ready");
  });

  it("enforces runtime readiness before calling an injected provider", async () => {
    const provider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: buildOutput(),
    }));

    const result = await runAdapter({
      allowProviderCall: true,
      provider,
      providerRuntimeConfig: resolveDeliveryAgentLlmProviderRuntimeConfig({
        DELIVERY_AGENT_LLM_PROVIDER: "openai",
        DELIVERY_AGENT_LLM_STRONG_MODEL: "strong-v1",
        OPENAI_API_KEY: "test-key",
      }),
      enforceProviderRuntimeGate: true,
    });

    expect(result.status).toBe("blocked");
    expect(result.liveCallGate?.status).toBe("blocked");
    expect(result.providerCall.status).toBe("blocked_by_policy");
    expect(result.providerCall.errors).toEqual(
      expect.arrayContaining(["input_pricing_missing", "output_pricing_missing"])
    );
    expect(provider).not.toHaveBeenCalled();
  });

  it("blocks provider calls when the prompt is over the token limit", async () => {
    const provider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: buildOutput(),
    }));

    const result = await runAdapter({
      allowProviderCall: true,
      provider,
      policy: buildPolicy({
        callPolicies: {
          daily_candidate_generation: {
            maxInputTokens: 1,
          },
        },
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.providerCall.status).toBe("blocked_by_token_limit");
    expect(result.providerCall.reason).toBe("prompt_token_estimate_over_limit");
    expect(result.errors.join(" ")).toContain("must not be sent to a provider");
    expect(provider).not.toHaveBeenCalled();
  });

  it("does not cache invalid provider output", async () => {
    const invalidProvider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: "not json",
      providerRequestId: "invalid-output-call",
    }));

    const result = await runAdapter({
      allowProviderCall: true,
      provider: invalidProvider,
    });

    expect(result.status).toBe("blocked");
    expect(result.providerCall.status).toBe("called");
    expect(result.cacheWrite?.status).toBe("skipped_invalid_output");
    expect(result.dryRunResult?.status).toBe("blocked");

    const validProvider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: buildOutput(),
    }));
    const secondAttempt = await runAdapter({
      allowProviderCall: true,
      provider: validProvider,
      nowMs: NOW_MS + 1000,
    });

    expect(secondAttempt.status).toBe("provider_completed");
    expect(validProvider).toHaveBeenCalledTimes(1);
  });

  it("blocks when a provider completes without returning candidate output", async () => {
    const provider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => ({
      rawCandidateOutput: undefined,
      providerRequestId: "missing-output-call",
    }));

    const result = await runAdapter({
      allowProviderCall: true,
      provider,
    });

    expect(result.status).toBe("blocked");
    expect(result.providerCall.status).toBe("called");
    expect(result.providerCall.reason).toBe(
      "provider_executor_returned_no_candidate_output"
    );
    expect(result.errors.join(" ")).toContain("no raw candidate output");
    expect(result.cacheWrite).toBeUndefined();
  });

  it("returns blocked without caching when the provider executor fails", async () => {
    const provider = vi.fn<DeliveryAgentLlmCandidateProviderExecutor>(() => {
      throw new Error("provider unavailable");
    });

    const result = await runAdapter({
      allowProviderCall: true,
      provider,
    });

    expect(result.status).toBe("blocked");
    expect(result.providerCall.status).toBe("failed");
    expect(result.providerCall.reason).toBe("provider_executor_failed");
    expect(result.errors.join(" ")).toContain("provider unavailable");
    expect(result.cacheWrite).toBeUndefined();
    expect(provider).toHaveBeenCalledTimes(1);
  });
});
