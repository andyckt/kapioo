import {
  DELIVERY_AGENT_HISTORICAL_RETRIEVAL_VERSION,
  type DeliveryAgentHistoricalRetrievalDimensionKey,
  type DeliveryAgentHistoricalRetrievalDimensionScore,
  type DeliveryAgentHistoricalRetrievalMatch,
  type DeliveryAgentHistoricalRetrievalMatchUseAs,
  type DeliveryAgentHistoricalRetrievalResult,
  type DeliveryAgentHistoricalRetrievalTarget,
} from "@/lib/contracts/delivery-agent-historical-retrieval";
import type { DeliveryAgentLearningCaseContract } from "@/lib/contracts/delivery-agent-learning";

const DEFAULT_MIN_SIMILARITY_SCORE = 35;
const DEFAULT_MAX_POSITIVE_MATCHES = 2;
const DEFAULT_MAX_AVOID_MATCHES = 1;
const DEFAULT_MAX_CONTEXT_MATCHES = 0;
const MIN_DATA_QUALITY_SCORE = 50;

const DIMENSION_WEIGHTS: Record<DeliveryAgentHistoricalRetrievalDimensionKey, number> = {
  area_distribution: 24,
  profile: 14,
  order_count: 12,
  route_shape: 14,
  spread: 10,
  outliers: 10,
  coordinate_quality: 6,
  same_building_clusters: 4,
  learning_quality: 6,
};

export type RetrieveSimilarHistoricalLearningCasesInput = {
  target: DeliveryAgentHistoricalRetrievalTarget;
  learningCases: DeliveryAgentLearningCaseContract[];
  maxPositiveMatches?: number;
  maxAvoidMatches?: number;
  maxContextMatches?: number;
  minSimilarityScore?: number;
  includeTargetDeliveryDate?: boolean;
  excludeCaseKeys?: string[];
};

type ScoredMatch = DeliveryAgentHistoricalRetrievalMatch & {
  sortScore: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function roundScore(value: number): number {
  return Math.round(clampScore(value) * 10) / 10;
}

function roundWeighted(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeDistribution(distribution: Record<string, number>): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const [rawKey, rawCount] of Object.entries(distribution)) {
    const key = normalizeKey(rawKey);
    if (!key || !isFiniteNumber(rawCount) || rawCount <= 0) {
      continue;
    }

    normalized[key] = (normalized[key] ?? 0) + rawCount;
  }

  return normalized;
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right));
}

function mapTotal(distribution: Record<string, number>): number {
  return Object.values(distribution).reduce((total, count) => total + count, 0);
}

function scoreWeightedMapOverlap(
  leftDistribution: Record<string, number>,
  rightDistribution: Record<string, number>
): number {
  const left = normalizeDistribution(leftDistribution);
  const right = normalizeDistribution(rightDistribution);
  const leftTotal = mapTotal(left);
  const rightTotal = mapTotal(right);

  if (leftTotal === 0 && rightTotal === 0) {
    return 50;
  }

  if (leftTotal === 0 || rightTotal === 0) {
    return 25;
  }

  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  let shared = 0;
  let total = 0;

  for (const key of keys) {
    const leftCount = left[key] ?? 0;
    const rightCount = right[key] ?? 0;
    shared += Math.min(leftCount, rightCount);
    total += Math.max(leftCount, rightCount);
  }

  return total > 0 ? (shared / total) * 100 : 50;
}

function scoreRelativeCloseness(left: number, right: number): number {
  if (!isFiniteNumber(left) || !isFiniteNumber(right)) {
    return 50;
  }

  const reference = Math.max(Math.abs(left), Math.abs(right), 1);
  return (1 - Math.min(Math.abs(left - right) / reference, 1)) * 100;
}

function scoreOptionalRelativeCloseness(
  left: number | null | undefined,
  right: number | null | undefined
): number {
  if (!isFiniteNumber(left) || !isFiniteNumber(right)) {
    return 50;
  }

  return scoreRelativeCloseness(left, right);
}

function boolScore(
  targetValue: boolean | null | undefined,
  caseValue: boolean | null | undefined,
  unknownScore = 65
): number {
  if (typeof targetValue !== "boolean" || typeof caseValue !== "boolean") {
    return unknownScore;
  }

  return targetValue === caseValue ? 100 : 25;
}

function buildDimensionScore(input: {
  key: DeliveryAgentHistoricalRetrievalDimensionKey;
  label: string;
  points: number;
  reason: string;
}): DeliveryAgentHistoricalRetrievalDimensionScore {
  const points = roundScore(input.points);
  const weight = DIMENSION_WEIGHTS[input.key];

  return {
    key: input.key,
    label: input.label,
    points,
    weight,
    weightedScore: roundWeighted((points / 100) * weight),
    reason: input.reason,
  };
}

function getOrderCount(learningCase: DeliveryAgentLearningCaseContract): number {
  return learningCase.matchCoverage.totalOrders || learningCase.adminOrdersSnapshot.length;
}

function getCaseCoordinateCoveragePercent(
  learningCase: DeliveryAgentLearningCaseContract
): number | null {
  if (isFiniteNumber(learningCase.coordinateCoverage.coveragePercent)) {
    return learningCase.coordinateCoverage.coveragePercent;
  }

  if (isFiniteNumber(learningCase.geoFeatures.coordinateCoverage.coveragePercent)) {
    return learningCase.geoFeatures.coordinateCoverage.coveragePercent;
  }

  return null;
}

function scoreProfileSimilarity(input: {
  target: DeliveryAgentHistoricalRetrievalTarget;
  learningCase: DeliveryAgentLearningCaseContract;
}): number {
  const caseProfileId =
    input.learningCase.resourceProfileFeatures.profileId || input.learningCase.profileId;

  if (
    caseProfileId === input.target.profileId ||
    input.learningCase.profileId === input.target.profileId
  ) {
    return 100;
  }

  switch (input.learningCase.resourceProfileFeatures.profileCompatibilityForFuture) {
    case "same_profile":
      return 95;
    case "transferable_profile":
      return 78;
    case "different_profile":
      return 25;
    case "unknown":
    default:
      return 55;
  }
}

function scoreRouteShape(input: {
  target: DeliveryAgentHistoricalRetrievalTarget;
  learningCase: DeliveryAgentLearningCaseContract;
}): number {
  const targetRunCount =
    input.target.plannedRunCount ??
    input.target.availableRunCount ??
    input.target.hiredDriverRunCount ??
    null;
  const caseRunCount =
    input.learningCase.routeShapeFeatures.runCount ||
    input.learningCase.resourceProfileFeatures.runCountUsed;
  const caseNeedsHandoff =
    input.learningCase.routeShapeFeatures.handoffStartRunCount > 0 ||
    input.learningCase.stopControlFeatures.handoffStopsUsed;
  const caseNeedsSelfOrSupport =
    input.learningCase.routeShapeFeatures.selfRunUsed ||
    input.learningCase.routeShapeFeatures.supportRunUsed ||
    input.learningCase.resourceProfileFeatures.selfRunUsed ||
    input.learningCase.resourceProfileFeatures.supportRunUsed;

  const runScore = scoreOptionalRelativeCloseness(targetRunCount, caseRunCount);
  const handoffScore = boolScore(input.target.needsHandoff, caseNeedsHandoff);
  const selfScore = boolScore(input.target.needsSelfOrSupport, caseNeedsSelfOrSupport);
  const fixedScore = boolScore(
    input.target.fixedStopsExpected,
    input.learningCase.stopControlFeatures.fixedStopsUsed,
    75
  );
  const endScore = boolScore(
    input.target.endStopsExpected,
    input.learningCase.stopControlFeatures.endStopsUsed,
    75
  );

  return (
    runScore * 0.35 +
    handoffScore * 0.25 +
    selfScore * 0.2 +
    fixedScore * 0.1 +
    endScore * 0.1
  );
}

function scoreSpreadSimilarity(input: {
  target: DeliveryAgentHistoricalRetrievalTarget;
  learningCase: DeliveryAgentLearningCaseContract;
}): number {
  const targetSpread = input.target.spreadKm;
  const caseSpread = input.learningCase.geoFeatures.spreadKm;

  if (!targetSpread || !caseSpread) {
    return 50;
  }

  return (
    scoreRelativeCloseness(targetSpread.northSouth, caseSpread.northSouth) * 0.5 +
    scoreRelativeCloseness(targetSpread.eastWest, caseSpread.eastWest) * 0.5
  );
}

function scoreOutlierSimilarity(input: {
  target: DeliveryAgentHistoricalRetrievalTarget;
  learningCase: DeliveryAgentLearningCaseContract;
}): number {
  const caseOutliers = input.learningCase.geoFeatures.dynamicOutliers;
  const caseDirections = uniqueSorted(caseOutliers.map((outlier) => outlier.direction));
  const targetDirections = uniqueSorted(input.target.dynamicOutlierDirections);
  const countScore = scoreRelativeCloseness(
    input.target.dynamicOutlierCount,
    caseOutliers.length
  );

  if (targetDirections.length === 0 && caseDirections.length === 0) {
    return countScore;
  }

  if (targetDirections.length === 0 || caseDirections.length === 0) {
    return countScore * 0.6 + 20;
  }

  const sharedDirections = targetDirections.filter((direction) =>
    caseDirections.includes(direction)
  );
  const allDirections = new Set([...targetDirections, ...caseDirections]);
  const directionScore =
    allDirections.size > 0 ? (sharedDirections.length / allDirections.size) * 100 : 50;

  return countScore * 0.6 + directionScore * 0.4;
}

function scoreCoordinateQuality(input: {
  target: DeliveryAgentHistoricalRetrievalTarget;
  learningCase: DeliveryAgentLearningCaseContract;
}): number {
  const caseCoverage = getCaseCoordinateCoveragePercent(input.learningCase);
  const targetCoverage = input.target.coordinateCoveragePercent;

  if (!isFiniteNumber(caseCoverage)) {
    return 35;
  }

  if (!isFiniteNumber(targetCoverage)) {
    return caseCoverage;
  }

  return caseCoverage * 0.7 + scoreRelativeCloseness(targetCoverage, caseCoverage) * 0.3;
}

function scoreLearningQuality(learningCase: DeliveryAgentLearningCaseContract): number {
  const labelUtility = (() => {
    switch (learningCase.quality.learningLabel) {
      case "positive":
        return 100;
      case "weak_positive":
        return 90;
      case "avoid_pattern":
        return 85;
      case "negative":
        return 75;
      case "uncertain":
        return 35;
      case "excluded":
        return 0;
    }
  })();
  const reviewScore =
    learningCase.reviewStatus === "reviewed"
      ? 100
      : learningCase.reviewStatus === "none"
        ? 70
        : 0;

  return (
    learningCase.quality.dataQualityScore * 0.55 +
    reviewScore * 0.25 +
    labelUtility * 0.2
  );
}

function getUseAs(
  learningCase: DeliveryAgentLearningCaseContract
): DeliveryAgentHistoricalRetrievalMatchUseAs {
  switch (learningCase.quality.learningLabel) {
    case "positive":
    case "weak_positive":
      return learningCase.quality.canUseForPositiveRetrieval
        ? "positive_example"
        : "context_only";
    case "avoid_pattern":
    case "negative":
      return "avoid_example";
    case "uncertain":
    case "excluded":
      return "context_only";
  }
}

function getOmitReason(input: {
  target: DeliveryAgentHistoricalRetrievalTarget;
  learningCase: DeliveryAgentLearningCaseContract;
  includeTargetDeliveryDate: boolean;
  excludeCaseKeys: Set<string>;
}): string | null {
  if (input.excludeCaseKeys.has(input.learningCase.caseKey)) {
    return "explicitly excluded by case key";
  }

  if (
    !input.includeTargetDeliveryDate &&
    input.target.deliveryDate &&
    input.learningCase.deliveryDate === input.target.deliveryDate
  ) {
    return "same delivery date as target";
  }

  if (input.learningCase.quality.learningLabel === "excluded") {
    return "excluded learning label";
  }

  if (input.learningCase.reviewStatus === "pending") {
    return "pending Donald review";
  }

  if (input.learningCase.quality.dataQualityScore < MIN_DATA_QUALITY_SCORE) {
    return `data quality below ${MIN_DATA_QUALITY_SCORE}`;
  }

  return null;
}

function buildDimensionScores(input: {
  target: DeliveryAgentHistoricalRetrievalTarget;
  learningCase: DeliveryAgentLearningCaseContract;
}): DeliveryAgentHistoricalRetrievalDimensionScore[] {
  const target = input.target;
  const learningCase = input.learningCase;
  const caseOrderCount = getOrderCount(learningCase);
  const caseCoordinateCoverage = getCaseCoordinateCoveragePercent(learningCase);
  const caseNeedsHandoff =
    learningCase.routeShapeFeatures.handoffStartRunCount > 0 ||
    learningCase.stopControlFeatures.handoffStopsUsed;
  const caseNeedsSelfOrSupport =
    learningCase.routeShapeFeatures.selfRunUsed ||
    learningCase.routeShapeFeatures.supportRunUsed ||
    learningCase.resourceProfileFeatures.selfRunUsed ||
    learningCase.resourceProfileFeatures.supportRunUsed;

  return [
    buildDimensionScore({
      key: "area_distribution",
      label: "Area mix",
      points: scoreWeightedMapOverlap(
        target.areaDistribution,
        learningCase.geoFeatures.areaDistribution
      ),
      reason:
        "Compares today's Downtown, Midtown, North York, Markham, and similar area mix against the old day.",
    }),
    buildDimensionScore({
      key: "profile",
      label: "Driver profile",
      points: scoreProfileSimilarity(input),
      reason: `Historical profile is ${learningCase.resourceProfileFeatures.profileCompatibilityForFuture ?? "unknown"} for future use.`,
    }),
    buildDimensionScore({
      key: "order_count",
      label: "Order count",
      points: scoreRelativeCloseness(target.orderCount, caseOrderCount),
      reason: `Today has ${target.orderCount} order(s); historical case had ${caseOrderCount}.`,
    }),
    buildDimensionScore({
      key: "route_shape",
      label: "Route shape",
      points: scoreRouteShape(input),
      reason: `Compares run count, handoff usage (${caseNeedsHandoff}), and self/support usage (${caseNeedsSelfOrSupport}).`,
    }),
    buildDimensionScore({
      key: "spread",
      label: "Map spread",
      points: scoreSpreadSimilarity(input),
      reason: "Compares north-south and east-west spread so compact days do not teach wide-spread days.",
    }),
    buildDimensionScore({
      key: "outliers",
      label: "Outliers",
      points: scoreOutlierSimilarity(input),
      reason: `Today has ${target.dynamicOutlierCount} outlier(s); historical case had ${learningCase.geoFeatures.dynamicOutliers.length}.`,
    }),
    buildDimensionScore({
      key: "coordinate_quality",
      label: "Coordinate quality",
      points: scoreCoordinateQuality(input),
      reason: `Historical coordinate coverage is ${Math.round(caseCoordinateCoverage ?? 0)}%.`,
    }),
    buildDimensionScore({
      key: "same_building_clusters",
      label: "Same-building clusters",
      points: scoreRelativeCloseness(
        target.sameBuildingClusterCount,
        learningCase.geoFeatures.sameBuildingClusterCount
      ),
      reason: `Today has ${target.sameBuildingClusterCount} same-building cluster(s); historical case had ${learningCase.geoFeatures.sameBuildingClusterCount}.`,
    }),
    buildDimensionScore({
      key: "learning_quality",
      label: "Learning quality",
      points: scoreLearningQuality(learningCase),
      reason: `${learningCase.quality.learningLabel} case with ${Math.round(
        learningCase.quality.dataQualityScore
      )}/100 data quality and ${learningCase.reviewStatus} review status.`,
    }),
  ];
}

function buildMatch(input: {
  target: DeliveryAgentHistoricalRetrievalTarget;
  learningCase: DeliveryAgentLearningCaseContract;
}): ScoredMatch {
  const dimensionScores = buildDimensionScores(input);
  const totalWeight = dimensionScores.reduce((sum, dimension) => sum + dimension.weight, 0);
  const rawScore =
    totalWeight > 0
      ? (dimensionScores.reduce((sum, dimension) => sum + dimension.weightedScore, 0) /
          totalWeight) *
        100
      : 0;
  const similarityScore = roundScore(rawScore);
  const learningCase = input.learningCase;
  const warnings: string[] = [];

  if (
    learningCase.quality.learningLabel === "positive" &&
    !learningCase.quality.canUseForPositiveRetrieval
  ) {
    warnings.push("Positive case was downgraded to context-only because positive retrieval is disabled.");
  }

  if ((getCaseCoordinateCoveragePercent(learningCase) ?? 0) < 70) {
    warnings.push("Historical case has lower coordinate coverage; use its lesson carefully.");
  }

  return {
    caseKey: learningCase.caseKey,
    deliveryDate: learningCase.deliveryDate,
    profileId: learningCase.profileId,
    learningLabel: learningCase.quality.learningLabel,
    reviewStatus: learningCase.reviewStatus,
    useAs: getUseAs(learningCase),
    similarityScore,
    dataQualityScore: roundScore(learningCase.quality.dataQualityScore),
    orderCount: getOrderCount(learningCase),
    areaDistribution: learningCase.geoFeatures.areaDistribution,
    dimensionScores,
    warnings,
    sortScore: similarityScore,
  };
}

function reviewSortScore(reviewStatus: DeliveryAgentLearningCaseContract["reviewStatus"]): number {
  switch (reviewStatus) {
    case "reviewed":
      return 2;
    case "none":
      return 1;
    case "pending":
      return 0;
  }
}

function compareScoredMatches(left: ScoredMatch, right: ScoredMatch): number {
  const scoreDelta = right.sortScore - left.sortScore;
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const qualityDelta = right.dataQualityScore - left.dataQualityScore;
  if (qualityDelta !== 0) {
    return qualityDelta;
  }

  const reviewDelta =
    reviewSortScore(right.reviewStatus) - reviewSortScore(left.reviewStatus);
  if (reviewDelta !== 0) {
    return reviewDelta;
  }

  const dateDelta = right.deliveryDate.localeCompare(left.deliveryDate);
  if (dateDelta !== 0) {
    return dateDelta;
  }

  return left.caseKey.localeCompare(right.caseKey);
}

function compareSelectedMatches(
  left: DeliveryAgentHistoricalRetrievalMatch,
  right: DeliveryAgentHistoricalRetrievalMatch
): number {
  const useAsOrder: Record<DeliveryAgentHistoricalRetrievalMatchUseAs, number> = {
    positive_example: 0,
    avoid_example: 1,
    context_only: 2,
  };
  const useAsDelta = useAsOrder[left.useAs] - useAsOrder[right.useAs];
  if (useAsDelta !== 0) {
    return useAsDelta;
  }

  const scoreDelta = right.similarityScore - left.similarityScore;
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const qualityDelta = right.dataQualityScore - left.dataQualityScore;
  if (qualityDelta !== 0) {
    return qualityDelta;
  }

  const reviewDelta =
    reviewSortScore(right.reviewStatus) - reviewSortScore(left.reviewStatus);
  if (reviewDelta !== 0) {
    return reviewDelta;
  }

  const dateDelta = right.deliveryDate.localeCompare(left.deliveryDate);
  if (dateDelta !== 0) {
    return dateDelta;
  }

  return left.caseKey.localeCompare(right.caseKey);
}

function stripSortScore(match: ScoredMatch): DeliveryAgentHistoricalRetrievalMatch {
  const { sortScore, ...publicMatch } = match;
  return publicMatch;
}

function sanitizeLimit(value: number | undefined, fallback: number): number {
  if (!isFiniteNumber(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function buildTargetWarnings(target: DeliveryAgentHistoricalRetrievalTarget): string[] {
  const warnings: string[] = [];

  if (mapTotal(normalizeDistribution(target.areaDistribution)) === 0) {
    warnings.push("Historical retrieval target has no area distribution, so area similarity is weaker.");
  }

  if (!target.spreadKm) {
    warnings.push("Historical retrieval target has no map spread, so spread similarity is weaker.");
  }

  if (
    isFiniteNumber(target.coordinateCoveragePercent) &&
    target.coordinateCoveragePercent < 70
  ) {
    warnings.push(
      "Today has lower coordinate coverage, so historical similarity should be treated carefully."
    );
  }

  return warnings;
}

export function buildHistoricalRetrievalTargetFromLearningCase(
  learningCase: DeliveryAgentLearningCaseContract,
  overrides: Partial<DeliveryAgentHistoricalRetrievalTarget> = {}
): DeliveryAgentHistoricalRetrievalTarget {
  const routeShape = learningCase.routeShapeFeatures;
  const resourceProfile = learningCase.resourceProfileFeatures;

  return {
    deliveryDate: learningCase.deliveryDate,
    profileId: learningCase.profileId,
    orderCount: getOrderCount(learningCase),
    areaDistribution: learningCase.geoFeatures.areaDistribution,
    coordinateCoveragePercent: getCaseCoordinateCoveragePercent(learningCase),
    spreadKm: learningCase.geoFeatures.spreadKm ?? null,
    dynamicOutlierCount: learningCase.geoFeatures.dynamicOutliers.length,
    dynamicOutlierDirections: uniqueSorted(
      learningCase.geoFeatures.dynamicOutliers.map((outlier) => outlier.direction)
    ),
    sameBuildingClusterCount: learningCase.geoFeatures.sameBuildingClusterCount,
    plannedRunCount: routeShape.runCount || resourceProfile.runCountUsed || null,
    hiredDriverRunCount: resourceProfile.hiredDriverRunCount ?? null,
    availableRunCount: resourceProfile.availableRunCount ?? null,
    supportAvailable: resourceProfile.supportAvailable ?? null,
    needsHandoff:
      routeShape.handoffStartRunCount > 0 ||
      learningCase.stopControlFeatures.handoffStopsUsed,
    needsSelfOrSupport:
      routeShape.selfRunUsed ||
      routeShape.supportRunUsed ||
      resourceProfile.selfRunUsed ||
      resourceProfile.supportRunUsed,
    fixedStopsExpected: learningCase.stopControlFeatures.fixedStopsUsed,
    endStopsExpected: learningCase.stopControlFeatures.endStopsUsed,
    ...overrides,
  };
}

export function scoreHistoricalLearningCaseSimilarity(input: {
  target: DeliveryAgentHistoricalRetrievalTarget;
  learningCase: DeliveryAgentLearningCaseContract;
}): DeliveryAgentHistoricalRetrievalMatch {
  return stripSortScore(buildMatch(input));
}

export function retrieveSimilarHistoricalLearningCases(
  input: RetrieveSimilarHistoricalLearningCasesInput
): DeliveryAgentHistoricalRetrievalResult {
  const minSimilarityScore = isFiniteNumber(input.minSimilarityScore)
    ? clampScore(input.minSimilarityScore)
    : DEFAULT_MIN_SIMILARITY_SCORE;
  const maxPositiveMatches = sanitizeLimit(
    input.maxPositiveMatches,
    DEFAULT_MAX_POSITIVE_MATCHES
  );
  const maxAvoidMatches = sanitizeLimit(input.maxAvoidMatches, DEFAULT_MAX_AVOID_MATCHES);
  const maxContextMatches = sanitizeLimit(input.maxContextMatches, DEFAULT_MAX_CONTEXT_MATCHES);
  const includeTargetDeliveryDate = input.includeTargetDeliveryDate === true;
  const excludeCaseKeys = new Set(input.excludeCaseKeys ?? []);
  const warnings = buildTargetWarnings(input.target);
  const omitReasons = new Map<string, number>();
  const eligibleMatches: ScoredMatch[] = [];

  for (const learningCase of input.learningCases) {
    const omitReason = getOmitReason({
      target: input.target,
      learningCase,
      includeTargetDeliveryDate,
      excludeCaseKeys,
    });

    if (omitReason) {
      omitReasons.set(omitReason, (omitReasons.get(omitReason) ?? 0) + 1);
      continue;
    }

    const match = buildMatch({ target: input.target, learningCase });
    if (match.similarityScore < minSimilarityScore) {
      omitReasons.set(
        "below similarity threshold",
        (omitReasons.get("below similarity threshold") ?? 0) + 1
      );
      continue;
    }

    eligibleMatches.push(match);
  }

  const positiveMatches = eligibleMatches
    .filter((match) => match.useAs === "positive_example")
    .sort(compareScoredMatches)
    .slice(0, maxPositiveMatches);
  const avoidMatches = eligibleMatches
    .filter((match) => match.useAs === "avoid_example")
    .sort(compareScoredMatches)
    .slice(0, maxAvoidMatches);
  const contextMatches = eligibleMatches
    .filter((match) => match.useAs === "context_only")
    .sort(compareScoredMatches)
    .slice(0, maxContextMatches);

  const matches = [...positiveMatches, ...avoidMatches, ...contextMatches]
    .map(stripSortScore)
    .sort(compareSelectedMatches);

  if (input.learningCases.length === 0) {
    warnings.push("No historical learning cases were available for similarity retrieval.");
  }

  if (eligibleMatches.length === 0 && input.learningCases.length > 0) {
    warnings.push("No eligible historical learning cases remained after quality and similarity filters.");
  }

  if (positiveMatches.length === 0) {
    warnings.push("No similar positive historical cases were selected for today's planning prompt.");
  }

  if (avoidMatches.length === 0) {
    warnings.push("No similar avoid-pattern historical cases were selected for today's planning prompt.");
  }

  for (const [reason, count] of Array.from(omitReasons.entries()).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    warnings.push(`${count} historical case(s) omitted: ${reason}.`);
  }

  return {
    retrievalVersion: DELIVERY_AGENT_HISTORICAL_RETRIEVAL_VERSION,
    target: input.target,
    candidateCaseCount: input.learningCases.length,
    eligibleCaseCount: eligibleMatches.length,
    omittedCaseCount: input.learningCases.length - eligibleMatches.length,
    matches,
    selectedPositiveCaseIds: positiveMatches.map((match) => match.caseKey),
    selectedAvoidCaseIds: avoidMatches.map((match) => match.caseKey),
    selectedContextCaseIds: contextMatches.map((match) => match.caseKey),
    warnings,
  };
}
