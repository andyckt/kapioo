import type { DeliveryAgentLearningCaseContract } from "@/lib/contracts/delivery-agent-learning";

export const LEARNING_BACKFILL_READY_MIN_MATCH_COVERAGE_PERCENT = 80;
export const LEARNING_BACKFILL_READY_MIN_COORDINATE_COVERAGE_PERCENT = 70;
export const LEARNING_BACKFILL_READY_MIN_DATA_QUALITY_SCORE = 70;
export const LEARNING_BACKFILL_BLOCKED_MIN_MATCH_COVERAGE_PERCENT = 50;
export const LEARNING_BACKFILL_BLOCKED_MIN_COORDINATE_COVERAGE_PERCENT = 50;
export const LEARNING_BACKFILL_BLOCKED_MIN_DATA_QUALITY_SCORE = 50;

export type DeliveryAgentLearningBackfillReadiness =
  | "ready"
  | "needs_review"
  | "blocked";

export type DeliveryAgentLearningBackfillReadinessAssessment = {
  readiness: DeliveryAgentLearningBackfillReadiness;
  positiveRetrievalReady: boolean;
  reasons: string[];
  warnings: string[];
};

function pushIf(condition: boolean, target: string[], message: string): void {
  if (condition) {
    target.push(message);
  }
}

export function assessDeliveryAgentLearningBackfillReadiness(
  learningCase: DeliveryAgentLearningCaseContract
): DeliveryAgentLearningBackfillReadinessAssessment {
  const blockers: string[] = [];
  const reviewReasons: string[] = [];
  const warnings = new Set<string>(learningCase.warnings ?? []);
  const matchCoveragePercent = learningCase.matchCoverage.matchCoveragePercent;
  const coordinateCoveragePercent = learningCase.coordinateCoverage.coveragePercent;
  const dataQualityScore = learningCase.quality.dataQualityScore;

  pushIf(
    learningCase.quality.learningLabel === "excluded",
    blockers,
    `Excluded from learning: ${learningCase.quality.excludeReason ?? "not enough usable historical data"}.`
  );
  pushIf(
    learningCase.matchCoverage.matchedOrders === 0,
    blockers,
    "No Admin orders matched Route Optimizer customer stops."
  );
  pushIf(
    matchCoveragePercent < LEARNING_BACKFILL_BLOCKED_MIN_MATCH_COVERAGE_PERCENT,
    blockers,
    `Match coverage is ${matchCoveragePercent}%, below the blocked threshold of ${LEARNING_BACKFILL_BLOCKED_MIN_MATCH_COVERAGE_PERCENT}%.`
  );
  pushIf(
    coordinateCoveragePercent < LEARNING_BACKFILL_BLOCKED_MIN_COORDINATE_COVERAGE_PERCENT,
    blockers,
    `Coordinate coverage is ${coordinateCoveragePercent}%, below the blocked threshold of ${LEARNING_BACKFILL_BLOCKED_MIN_COORDINATE_COVERAGE_PERCENT}%.`
  );
  pushIf(
    dataQualityScore < LEARNING_BACKFILL_BLOCKED_MIN_DATA_QUALITY_SCORE,
    blockers,
    `Data quality score is ${dataQualityScore}/100, below the blocked threshold of ${LEARNING_BACKFILL_BLOCKED_MIN_DATA_QUALITY_SCORE}.`
  );

  pushIf(
    learningCase.reviewStatus === "pending",
    reviewReasons,
    "Needs Donald review because matching or route history has uncertainty."
  );
  pushIf(
    learningCase.quality.learningLabel === "uncertain",
    reviewReasons,
    "Learning label is uncertain."
  );
  pushIf(
    matchCoveragePercent < LEARNING_BACKFILL_READY_MIN_MATCH_COVERAGE_PERCENT,
    reviewReasons,
    `Match coverage is ${matchCoveragePercent}%, below the ready threshold of ${LEARNING_BACKFILL_READY_MIN_MATCH_COVERAGE_PERCENT}%.`
  );
  pushIf(
    coordinateCoveragePercent < LEARNING_BACKFILL_READY_MIN_COORDINATE_COVERAGE_PERCENT,
    reviewReasons,
    `Coordinate coverage is ${coordinateCoveragePercent}%, below the ready threshold of ${LEARNING_BACKFILL_READY_MIN_COORDINATE_COVERAGE_PERCENT}%.`
  );
  pushIf(
    dataQualityScore < LEARNING_BACKFILL_READY_MIN_DATA_QUALITY_SCORE,
    reviewReasons,
    `Data quality score is ${dataQualityScore}/100, below the ready threshold of ${LEARNING_BACKFILL_READY_MIN_DATA_QUALITY_SCORE}.`
  );
  pushIf(
    learningCase.matchCoverage.uncertainMatches > 0,
    reviewReasons,
    `${learningCase.matchCoverage.uncertainMatches} uncertain match(es) require review.`
  );
  pushIf(
    learningCase.unmatchedOrders.length > 0,
    reviewReasons,
    `${learningCase.unmatchedOrders.length} Admin order(s) did not match RO customer stops.`
  );
  pushIf(
    learningCase.unmatchedRoStops.some((stop) => stop.isSynthetic !== true),
    reviewReasons,
    "One or more real Route Optimizer customer stops did not match Admin orders."
  );

  const readiness =
    blockers.length > 0 ? "blocked" : reviewReasons.length > 0 ? "needs_review" : "ready";
  const positiveRetrievalReady =
    readiness === "ready" &&
    learningCase.quality.canUseForPositiveRetrieval === true &&
    dataQualityScore >= LEARNING_BACKFILL_READY_MIN_DATA_QUALITY_SCORE &&
    matchCoveragePercent >= LEARNING_BACKFILL_READY_MIN_MATCH_COVERAGE_PERCENT &&
    coordinateCoveragePercent >= LEARNING_BACKFILL_READY_MIN_COORDINATE_COVERAGE_PERCENT;

  return {
    readiness,
    positiveRetrievalReady,
    reasons: readiness === "blocked" ? blockers : reviewReasons,
    warnings: [...warnings],
  };
}

export function getDryRunBackfillStatus(
  readiness: DeliveryAgentLearningBackfillReadiness
): "dry_run_ready" | "dry_run_needs_review" | "dry_run_blocked" {
  if (readiness === "ready") {
    return "dry_run_ready";
  }

  if (readiness === "needs_review") {
    return "dry_run_needs_review";
  }

  return "dry_run_blocked";
}
