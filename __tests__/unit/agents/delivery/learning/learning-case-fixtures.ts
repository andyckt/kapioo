import {
  createEmptyDeliveryAgentLearningCaseContract,
  DELIVERY_AGENT_HISTORICAL_RUN_ROLES,
  DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION,
  DELIVERY_AGENT_LEARNING_COORDINATE_SOURCES,
  DELIVERY_AGENT_LEARNING_LABELS,
  DELIVERY_AGENT_PROFILE_COMPATIBILITY_VALUES,
  deliveryAgentLearningLabelSchema,
} from "@/lib/contracts/delivery-agent-learning";
import { oneRunOneStopResponse } from "@/__tests__/unit/integrations/route-optimizer/runs-by-date-fixtures";

export function buildMinimalLearningCaseInput() {
  return createEmptyDeliveryAgentLearningCaseContract({
    deliveryDate: "2026-05-31",
    profileId: "daily-default",
  });
}

export function buildTwoDriverResourceProfileFeatures() {
  return {
    profileId: "daily-v1-2-driver",
    profileName: "2 hired drivers + Donald backup",
    hiredDriverRunCount: 2,
    availableRunCount: 2,
    supportAvailable: true,
    supportRunUsed: false,
    selfRunUsed: false,
    runCountUsed: 2,
    runRoles: ["kitchen_start_provider", "handoff_start_receiver"] as const,
    driverNamesRaw: ["DT", "Marco"],
    profileCompatibilityForFuture: "transferable_profile" as const,
    profileTransferNotes: [
      "Historical 2-driver split; geography lessons transferable to 3-driver profile.",
    ],
    warnings: [],
  };
}

export function buildThreeDriverResourceProfileFeatures() {
  return {
    profileId: "daily-v1-3-driver",
    profileName: "3 hired drivers + Donald backup",
    hiredDriverRunCount: 3,
    availableRunCount: 3,
    supportAvailable: true,
    supportRunUsed: false,
    selfRunUsed: false,
    runCountUsed: 3,
    runRoles: ["independent_driver", "independent_driver", "independent_driver"] as const,
    driverNamesRaw: ["DT", "Marco", "UT"],
    profileCompatibilityForFuture: "same_profile" as const,
    profileTransferNotes: [],
    warnings: [],
  };
}

export function buildSampleGeoFeatures() {
  return {
    coordinateCoverage: {
      totalStops: 10,
      stopsWithCoordinates: 9,
      stopsAddressOnly: 1,
      coveragePercent: 90,
      sourceBreakdown: {
        route_optimizer_historical: 8,
        order_data: 1,
      },
      handoffCoordinatesPresent: true,
      kitchenCoordinatesPresent: false,
      recommendationConfidence: "high" as const,
      warnings: ["kitchen_coordinates_unconfigured"],
    },
    boundingBox: { minLat: 43.64, maxLat: 43.78, minLng: -79.45, maxLng: -79.32 },
    centerPoint: { lat: 43.71, lng: -79.38 },
    spreadKm: { northSouth: 15.6, eastWest: 10.2 },
    maxDistanceFromCenterKm: 12.4,
    maxDistanceFromKitchenKm: null,
    maxDistanceFromHandoffKm: 8.1,
    dynamicOutliers: [
      {
        ref: "order:DD-90000099",
        orderId: "DD-90000099",
        distanceFromCenterKm: 12.4,
        direction: "far_north" as const,
        reason: "north_of_center_threshold",
      },
    ],
    areaDistribution: {
      core_dt: 4,
      flexible_north_york: 3,
      core_uptown: 3,
    },
    sameBuildingClusterCount: 1,
    sameBuildingClusters: [
      {
        clusterId: "cluster-1",
        orderIds: ["DD-90000001", "DD-90000002"],
        center: { lat: 43.65, lng: -79.38 },
      },
    ],
    majorClusterSummary: "Downtown cluster with one North York outlier",
    warnings: [],
  };
}

export function buildFullLearningCasePayload() {
  const base = buildMinimalLearningCaseInput();

  return {
    ...base,
    routeOptimizerRunsSnapshot: oneRunOneStopResponse,
    adminOrdersSnapshot: [
      {
        orderId: "DD-90000001",
        customerName: "Donald",
        customerPhone: "4379891111",
        formattedAddress: "123 Main St, Toronto",
        area: "Downtown Toronto",
        status: "delivered",
        deliveryDate: "2026-05-31",
        totalMealQuantity: 2,
      },
    ],
    matchedStops: [
      {
        kapiooOrderId: "DD-90000001",
        roRunId: "run-abc123",
        roStopSequence: 0,
        roCustomerIndex: 0,
        roCustomerName: "Donald-1111",
        matchMethod: "order_id" as const,
        matchConfidence: "exact" as const,
        matchReason: "order_id_exact_match",
        coordinateRef: "order:DD-90000001",
      },
    ],
    coordinateSnapshots: [
      {
        ref: "order:DD-90000001",
        refType: "order" as const,
        orderId: "DD-90000001",
        lat: 43.65,
        lng: -79.38,
        coordinateSource: "route_optimizer_historical" as const,
        coordinateConfidence: "high" as const,
      },
      {
        ref: "handoff:run-abc123",
        refType: "handoff" as const,
        roRunId: "run-abc123",
        lat: 43.7,
        lng: -79.4,
        coordinateSource: "route_optimizer_historical" as const,
        coordinateConfidence: "high" as const,
      },
    ],
    geoFeatures: buildSampleGeoFeatures(),
    resourceProfileFeatures: buildTwoDriverResourceProfileFeatures(),
    quality: {
      ...base.quality,
      learningLabel: "positive" as const,
      learningWeight: 0.9,
      dataQualityScore: 85,
      canUseForPositiveRetrieval: true,
    },
  };
}

export {
  DELIVERY_AGENT_HISTORICAL_RUN_ROLES,
  DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION,
  DELIVERY_AGENT_LEARNING_COORDINATE_SOURCES,
  DELIVERY_AGENT_LEARNING_LABELS,
  DELIVERY_AGENT_PROFILE_COMPATIBILITY_VALUES,
};
