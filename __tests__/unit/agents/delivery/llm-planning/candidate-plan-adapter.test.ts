import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import { buildDeliveryAgentCandidatePlansFromLlmOutput } from "@/lib/agents/delivery/llm-planning/candidate-plan-adapter";
import { parseDeliveryAgentLlmCandidateOutput } from "@/lib/agents/delivery/llm-planning/candidate-output-parser";
import { buildDeliveryAgentLlmPromptPackage } from "@/lib/agents/delivery/llm-planning/prompt-assembly";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import type { PlanningStop } from "@/lib/agents/delivery/candidate-plans/types";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import {
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
  type DeliveryAgentLlmCandidateOutput,
  type DeliveryAgentLlmCandidateOutputCandidate,
  type DeliveryAgentLlmCandidateOutputParseResult,
  type DeliveryAgentLlmPromptPackage,
  type DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";

const ORDER_FACTS: DeliveryAgentPlanningFingerprintOrderFact[] = [
  {
    orderId: "DD-4001",
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
    orderId: "DD-4002",
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
    orderId: "DD-4003",
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

const PLANNING_STOPS: PlanningStop[] = [
  {
    orderId: "DD-4001",
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
    orderId: "DD-4002",
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
    orderId: "DD-4003",
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
];

function buildPromptPackage(): DeliveryAgentLlmPromptPackage {
  return buildDeliveryAgentLlmPromptPackage({
    deliveryDate: "2026-06-11",
    profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    policy: createDefaultDeliveryAgentCostPolicy(),
    orders: ORDER_FACTS,
  });
}

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
    reasoningSummary: "Use current order geography to create an exact local split draft.",
    runs: [
      {
        runSlot: "A",
        orderIds: input.runA,
      },
      {
        runSlot: "B",
        orderIds: input.runB,
      },
      ...(runC.length > 0
        ? [
            {
              runSlot: "C",
              orderIds: runC,
            },
          ]
        : []),
    ],
    handoffPlan: {
      required: true,
      providerRunSlot: "A",
      receiverRunSlot: "B",
      strategy: "Use North York source stop as handoff search hint.",
      suggestedMeetupArea: "Central North York",
      sourceOrderIds: ["DD-4002"],
    },
    selfUse: {
      used: runC.length > 0,
      orderIds: runC,
      reason: runC.length > 0 ? "Use Self only as backup pressure relief." : undefined,
    },
    risks: ["Needs local and Route Optimizer proof before recommendation."],
    historicalCaseIdsUsed: ["case-positive"],
    expectedStrengths: ["Keeps Richmond Hill with the uptown run."],
    warnings: [],
  };
}

function buildOutput(candidates: DeliveryAgentLlmCandidateOutputCandidate[]): DeliveryAgentLlmCandidateOutput {
  return {
    schemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    summary: {
      planningSummary: "Mock LLM candidate output for adapter tests.",
      candidateCount: candidates.length,
      assumptions: ["No paid preview has been run."],
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

function parseOutput(input: {
  promptPackage: DeliveryAgentLlmPromptPackage;
  candidates: DeliveryAgentLlmCandidateOutputCandidate[];
}): DeliveryAgentLlmCandidateOutputParseResult {
  return parseDeliveryAgentLlmCandidateOutput({
    promptPackage: input.promptPackage,
    rawOutput: buildOutput(input.candidates),
  });
}

describe("buildDeliveryAgentCandidatePlansFromLlmOutput", () => {
  it("builds local candidate plans from accepted LLM ideas using canonical candidate-plan shape", () => {
    const promptPackage = buildPromptPackage();
    const parseResult = parseOutput({
      promptPackage,
      candidates: [
        buildCandidate({
          candidateId: "balanced-a",
          runA: ["DD-4001", "DD-4002"],
          runB: ["DD-4003"],
        }),
      ],
    });

    const result = buildDeliveryAgentCandidatePlansFromLlmOutput({
      promptPackage,
      parseResult,
      planningStops: PLANNING_STOPS,
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    });

    expect(result.status).toBe("built");
    expect(result.candidatePlans).toHaveLength(1);

    const [plan] = result.candidatePlans;
    expect(plan.candidateId).toBe("llm:2026-06-11:balanced-a");
    expect(plan.strategyType).toBe("llm_generated");
    expect(plan.profileId).toBe(DEFAULT_DELIVERY_PLANNING_PROFILE.profileId);
    expect(plan.summary.totalStops).toBe(3);
    expect(plan.summary.totalMeals).toBe(4);
    expect(plan.summary.byRun).toMatchObject({ A: 2, B: 1 });
    expect(plan.summary.selfUsed).toBe(false);
    expect(plan.runs.find((run) => run.runSlot === "A")?.stops.map((stop) => stop.orderId)).toEqual([
      "DD-4001",
      "DD-4002",
    ]);
    expect(plan.runs.find((run) => run.runSlot === "B")?.stops.map((stop) => stop.orderId)).toEqual([
      "DD-4003",
    ]);
    expect(plan.assumptions.join(" ")).toContain("accepted LLM candidate idea");
    expect(plan.handoffPlan.note).toContain("Central North York");
  });

  it("preserves Self run assignments and marks self usage in the local summary", () => {
    const promptPackage = buildPromptPackage();
    const parseResult = parseOutput({
      promptPackage,
      candidates: [
        buildCandidate({
          candidateId: "self-a",
          runA: ["DD-4001"],
          runB: ["DD-4003"],
          runC: ["DD-4002"],
        }),
      ],
    });

    const result = buildDeliveryAgentCandidatePlansFromLlmOutput({
      promptPackage,
      parseResult,
      planningStops: PLANNING_STOPS,
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    });

    const [plan] = result.candidatePlans;
    expect(result.status).toBe("built");
    expect(plan.summary.selfUsed).toBe(true);
    expect(plan.summary.selfStopCount).toBe(1);
    expect(plan.summary.byRun).toMatchObject({ A: 1, B: 1, C: 1 });
    expect(plan.runs.find((run) => run.runSlot === "C")?.stops.map((stop) => stop.orderId)).toEqual([
      "DD-4002",
    ]);
  });

  it("blocks stale model output when local planning stops do not match the prompt order set", () => {
    const promptPackage = buildPromptPackage();
    const parseResult = parseOutput({
      promptPackage,
      candidates: [
        buildCandidate({
          candidateId: "balanced-a",
          runA: ["DD-4001", "DD-4002"],
          runB: ["DD-4003"],
        }),
      ],
    });

    const result = buildDeliveryAgentCandidatePlansFromLlmOutput({
      promptPackage,
      parseResult,
      planningStops: [
        ...PLANNING_STOPS,
        {
          ...PLANNING_STOPS[0],
          orderId: "DD-4999",
        },
      ],
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    });

    expect(result.status).toBe("blocked");
    expect(result.candidatePlans).toHaveLength(0);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "planning_stop_prompt_order_mismatch",
          severity: "error",
        }),
      ])
    );
  });

  it("blocks when the parse result planning fingerprint does not match the prompt package", () => {
    const promptPackage = buildPromptPackage();
    const parseResult = {
      ...parseOutput({
        promptPackage,
        candidates: [
          buildCandidate({
            candidateId: "balanced-a",
            runA: ["DD-4001", "DD-4002"],
            runB: ["DD-4003"],
          }),
        ],
      }),
      planningFingerprint: "wrong-fingerprint",
    };

    const result = buildDeliveryAgentCandidatePlansFromLlmOutput({
      promptPackage,
      parseResult,
      planningStops: PLANNING_STOPS,
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    });

    expect(result.status).toBe("blocked");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "planning_fingerprint_mismatch",
          severity: "error",
        }),
      ])
    );
  });

  it("rechecks accepted candidates and rejects impossible conversion inputs", () => {
    const promptPackage = buildPromptPackage();
    const parseResult = parseOutput({
      promptPackage,
      candidates: [
        buildCandidate({
          candidateId: "balanced-a",
          runA: ["DD-4001", "DD-4002"],
          runB: ["DD-4003"],
        }),
      ],
    });
    const corruptedParseResult = {
      ...parseResult,
      acceptedCandidates: [
        {
          ...parseResult.acceptedCandidates[0],
          runs: [
            {
              runSlot: "A",
              orderIds: ["DD-4001", "DD-9999"],
            },
            {
              runSlot: "B",
              orderIds: ["DD-4003"],
            },
          ],
        },
      ],
    };

    const result = buildDeliveryAgentCandidatePlansFromLlmOutput({
      promptPackage,
      parseResult: corruptedParseResult,
      planningStops: PLANNING_STOPS,
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    });

    expect(result.status).toBe("blocked");
    expect(result.candidatePlans).toHaveLength(0);
    expect(result.rejectedCandidateIds).toEqual(["balanced-a"]);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "candidate_references_missing_planning_stop",
        "candidate_missing_assignments",
      ])
    );
  });

  it("caps built candidate plans without changing the parsed output", () => {
    const promptPackage = buildPromptPackage();
    const parseResult = parseOutput({
      promptPackage,
      candidates: [
        buildCandidate({ candidateId: "candidate-a", runA: ["DD-4001"], runB: ["DD-4002", "DD-4003"] }),
        buildCandidate({ candidateId: "candidate-b", runA: ["DD-4001", "DD-4002"], runB: ["DD-4003"] }),
        buildCandidate({ candidateId: "candidate-c", runA: ["DD-4002"], runB: ["DD-4001", "DD-4003"] }),
      ],
    });

    const result = buildDeliveryAgentCandidatePlansFromLlmOutput({
      promptPackage,
      parseResult,
      planningStops: PLANNING_STOPS,
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      maxCandidatePlans: 2,
    });

    expect(result.status).toBe("partial");
    expect(result.candidatePlans.map((plan) => plan.candidateId)).toEqual([
      "llm:2026-06-11:candidate-a",
      "llm:2026-06-11:candidate-b",
    ]);
    expect(result.omittedCandidateIds).toEqual(["candidate-c"]);
  });

  it("blocks when a different planning profile is passed into the adapter", () => {
    const promptPackage = buildPromptPackage();
    const parseResult = parseOutput({
      promptPackage,
      candidates: [
        buildCandidate({
          candidateId: "balanced-a",
          runA: ["DD-4001", "DD-4002"],
          runB: ["DD-4003"],
        }),
      ],
    });
    const wrongProfile: DeliveryPlanningProfile = {
      ...DEFAULT_DELIVERY_PLANNING_PROFILE,
      profileVersion: "different-profile-version",
    };

    const result = buildDeliveryAgentCandidatePlansFromLlmOutput({
      promptPackage,
      parseResult,
      planningStops: PLANNING_STOPS,
      profile: wrongProfile,
    });

    expect(result.status).toBe("blocked");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "profile_mismatch",
          severity: "error",
        }),
      ])
    );
  });
});
