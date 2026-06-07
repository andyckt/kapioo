/**
 * Delivery Agent historical learning case contracts.
 *
 * One DeliveryAgentLearningCase = one frozen historical delivery day for one planning profile.
 * RO run_date is the Kapioo business delivery date.
 */
import { z } from "zod";

import { buildDeliveryAgentLearningCaseKey } from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-key";
import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/runs-by-date-types";

export {
  ROUTE_OPTIMIZER_HISTORICAL_ETA_BASIS_VALUES,
  type RouteOptimizerHistoricalEtaBasis,
} from "@/lib/integrations/route-optimizer/runs-by-date-types";

export const DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION = "learning-case-v1" as const;

export const DELIVERY_AGENT_LEARNING_LABELS = [
  "positive",
  "weak_positive",
  "negative",
  "avoid_pattern",
  "uncertain",
  "excluded",
] as const;

export type DeliveryAgentLearningLabel = (typeof DELIVERY_AGENT_LEARNING_LABELS)[number];

export const deliveryAgentLearningLabelSchema = z.enum(DELIVERY_AGENT_LEARNING_LABELS);

export const DELIVERY_AGENT_LEARNING_REVIEW_STATUSES = ["none", "pending", "reviewed"] as const;

export type DeliveryAgentLearningReviewStatus =
  (typeof DELIVERY_AGENT_LEARNING_REVIEW_STATUSES)[number];

export const deliveryAgentLearningReviewStatusSchema = z.enum(
  DELIVERY_AGENT_LEARNING_REVIEW_STATUSES
);

export const DELIVERY_AGENT_LEARNING_COORDINATE_SOURCES = [
  "route_optimizer_historical",
  "order_data",
  "delivery_agent_cache",
  "route_optimizer_geocode",
  "address_only",
  "unavailable",
] as const;

export type DeliveryAgentLearningCoordinateSource =
  (typeof DELIVERY_AGENT_LEARNING_COORDINATE_SOURCES)[number];

export const deliveryAgentLearningCoordinateSourceSchema = z.enum(
  DELIVERY_AGENT_LEARNING_COORDINATE_SOURCES
);

export const DELIVERY_AGENT_LEARNING_COORDINATE_CONFIDENCES = [
  "high",
  "medium",
  "low",
  "none",
] as const;

export type DeliveryAgentLearningCoordinateConfidence =
  (typeof DELIVERY_AGENT_LEARNING_COORDINATE_CONFIDENCES)[number];

export const deliveryAgentLearningCoordinateConfidenceSchema = z.enum(
  DELIVERY_AGENT_LEARNING_COORDINATE_CONFIDENCES
);

/**
 * Superset of customer-identity HistoricalMatchMethod — adds manual_review for triage.
 * order_id and derived_route_optimizer_name align with lib/agents/delivery/customer-identity.
 */
export const DELIVERY_AGENT_HISTORICAL_MATCH_METHODS = [
  "order_id",
  "derived_route_optimizer_name",
  "manual_review",
  "none",
] as const;

export type DeliveryAgentHistoricalMatchMethod =
  (typeof DELIVERY_AGENT_HISTORICAL_MATCH_METHODS)[number];

export const deliveryAgentHistoricalMatchMethodSchema = z.enum(
  DELIVERY_AGENT_HISTORICAL_MATCH_METHODS
);

/** Superset of customer-identity HistoricalMatchConfidence — adds medium and low. */
export const DELIVERY_AGENT_HISTORICAL_MATCH_CONFIDENCES = [
  "exact",
  "high",
  "medium",
  "low",
  "none",
] as const;

export type DeliveryAgentHistoricalMatchConfidence =
  (typeof DELIVERY_AGENT_HISTORICAL_MATCH_CONFIDENCES)[number];

export const deliveryAgentHistoricalMatchConfidenceSchema = z.enum(
  DELIVERY_AGENT_HISTORICAL_MATCH_CONFIDENCES
);

export const DELIVERY_AGENT_HISTORICAL_RUN_ROLES = [
  "kitchen_start_provider",
  "handoff_start_receiver",
  "independent_driver",
  "support_rescue",
  "unknown",
] as const;

export type DeliveryAgentHistoricalRunRole =
  (typeof DELIVERY_AGENT_HISTORICAL_RUN_ROLES)[number];

export const deliveryAgentHistoricalRunRoleSchema = z.enum(DELIVERY_AGENT_HISTORICAL_RUN_ROLES);

export const DELIVERY_AGENT_PROFILE_COMPATIBILITY_VALUES = [
  "same_profile",
  "transferable_profile",
  "different_profile",
  "unknown",
] as const;

export type DeliveryAgentProfileCompatibility =
  (typeof DELIVERY_AGENT_PROFILE_COMPATIBILITY_VALUES)[number];

export const deliveryAgentProfileCompatibilitySchema = z.enum(
  DELIVERY_AGENT_PROFILE_COMPATIBILITY_VALUES
);

export const DELIVERY_AGENT_LEARNING_COORDINATE_REF_TYPES = [
  "order",
  "ro_stop",
  "handoff",
  "start",
  "end",
  "kitchen",
  "unknown",
] as const;

export type DeliveryAgentLearningCoordinateRefType =
  (typeof DELIVERY_AGENT_LEARNING_COORDINATE_REF_TYPES)[number];

export const DELIVERY_AGENT_LEARNING_OUTLIER_DIRECTIONS = [
  "north",
  "south",
  "east",
  "west",
  "far_north",
  "far_south",
  "far_east",
  "far_west",
  "unknown",
] as const;

export type DeliveryAgentLearningOutlierDirection =
  (typeof DELIVERY_AGENT_LEARNING_OUTLIER_DIRECTIONS)[number];

export const DELIVERY_AGENT_LEARNING_BACKTRACKING_RISK = [
  "low",
  "medium",
  "high",
  "unknown",
] as const;

export type DeliveryAgentLearningBacktrackingRisk =
  (typeof DELIVERY_AGENT_LEARNING_BACKTRACKING_RISK)[number];

export const DELIVERY_AGENT_LEARNING_ROUTE_SMOOTHNESS = [
  "good",
  "risky",
  "bad",
  "unknown",
] as const;

export type DeliveryAgentLearningRouteSmoothness =
  (typeof DELIVERY_AGENT_LEARNING_ROUTE_SMOOTHNESS)[number];

export const DELIVERY_AGENT_LEARNING_ETA_BASIS_QUALITY = [
  "post_start_majority",
  "planned_only",
  "mixed",
  "unknown",
] as const;

export type DeliveryAgentLearningEtaBasisQuality =
  (typeof DELIVERY_AGENT_LEARNING_ETA_BASIS_QUALITY)[number];

export const DELIVERY_AGENT_LEARNING_LATENESS_ATTRIBUTIONS = [
  "on_time",
  "route_problem",
  "driver_start_delay",
  "handoff_delay",
  "mixed",
  "unknown",
] as const;

export type DeliveryAgentLearningLatenessAttribution =
  (typeof DELIVERY_AGENT_LEARNING_LATENESS_ATTRIBUTIONS)[number];

export const deliveryAgentLearningLatenessAttributionSchema = z.enum(
  DELIVERY_AGENT_LEARNING_LATENESS_ATTRIBUTIONS
);

export type DeliveryAgentLearningRunStartDelay = {
  roRunId: string;
  plannedStartTime?: string | null;
  actualStartTime?: string | null;
  startDelayMinutes?: number | null;
};

export type DeliveryAgentLearningOrderSnapshot = {
  orderId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  formattedAddress?: string | null;
  area?: string | null;
  status?: string | null;
  deliveryDate?: string | null;
  totalMealQuantity?: number | null;
  unitNumber?: string | null;
  buzzCode?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type DeliveryAgentLearningMatchedStop = {
  kapiooOrderId: string;
  roRunId: string;
  roStopSequence: number;
  roCustomerIndex?: number | null;
  roStopType?: string | null;
  roCustomerName?: string | null;
  roCustomerPhone?: string | null;
  roCustomerAddress?: string | null;
  matchMethod: DeliveryAgentHistoricalMatchMethod;
  matchConfidence: DeliveryAgentHistoricalMatchConfidence;
  matchReason?: string | null;
  coordinateRef?: string | null;
};

export type DeliveryAgentLearningUnmatchedOrder = {
  orderId: string;
  reason: string;
  possibleRoStopRefs?: string[];
};

export type DeliveryAgentLearningUnmatchedRoStop = {
  roRunId: string;
  roStopSequence: number;
  roCustomerName?: string | null;
  roCustomerPhone?: string | null;
  roCustomerAddress?: string | null;
  isSynthetic?: boolean;
  stopType?: string | null;
  reason: string;
};

export type DeliveryAgentLearningMatchCoverage = {
  totalOrders: number;
  matchedOrders: number;
  unmatchedOrders: number;
  totalRoCustomerStops: number;
  matchedRoCustomerStops: number;
  unmatchedRoCustomerStops: number;
  matchCoveragePercent: number;
  exactMatches: number;
  highConfidenceMatches: number;
  uncertainMatches: number;
  syntheticUnmatchedStops: number;
};

export type DeliveryAgentLearningCoordinateSnapshot = {
  ref: string;
  refType: DeliveryAgentLearningCoordinateRefType;
  orderId?: string | null;
  roRunId?: string | null;
  roStopSequence?: number | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  coordinateSource: DeliveryAgentLearningCoordinateSource;
  coordinateConfidence: DeliveryAgentLearningCoordinateConfidence;
  warnings?: string[];
};

export type DeliveryAgentLearningCoordinateCoverage = {
  totalStops: number;
  stopsWithCoordinates: number;
  stopsAddressOnly: number;
  coveragePercent: number;
  sourceBreakdown: Partial<Record<DeliveryAgentLearningCoordinateSource, number>>;
  handoffCoordinatesPresent: boolean;
  kitchenCoordinatesPresent: boolean;
  recommendationConfidence: "high" | "medium" | "low";
  warnings: string[];
};

export type DeliveryAgentLearningGeoFeatures = {
  coordinateCoverage: DeliveryAgentLearningCoordinateCoverage;
  boundingBox?: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
  centerPoint?: { lat: number; lng: number } | null;
  spreadKm?: { northSouth: number; eastWest: number } | null;
  maxDistanceFromCenterKm?: number | null;
  maxDistanceFromKitchenKm?: number | null;
  maxDistanceFromHandoffKm?: number | null;
  dynamicOutliers: Array<{
    ref: string;
    orderId?: string | null;
    distanceFromCenterKm: number;
    direction?: DeliveryAgentLearningOutlierDirection;
    reason: string;
  }>;
  areaDistribution: Record<string, number>;
  sameBuildingClusterCount: number;
  sameBuildingClusters: Array<{
    clusterId: string;
    orderIds: string[];
    center?: { lat: number; lng: number } | null;
  }>;
  majorClusterSummary?: string | null;
  warnings: string[];
};

export type DeliveryAgentLearningRouteShapeFeatures = {
  runCount: number;
  supportRunUsed: boolean;
  selfRunUsed: boolean;
  kitchenStartRunCount: number;
  handoffStartRunCount: number;
  providerBeforeHandoffStopCount?: number | null;
  handoffSequencePositions: Array<{
    roRunId: string;
    sequence: number;
  }>;
  receiverStartsAtHandoff?: boolean | null;
  backtrackingRisk?: DeliveryAgentLearningBacktrackingRisk;
  routeDirectionSmoothness?: DeliveryAgentLearningRouteSmoothness;
  warnings: string[];
};

export type DeliveryAgentLearningStopControlFeatures = {
  fixedStopsUsed: boolean;
  endStopsUsed: boolean;
  firstStopsUsed: boolean;
  handoffStopsUsed: boolean;
  runs: Array<{
    roRunId: string;
    driverName?: string | null;
    runRole: DeliveryAgentHistoricalRunRole;
    startLocation?: string | null;
    endLocation?: string | null;
    stops: Array<{
      sequence: number;
      orderIds: string[];
      fixedStopPosition?: number | null;
      isFirstStop?: boolean | null;
      isEndPoint?: boolean | null;
      isSynthetic?: boolean | null;
      stopType?: string | null;
    }>;
  }>;
  unknownFlags: string[];
  warnings: string[];
};

export type DeliveryAgentLearningOutcomeFeatures = {
  runCompletedBefore1pm?: boolean | null;
  latestRunCompletedAt?: string | null;
  deadlineBufferMinutes?: number | null;
  lateMinutes?: number | null;
  etaBasisQuality: DeliveryAgentLearningEtaBasisQuality;
  actualStartTimes: string[];
  runCompletedAtTimes: string[];
  plannedStartTimes?: string[];
  startDelayMinutesByRun?: DeliveryAgentLearningRunStartDelay[];
  providerStartDelayMinutes?: number | null;
  normalizedFinishTimeIfStartedOnTime?: string | null;
  normalizedDeadlineBufferMinutes?: number | null;
  routeWouldHaveMetDeadlineIfStartedOnTime?: boolean | null;
  latenessAttribution?: DeliveryAgentLearningLatenessAttribution | null;
  handoffDelayLikely?: boolean | null;
  receiverLikelyDelayedByProvider?: boolean | null;
  perStopEtaErrorsMinutes: Array<{
    roRunId: string;
    sequence: number;
    etaErrorMinutes: number;
  }>;
  warnings: string[];
};

export type DeliveryAgentLearningResourceProfileFeatures = {
  profileId: string;
  profileName?: string | null;
  hiredDriverRunCount?: number | null;
  availableRunCount?: number | null;
  supportAvailable?: boolean | null;
  supportRunUsed: boolean;
  selfRunUsed: boolean;
  runCountUsed: number;
  runRoles: DeliveryAgentHistoricalRunRole[];
  driverNamesRaw: string[];
  profileCompatibilityForFuture?: DeliveryAgentProfileCompatibility;
  profileTransferNotes: string[];
  warnings: string[];
};

export type DeliveryAgentLearningQualitySummary = {
  learningLabel: DeliveryAgentLearningLabel;
  learningWeight: number;
  dataQualityScore: number;
  canUseForPositiveRetrieval: boolean;
  excludeReason?: string | null;
  qualityReasons: string[];
  warnings: string[];
};

export const DELIVERY_AGENT_LEARNING_MANUAL_REVIEW_ACTIONS = [
  "approve_positive",
  "approve_weak_positive",
  "mark_negative",
  "mark_avoid_pattern",
  "exclude",
  "keep_uncertain",
  "reset_pending",
] as const;

export type DeliveryAgentLearningManualReviewAction =
  (typeof DELIVERY_AGENT_LEARNING_MANUAL_REVIEW_ACTIONS)[number];

export type DeliveryAgentLearningManualReview = {
  reviewedAt: string;
  reviewedBy?: string | null;
  action: DeliveryAgentLearningManualReviewAction;
  previousLearningLabel: DeliveryAgentLearningLabel;
  learningLabel: DeliveryAgentLearningLabel;
  notes?: string | null;
};

export type DeliveryAgentLearningCaseContract = {
  schemaVersion: typeof DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION;
  deliveryDate: string;
  profileId: string;
  caseKey: string;
  sourceHash?: string | null;
  backfillBatchId?: string | null;
  deliveryAgentRunId?: string | null;
  adminOrdersSnapshot: DeliveryAgentLearningOrderSnapshot[];
  routeOptimizerRunsSnapshot?: RouteOptimizerRunsByDateResponse | null;
  matchedStops: DeliveryAgentLearningMatchedStop[];
  unmatchedOrders: DeliveryAgentLearningUnmatchedOrder[];
  unmatchedRoStops: DeliveryAgentLearningUnmatchedRoStop[];
  matchCoverage: DeliveryAgentLearningMatchCoverage;
  coordinateSnapshots: DeliveryAgentLearningCoordinateSnapshot[];
  coordinateCoverage: DeliveryAgentLearningCoordinateCoverage;
  geoFeatures: DeliveryAgentLearningGeoFeatures;
  routeShapeFeatures: DeliveryAgentLearningRouteShapeFeatures;
  stopControlFeatures: DeliveryAgentLearningStopControlFeatures;
  outcomeFeatures: DeliveryAgentLearningOutcomeFeatures;
  resourceProfileFeatures: DeliveryAgentLearningResourceProfileFeatures;
  quality: DeliveryAgentLearningQualitySummary;
  reviewStatus: DeliveryAgentLearningReviewStatus;
  manualReview?: DeliveryAgentLearningManualReview | null;
  warnings: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

export function createEmptyDeliveryAgentLearningMatchCoverage(): DeliveryAgentLearningMatchCoverage {
  return {
    totalOrders: 0,
    matchedOrders: 0,
    unmatchedOrders: 0,
    totalRoCustomerStops: 0,
    matchedRoCustomerStops: 0,
    unmatchedRoCustomerStops: 0,
    matchCoveragePercent: 0,
    exactMatches: 0,
    highConfidenceMatches: 0,
    uncertainMatches: 0,
    syntheticUnmatchedStops: 0,
  };
}

export function createEmptyDeliveryAgentLearningCoordinateCoverage(): DeliveryAgentLearningCoordinateCoverage {
  return {
    totalStops: 0,
    stopsWithCoordinates: 0,
    stopsAddressOnly: 0,
    coveragePercent: 0,
    sourceBreakdown: {},
    handoffCoordinatesPresent: false,
    kitchenCoordinatesPresent: false,
    recommendationConfidence: "low",
    warnings: [],
  };
}

export function createEmptyDeliveryAgentLearningGeoFeatures(): DeliveryAgentLearningGeoFeatures {
  return {
    coordinateCoverage: createEmptyDeliveryAgentLearningCoordinateCoverage(),
    boundingBox: null,
    centerPoint: null,
    spreadKm: null,
    maxDistanceFromCenterKm: null,
    maxDistanceFromKitchenKm: null,
    maxDistanceFromHandoffKm: null,
    dynamicOutliers: [],
    areaDistribution: {},
    sameBuildingClusterCount: 0,
    sameBuildingClusters: [],
    majorClusterSummary: null,
    warnings: [],
  };
}

export function createEmptyDeliveryAgentLearningRouteShapeFeatures(): DeliveryAgentLearningRouteShapeFeatures {
  return {
    runCount: 0,
    supportRunUsed: false,
    selfRunUsed: false,
    kitchenStartRunCount: 0,
    handoffStartRunCount: 0,
    providerBeforeHandoffStopCount: null,
    handoffSequencePositions: [],
    receiverStartsAtHandoff: null,
    backtrackingRisk: "unknown",
    routeDirectionSmoothness: "unknown",
    warnings: [],
  };
}

export function createEmptyDeliveryAgentLearningStopControlFeatures(): DeliveryAgentLearningStopControlFeatures {
  return {
    fixedStopsUsed: false,
    endStopsUsed: false,
    firstStopsUsed: false,
    handoffStopsUsed: false,
    runs: [],
    unknownFlags: [],
    warnings: [],
  };
}

export function createEmptyDeliveryAgentLearningOutcomeFeatures(): DeliveryAgentLearningOutcomeFeatures {
  return {
    runCompletedBefore1pm: null,
    latestRunCompletedAt: null,
    deadlineBufferMinutes: null,
    lateMinutes: null,
    etaBasisQuality: "unknown",
    actualStartTimes: [],
    runCompletedAtTimes: [],
    plannedStartTimes: [],
    startDelayMinutesByRun: [],
    providerStartDelayMinutes: null,
    normalizedFinishTimeIfStartedOnTime: null,
    normalizedDeadlineBufferMinutes: null,
    routeWouldHaveMetDeadlineIfStartedOnTime: null,
    latenessAttribution: "unknown",
    handoffDelayLikely: null,
    receiverLikelyDelayedByProvider: null,
    perStopEtaErrorsMinutes: [],
    warnings: [],
  };
}

export function createEmptyDeliveryAgentLearningResourceProfileFeatures(
  profileId: string
): DeliveryAgentLearningResourceProfileFeatures {
  return {
    profileId,
    profileName: null,
    hiredDriverRunCount: null,
    availableRunCount: null,
    supportAvailable: null,
    supportRunUsed: false,
    selfRunUsed: false,
    runCountUsed: 0,
    runRoles: [],
    driverNamesRaw: [],
    profileCompatibilityForFuture: "unknown",
    profileTransferNotes: [],
    warnings: [],
  };
}

export function createEmptyDeliveryAgentLearningQualitySummary(): DeliveryAgentLearningQualitySummary {
  return {
    learningLabel: "uncertain",
    learningWeight: 0,
    dataQualityScore: 0,
    canUseForPositiveRetrieval: false,
    excludeReason: null,
    qualityReasons: [],
    warnings: [],
  };
}

export function createEmptyDeliveryAgentLearningCaseContract(input: {
  deliveryDate: string;
  profileId: string;
  caseKey?: string;
}): DeliveryAgentLearningCaseContract {
  const deliveryDate = input.deliveryDate.trim();
  const profileId = input.profileId.trim();
  const caseKey =
    input.caseKey?.trim() ||
    buildDeliveryAgentLearningCaseKey({ deliveryDate, profileId });

  return {
    schemaVersion: DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION,
    deliveryDate,
    profileId,
    caseKey,
    sourceHash: null,
    backfillBatchId: null,
    deliveryAgentRunId: null,
    adminOrdersSnapshot: [],
    routeOptimizerRunsSnapshot: null,
    matchedStops: [],
    unmatchedOrders: [],
    unmatchedRoStops: [],
    matchCoverage: createEmptyDeliveryAgentLearningMatchCoverage(),
    coordinateSnapshots: [],
    coordinateCoverage: createEmptyDeliveryAgentLearningCoordinateCoverage(),
    geoFeatures: createEmptyDeliveryAgentLearningGeoFeatures(),
    routeShapeFeatures: createEmptyDeliveryAgentLearningRouteShapeFeatures(),
    stopControlFeatures: createEmptyDeliveryAgentLearningStopControlFeatures(),
    outcomeFeatures: createEmptyDeliveryAgentLearningOutcomeFeatures(),
    resourceProfileFeatures: createEmptyDeliveryAgentLearningResourceProfileFeatures(profileId),
    quality: createEmptyDeliveryAgentLearningQualitySummary(),
    reviewStatus: "none",
    manualReview: null,
    warnings: [],
  };
}
