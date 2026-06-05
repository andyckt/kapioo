import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import { buildDeliveryAgentCandidatePlansFromLlmOutput } from "@/lib/agents/delivery/llm-planning/candidate-plan-adapter";
import { parseDeliveryAgentLlmCandidateOutput } from "@/lib/agents/delivery/llm-planning/candidate-output-parser";
import { rankDeliveryAgentLlmLocalCandidatePlans } from "@/lib/agents/delivery/llm-planning/local-candidate-ranking";
import { buildDeliveryAgentLlmPromptPackage } from "@/lib/agents/delivery/llm-planning/prompt-assembly";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import type { CandidatePlan, PlanningStop } from "@/lib/agents/delivery/candidate-plans/types";
import {
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
  type DeliveryAgentLlmCandidateOutput,
  type DeliveryAgentLlmCandidateOutputCandidate,
  type DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";

const ORDER_FACTS: DeliveryAgentPlanningFingerprintOrderFact[] = [
  {
    orderId: "DD-5001",
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
    orderId: "DD-5002",
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
    orderId: "DD-5003",
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
    orderId: "DD-5004",
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
    orderId: "DD-5001",
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
    orderId: "DD-5002",
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
    orderId: "DD-5003",
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
    orderId: "DD-5004",
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

const EXPECTED_ORDER_IDS = ORDER_FACTS.map((order) => order.orderId);

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
    reasoningSummary: "Local ranking test candidate.",
    runs: [
      { runSlot: "A", orderIds: input.runA },
      { runSlot: "B", orderIds: input.runB },
      ...(runC.length > 0 ? [{ runSlot: "C", orderIds: runC }] : []),
    ],
    handoffPlan: {
      required: true,
      providerRunSlot: "A",
      receiverRunSlot: "B",
      strategy: "Use a local Central North York source stop for handoff search.",
      suggestedMeetupArea: "Central North York",
      sourceOrderIds: ["DD-5002"],
    },
    selfUse: {
      used: runC.length > 0,
      orderIds: runC,
      reason: runC.length > 0 ? "Self backup pressure relief." : undefined,
    },
    risks: ["Needs paid route proof before recommendation."],
    historicalCaseIdsUsed: ["case-positive"],
    expectedStrengths: [],
    warnings: [],
  };
}

function buildOutput(candidates: DeliveryAgentLlmCandidateOutputCandidate[]): DeliveryAgentLlmCandidateOutput {
  return {
    schemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    summary: {
      planningSummary: "Mock LLM candidate output for local ranking tests.",
      candidateCount: candidates.length,
      assumptions: ["No paid proof yet."],
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

function buildPlans(candidates: DeliveryAgentLlmCandidateOutputCandidate[]): CandidatePlan[] {
  const promptPackage = buildDeliveryAgentLlmPromptPackage({
    deliveryDate: "2026-06-12",
    profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    policy: createDefaultDeliveryAgentCostPolicy(),
    orders: ORDER_FACTS,
  });
  const parseResult = parseDeliveryAgentLlmCandidateOutput({
    promptPackage,
    rawOutput: buildOutput(candidates),
  });
  const buildResult = buildDeliveryAgentCandidatePlansFromLlmOutput({
    promptPackage,
    parseResult,
    planningStops: PLANNING_STOPS,
    profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
  });

  expect(buildResult.status).not.toBe("blocked");
  return buildResult.candidatePlans;
}

describe("rankDeliveryAgentLlmLocalCandidatePlans", () => {
  it("ranks canonical LLM local plans before any paid preview", () => {
    const plans = buildPlans([
      buildCandidate({
        candidateId: "pattern-good",
        runA: ["DD-5001", "DD-5002"],
        runB: ["DD-5003", "DD-5004"],
      }),
      buildCandidate({
        candidateId: "pattern-bad",
        runA: ["DD-5003", "DD-5004"],
        runB: ["DD-5001", "DD-5002"],
      }),
      buildCandidate({
        candidateId: "self-backup",
        runA: ["DD-5001"],
        runB: ["DD-5003", "DD-5004"],
        runC: ["DD-5002"],
      }),
    ]);

    const result = rankDeliveryAgentLlmLocalCandidatePlans({
      candidatePlans: plans,
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      expectedOrderIds: EXPECTED_ORDER_IDS,
    });

    expect(result.status).toBe("selected");
    expect(result.rankedCandidates[0].candidateId).toBe("llm:2026-06-12:pattern-good");
    expect(result.rankedCandidates[0].score).toBeGreaterThan(
      result.rankedCandidates.find((entry) => entry.candidateId.endsWith("pattern-bad"))!.score
    );
    expect(result.finalistCandidateIds).toContain("llm:2026-06-12:pattern-good");
    expect(result.finalistCandidateIds).toContain("llm:2026-06-12:self-backup");
    expect(result.rankedCandidates.every((entry) => entry.blockingIssues.length === 0)).toBe(true);
  });

  it("blocks structurally corrupted local plans even if they were previously accepted", () => {
    const [plan] = buildPlans([
      buildCandidate({
        candidateId: "corrupted-later",
        runA: ["DD-5001", "DD-5002"],
        runB: ["DD-5003", "DD-5004"],
      }),
    ]);
    const corrupted: CandidatePlan = {
      ...plan,
      runs: plan.runs.map((run) =>
        run.runSlot === "B"
          ? {
              ...run,
              stops: [...run.stops, plan.runs[0].stops[0]],
              stopCount: run.stopCount + 1,
            }
          : run
      ),
    };

    const result = rankDeliveryAgentLlmLocalCandidatePlans({
      candidatePlans: [corrupted],
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      expectedOrderIds: EXPECTED_ORDER_IDS,
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedCandidateIds).toEqual(["llm:2026-06-12:corrupted-later"]);
    expect(result.rankedCandidates[0].blockingIssues.join(" ")).toContain(
      "duplicate order IDs"
    );
  });

  it("blocks locally mutated plans that are missing expected orders", () => {
    const [plan] = buildPlans([
      buildCandidate({
        candidateId: "missing-later",
        runA: ["DD-5001", "DD-5002"],
        runB: ["DD-5003", "DD-5004"],
      }),
    ]);
    const missingOrderPlan: CandidatePlan = {
      ...plan,
      runs: plan.runs.map((run) =>
        run.runSlot === "B"
          ? {
              ...run,
              stops: run.stops.filter((stop) => stop.orderId !== "DD-5004"),
              stopCount: run.stopCount - 1,
              totalMealQuantity: run.totalMealQuantity - 1,
            }
          : run
      ),
      summary: {
        ...plan.summary,
        totalStops: plan.summary.totalStops - 1,
        totalMeals: plan.summary.totalMeals - 1,
        byRun: {
          ...plan.summary.byRun,
          B: (plan.summary.byRun.B ?? 0) - 1,
        },
      },
    };

    const result = rankDeliveryAgentLlmLocalCandidatePlans({
      candidatePlans: [missingOrderPlan],
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      expectedOrderIds: EXPECTED_ORDER_IDS,
    });

    expect(result.status).toBe("blocked");
    expect(result.rankedCandidates[0].blockingIssues.join(" ")).toContain(
      "missing expected order IDs: DD-5004"
    );
  });

  it("blocks locally mutated plans that invent unexpected orders", () => {
    const [plan] = buildPlans([
      buildCandidate({
        candidateId: "invented-later",
        runA: ["DD-5001", "DD-5002"],
        runB: ["DD-5003", "DD-5004"],
      }),
    ]);
    const inventedOrderPlan: CandidatePlan = {
      ...plan,
      runs: plan.runs.map((run) => ({
        ...run,
        stops: run.stops.map((stop) =>
          stop.orderId === "DD-5004"
            ? {
                ...stop,
                orderId: "DD-9999",
              }
            : stop
        ),
      })),
    };

    const result = rankDeliveryAgentLlmLocalCandidatePlans({
      candidatePlans: [inventedOrderPlan],
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      expectedOrderIds: EXPECTED_ORDER_IDS,
    });

    const issues = result.rankedCandidates[0].blockingIssues.join(" ");

    expect(result.status).toBe("blocked");
    expect(issues).toContain("missing expected order IDs: DD-5004");
    expect(issues).toContain("unexpected order IDs: DD-9999");
  });

  it("uses a warning-only low-score fallback instead of silently returning no plan", () => {
    const plans = buildPlans([
      buildCandidate({
        candidateId: "weak-but-structural",
        runA: ["DD-5003", "DD-5004"],
        runB: ["DD-5001", "DD-5002"],
      }),
    ]);

    const result = rankDeliveryAgentLlmLocalCandidatePlans({
      candidatePlans: plans,
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      expectedOrderIds: EXPECTED_ORDER_IDS,
      minPreferredScore: 101,
    });

    expect(result.status).toBe("fallback_selected");
    expect(result.finalistCandidateIds).toEqual(["llm:2026-06-12:weak-but-structural"]);
    expect(result.rankedCandidates[0].status).toBe("low_score");
    expect(result.warnings.join(" ")).toContain("warning-only fallback");
  });

  it("penalizes same-address groups that are split across runs", () => {
    const [basePlan] = buildPlans([
      buildCandidate({
        candidateId: "same-building-split",
        runA: ["DD-5001", "DD-5002"],
        runB: ["DD-5003", "DD-5004"],
      }),
    ]);
    const sameBuildingPlan: CandidatePlan = {
      ...basePlan,
      runs: basePlan.runs.map((run) => ({
        ...run,
        stops: run.stops.map((stop) =>
          stop.orderId === "DD-5001" || stop.orderId === "DD-5003"
            ? {
                ...stop,
                formattedAddress:
                  stop.orderId === "DD-5001"
                    ? "88 Shared St Unit 100, Toronto"
                    : "88 Shared St Unit 200, Toronto",
              }
            : stop
        ),
      })),
    };

    const result = rankDeliveryAgentLlmLocalCandidatePlans({
      candidatePlans: [sameBuildingPlan],
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      expectedOrderIds: EXPECTED_ORDER_IDS,
    });
    const groupingItem = result.rankedCandidates[0].scoreBreakdown.find(
      (item) => item.key === "sameAddressGrouping"
    );

    expect(groupingItem?.points).toBeLessThan(100);
    expect(result.warnings.join(" ")).toContain("Same-address order group split");
  });

  it("respects a zero finalist cap without treating omitted plans as recommended", () => {
    const plans = buildPlans([
      buildCandidate({
        candidateId: "candidate-a",
        runA: ["DD-5001", "DD-5002"],
        runB: ["DD-5003", "DD-5004"],
      }),
    ]);

    const result = rankDeliveryAgentLlmLocalCandidatePlans({
      candidatePlans: plans,
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      expectedOrderIds: EXPECTED_ORDER_IDS,
      maxFinalists: 0,
    });

    expect(result.status).toBe("blocked");
    expect(result.finalistCandidateIds).toHaveLength(0);
    expect(result.omittedCandidateIds).toEqual(["llm:2026-06-12:candidate-a"]);
    expect(result.warnings.join(" ")).toContain("finalist limit is zero");
  });
});
