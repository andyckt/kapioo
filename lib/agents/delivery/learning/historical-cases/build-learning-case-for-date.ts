import { createHash } from "crypto";

import connectToDatabase from "@/lib/db";
import {
  DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION,
  type DeliveryAgentLearningCaseContract,
  type DeliveryAgentLearningLabel,
  type DeliveryAgentLearningQualitySummary,
} from "@/lib/contracts/delivery-agent-learning";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import { buildDeliveryAgentLearningCaseKey } from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-key";
import { getHistoricalOrdersForLearning } from "@/lib/agents/delivery/learning/historical-cases/get-historical-orders-for-learning";
import { validateLearningDeliveryDate } from "@/lib/agents/delivery/learning/historical-cases/validate-learning-delivery-date";
import { matchOrdersToRouteOptimizerRunsForDate } from "@/lib/agents/delivery/learning/matching/match-orders-to-ro-runs-for-date";
import { buildLearningCoordinateSnapshots } from "@/lib/agents/delivery/learning/coordinates/build-learning-coordinate-snapshots";
import { buildLearningCoordinateCoverage } from "@/lib/agents/delivery/learning/coordinates/build-learning-coordinate-coverage";
import { computeDeliveryGeoFeatures } from "@/lib/agents/delivery/learning/geo-features/compute-delivery-geo-features";
import { extractDeliveryAgentLearningStopControlFeatures } from "@/lib/agents/delivery/learning/stop-controls/extract-stop-control-features";
import { extractDeliveryAgentLearningRouteShapeFeatures } from "@/lib/agents/delivery/learning/route-shape/extract-route-shape-features";
import { extractDeliveryAgentLearningOutcomeFeatures } from "@/lib/agents/delivery/learning/outcome/extract-outcome-features";
import { extractDeliveryAgentLearningResourceProfileFeatures } from "@/lib/agents/delivery/learning/resource-profile/extract-resource-profile-features";
import type { DeliveryAgentHistoricalOrderStopMatchingResult } from "@/lib/agents/delivery/learning/matching/types";
import type {
  DeliveryAgentLearningCoordinateCoverage,
  DeliveryAgentLearningOrderSnapshot,
} from "@/lib/contracts/delivery-agent-learning";
import { fetchRouteOptimizerRunsByDate } from "@/lib/integrations/route-optimizer/fetch-runs-by-date";
import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/runs-by-date-types";
import DeliveryAgentLearningCase from "@/models/DeliveryAgentLearningCase";

export type BuildDeliveryAgentLearningCaseFromHistoricalDataInput = {
  deliveryDate: string;
  profileId?: string;
  backfillBatchId?: string;
  deliveryAgentRunId?: string;
  orders: DeliveryAgentLearningOrderSnapshot[];
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse;
  profile?: DeliveryPlanningProfile;
};

export type BuildAndUpsertDeliveryAgentLearningCaseForDateInput = {
  deliveryDate: string;
  profileId?: string;
  backfillBatchId?: string;
  deliveryAgentRunId?: string;
};

export type BuildAndUpsertDeliveryAgentLearningCaseForDateResult = {
  learningCase: DeliveryAgentLearningCaseContract;
  savedLearningCase: DeliveryAgentLearningCaseContract;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, stableValue(entryValue)])
    );
  }

  return value;
}

function buildLearningCaseSourceHash(input: {
  deliveryDate: string;
  profileId: string;
  orders: DeliveryAgentLearningOrderSnapshot[];
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse;
}): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(input)))
    .digest("hex")
    .slice(0, 32);
}

function collectUniqueWarnings(...groups: Array<Array<string | undefined>>): string[] {
  const warnings = new Set<string>();

  for (const group of groups) {
    for (const warning of group) {
      const trimmed = warning?.trim();
      if (trimmed) {
        warnings.add(trimmed);
      }
    }
  }

  return [...warnings];
}

function hasRealUnmatchedRoStops(matchingResult: DeliveryAgentHistoricalOrderStopMatchingResult): boolean {
  return matchingResult.unmatchedRoStops.some((stop) => stop.isSynthetic !== true);
}

function resolveReviewStatus(
  matchingResult: DeliveryAgentHistoricalOrderStopMatchingResult
): DeliveryAgentLearningCaseContract["reviewStatus"] {
  if (
    matchingResult.unmatchedOrders.length > 0 ||
    hasRealUnmatchedRoStops(matchingResult) ||
    matchingResult.matchCoverage.uncertainMatches > 0
  ) {
    return "pending";
  }

  return "none";
}

function resolveExpectedHiredDriverRunCount(profile: DeliveryPlanningProfile): number {
  return profile.drivers.filter((driver) => !driver.isBackupOnly).length;
}

function resolveSupportAvailable(profile: DeliveryPlanningProfile): boolean {
  return profile.drivers.some((driver) => driver.isBackupOnly);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreEtaBasis(etaBasisQuality: string): number {
  if (etaBasisQuality === "post_start_majority") {
    return 100;
  }

  if (etaBasisQuality === "mixed") {
    return 70;
  }

  if (etaBasisQuality === "planned_only") {
    return 45;
  }

  return 30;
}

function labelWeight(label: DeliveryAgentLearningLabel): number {
  switch (label) {
    case "positive":
      return 0.9;
    case "weak_positive":
      return 0.55;
    case "avoid_pattern":
      return 0.75;
    case "negative":
      return 0.5;
    case "uncertain":
      return 0.15;
    case "excluded":
      return 0;
  }
}

function classifyLearningCaseQuality(input: {
  orders: DeliveryAgentLearningOrderSnapshot[];
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse;
  matchingResult: DeliveryAgentHistoricalOrderStopMatchingResult;
  coordinateCoverage: DeliveryAgentLearningCoordinateCoverage;
  outcomeFeatures: DeliveryAgentLearningCaseContract["outcomeFeatures"];
}): DeliveryAgentLearningQualitySummary {
  const qualityReasons: string[] = [];
  const warnings: string[] = [];
  const matchCoveragePercent = input.matchingResult.matchCoverage.matchCoveragePercent;
  const coordinateCoveragePercent = input.coordinateCoverage.coveragePercent;
  const etaScore = scoreEtaBasis(input.outcomeFeatures.etaBasisQuality);
  const lateMinutes = input.outcomeFeatures.lateMinutes ?? 0;
  const latenessAttribution = input.outcomeFeatures.latenessAttribution ?? "unknown";

  let dataQualityScore = clampScore(
    matchCoveragePercent * 0.55 + coordinateCoveragePercent * 0.25 + etaScore * 0.2
  );

  if (input.matchingResult.matchCoverage.uncertainMatches > 0) {
    dataQualityScore = clampScore(dataQualityScore - 10);
    warnings.push("uncertain_matches_present");
  }

  if (input.matchingResult.unmatchedOrders.length > 0 || hasRealUnmatchedRoStops(input.matchingResult)) {
    dataQualityScore = clampScore(dataQualityScore - 15);
    warnings.push("unmatched_customer_stops_present");
  }

  let learningLabel: DeliveryAgentLearningLabel = "uncertain";
  let excludeReason: string | null = null;

  if (input.orders.length === 0) {
    learningLabel = "excluded";
    excludeReason = "no_admin_orders";
    qualityReasons.push("No historical Admin orders were found for this date.");
  } else if (input.routeOptimizerResponse.runs.length === 0) {
    learningLabel = "excluded";
    excludeReason = "no_route_optimizer_runs";
    qualityReasons.push("No historical Route Optimizer runs were found for this date.");
  } else if (input.matchingResult.matchCoverage.matchedOrders === 0) {
    learningLabel = "excluded";
    excludeReason = "no_matched_orders";
    qualityReasons.push("No Admin orders could be matched to Route Optimizer stops.");
  } else if (
    latenessAttribution === "route_problem" &&
    lateMinutes >= 30 &&
    matchCoveragePercent >= 70
  ) {
    learningLabel = "avoid_pattern";
    qualityReasons.push("Route appears materially late because of route design.");
  } else if (
    (latenessAttribution === "route_problem" || latenessAttribution === "mixed") &&
    lateMinutes > 0 &&
    matchCoveragePercent >= 70
  ) {
    learningLabel = "negative";
    qualityReasons.push("Route finished late and may contain avoidable route issues.");
  } else if (
    input.outcomeFeatures.runCompletedBefore1pm === true &&
    matchCoveragePercent >= 90 &&
    coordinateCoveragePercent >= 70 &&
    dataQualityScore >= 80
  ) {
    learningLabel = "positive";
    qualityReasons.push("Matched, coordinate-backed route finished before 1 PM.");
  } else if (
    (input.outcomeFeatures.runCompletedBefore1pm === true ||
      input.outcomeFeatures.routeWouldHaveMetDeadlineIfStartedOnTime === true ||
      latenessAttribution === "driver_start_delay" ||
      latenessAttribution === "handoff_delay") &&
    matchCoveragePercent >= 80 &&
    coordinateCoveragePercent >= 50
  ) {
    learningLabel = "weak_positive";
    qualityReasons.push(
      "Route pattern is usable with caution; lateness, if any, was not clearly a route-design failure."
    );
  } else {
    qualityReasons.push("Historical case needs more review before it can guide future planning.");
  }

  const canUseForPositiveRetrieval =
    (learningLabel === "positive" || learningLabel === "weak_positive") &&
    dataQualityScore >= 70 &&
    matchCoveragePercent >= 80;

  return {
    learningLabel,
    learningWeight: labelWeight(learningLabel),
    dataQualityScore,
    canUseForPositiveRetrieval,
    excludeReason,
    qualityReasons,
    warnings,
  };
}

export function buildDeliveryAgentLearningCaseFromHistoricalData(
  input: BuildDeliveryAgentLearningCaseFromHistoricalDataInput
): DeliveryAgentLearningCaseContract {
  const deliveryDate = validateLearningDeliveryDate(input.deliveryDate);
  const profile = input.profile ?? getDeliveryPlanningProfile(input.profileId);
  const profileId = profile.profileId;
  const caseKey = buildDeliveryAgentLearningCaseKey({ deliveryDate, profileId });
  const matchingResult = matchOrdersToRouteOptimizerRunsForDate({
    orders: input.orders,
    routeOptimizerResponse: input.routeOptimizerResponse,
  });
  const coordinateSnapshots = buildLearningCoordinateSnapshots({
    orders: input.orders,
    routeOptimizerResponse: input.routeOptimizerResponse,
    matchingResult,
  });
  const coordinateCoverage = buildLearningCoordinateCoverage(coordinateSnapshots);
  const geoFeatures = computeDeliveryGeoFeatures({
    orders: input.orders,
    coordinateSnapshots,
  });
  const stopControlFeatures = extractDeliveryAgentLearningStopControlFeatures({
    routeOptimizerResponse: input.routeOptimizerResponse,
  });
  const routeShapeFeatures = extractDeliveryAgentLearningRouteShapeFeatures({
    routeOptimizerResponse: input.routeOptimizerResponse,
    matchingResult,
    stopControlFeatures,
  });
  const outcomeFeatures = extractDeliveryAgentLearningOutcomeFeatures({
    deliveryDate,
    routeOptimizerResponse: input.routeOptimizerResponse,
    stopControlFeatures,
    deadlineTime: profile.timeRules.hardDeliveryDeadline,
  });
  const resourceProfileFeatures = extractDeliveryAgentLearningResourceProfileFeatures({
    profileId,
    profileName: profile.name,
    routeOptimizerResponse: input.routeOptimizerResponse,
    stopControlFeatures,
    expectedHiredDriverRunCount: resolveExpectedHiredDriverRunCount(profile),
    supportAvailable: resolveSupportAvailable(profile),
  });
  const quality = classifyLearningCaseQuality({
    orders: input.orders,
    routeOptimizerResponse: input.routeOptimizerResponse,
    matchingResult,
    coordinateCoverage,
    outcomeFeatures,
  });
  const warnings = collectUniqueWarnings(
    input.routeOptimizerResponse.warnings,
    matchingResult.warnings,
    coordinateCoverage.warnings,
    geoFeatures.warnings,
    stopControlFeatures.warnings,
    stopControlFeatures.unknownFlags,
    routeShapeFeatures.warnings,
    outcomeFeatures.warnings,
    resourceProfileFeatures.warnings,
    quality.warnings
  );

  return {
    schemaVersion: DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION,
    deliveryDate,
    profileId,
    caseKey,
    sourceHash: buildLearningCaseSourceHash({
      deliveryDate,
      profileId,
      orders: input.orders,
      routeOptimizerResponse: input.routeOptimizerResponse,
    }),
    backfillBatchId: input.backfillBatchId?.trim() || null,
    deliveryAgentRunId: input.deliveryAgentRunId?.trim() || null,
    adminOrdersSnapshot: input.orders,
    routeOptimizerRunsSnapshot: input.routeOptimizerResponse,
    matchedStops: matchingResult.matchedStops,
    unmatchedOrders: matchingResult.unmatchedOrders,
    unmatchedRoStops: matchingResult.unmatchedRoStops,
    matchCoverage: matchingResult.matchCoverage,
    coordinateSnapshots,
    coordinateCoverage,
    geoFeatures,
    routeShapeFeatures,
    stopControlFeatures,
    outcomeFeatures,
    resourceProfileFeatures,
    quality,
    reviewStatus: resolveReviewStatus(matchingResult),
    warnings,
  };
}

export async function upsertDeliveryAgentLearningCase(
  learningCase: DeliveryAgentLearningCaseContract
): Promise<DeliveryAgentLearningCaseContract> {
  await connectToDatabase();

  const saved = await DeliveryAgentLearningCase.findOneAndUpdate(
    { caseKey: learningCase.caseKey },
    { $set: learningCase },
    {
      new: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  );

  if (!saved) {
    throw new Error("DeliveryAgentLearningCase upsert did not return a saved document.");
  }

  if (typeof saved.toObject === "function") {
    return saved.toObject() as DeliveryAgentLearningCaseContract;
  }

  return saved as unknown as DeliveryAgentLearningCaseContract;
}

export async function buildAndUpsertDeliveryAgentLearningCaseForDate(
  input: BuildAndUpsertDeliveryAgentLearningCaseForDateInput
): Promise<BuildAndUpsertDeliveryAgentLearningCaseForDateResult> {
  const deliveryDate = validateLearningDeliveryDate(input.deliveryDate);
  const profile = getDeliveryPlanningProfile(input.profileId);
  const [orders, routeOptimizerResponse] = await Promise.all([
    getHistoricalOrdersForLearning({ deliveryDate }),
    fetchRouteOptimizerRunsByDate(deliveryDate),
  ]);
  const learningCase = buildDeliveryAgentLearningCaseFromHistoricalData({
    deliveryDate,
    profileId: profile.profileId,
    backfillBatchId: input.backfillBatchId,
    deliveryAgentRunId: input.deliveryAgentRunId,
    orders,
    routeOptimizerResponse,
    profile,
  });
  const savedLearningCase = await upsertDeliveryAgentLearningCase(learningCase);

  return {
    learningCase,
    savedLearningCase,
  };
}
