import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import { runDeliveryAgentLlmCandidatePlanningDryRun } from "@/lib/agents/delivery/llm-planning/candidate-planning-dry-run";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import type { PlanningStop } from "@/lib/agents/delivery/candidate-plans/types";
import type {
  DeliveryAgentLlmCandidateOutput,
  DeliveryAgentLlmCandidateOutputCandidate,
  DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";
import { DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION } from "@/lib/contracts/delivery-agent-llm-planning";

const ORDER_FACTS: DeliveryAgentPlanningFingerprintOrderFact[] = [
  {
    orderId: "DD-6001",
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
    orderId: "DD-6002",
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
    orderId: "DD-6003",
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
    orderId: "DD-6004",
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
    orderId: "DD-6001",
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
    orderId: "DD-6002",
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
    orderId: "DD-6003",
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
    orderId: "DD-6004",
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

const DRY_RUN_POLICY = createDefaultDeliveryAgentCostPolicy({ mode: "dry_run" });

function buildCandidate(input: {
  candidateId: string;
  runA: string[];
  runB: string[];
  runC?: string[];
}): DeliveryAgentLlmCandidateOutputCandidate {
  const runC = input.runC ?? [];

  return {
    candidateId: input.candidateId,
    strategyName: input.candidateId.replace(/-/g, " "),
    reasoningSummary: "Create an exact split draft for local validation.",
    runs: [
      { runSlot: "A", orderIds: input.runA },
      { runSlot: "B", orderIds: input.runB },
      ...(runC.length > 0 ? [{ runSlot: "C", orderIds: runC }] : []),
    ],
    handoffPlan: {
      required: true,
      providerRunSlot: "A",
      receiverRunSlot: "B",
      strategy: "Use a Central North York source stop for handoff search.",
      suggestedMeetupArea: "Central North York",
      sourceOrderIds: ["DD-6002"],
    },
    selfUse: {
      used: runC.length > 0,
      orderIds: runC,
      reason: runC.length > 0 ? "Self backup pressure relief." : undefined,
    },
    risks: ["Needs local and paid proof before recommendation."],
    historicalCaseIdsUsed: ["case-positive"],
    expectedStrengths: ["Keeps Markham and Richmond Hill together."],
    warnings: [],
  };
}

function buildOutput(candidates: DeliveryAgentLlmCandidateOutputCandidate[]): DeliveryAgentLlmCandidateOutput {
  const everyCandidateHasExactCoverage = candidates.every((candidate) => {
    const assigned = candidate.runs.flatMap((run) => run.orderIds);
    return (
      assigned.length === ORDER_FACTS.length &&
      new Set(assigned).size === ORDER_FACTS.length &&
      ORDER_FACTS.every((order) => assigned.includes(order.orderId))
    );
  });

  return {
    schemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    summary: {
      planningSummary: "Mock LLM candidate output for provider-free dry-run tests.",
      candidateCount: candidates.length,
      assumptions: ["No live provider or paid preview has been used."],
    },
    candidates,
    unprovenIdeas: [],
    hardRuleChecklist: {
      allOrdersAssignedExactlyOnce: everyCandidateHasExactCoverage,
      noDuplicateOrderIds: everyCandidateHasExactCoverage,
      noInventedOrderIds: everyCandidateHasExactCoverage,
      selfUsedOnlyAsBackup: true,
      routeOptimizerNotUsedAsSearch: true,
      unprovenIdeasNotRecommended: true,
    },
    warnings: [],
  };
}

function runDryRun(overrides: {
  rawCandidateOutput?: unknown;
  orders?: DeliveryAgentPlanningFingerprintOrderFact[];
  planningStops?: PlanningStop[];
  policy?: typeof DRY_RUN_POLICY;
  maxFinalists?: number;
  minPreferredScore?: number;
} = {}) {
  return runDeliveryAgentLlmCandidatePlanningDryRun({
    deliveryDate: "2026-06-13",
    profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    policy: overrides.policy ?? DRY_RUN_POLICY,
    orders: overrides.orders ?? ORDER_FACTS,
    planningStops: overrides.planningStops ?? PLANNING_STOPS,
    rawCandidateOutput: overrides.rawCandidateOutput,
    maxFinalists: overrides.maxFinalists,
    minPreferredScore: overrides.minPreferredScore,
  });
}

describe("runDeliveryAgentLlmCandidatePlanningDryRun", () => {
  it("assembles a prompt-only dry run without calling a provider", () => {
    const result = runDryRun();

    expect(result.status).toBe("prompt_ready");
    expect(result.providerCall.status).toBe("skipped");
    expect(result.providerCall.reason).toBe("provider_free_dry_run");
    expect(result.providerCall.modelResolution.disabledReason).toBe("dry_run");
    expect(result.stageStatuses).toEqual({
      promptPackage: "completed",
      candidateOutputParse: "skipped",
      candidatePlanBuild: "skipped",
      localCandidateRanking: "skipped",
    });
    expect(result.planningFingerprint).toBeDefined();
    expect(result.candidatePlans).toHaveLength(0);
    expect(result.finalistCandidates).toHaveLength(0);
    expect(result.warnings.join(" ")).toContain("No raw candidate output");
  });

  it("blocks prompt-only dry runs when the prompt would exceed the provider token limit", () => {
    const result = runDryRun({
      policy: createDefaultDeliveryAgentCostPolicy({
        mode: "dry_run",
        callPolicies: {
          daily_candidate_generation: {
            maxInputTokens: 1,
          },
        },
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.stageStatuses.promptPackage).toBe("partial");
    expect(result.stageStatuses.candidateOutputParse).toBe("skipped");
    expect(result.errors.join(" ")).toContain("must not be sent to a provider");
  });

  it("runs the full provider-free path from supplied output to local finalists", () => {
    const result = runDryRun({
      rawCandidateOutput: buildOutput([
        buildCandidate({
          candidateId: "pattern-good",
          runA: ["DD-6001", "DD-6002"],
          runB: ["DD-6003", "DD-6004"],
        }),
        buildCandidate({
          candidateId: "pattern-bad",
          runA: ["DD-6003", "DD-6004"],
          runB: ["DD-6001", "DD-6002"],
        }),
      ]),
    });

    expect(result.status).toBe("ranked");
    expect(result.providerCall.status).toBe("skipped");
    expect(result.stageStatuses).toEqual({
      promptPackage: "completed",
      candidateOutputParse: "completed",
      candidatePlanBuild: "completed",
      localCandidateRanking: "completed",
    });
    expect(result.candidateIds.parsedAcceptedCandidateIds).toEqual([
      "pattern-good",
      "pattern-bad",
    ]);
    expect(result.candidateIds.builtCandidateIds).toContain(
      "llm:2026-06-13:pattern-good"
    );
    expect(result.candidateIds.finalistCandidateIds).toEqual([
      "llm:2026-06-13:pattern-good",
      "llm:2026-06-13:pattern-bad",
    ]);
    expect(result.localRankingResult?.rankedCandidates[0].candidateId).toBe(
      "llm:2026-06-13:pattern-good"
    );
    expect(result.errors).toHaveLength(0);
  });

  it("continues with accepted candidates but marks the flow partial when some LLM candidates fail", () => {
    const result = runDryRun({
      rawCandidateOutput: buildOutput([
        buildCandidate({
          candidateId: "valid-candidate",
          runA: ["DD-6001", "DD-6002"],
          runB: ["DD-6003", "DD-6004"],
        }),
        buildCandidate({
          candidateId: "missing-order",
          runA: ["DD-6001", "DD-6002"],
          runB: ["DD-6003"],
        }),
      ]),
    });

    expect(result.status).toBe("partial");
    expect(result.stageStatuses.candidateOutputParse).toBe("partial");
    expect(result.stageStatuses.candidatePlanBuild).toBe("partial");
    expect(result.stageStatuses.localCandidateRanking).toBe("completed");
    expect(result.candidateIds.parsedAcceptedCandidateIds).toEqual(["valid-candidate"]);
    expect(result.candidateIds.parsedRejectedCandidateIds).toEqual(["missing-order"]);
    expect(result.candidateIds.finalistCandidateIds).toEqual([
      "llm:2026-06-13:valid-candidate",
    ]);
    expect(result.errors.join(" ")).toContain("missing-order");
  });

  it("blocks invalid raw output before local plan building", () => {
    const result = runDryRun({
      rawCandidateOutput: "not json",
    });

    expect(result.status).toBe("blocked");
    expect(result.stageStatuses.candidateOutputParse).toBe("blocked");
    expect(result.stageStatuses.candidatePlanBuild).toBe("not_started");
    expect(result.stageStatuses.localCandidateRanking).toBe("not_started");
    expect(result.candidatePlans).toHaveLength(0);
    expect(result.errors.join(" ")).toContain("Unexpected token");
  });

  it("blocks before ranking when planning stops no longer match the prompt order set", () => {
    const result = runDryRun({
      rawCandidateOutput: buildOutput([
        buildCandidate({
          candidateId: "valid-candidate",
          runA: ["DD-6001", "DD-6002"],
          runB: ["DD-6003", "DD-6004"],
        }),
      ]),
      planningStops: PLANNING_STOPS.filter((stop) => stop.orderId !== "DD-6004"),
    });

    expect(result.status).toBe("blocked");
    expect(result.stageStatuses.candidateOutputParse).toBe("completed");
    expect(result.stageStatuses.candidatePlanBuild).toBe("blocked");
    expect(result.stageStatuses.localCandidateRanking).toBe("not_started");
    expect(result.candidateIds.finalistCandidateIds).toHaveLength(0);
    expect(result.errors.join(" ")).toContain(
      "Local planning stops do not exactly match the order set"
    );
  });

  it("keeps a low-score local fallback warning-only instead of marking it ranked", () => {
    const result = runDryRun({
      rawCandidateOutput: buildOutput([
        buildCandidate({
          candidateId: "weak-but-structural",
          runA: ["DD-6003", "DD-6004"],
          runB: ["DD-6001", "DD-6002"],
        }),
      ]),
      minPreferredScore: 101,
    });

    expect(result.status).toBe("fallback_selected");
    expect(result.stageStatuses.localCandidateRanking).toBe("partial");
    expect(result.candidateIds.finalistCandidateIds).toEqual([
      "llm:2026-06-13:weak-but-structural",
    ]);
    expect(result.localRankingResult?.rankedCandidates[0].status).toBe("low_score");
    expect(result.warnings.join(" ")).toContain("warning-only fallback");
  });

  it("respects a zero finalist cap and blocks before any paid preview can be implied", () => {
    const result = runDryRun({
      rawCandidateOutput: buildOutput([
        buildCandidate({
          candidateId: "valid-candidate",
          runA: ["DD-6001", "DD-6002"],
          runB: ["DD-6003", "DD-6004"],
        }),
      ]),
      maxFinalists: 0,
    });

    expect(result.status).toBe("blocked");
    expect(result.stageStatuses.localCandidateRanking).toBe("blocked");
    expect(result.candidateIds.finalistCandidateIds).toHaveLength(0);
    expect(result.candidateIds.localOmittedCandidateIds).toEqual([
      "llm:2026-06-13:valid-candidate",
    ]);
    expect(result.warnings.join(" ")).toContain("finalist limit is zero");
  });

  it("blocks during prompt assembly when the source order set is invalid", () => {
    const result = runDryRun({
      orders: [...ORDER_FACTS, ORDER_FACTS[0]],
      rawCandidateOutput: buildOutput([
        buildCandidate({
          candidateId: "valid-candidate",
          runA: ["DD-6001", "DD-6002"],
          runB: ["DD-6003", "DD-6004"],
        }),
      ]),
    });

    expect(result.status).toBe("blocked");
    expect(result.promptPackage).toBeUndefined();
    expect(result.stageStatuses.promptPackage).toBe("blocked");
    expect(result.stageStatuses.candidateOutputParse).toBe("not_started");
    expect(result.errors.join(" ")).toContain("Duplicate orderId");
  });
});
