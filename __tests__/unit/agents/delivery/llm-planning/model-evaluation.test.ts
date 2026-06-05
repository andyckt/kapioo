import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import {
  buildDeliveryAgentLlmEvaluationScenarioFromLearningCase,
  evaluateDeliveryAgentLlmModelRuns,
} from "@/lib/agents/delivery/llm-planning/model-evaluation";
import {
  DELIVERY_AGENT_LLM_EVALUATION_REPORT_VERSION,
  deliveryAgentLlmEvaluationReportSchema,
} from "@/lib/contracts/delivery-agent-llm-planning";
import type {
  DeliveryAgentLlmEvaluationRun,
  DeliveryAgentLlmEvaluationScenario,
} from "@/lib/contracts/delivery-agent-llm-planning";
import type { DeliveryAgentLearningCaseContract } from "@/lib/contracts/delivery-agent-learning";
import { buildFullLearningCasePayload } from "@/__tests__/unit/agents/delivery/learning/learning-case-fixtures";

type LearningCaseOverrides = Omit<
  Partial<DeliveryAgentLearningCaseContract>,
  | "quality"
  | "matchCoverage"
  | "geoFeatures"
  | "routeShapeFeatures"
  | "stopControlFeatures"
  | "outcomeFeatures"
> & {
  quality?: Partial<DeliveryAgentLearningCaseContract["quality"]>;
  matchCoverage?: Partial<DeliveryAgentLearningCaseContract["matchCoverage"]>;
  geoFeatures?: Partial<DeliveryAgentLearningCaseContract["geoFeatures"]>;
  routeShapeFeatures?: Partial<DeliveryAgentLearningCaseContract["routeShapeFeatures"]>;
  stopControlFeatures?: Partial<DeliveryAgentLearningCaseContract["stopControlFeatures"]>;
  outcomeFeatures?: Partial<DeliveryAgentLearningCaseContract["outcomeFeatures"]>;
};

type EvaluationRunOverrides = Omit<
  Partial<DeliveryAgentLlmEvaluationRun>,
  "hardRuleChecks" | "quality" | "cost"
> & {
  hardRuleChecks?: Partial<DeliveryAgentLlmEvaluationRun["hardRuleChecks"]>;
  quality?: Partial<DeliveryAgentLlmEvaluationRun["quality"]>;
  cost?: Partial<DeliveryAgentLlmEvaluationRun["cost"]>;
};

const HARD_RULES_PASS = {
  validStructuredOutput: true,
  allOrdersAssignedExactlyOnce: true,
  noDuplicateOrderIds: true,
  noInventedOrderIds: true,
  deadlineSatisfied: true,
  routeProofQualified: true,
  recommendationIsProven: true,
};

function buildCase(overrides: LearningCaseOverrides = {}): DeliveryAgentLearningCaseContract {
  const base = buildFullLearningCasePayload() as unknown as DeliveryAgentLearningCaseContract;

  return {
    ...base,
    ...overrides,
    quality: {
      ...base.quality,
      dataQualityScore: 90,
      learningLabel: "positive",
      learningWeight: 0.9,
      ...overrides.quality,
    },
    matchCoverage: {
      ...base.matchCoverage,
      totalOrders: 8,
      matchedOrders: 8,
      matchCoveragePercent: 100,
      ...overrides.matchCoverage,
    },
    geoFeatures: {
      ...base.geoFeatures,
      dynamicOutliers: [],
      ...overrides.geoFeatures,
    },
    routeShapeFeatures: {
      ...base.routeShapeFeatures,
      runCount: 2,
      handoffStartRunCount: 0,
      selfRunUsed: false,
      supportRunUsed: false,
      ...overrides.routeShapeFeatures,
    },
    stopControlFeatures: {
      ...base.stopControlFeatures,
      fixedStopsUsed: false,
      endStopsUsed: false,
      firstStopsUsed: false,
      ...overrides.stopControlFeatures,
    },
    outcomeFeatures: {
      ...base.outcomeFeatures,
      runCompletedBefore1pm: true,
      deadlineBufferMinutes: 15,
      lateMinutes: 0,
      ...overrides.outcomeFeatures,
    },
  };
}

function buildScenario(
  caseKey: string,
  overrides: LearningCaseOverrides = {}
): DeliveryAgentLlmEvaluationScenario {
  return buildDeliveryAgentLlmEvaluationScenarioFromLearningCase(
    buildCase({ caseKey, ...overrides })
  );
}

function buildRun(
  scenarioId: string,
  modelTier: DeliveryAgentLlmEvaluationRun["modelTier"],
  overrides: EvaluationRunOverrides = {}
): DeliveryAgentLlmEvaluationRun {
  const base: DeliveryAgentLlmEvaluationRun = {
    scenarioId,
    modelTier,
    modelProvider: "test-provider",
    modelId: `${modelTier}-model`,
    promptVersion: "candidate-prompt-v1",
    outputSchemaVersion: "candidate-output-v1",
    planningFingerprint: `fingerprint:${scenarioId}:${modelTier}`,
    callType: "daily_candidate_generation",
    status: "completed",
    hardRuleChecks: HARD_RULES_PASS,
    quality: {
      score: modelTier === "strong" ? 92 : 90,
      recommendationStatus: "recommended",
      qualifiedCandidateCount: 1,
      recommendedCandidateId: `${scenarioId}:${modelTier}:recommended`,
    },
    cost: {
      llmCallCount: 1,
      optimizePreviewCallsUsed: 2,
      repairPreviewCallsUsed: 0,
    },
    warnings: [],
    errors: [],
  };

  return {
    ...base,
    ...overrides,
    hardRuleChecks: {
      ...base.hardRuleChecks,
      ...overrides.hardRuleChecks,
    },
    quality: {
      ...base.quality,
      ...overrides.quality,
    },
    cost: {
      ...base.cost,
      ...overrides.cost,
    },
  };
}

function buildEvaluationPolicy() {
  return createDefaultDeliveryAgentCostPolicy({
    evaluationGate: {
      minHistoricalScenarioCount: 2,
      minHardRulePassRatePercent: 98,
      minQualifiedRecommendationRatePercent: 90,
      maxCriticalFailureCount: 0,
      maxAverageScoreGapToStrong: 5,
      maxP95ScoreGapToStrong: 10,
      maxAverageOptimizePreviewCalls: 3,
    },
  });
}

describe("delivery-agent LLM model evaluation", () => {
  it("builds scenario complexity and exclusion status from a learning case", () => {
    const easy = buildScenario("easy-case");
    const complex = buildScenario("complex-case", {
      matchCoverage: { totalOrders: 28 },
      routeShapeFeatures: { handoffStartRunCount: 1 },
      geoFeatures: {
        dynamicOutliers: [
          {
            ref: "order:far-north",
            orderId: "far-north",
            distanceFromCenterKm: 14,
            direction: "far_north",
            reason: "far north",
          },
        ],
      },
    });
    const rescue = buildScenario("rescue-case", {
      routeShapeFeatures: { selfRunUsed: true, supportRunUsed: true },
    });
    const pending = buildScenario("pending-case", { reviewStatus: "pending" });

    expect(easy.complexity).toBe("easy");
    expect(complex.complexity).toBe("complex");
    expect(complex.requiredCapabilities).toEqual(
      expect.arrayContaining(["handoff_logic", "outlier_handling"])
    );
    expect(rescue.complexity).toBe("rescue");
    expect(pending.canUseForEvaluation).toBe(false);
    expect(pending.exclusionReasons).toContain("learning_case_pending_review");
  });

  it("approves a cheap model only within the historical complexity scope it passed", () => {
    const scenarios = [buildScenario("case-1"), buildScenario("case-2")];
    const runs = scenarios.flatMap((scenario) => [
      buildRun(scenario.scenarioId, "strong", {
        quality: { score: 92 },
      }),
      buildRun(scenario.scenarioId, "cheap", {
        quality: { score: 89 },
      }),
    ]);

    const report = evaluateDeliveryAgentLlmModelRuns({
      scenarios,
      runs,
      policy: buildEvaluationPolicy(),
      evaluatedAt: "2026-06-05T12:00:00.000Z",
    });
    const cheapSummary = report.summaries.find((summary) => summary.modelTier === "cheap");
    const strongSummary = report.summaries.find((summary) => summary.modelTier === "strong");

    expect(deliveryAgentLlmEvaluationReportSchema.parse(report).reportVersion).toBe(
      DELIVERY_AGENT_LLM_EVALUATION_REPORT_VERSION
    );
    expect(strongSummary?.approvalDecision).toBe("approved_as_strong_baseline");
    expect(cheapSummary?.approvalDecision).toBe("approved_for_easy_days");
    expect(cheapSummary?.averageScoreGapToStrong).toBe(3);
    expect(cheapSummary?.blockingReasons).toEqual([]);
  });

  it("blocks cheap model approval without a strong baseline for every scenario", () => {
    const scenarios = [buildScenario("case-1"), buildScenario("case-2")];
    const runs = scenarios.map((scenario) => buildRun(scenario.scenarioId, "cheap"));

    const report = evaluateDeliveryAgentLlmModelRuns({
      scenarios,
      runs,
      policy: buildEvaluationPolicy(),
    });
    const cheapSummary = report.summaries.find((summary) => summary.modelTier === "cheap");

    expect(cheapSummary?.approvalDecision).toBe("not_approved");
    expect(cheapSummary?.blockingReasons).toContain(
      "Cheap model approval requires a strong-model baseline for every evaluated scenario."
    );
  });

  it("blocks a model after any critical hard-rule failure", () => {
    const scenarios = [buildScenario("case-1"), buildScenario("case-2")];
    const runs = [
      buildRun("case-1", "strong"),
      buildRun("case-2", "strong"),
      buildRun("case-1", "cheap"),
      buildRun("case-2", "cheap", {
        hardRuleChecks: {
          noInventedOrderIds: false,
          recommendationIsProven: false,
        },
        quality: {
          score: 80,
          recommendationStatus: "risky",
          qualifiedCandidateCount: 0,
        },
        errors: ["invented_order_id"],
      }),
    ];

    const report = evaluateDeliveryAgentLlmModelRuns({
      scenarios,
      runs,
      policy: buildEvaluationPolicy(),
    });
    const cheapSummary = report.summaries.find((summary) => summary.modelTier === "cheap");

    expect(cheapSummary?.approvalDecision).toBe("not_approved");
    expect(cheapSummary?.criticalFailureCount).toBe(1);
    expect(cheapSummary?.blockingReasons).toEqual(
      expect.arrayContaining([
        "Critical failures 1 exceed allowed 0.",
        "Hard-rule pass rate 50% is below 98%.",
      ])
    );
  });

  it("blocks a cheaper model when it would cause too many Route Optimizer preview calls", () => {
    const scenarios = [buildScenario("case-1"), buildScenario("case-2")];
    const runs = scenarios.flatMap((scenario) => [
      buildRun(scenario.scenarioId, "strong"),
      buildRun(scenario.scenarioId, "cheap", {
        cost: {
          optimizePreviewCallsUsed: 5,
        },
      }),
    ]);

    const report = evaluateDeliveryAgentLlmModelRuns({
      scenarios,
      runs,
      policy: buildEvaluationPolicy(),
    });
    const cheapSummary = report.summaries.find((summary) => summary.modelTier === "cheap");

    expect(cheapSummary?.approvalDecision).toBe("not_approved");
    expect(cheapSummary?.blockingReasons).toContain(
      "Average optimize-preview calls 5 exceeds 3."
    );
  });

  it("warns and produces no approved model when no usable historical scenarios exist", () => {
    const report = evaluateDeliveryAgentLlmModelRuns({
      scenarios: [
        buildScenario("pending-case", { reviewStatus: "pending" }),
        buildScenario("excluded-case", {
          quality: {
            learningLabel: "excluded",
            dataQualityScore: 95,
            learningWeight: 0,
            canUseForPositiveRetrieval: false,
          },
        }),
      ],
      runs: [buildRun("pending-case", "cheap"), buildRun("excluded-case", "strong")],
      policy: buildEvaluationPolicy(),
    });

    expect(report.usableScenarioCount).toBe(0);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        "2 scenario(s) were ignored because they are pending, excluded, or too low quality.",
        "No usable historical scenarios were available for LLM model evaluation.",
      ])
    );
    expect(report.summaries.every((summary) => summary.approvalDecision === "not_approved")).toBe(
      true
    );
  });
});
