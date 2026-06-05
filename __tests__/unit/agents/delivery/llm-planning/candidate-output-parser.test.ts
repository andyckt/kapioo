import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import { parseDeliveryAgentLlmCandidateOutput } from "@/lib/agents/delivery/llm-planning/candidate-output-parser";
import { buildDeliveryAgentLlmPromptPackage } from "@/lib/agents/delivery/llm-planning/prompt-assembly";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import {
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_MAX_CANDIDATES,
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
  deliveryAgentLlmCandidateOutputParseResultSchema,
  type DeliveryAgentLlmCandidateOutput,
  type DeliveryAgentLlmCandidateOutputCandidate,
  type DeliveryAgentLlmPromptPackage,
  type DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";

const ORDERS: DeliveryAgentPlanningFingerprintOrderFact[] = [
  {
    orderId: "DD-3001",
    status: "confirmed",
    area: "Downtown Toronto",
    formattedAddress: "100 King St W, Toronto",
    totalMealQuantity: 1,
    lat: 43.6487,
    lng: -79.3817,
    coordinateConfidence: "high",
    coordinateSource: "delivery_agent_cache",
    planningTags: ["downtown"],
  },
  {
    orderId: "DD-3002",
    status: "confirmed",
    area: "North York",
    formattedAddress: "5000 Yonge St, Toronto",
    totalMealQuantity: 2,
    lat: 43.7661,
    lng: -79.4149,
    coordinateConfidence: "high",
    coordinateSource: "delivery_agent_cache",
    planningTags: ["handoff_candidate", "north"],
  },
  {
    orderId: "DD-3003",
    status: "confirmed",
    area: "Richmond Hill",
    formattedAddress: "30 High Tech Rd, Richmond Hill",
    totalMealQuantity: 1,
    lat: 43.8432,
    lng: -79.3867,
    coordinateConfidence: "high",
    coordinateSource: "delivery_agent_cache",
    planningTags: ["uptown"],
  },
];

function buildPromptPackage(): DeliveryAgentLlmPromptPackage {
  return buildDeliveryAgentLlmPromptPackage({
    deliveryDate: "2026-06-10",
    profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
    policy: createDefaultDeliveryAgentCostPolicy(),
    orders: ORDERS,
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
    reasoningSummary: "Keep downtown and uptown shapes clean before local proof.",
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
      strategy: "Use a Central North York handoff before Run B starts uptown.",
      sourceOrderIds: ["DD-3002"],
      notes: ["Exact meetup proof is deferred to local/RO validation."],
    },
    selfUse: {
      used: runC.length > 0,
      orderIds: runC,
      reason: runC.length > 0 ? "Self is only used as backup pressure relief." : undefined,
    },
    risks: ["Needs Route Optimizer proof before recommendation."],
    historicalCaseIdsUsed: ["positive-case"],
    expectedStrengths: ["Preserves downtown/uptown split."],
    warnings: [],
  };
}

function buildOutput(
  candidates: DeliveryAgentLlmCandidateOutputCandidate[],
  overrides: Partial<DeliveryAgentLlmCandidateOutput> = {}
): DeliveryAgentLlmCandidateOutput {
  return {
    schemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    summary: {
      planningSummary: "Mock candidate plan output for deterministic validation.",
      candidateCount: candidates.length,
      assumptions: ["No route proof has been performed yet."],
    },
    candidates,
    unprovenIdeas: [
      {
        title: "Try a more northern meetup if traffic is unusual",
        reason: "It may reduce receiver detour.",
        risk: "Warning-only idea; not eligible until converted and proved.",
        relatedOrderIds: ["DD-3002"],
      },
    ],
    hardRuleChecklist: {
      allOrdersAssignedExactlyOnce: true,
      noDuplicateOrderIds: true,
      noInventedOrderIds: true,
      selfUsedOnlyAsBackup: true,
      routeOptimizerNotUsedAsSearch: true,
      unprovenIdeasNotRecommended: true,
    },
    warnings: [],
    ...overrides,
  };
}

describe("parseDeliveryAgentLlmCandidateOutput", () => {
  it("accepts valid JSON candidate ideas without treating them as recommendations", () => {
    const promptPackage = buildPromptPackage();
    const output = buildOutput([
      buildCandidate({
        candidateId: "balanced-a",
        runA: ["DD-3001", "DD-3002"],
        runB: ["DD-3003"],
      }),
      buildCandidate({
        candidateId: "uptown-a",
        runA: ["DD-3001"],
        runB: ["DD-3002", "DD-3003"],
      }),
    ]);

    const result = parseDeliveryAgentLlmCandidateOutput({
      promptPackage,
      rawOutput: JSON.stringify(output),
    });

    expect(deliveryAgentLlmCandidateOutputParseResultSchema.parse(result)).toEqual(result);
    expect(result.status).toBe("valid");
    expect(result.planningFingerprint).toBe(
      promptPackage.planningFingerprint.planningFingerprint
    );
    expect(result.acceptedCandidates.map((candidate) => candidate.candidateId)).toEqual([
      "balanced-a",
      "uptown-a",
    ]);
    expect(result.rejectedCandidates).toHaveLength(0);
    expect(result.omittedCandidates).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects markdown or prose instead of silently repairing invalid JSON", () => {
    const result = parseDeliveryAgentLlmCandidateOutput({
      promptPackage: buildPromptPackage(),
      rawOutput: "```json\n{\"schemaVersion\":\"wrong\"}\n```",
    });

    expect(result.status).toBe("invalid");
    expect(result.acceptedCandidates).toHaveLength(0);
    expect(result.issues.map((issue) => issue.code)).toContain("invalid_json");
  });

  it("keeps a valid candidate but rejects candidates with missing, duplicate, or invented orders", () => {
    const goodCandidate = buildCandidate({
      candidateId: "good-a",
      runA: ["DD-3001", "DD-3002"],
      runB: ["DD-3003"],
    });
    const badCandidate = buildCandidate({
      candidateId: "bad-a",
      runA: ["DD-3001", "DD-3001"],
      runB: ["DD-9999"],
    });
    const output = buildOutput([goodCandidate, badCandidate]);

    const result = parseDeliveryAgentLlmCandidateOutput({
      promptPackage: buildPromptPackage(),
      rawOutput: output,
    });

    expect(result.status).toBe("partial_valid");
    expect(result.acceptedCandidates.map((candidate) => candidate.candidateId)).toEqual([
      "good-a",
    ]);
    expect(result.rejectedCandidates.map((candidate) => candidate.candidateId)).toEqual([
      "bad-a",
    ]);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "missing_order_ids",
        "duplicate_order_ids",
        "invented_order_ids",
        "hard_rule_checklist_mismatch",
      ])
    );
  });

  it("rejects repeated candidate IDs because they would make later selection ambiguous", () => {
    const output = buildOutput([
      buildCandidate({
        candidateId: "duplicate-a",
        runA: ["DD-3001", "DD-3002"],
        runB: ["DD-3003"],
      }),
      buildCandidate({
        candidateId: "duplicate-a",
        runA: ["DD-3001"],
        runB: ["DD-3002", "DD-3003"],
      }),
    ]);

    const result = parseDeliveryAgentLlmCandidateOutput({
      promptPackage: buildPromptPackage(),
      rawOutput: output,
    });

    expect(result.status).toBe("invalid");
    expect(result.acceptedCandidates).toHaveLength(0);
    expect(result.rejectedCandidates.map((candidate) => candidate.candidateId)).toEqual([
      "duplicate-a",
      "duplicate-a",
    ]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "duplicate_candidate_id",
          severity: "error",
        }),
      ])
    );
  });

  it("rejects an output that contains no candidate plans", () => {
    const result = parseDeliveryAgentLlmCandidateOutput({
      promptPackage: buildPromptPackage(),
      rawOutput: buildOutput([]),
    });

    expect(result.status).toBe("invalid");
    expect(result.acceptedCandidates).toHaveLength(0);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "no_candidates",
          severity: "error",
        }),
      ])
    );
  });

  it("caps accepted candidates at the hard output limit without requiring another model call", () => {
    const output = buildOutput([
      buildCandidate({ candidateId: "candidate-a", runA: ["DD-3001"], runB: ["DD-3002", "DD-3003"] }),
      buildCandidate({ candidateId: "candidate-b", runA: ["DD-3001", "DD-3002"], runB: ["DD-3003"] }),
      buildCandidate({ candidateId: "candidate-c", runA: ["DD-3002"], runB: ["DD-3001", "DD-3003"] }),
      buildCandidate({ candidateId: "candidate-d", runA: ["DD-3003"], runB: ["DD-3001", "DD-3002"] }),
    ]);

    const result = parseDeliveryAgentLlmCandidateOutput({
      promptPackage: buildPromptPackage(),
      rawOutput: output,
    });

    expect(result.status).toBe("partial_valid");
    expect(result.acceptedCandidates).toHaveLength(
      DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_MAX_CANDIDATES
    );
    expect(result.acceptedCandidates.map((candidate) => candidate.candidateId)).toEqual([
      "candidate-a",
      "candidate-b",
      "candidate-c",
    ]);
    expect(result.omittedCandidates.map((candidate) => candidate.candidateId)).toEqual([
      "candidate-d",
    ]);
    expect(result.warnings.join(" ")).toContain("only the first 3 valid candidate");
  });

  it("ignores unsafe recommendation/proof claims and keeps the output as candidate ideas only", () => {
    const output = {
      ...buildOutput([
        buildCandidate({
          candidateId: "safe-a",
          runA: ["DD-3001", "DD-3002"],
          runB: ["DD-3003"],
        }),
      ]),
      recommendedCandidateId: "safe-a",
      candidates: [
        {
          ...buildCandidate({
            candidateId: "safe-a",
            runA: ["DD-3001", "DD-3002"],
            runB: ["DD-3003"],
          }),
          proven: true,
        },
      ],
    };

    const result = parseDeliveryAgentLlmCandidateOutput({
      promptPackage: buildPromptPackage(),
      rawOutput: output,
    });

    expect(result.status).toBe("partial_valid");
    expect(result.acceptedCandidates.map((candidate) => candidate.candidateId)).toEqual([
      "safe-a",
    ]);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "llm_recommendation_claim_ignored",
        "llm_candidate_proof_claim_ignored",
      ])
    );
  });

  it("warns when selfUse metadata does not match the actual backup run assignment", () => {
    const candidate = buildCandidate({
      candidateId: "self-a",
      runA: ["DD-3001"],
      runB: ["DD-3003"],
      runC: ["DD-3002"],
    });
    const output = buildOutput([
      {
        ...candidate,
        selfUse: {
          used: false,
          orderIds: [],
        },
      },
    ]);

    const result = parseDeliveryAgentLlmCandidateOutput({
      promptPackage: buildPromptPackage(),
      rawOutput: output,
    });

    expect(result.status).toBe("partial_valid");
    expect(result.acceptedCandidates.map((entry) => entry.candidateId)).toEqual(["self-a"]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "self_use_metadata_mismatch",
          severity: "warning",
          candidateId: "self-a",
        }),
      ])
    );
  });
});
