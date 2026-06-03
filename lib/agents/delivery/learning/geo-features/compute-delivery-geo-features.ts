import { createEmptyDeliveryAgentLearningGeoFeatures } from "@/lib/contracts/delivery-agent-learning";
import type {
  DeliveryAgentLearningCoordinateSnapshot,
  DeliveryAgentLearningGeoFeatures,
  DeliveryAgentLearningOrderSnapshot,
} from "@/lib/contracts/delivery-agent-learning";

import { buildLearningCoordinateCoverage } from "@/lib/agents/delivery/learning/coordinates/build-learning-coordinate-coverage";
import { hasFiniteLatLng } from "@/lib/agents/delivery/learning/coordinates/is-finite-coordinate";
import { computeAreaDistribution } from "@/lib/agents/delivery/learning/geo-features/compute-area-distribution";
import { computeBoundingBox } from "@/lib/agents/delivery/learning/geo-features/compute-bounding-box";
import { computeCenterPoint } from "@/lib/agents/delivery/learning/geo-features/compute-center-point";
import { computeSpreadKm } from "@/lib/agents/delivery/learning/geo-features/compute-spread-km";
import { detectDynamicOutliers } from "@/lib/agents/delivery/learning/geo-features/detect-dynamic-outliers";
import { detectSameBuildingClusters } from "@/lib/agents/delivery/learning/geo-features/detect-same-building-clusters";
import { haversineDistanceKm } from "@/lib/agents/delivery/learning/geo-features/distance";
import type { GeoPoint } from "@/lib/agents/delivery/learning/geo-features/types";

function snapshotToPoint(snapshot: DeliveryAgentLearningCoordinateSnapshot): GeoPoint | null {
  if (!hasFiniteLatLng(snapshot)) {
    return null;
  }

  return { lat: snapshot.lat as number, lng: snapshot.lng as number };
}

function resolveHandoffPoint(input: {
  coordinateSnapshots: DeliveryAgentLearningCoordinateSnapshot[];
  handoffPoint?: GeoPoint | null;
}): GeoPoint | null {
  if (input.handoffPoint) {
    return input.handoffPoint;
  }

  for (const snapshot of input.coordinateSnapshots) {
    if (snapshot.refType !== "handoff") {
      continue;
    }

    const point = snapshotToPoint(snapshot);
    if (point) {
      return point;
    }
  }

  return null;
}

function computeMaxDistanceFromPoint(
  points: GeoPoint[],
  referencePoint: GeoPoint | null
): number | null {
  if (!referencePoint || points.length === 0) {
    return null;
  }

  return points.reduce((maxDistance, point) => {
    const distance = haversineDistanceKm(referencePoint, point);
    return Math.max(maxDistance, distance);
  }, 0);
}

function buildMajorClusterSummary(
  clusters: DeliveryAgentLearningGeoFeatures["sameBuildingClusters"]
): string | null {
  if (clusters.length === 0) {
    return null;
  }

  const largest = clusters.reduce((currentLargest, cluster) =>
    cluster.orderIds.length > currentLargest.orderIds.length ? cluster : currentLargest
  );

  if (largest.orderIds.length < 2) {
    return null;
  }

  return `Largest same-building cluster has ${largest.orderIds.length} orders (${largest.clusterId})`;
}

export function computeDeliveryGeoFeatures(args: {
  orders: DeliveryAgentLearningOrderSnapshot[];
  coordinateSnapshots: DeliveryAgentLearningCoordinateSnapshot[];
  kitchenPoint?: GeoPoint | null;
  handoffPoint?: GeoPoint | null;
}): DeliveryAgentLearningGeoFeatures {
  const warnings: string[] = [];
  const coordinateCoverage = buildLearningCoordinateCoverage(args.coordinateSnapshots);

  const geoPoints = args.coordinateSnapshots
    .map(snapshotToPoint)
    .filter((point): point is GeoPoint => point !== null);

  if (geoPoints.length === 0) {
    const empty = createEmptyDeliveryAgentLearningGeoFeatures();
    return {
      ...empty,
      coordinateCoverage,
      warnings: [...coordinateCoverage.warnings],
    };
  }

  const boundingBox = computeBoundingBox(geoPoints);
  const centerPoint = computeCenterPoint(geoPoints);
  const spreadKm = computeSpreadKm(geoPoints);
  const maxDistanceFromCenterKm = computeMaxDistanceFromPoint(geoPoints, centerPoint);

  const handoffPoint = resolveHandoffPoint({
    coordinateSnapshots: args.coordinateSnapshots,
    handoffPoint: args.handoffPoint,
  });
  const maxDistanceFromHandoffKm = computeMaxDistanceFromPoint(geoPoints, handoffPoint);

  const kitchenPoint = args.kitchenPoint ?? null;
  const maxDistanceFromKitchenKm = kitchenPoint
    ? computeMaxDistanceFromPoint(geoPoints, kitchenPoint)
    : null;

  if (!kitchenPoint) {
    warnings.push("kitchen_coordinates_unconfigured");
  }

  const dynamicOutliers = detectDynamicOutliers({
    snapshots: args.coordinateSnapshots,
    centerPoint,
  });
  const areaDistribution = computeAreaDistribution({
    orders: args.orders,
    snapshots: args.coordinateSnapshots,
  });
  const sameBuildingClusters = detectSameBuildingClusters({
    snapshots: args.coordinateSnapshots,
  });

  return {
    coordinateCoverage,
    boundingBox,
    centerPoint,
    spreadKm,
    maxDistanceFromCenterKm,
    maxDistanceFromKitchenKm,
    maxDistanceFromHandoffKm,
    dynamicOutliers,
    areaDistribution,
    sameBuildingClusterCount: sameBuildingClusters.length,
    sameBuildingClusters,
    majorClusterSummary: buildMajorClusterSummary(sameBuildingClusters),
    warnings: [...coordinateCoverage.warnings, ...warnings],
  };
}
