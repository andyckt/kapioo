import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import {
  clearDeliveryAgentLlmCandidateOutputCacheForTests,
  readDeliveryAgentLlmCandidateOutputCache,
  resolveDeliveryAgentLlmCandidateOutputCacheContext,
  writeDeliveryAgentLlmCandidateOutputCache,
} from "@/lib/agents/delivery/llm-planning/candidate-output-cache";
import { parseDeliveryAgentLlmCandidateOutput } from "@/lib/agents/delivery/llm-planning/candidate-output-parser";
import { buildDeliveryAgentLlmPromptPackage } from "@/lib/agents/delivery/llm-planning/prompt-assembly";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import {
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
  type DeliveryAgentLlmCandidateOutput,
  type DeliveryAgentLlmCandidateOutputCandidate,
  type DeliveryAgentLlmPromptPackage,
  type DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";

const NOW_MS = Date.parse("2026-06-14T10:00:00.000Z");

const ORDERS: DeliveryAgentPlanningFingerprintOrderFact[] = [
  {
    orderId: "DD-7001",
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
    orderId: "DD-7002",
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
    orderId: "DD-7003",
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
];

function buildPolicy(overrides = {}) {
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

function buildPromptPackage(input: {
  orders?: DeliveryAgentPlanningFingerprintOrderFact[];
  policy?: ReturnType<typeof createDefaultDeliveryAgentCostPolicy>;
} = {}): DeliveryAgentLlmPromptPackage {
  return buildDeliveryAgentLlmPromptPackage({
    deliveryDate: "2026-06-14",
    profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    policy: input.policy ?? buildPolicy(),
    orders: input.orders ?? ORDERS,
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
    reasoningSummary: "Candidate output cache test plan.",
    runs: [
      { runSlot: "A", orderIds: input.runA },
      { runSlot: "B", orderIds: input.runB },
    ],
    handoffPlan: {
      required: true,
      providerRunSlot: "A",
      receiverRunSlot: "B",
      strategy: "Use Central North York handoff source hint.",
      sourceOrderIds: ["DD-7002"],
    },
    selfUse: {
      used: false,
      orderIds: [],
    },
    risks: ["Needs local and paid proof before recommendation."],
    historicalCaseIdsUsed: ["case-positive"],
    expectedStrengths: ["Keeps Richmond Hill with the uptown run."],
    warnings: [],
  };
}

function buildOutput(
  candidates: DeliveryAgentLlmCandidateOutputCandidate[]
): DeliveryAgentLlmCandidateOutput {
  return {
    schemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    summary: {
      planningSummary: "Mock LLM candidate output for cache tests.",
      candidateCount: candidates.length,
      assumptions: ["No paid proof has been run."],
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

function buildValidOutput(): DeliveryAgentLlmCandidateOutput {
  return buildOutput([
    buildCandidate({
      candidateId: "balanced-cache",
      runA: ["DD-7001", "DD-7002"],
      runB: ["DD-7003"],
    }),
  ]);
}

function parseOutput(input: {
  promptPackage: DeliveryAgentLlmPromptPackage;
  rawOutput: unknown;
}) {
  return parseDeliveryAgentLlmCandidateOutput({
    promptPackage: input.promptPackage,
    rawOutput: input.rawOutput,
  });
}

describe("delivery-agent LLM candidate output cache", () => {
  beforeEach(() => {
    clearDeliveryAgentLlmCandidateOutputCacheForTests();
  });

  it("writes and reuses a validated candidate output for the same planning fingerprint", () => {
    const policy = buildPolicy();
    const promptPackage = buildPromptPackage({ policy });
    const rawOutput = buildValidOutput();
    const parseResult = parseOutput({ promptPackage, rawOutput });
    const context = resolveDeliveryAgentLlmCandidateOutputCacheContext({
      promptPackage,
      policy,
    });

    expect(context.cacheDecision.status).toBe("enabled");

    const beforeWrite = readDeliveryAgentLlmCandidateOutputCache({
      context,
      nowMs: NOW_MS,
    });
    expect(beforeWrite.status).toBe("miss");

    const write = writeDeliveryAgentLlmCandidateOutputCache({
      context,
      promptPackage,
      parseResult,
      rawCandidateOutput: rawOutput,
      nowMs: NOW_MS,
      source: "test_seed",
    });
    expect(write.status).toBe("written");
    expect(write.record?.acceptedCandidateIds).toEqual(["balanced-cache"]);
    expect(write.record?.ttlHours).toBe(24);

    const hit = readDeliveryAgentLlmCandidateOutputCache({
      context,
      nowMs: NOW_MS + 1000,
    });
    expect(hit.status).toBe("hit");
    expect(hit.record?.rawCandidateOutput).toEqual(rawOutput);
    expect(hit.record?.outputHash).toBe(write.record?.outputHash);
  });

  it("uses model provider and model ID as part of the idempotency key", () => {
    const policy = buildPolicy();
    const promptPackage = buildPromptPackage({ policy });
    const rawOutput = buildValidOutput();
    const parseResult = parseOutput({ promptPackage, rawOutput });
    const strongContext = resolveDeliveryAgentLlmCandidateOutputCacheContext({
      promptPackage,
      policy,
    });
    const cheapContext = resolveDeliveryAgentLlmCandidateOutputCacheContext({
      promptPackage,
      policy,
      modelProvider: "test-provider",
      modelId: "cheap-v1",
    });

    expect(strongContext.cacheKey.cacheKey).not.toBe(cheapContext.cacheKey.cacheKey);

    writeDeliveryAgentLlmCandidateOutputCache({
      context: strongContext,
      promptPackage,
      parseResult,
      rawCandidateOutput: rawOutput,
      nowMs: NOW_MS,
    });

    expect(
      readDeliveryAgentLlmCandidateOutputCache({
        context: cheapContext,
        nowMs: NOW_MS + 1000,
      }).status
    ).toBe("miss");
  });

  it("disables reads and writes when policy disables cache usage", () => {
    const policy = buildPolicy({ mode: "dry_run" });
    const promptPackage = buildPromptPackage({ policy });
    const rawOutput = buildValidOutput();
    const parseResult = parseOutput({ promptPackage, rawOutput });
    const context = resolveDeliveryAgentLlmCandidateOutputCacheContext({
      promptPackage,
      policy,
    });

    expect(context.cacheDecision.status).toBe("disabled");
    expect(context.cacheDecision.reasons).toContain("dry_run");

    const write = writeDeliveryAgentLlmCandidateOutputCache({
      context,
      promptPackage,
      parseResult,
      rawCandidateOutput: rawOutput,
      nowMs: NOW_MS,
    });
    const read = readDeliveryAgentLlmCandidateOutputCache({
      context,
      nowMs: NOW_MS,
    });

    expect(write.status).toBe("disabled");
    expect(read.status).toBe("disabled");
    expect(read.warnings.join(" ")).toContain("dry_run");
  });

  it("expires stale entries and does not return old candidate output", () => {
    const policy = buildPolicy({ cacheTtlHours: 1 });
    const promptPackage = buildPromptPackage({ policy });
    const rawOutput = buildValidOutput();
    const parseResult = parseOutput({ promptPackage, rawOutput });
    const context = resolveDeliveryAgentLlmCandidateOutputCacheContext({
      promptPackage,
      policy,
    });

    writeDeliveryAgentLlmCandidateOutputCache({
      context,
      promptPackage,
      parseResult,
      rawCandidateOutput: rawOutput,
      nowMs: NOW_MS,
    });

    const stale = readDeliveryAgentLlmCandidateOutputCache({
      context,
      nowMs: NOW_MS + 60 * 60 * 1000 + 1,
    });
    const afterStale = readDeliveryAgentLlmCandidateOutputCache({
      context,
      nowMs: NOW_MS + 60 * 60 * 1000 + 2,
    });

    expect(stale.status).toBe("stale");
    expect(stale.record).toBeNull();
    expect(stale.staleRecord?.acceptedCandidateIds).toEqual(["balanced-cache"]);
    expect(afterStale.status).toBe("miss");
  });

  it("refuses to cache invalid candidate output", () => {
    const policy = buildPolicy();
    const promptPackage = buildPromptPackage({ policy });
    const rawOutput = "not json";
    const parseResult = parseOutput({ promptPackage, rawOutput });
    const context = resolveDeliveryAgentLlmCandidateOutputCacheContext({
      promptPackage,
      policy,
    });

    expect(parseResult.status).toBe("invalid");

    const write = writeDeliveryAgentLlmCandidateOutputCache({
      context,
      promptPackage,
      parseResult,
      rawCandidateOutput: rawOutput,
      nowMs: NOW_MS,
    });

    expect(write.status).toBe("skipped_invalid_output");
    expect(
      readDeliveryAgentLlmCandidateOutputCache({
        context,
        nowMs: NOW_MS + 1000,
      }).status
    ).toBe("miss");
  });

  it("refuses to cache output when the parse result fingerprint does not match the prompt", () => {
    const policy = buildPolicy();
    const promptPackage = buildPromptPackage({ policy });
    const otherPromptPackage = buildPromptPackage({
      policy,
      orders: ORDERS.map((order) =>
        order.orderId === "DD-7002" ? { ...order, lat: 43.77 } : order
      ),
    });
    const rawOutput = buildValidOutput();
    const parseResult = {
      ...parseOutput({ promptPackage: otherPromptPackage, rawOutput }),
      acceptedCandidates: parseOutput({ promptPackage, rawOutput }).acceptedCandidates,
    };
    const context = resolveDeliveryAgentLlmCandidateOutputCacheContext({
      promptPackage,
      policy,
    });

    const write = writeDeliveryAgentLlmCandidateOutputCache({
      context,
      promptPackage,
      parseResult,
      rawCandidateOutput: rawOutput,
      nowMs: NOW_MS,
    });

    expect(write.status).toBe("skipped_fingerprint_mismatch");
    expect(
      readDeliveryAgentLlmCandidateOutputCache({
        context,
        nowMs: NOW_MS + 1000,
      }).status
    ).toBe("miss");
  });

  it("returns cloned cache records so callers cannot mutate the stored output", () => {
    const policy = buildPolicy();
    const promptPackage = buildPromptPackage({ policy });
    const rawOutput = buildValidOutput();
    const parseResult = parseOutput({ promptPackage, rawOutput });
    const context = resolveDeliveryAgentLlmCandidateOutputCacheContext({
      promptPackage,
      policy,
    });

    writeDeliveryAgentLlmCandidateOutputCache({
      context,
      promptPackage,
      parseResult,
      rawCandidateOutput: rawOutput,
      nowMs: NOW_MS,
    });

    const firstHit = readDeliveryAgentLlmCandidateOutputCache({
      context,
      nowMs: NOW_MS + 1000,
    });
    const mutableOutput = firstHit.record?.rawCandidateOutput as DeliveryAgentLlmCandidateOutput;
    mutableOutput.candidates[0].candidateId = "mutated";

    const secondHit = readDeliveryAgentLlmCandidateOutputCache({
      context,
      nowMs: NOW_MS + 2000,
    });
    const secondOutput = secondHit.record?.rawCandidateOutput as DeliveryAgentLlmCandidateOutput;

    expect(secondOutput.candidates[0].candidateId).toBe("balanced-cache");
  });
});
