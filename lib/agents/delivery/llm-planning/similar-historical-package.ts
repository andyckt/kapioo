import { buildCompactHistoricalPackageForDeliveryAgent } from "@/lib/agents/delivery/llm-planning/compact-historical-package";
import { computeDeliveryGeoFeatures } from "@/lib/agents/delivery/learning/geo-features/compute-delivery-geo-features";
import {
  retrieveSimilarHistoricalLearningCases,
  type RetrieveSimilarHistoricalLearningCasesInput,
} from "@/lib/agents/delivery/learning/retrieval/historical-similarity";
import type { DeliveryAgentCostPolicy } from "@/lib/contracts/delivery-agent-cost-policy";
import type {
  DeliveryAgentHistoricalRetrievalMatch,
  DeliveryAgentHistoricalRetrievalResult,
  DeliveryAgentHistoricalRetrievalTarget,
} from "@/lib/contracts/delivery-agent-historical-retrieval";
import type {
  DeliveryAgentLearningCaseContract,
  DeliveryAgentLearningCoordinateSnapshot,
  DeliveryAgentLearningCoordinateSource,
  DeliveryAgentLearningOrderSnapshot,
} from "@/lib/contracts/delivery-agent-learning";
import type {
  DeliveryAgentCompactHistoricalPackage,
  DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";
import DeliveryAgentLearningCase from "@/models/DeliveryAgentLearningCase";

const DEFAULT_HISTORICAL_RETRIEVAL_QUERY_LIMIT = 120;
const DEFAULT_MIN_DATA_QUALITY_SCORE = 50;

export type DeliveryAgentHistoricalRetrievalResourceHints = {
  plannedRunCount?: number | null;
  hiredDriverRunCount?: number | null;
  availableRunCount?: number | null;
  supportAvailable?: boolean | null;
  needsHandoff?: boolean | null;
  needsSelfOrSupport?: boolean | null;
  fixedStopsExpected?: boolean | null;
  endStopsExpected?: boolean | null;
};

export type BuildHistoricalRetrievalTargetFromOrderFactsInput =
  DeliveryAgentHistoricalRetrievalResourceHints & {
    deliveryDate?: string;
    profileId: string;
    orders: DeliveryAgentPlanningFingerprintOrderFact[];
  };

export type BuildSimilarCompactHistoricalPackageForDeliveryAgentInput =
  DeliveryAgentHistoricalRetrievalResourceHints & {
    deliveryDate?: string;
    profileId: string;
    orders?: DeliveryAgentPlanningFingerprintOrderFact[];
    target?: DeliveryAgentHistoricalRetrievalTarget;
    learningCases: DeliveryAgentLearningCaseContract[];
    policy: DeliveryAgentCostPolicy;
    minSimilarityScore?: number;
    includeTargetDeliveryDate?: boolean;
    excludeCaseKeys?: string[];
  };

export type BuildSimilarCompactHistoricalPackageForDeliveryAgentResult = {
  target: DeliveryAgentHistoricalRetrievalTarget;
  retrieval: DeliveryAgentHistoricalRetrievalResult;
  historicalPackage: DeliveryAgentCompactHistoricalPackage;
  selectedLearningCases: DeliveryAgentLearningCaseContract[];
  warnings: string[];
};

export type LoadHistoricalLearningCasesForRetrievalInput = {
  deliveryDate?: string;
  includeTargetDeliveryDate?: boolean;
  minDataQualityScore?: number;
  limit?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeAreaLabel(area: string | undefined): string {
  const normalized = area?.trim();
  return normalized || "unknown";
}

function buildAreaDistributionFromOrderFacts(
  orders: DeliveryAgentPlanningFingerprintOrderFact[]
): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (const order of orders) {
    const area = normalizeAreaLabel(order.area);
    distribution[area] = (distribution[area] ?? 0) + 1;
  }

  return distribution;
}

function orderFactToLearningOrderSnapshot(
  order: DeliveryAgentPlanningFingerprintOrderFact
): DeliveryAgentLearningOrderSnapshot {
  return {
    orderId: order.orderId,
    formattedAddress: order.formattedAddress,
    area: order.area,
    status: order.status,
    totalMealQuantity: order.totalMealQuantity,
    lat: order.lat,
    lng: order.lng,
  };
}

function mapOrderFactCoordinateSource(
  source: string | undefined
): DeliveryAgentLearningCoordinateSource {
  switch (source) {
    case "route_optimizer_historical":
    case "order_data":
    case "delivery_agent_cache":
    case "route_optimizer_geocode":
      return source;
    default:
      return "delivery_agent_cache";
  }
}

function orderFactToCoordinateSnapshot(
  order: DeliveryAgentPlanningFingerprintOrderFact
): DeliveryAgentLearningCoordinateSnapshot | null {
  if (!isFiniteNumber(order.lat) || !isFiniteNumber(order.lng)) {
    return null;
  }

  return {
    ref: `order:${order.orderId}`,
    refType: "order",
    orderId: order.orderId,
    address: order.formattedAddress,
    lat: order.lat,
    lng: order.lng,
    coordinateSource: mapOrderFactCoordinateSource(order.coordinateSource),
    coordinateConfidence:
      order.coordinateConfidence === "high" ||
      order.coordinateConfidence === "medium" ||
      order.coordinateConfidence === "low"
        ? order.coordinateConfidence
        : "medium",
    warnings: [],
  };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const compact = value.trim().replace(/\s+/g, " ");
    if (!compact || seen.has(compact)) {
      continue;
    }

    seen.add(compact);
    output.push(compact);
  }

  return output;
}

function deriveRetrievalLimits(policy: DeliveryAgentCostPolicy): {
  maxMatchesToConsider: number;
} {
  return {
    maxMatchesToConsider: Math.max(0, policy.historicalPrompt.maxDetailedHistoricalCases),
  };
}

function selectMatchesForCompactPackage(input: {
  matches: DeliveryAgentHistoricalRetrievalMatch[];
  maxDetailedCases: number;
}): DeliveryAgentHistoricalRetrievalMatch[] {
  const maxDetailedCases = Math.max(0, Math.floor(input.maxDetailedCases));
  if (maxDetailedCases === 0) {
    return [];
  }

  const positives = input.matches.filter((match) => match.useAs === "positive_example");
  const avoids = input.matches.filter((match) => match.useAs === "avoid_example");
  const contexts = input.matches.filter((match) => match.useAs === "context_only");
  const selected: DeliveryAgentHistoricalRetrievalMatch[] = [];
  const positiveLimit =
    avoids.length > 0 && maxDetailedCases > 1 ? maxDetailedCases - 1 : maxDetailedCases;

  selected.push(...positives.slice(0, positiveLimit));

  if (selected.length < maxDetailedCases) {
    selected.push(...avoids.slice(0, maxDetailedCases - selected.length));
  }

  if (selected.length < maxDetailedCases) {
    selected.push(...contexts.slice(0, maxDetailedCases - selected.length));
  }

  return selected;
}

function filterRetrievalToSelectedMatches(input: {
  retrieval: DeliveryAgentHistoricalRetrievalResult;
  selectedMatches: DeliveryAgentHistoricalRetrievalMatch[];
}): DeliveryAgentHistoricalRetrievalResult {
  return {
    ...input.retrieval,
    matches: input.selectedMatches,
    selectedPositiveCaseIds: input.selectedMatches
      .filter((match) => match.useAs === "positive_example")
      .map((match) => match.caseKey),
    selectedAvoidCaseIds: input.selectedMatches
      .filter((match) => match.useAs === "avoid_example")
      .map((match) => match.caseKey),
    selectedContextCaseIds: input.selectedMatches
      .filter((match) => match.useAs === "context_only")
      .map((match) => match.caseKey),
  };
}

function getLearningCasesForMatches(input: {
  learningCases: DeliveryAgentLearningCaseContract[];
  matches: DeliveryAgentHistoricalRetrievalMatch[];
}): DeliveryAgentLearningCaseContract[] {
  const casesByKey = new Map(
    input.learningCases.map((learningCase) => [learningCase.caseKey, learningCase])
  );

  return input.matches
    .map((match) => casesByKey.get(match.caseKey))
    .filter((learningCase): learningCase is DeliveryAgentLearningCaseContract =>
      Boolean(learningCase)
    );
}

export function buildHistoricalRetrievalTargetFromOrderFacts(
  input: BuildHistoricalRetrievalTargetFromOrderFactsInput
): DeliveryAgentHistoricalRetrievalTarget {
  const learningOrders = input.orders.map(orderFactToLearningOrderSnapshot);
  const coordinateSnapshots = input.orders
    .map(orderFactToCoordinateSnapshot)
    .filter(
      (snapshot): snapshot is DeliveryAgentLearningCoordinateSnapshot => snapshot !== null
    );
  const geoFeatures = computeDeliveryGeoFeatures({
    orders: learningOrders,
    coordinateSnapshots,
  });

  return {
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
    orderCount: input.orders.length,
    areaDistribution: buildAreaDistributionFromOrderFacts(input.orders),
    coordinateCoveragePercent:
      input.orders.length > 0
        ? (coordinateSnapshots.length / input.orders.length) * 100
        : 0,
    spreadKm: geoFeatures.spreadKm ?? null,
    dynamicOutlierCount: geoFeatures.dynamicOutliers.length,
    dynamicOutlierDirections: geoFeatures.dynamicOutliers.flatMap((outlier) =>
      outlier.direction ? [outlier.direction] : []
    ),
    sameBuildingClusterCount: geoFeatures.sameBuildingClusterCount,
    plannedRunCount: input.plannedRunCount ?? null,
    hiredDriverRunCount: input.hiredDriverRunCount ?? null,
    availableRunCount: input.availableRunCount ?? null,
    supportAvailable: input.supportAvailable ?? null,
    needsHandoff: input.needsHandoff ?? null,
    needsSelfOrSupport: input.needsSelfOrSupport ?? null,
    fixedStopsExpected: input.fixedStopsExpected ?? null,
    endStopsExpected: input.endStopsExpected ?? null,
  };
}

export function buildSimilarCompactHistoricalPackageForDeliveryAgent(
  input: BuildSimilarCompactHistoricalPackageForDeliveryAgentInput
): BuildSimilarCompactHistoricalPackageForDeliveryAgentResult {
  const target =
    input.target ??
    buildHistoricalRetrievalTargetFromOrderFacts({
      deliveryDate: input.deliveryDate,
      profileId: input.profileId,
      orders: input.orders ?? [],
      plannedRunCount: input.plannedRunCount,
      hiredDriverRunCount: input.hiredDriverRunCount,
      availableRunCount: input.availableRunCount,
      supportAvailable: input.supportAvailable,
      needsHandoff: input.needsHandoff,
      needsSelfOrSupport: input.needsSelfOrSupport,
      fixedStopsExpected: input.fixedStopsExpected,
      endStopsExpected: input.endStopsExpected,
    });
  const limits = deriveRetrievalLimits(input.policy);
  const broadRetrievalInput: RetrieveSimilarHistoricalLearningCasesInput = {
    target,
    learningCases: input.learningCases,
    maxPositiveMatches: limits.maxMatchesToConsider,
    maxAvoidMatches: limits.maxMatchesToConsider,
    maxContextMatches: limits.maxMatchesToConsider,
    minSimilarityScore: input.minSimilarityScore,
    includeTargetDeliveryDate: input.includeTargetDeliveryDate,
    excludeCaseKeys: input.excludeCaseKeys,
  };
  const broadRetrieval = retrieveSimilarHistoricalLearningCases(broadRetrievalInput);
  const selectedMatches = selectMatchesForCompactPackage({
    matches: broadRetrieval.matches,
    maxDetailedCases: input.policy.historicalPrompt.maxDetailedHistoricalCases,
  });
  const retrieval = filterRetrievalToSelectedMatches({
    retrieval: broadRetrieval,
    selectedMatches,
  });
  const selectedLearningCases = getLearningCasesForMatches({
    learningCases: input.learningCases,
    matches: selectedMatches,
  });
  const historicalPackage = buildCompactHistoricalPackageForDeliveryAgent({
    learningCases: selectedLearningCases,
    policy: input.policy,
    deliveryDate: input.deliveryDate ?? target.deliveryDate,
    profileId: input.profileId ?? target.profileId,
  });
  const warnings = uniqueStrings([
    ...retrieval.warnings.map((warning) => `Historical retrieval: ${warning}`),
    ...historicalPackage.warnings,
  ]);

  return {
    target,
    retrieval,
    historicalPackage: {
      ...historicalPackage,
      warnings,
    },
    selectedLearningCases,
    warnings,
  };
}

export async function loadHistoricalLearningCasesForRetrieval(
  input: LoadHistoricalLearningCasesForRetrievalInput
): Promise<DeliveryAgentLearningCaseContract[]> {
  const minDataQualityScore = input.minDataQualityScore ?? DEFAULT_MIN_DATA_QUALITY_SCORE;
  const limit = Math.max(
    0,
    Math.floor(input.limit ?? DEFAULT_HISTORICAL_RETRIEVAL_QUERY_LIMIT)
  );
  const query: Record<string, unknown> = {
    reviewStatus: { $ne: "pending" },
    "quality.learningLabel": {
      $in: ["positive", "weak_positive", "negative", "avoid_pattern", "uncertain"],
    },
    "quality.dataQualityScore": { $gte: minDataQualityScore },
  };

  if (input.deliveryDate && !input.includeTargetDeliveryDate) {
    query.deliveryDate = { $ne: input.deliveryDate };
  }

  if (limit === 0) {
    return [];
  }

  const learningCases = await DeliveryAgentLearningCase.find(query)
    .sort({ deliveryDate: -1, "quality.dataQualityScore": -1 })
    .limit(limit)
    .lean()
    .exec();

  return learningCases as unknown as DeliveryAgentLearningCaseContract[];
}
