import type { DeliveryAgentCostPolicy } from "@/lib/contracts/delivery-agent-cost-policy";
import type { DeliveryAgentLearningCaseContract } from "@/lib/contracts/delivery-agent-learning";
import {
  DELIVERY_AGENT_LLM_EVALUATION_REPORT_VERSION,
  type DeliveryAgentLlmEvaluationRun,
  type DeliveryAgentLlmEvaluationScenario,
  type DeliveryAgentLlmEvaluationScenarioComplexity,
  type DeliveryAgentLlmModelApprovalDecision,
  type DeliveryAgentLlmModelEvaluationSummary,
  type DeliveryAgentLlmEvaluationReport,
} from "@/lib/contracts/delivery-agent-llm-planning";

type ModelKey = string;

type ModelRunGroup = {
  key: ModelKey;
  modelTier: DeliveryAgentLlmEvaluationRun["modelTier"];
  modelProvider: string;
  modelId: string;
  runs: DeliveryAgentLlmEvaluationRun[];
};

function uniqueStrings(values: string[]): string[] {
  return [
    ...new Set(values.filter((value) => value.trim()).map((value) => value.trim())),
  ];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return round1((numerator / denominator) * 100);
}

function average(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function p95(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return round1(sorted[index] ?? 0);
}

function modelKey(run: DeliveryAgentLlmEvaluationRun): ModelKey {
  return `${run.modelTier}:${run.modelProvider}:${run.modelId}`;
}

function allHardRulesPass(run: DeliveryAgentLlmEvaluationRun): boolean {
  return Object.values(run.hardRuleChecks).every(Boolean);
}

function hasCriticalFailure(run: DeliveryAgentLlmEvaluationRun): boolean {
  if (run.status !== "completed") {
    return true;
  }

  return !allHardRulesPass(run);
}

function hasQualifiedRecommendation(run: DeliveryAgentLlmEvaluationRun): boolean {
  if (hasCriticalFailure(run)) {
    return false;
  }

  const status = run.quality.recommendationStatus;
  const qualifiedCount = run.quality.qualifiedCandidateCount ?? 0;

  return (
    qualifiedCount > 0 &&
    (status === "recommended" || status === "acceptable")
  );
}

function groupModelRuns(runs: DeliveryAgentLlmEvaluationRun[]): ModelRunGroup[] {
  const groups = new Map<ModelKey, ModelRunGroup>();

  for (const run of runs) {
    const key = modelKey(run);
    const existing = groups.get(key);
    if (existing) {
      existing.runs.push(run);
      continue;
    }

    groups.set(key, {
      key,
      modelTier: run.modelTier,
      modelProvider: run.modelProvider,
      modelId: run.modelId,
      runs: [run],
    });
  }

  return [...groups.values()];
}

function selectStrongBaselineByScenario(
  runs: DeliveryAgentLlmEvaluationRun[]
): Map<string, DeliveryAgentLlmEvaluationRun> {
  const baseline = new Map<string, DeliveryAgentLlmEvaluationRun>();

  for (const run of runs) {
    if (run.modelTier !== "strong" || !hasQualifiedRecommendation(run)) {
      continue;
    }

    const existing = baseline.get(run.scenarioId);
    const runScore = run.quality.score ?? 0;
    const existingScore = existing?.quality.score ?? -1;
    if (!existing || runScore > existingScore) {
      baseline.set(run.scenarioId, run);
    }
  }

  return baseline;
}

function collectScoreGaps(input: {
  runs: DeliveryAgentLlmEvaluationRun[];
  strongBaselineByScenario: Map<string, DeliveryAgentLlmEvaluationRun>;
}): number[] {
  const gaps: number[] = [];

  for (const run of input.runs) {
    const runScore = run.quality.score;
    const baselineScore = input.strongBaselineByScenario.get(run.scenarioId)?.quality.score;
    if (typeof runScore !== "number" || typeof baselineScore !== "number") {
      continue;
    }

    gaps.push(Math.max(0, baselineScore - runScore));
  }

  return gaps;
}

function decisionForPassingModel(input: {
  modelTier: DeliveryAgentLlmEvaluationRun["modelTier"];
  coveredComplexities: DeliveryAgentLlmEvaluationScenarioComplexity[];
}): DeliveryAgentLlmModelApprovalDecision {
  if (input.modelTier === "strong") {
    return "approved_as_strong_baseline";
  }

  if (input.modelTier === "rescue") {
    return "approved_for_rescue_planning";
  }

  if (input.coveredComplexities.includes("rescue")) {
    return "not_approved";
  }

  if (input.coveredComplexities.includes("complex")) {
    return "approved_for_complex_days";
  }

  if (input.coveredComplexities.includes("normal")) {
    return "approved_for_normal_days";
  }

  return "approved_for_easy_days";
}

function buildApprovalReasons(summary: {
  modelTier: DeliveryAgentLlmEvaluationRun["modelTier"];
  coveredComplexities: DeliveryAgentLlmEvaluationScenarioComplexity[];
}): string[] {
  if (summary.modelTier === "cheap") {
    return [
      `Cheap model passed evaluation for ${summary.coveredComplexities.join(", ")} scenario(s).`,
      "Cheap model can be considered only within the approved complexity scope.",
    ];
  }

  if (summary.modelTier === "strong") {
    return ["Strong model passed as the comparison baseline."];
  }

  return ["Rescue model passed for rescue planning evaluation."];
}

function buildBlockingReasons(input: {
  modelTier: DeliveryAgentLlmEvaluationRun["modelTier"];
  scenarioCount: number;
  criticalFailureCount: number;
  hardRulePassRatePercent: number;
  qualifiedRecommendationRatePercent: number;
  averageScoreGapToStrong?: number;
  p95ScoreGapToStrong?: number;
  averageOptimizePreviewCalls: number;
  strongBaselineScenarioCount: number;
  coveredComplexities: DeliveryAgentLlmEvaluationScenarioComplexity[];
  policy: DeliveryAgentCostPolicy;
}): string[] {
  const gate = input.policy.evaluationGate;
  const reasons: string[] = [];

  if (input.scenarioCount < gate.minHistoricalScenarioCount) {
    reasons.push(
      `Needs at least ${gate.minHistoricalScenarioCount} historical scenarios; only ${input.scenarioCount} evaluated.`
    );
  }

  if (input.criticalFailureCount > gate.maxCriticalFailureCount) {
    reasons.push(
      `Critical failures ${input.criticalFailureCount} exceed allowed ${gate.maxCriticalFailureCount}.`
    );
  }

  if (input.hardRulePassRatePercent < gate.minHardRulePassRatePercent) {
    reasons.push(
      `Hard-rule pass rate ${input.hardRulePassRatePercent}% is below ${gate.minHardRulePassRatePercent}%.`
    );
  }

  if (
    input.qualifiedRecommendationRatePercent <
    gate.minQualifiedRecommendationRatePercent
  ) {
    reasons.push(
      `Qualified recommendation rate ${input.qualifiedRecommendationRatePercent}% is below ${gate.minQualifiedRecommendationRatePercent}%.`
    );
  }

  if (
    typeof input.averageScoreGapToStrong === "number" &&
    input.averageScoreGapToStrong > gate.maxAverageScoreGapToStrong
  ) {
    reasons.push(
      `Average score gap to strong model ${input.averageScoreGapToStrong} exceeds ${gate.maxAverageScoreGapToStrong}.`
    );
  }

  if (
    typeof input.p95ScoreGapToStrong === "number" &&
    input.p95ScoreGapToStrong > gate.maxP95ScoreGapToStrong
  ) {
    reasons.push(
      `P95 score gap to strong model ${input.p95ScoreGapToStrong} exceeds ${gate.maxP95ScoreGapToStrong}.`
    );
  }

  if (input.averageOptimizePreviewCalls > gate.maxAverageOptimizePreviewCalls) {
    reasons.push(
      `Average optimize-preview calls ${input.averageOptimizePreviewCalls} exceeds ${gate.maxAverageOptimizePreviewCalls}.`
    );
  }

  if (
    input.modelTier === "cheap" &&
    gate.requireStrongBaselineForCheapCandidateGeneration &&
    input.strongBaselineScenarioCount < input.scenarioCount
  ) {
    reasons.push("Cheap model approval requires a strong-model baseline for every evaluated scenario.");
  }

  if (input.modelTier === "cheap" && input.coveredComplexities.includes("rescue")) {
    reasons.push("Cheap model cannot be approved for rescue planning scenarios.");
  }

  return reasons;
}

function summarizeModelGroup(input: {
  group: ModelRunGroup;
  usableScenarioById: Map<string, DeliveryAgentLlmEvaluationScenario>;
  strongBaselineByScenario: Map<string, DeliveryAgentLlmEvaluationRun>;
  policy: DeliveryAgentCostPolicy;
}): DeliveryAgentLlmModelEvaluationSummary {
  const usableRuns = input.group.runs.filter((run) =>
    input.usableScenarioById.has(run.scenarioId)
  );
  const scenarioIds = new Set(usableRuns.map((run) => run.scenarioId));
  const scenarioCount = scenarioIds.size;
  const completedCount = usableRuns.filter((run) => run.status === "completed").length;
  const criticalFailureCount = usableRuns.filter(hasCriticalFailure).length;
  const hardRulePassCount = usableRuns.filter(
    (run) => run.status === "completed" && allHardRulesPass(run)
  ).length;
  const qualifiedRecommendationCount = usableRuns.filter(hasQualifiedRecommendation).length;
  const coveredComplexities = uniqueStrings(
    usableRuns
      .map((run) => input.usableScenarioById.get(run.scenarioId)?.complexity)
      .filter(Boolean) as string[]
  ) as DeliveryAgentLlmEvaluationScenarioComplexity[];
  const scores = usableRuns
    .map((run) => run.quality.score)
    .filter((score): score is number => typeof score === "number");
  const scoreGaps = collectScoreGaps({
    runs: usableRuns,
    strongBaselineByScenario: input.strongBaselineByScenario,
  });
  const optimizePreviewCalls = usableRuns.map((run) => run.cost.optimizePreviewCallsUsed);
  const strongBaselineScenarioCount = [...scenarioIds].filter((scenarioId) =>
    input.strongBaselineByScenario.has(scenarioId)
  ).length;

  const partialSummary = {
    modelTier: input.group.modelTier,
    coveredComplexities,
    scenarioCount,
    completedCount,
    criticalFailureCount,
    hardRulePassRatePercent: percent(hardRulePassCount, scenarioCount),
    qualifiedRecommendationRatePercent: percent(qualifiedRecommendationCount, scenarioCount),
    averageScore: average(scores),
    averageScoreGapToStrong: average(scoreGaps),
    p95ScoreGapToStrong: p95(scoreGaps),
    averageOptimizePreviewCalls: average(optimizePreviewCalls) ?? 0,
    strongBaselineScenarioCount,
  };
  const blockingReasons = buildBlockingReasons({
    ...partialSummary,
    policy: input.policy,
  });
  const approvalDecision =
    blockingReasons.length === 0
      ? decisionForPassingModel({
          modelTier: input.group.modelTier,
          coveredComplexities,
        })
      : "not_approved";

  return {
    modelTier: input.group.modelTier,
    modelProvider: input.group.modelProvider,
    modelId: input.group.modelId,
    scenarioCount,
    completedCount,
    coveredComplexities,
    criticalFailureCount,
    hardRulePassRatePercent: partialSummary.hardRulePassRatePercent,
    qualifiedRecommendationRatePercent: partialSummary.qualifiedRecommendationRatePercent,
    averageScore: partialSummary.averageScore,
    averageScoreGapToStrong: partialSummary.averageScoreGapToStrong,
    p95ScoreGapToStrong: partialSummary.p95ScoreGapToStrong,
    averageOptimizePreviewCalls: partialSummary.averageOptimizePreviewCalls,
    approvalDecision,
    approvalReasons:
      approvalDecision === "not_approved"
        ? []
        : buildApprovalReasons({
            modelTier: input.group.modelTier,
            coveredComplexities,
          }),
    blockingReasons,
  };
}

export function buildDeliveryAgentLlmEvaluationScenarioFromLearningCase(
  learningCase: DeliveryAgentLearningCaseContract
): DeliveryAgentLlmEvaluationScenario {
  const requiredCapabilities: string[] = [];
  const exclusionReasons: string[] = [];
  const orderCount =
    learningCase.matchCoverage.totalOrders || learningCase.adminOrdersSnapshot.length;

  if (learningCase.routeShapeFeatures.handoffStartRunCount > 0) {
    requiredCapabilities.push("handoff_logic");
  }

  if (
    learningCase.routeShapeFeatures.selfRunUsed ||
    learningCase.routeShapeFeatures.supportRunUsed
  ) {
    requiredCapabilities.push("support_or_self_decision");
  }

  if (
    learningCase.stopControlFeatures.fixedStopsUsed ||
    learningCase.stopControlFeatures.endStopsUsed ||
    learningCase.stopControlFeatures.firstStopsUsed
  ) {
    requiredCapabilities.push("fixed_or_end_stop_logic");
  }

  if (learningCase.geoFeatures.dynamicOutliers.length > 0) {
    requiredCapabilities.push("outlier_handling");
  }

  if ((learningCase.outcomeFeatures.deadlineBufferMinutes ?? 99) < 10) {
    requiredCapabilities.push("deadline_pressure");
  }

  if (learningCase.routeShapeFeatures.runCount >= 3) {
    requiredCapabilities.push("multi_driver_split");
  }

  if (learningCase.quality.learningLabel === "excluded") {
    exclusionReasons.push("learning_case_excluded");
  }

  if (learningCase.reviewStatus === "pending") {
    exclusionReasons.push("learning_case_pending_review");
  }

  if (learningCase.quality.dataQualityScore < 50) {
    exclusionReasons.push("learning_case_data_quality_too_low");
  }

  let complexity: DeliveryAgentLlmEvaluationScenarioComplexity = "normal";
  if (requiredCapabilities.includes("support_or_self_decision")) {
    complexity = "rescue";
  } else if (
    orderCount >= 25 ||
    requiredCapabilities.includes("handoff_logic") ||
    requiredCapabilities.includes("fixed_or_end_stop_logic") ||
    requiredCapabilities.includes("outlier_handling") ||
    requiredCapabilities.includes("deadline_pressure") ||
    requiredCapabilities.includes("multi_driver_split")
  ) {
    complexity = "complex";
  } else if (orderCount <= 12 && learningCase.quality.learningLabel === "positive") {
    complexity = "easy";
  }

  return {
    scenarioId: learningCase.caseKey,
    deliveryDate: learningCase.deliveryDate,
    profileId: learningCase.profileId,
    orderCount,
    complexity,
    historicalLearningLabel: learningCase.quality.learningLabel,
    historicalDataQualityScore: learningCase.quality.dataQualityScore,
    canUseForEvaluation: exclusionReasons.length === 0,
    requiredCapabilities: uniqueStrings(requiredCapabilities),
    exclusionReasons,
  };
}

export function evaluateDeliveryAgentLlmModelRuns(input: {
  scenarios: DeliveryAgentLlmEvaluationScenario[];
  runs: DeliveryAgentLlmEvaluationRun[];
  policy: DeliveryAgentCostPolicy;
  evaluatedAt?: string;
}): DeliveryAgentLlmEvaluationReport {
  const usableScenarios = input.scenarios.filter((scenario) => scenario.canUseForEvaluation);
  const usableScenarioById = new Map(
    usableScenarios.map((scenario) => [scenario.scenarioId, scenario])
  );
  const strongBaselineByScenario = selectStrongBaselineByScenario(input.runs);
  const summaries = groupModelRuns(input.runs)
    .map((group) =>
      summarizeModelGroup({
        group,
        usableScenarioById,
        strongBaselineByScenario,
        policy: input.policy,
      })
    )
    .sort((left, right) => {
      const tierOrder = { strong: 0, cheap: 1, rescue: 2 };
      const tierDelta = tierOrder[left.modelTier] - tierOrder[right.modelTier];
      if (tierDelta !== 0) {
        return tierDelta;
      }

      return left.modelId.localeCompare(right.modelId);
    });

  const warnings: string[] = [];
  const ignoredScenarioCount = input.scenarios.length - usableScenarios.length;
  if (ignoredScenarioCount > 0) {
    warnings.push(
      `${ignoredScenarioCount} scenario(s) were ignored because they are pending, excluded, or too low quality.`
    );
  }

  if (usableScenarios.length === 0) {
    warnings.push("No usable historical scenarios were available for LLM model evaluation.");
  }

  return {
    reportVersion: DELIVERY_AGENT_LLM_EVALUATION_REPORT_VERSION,
    evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
    policyVersion: input.policy.policyVersion,
    modelRoutingPolicyVersion: input.policy.modelRoutingPolicyVersion,
    scenarioCount: input.scenarios.length,
    usableScenarioCount: usableScenarios.length,
    summaries,
    warnings,
  };
}
