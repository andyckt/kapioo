import type {
  DeliveryAgentLearningCoordinateSnapshot,
  DeliveryAgentLearningGeoFeatures,
  DeliveryAgentLearningOutlierDirection,
} from "@/lib/contracts/delivery-agent-learning";

import { hasFiniteLatLng } from "@/lib/agents/delivery/learning/coordinates/is-finite-coordinate";
import { haversineDistanceKm } from "@/lib/agents/delivery/learning/geo-features/distance";
import type { GeoPoint } from "@/lib/agents/delivery/learning/geo-features/types";

const DEFAULT_MIN_DISTANCE_FROM_CENTER_KM = 8;
const DEFAULT_TOP_N = 5;
const FAR_DIRECTION_DISTANCE_KM = 12;

const ELIGIBLE_REF_TYPES = new Set(["order", "ro_stop", "handoff"]);

function classifyOutlierDirection(input: {
  point: GeoPoint;
  centerPoint: GeoPoint;
  distanceKm: number;
}): DeliveryAgentLearningOutlierDirection {
  const latDelta = input.point.lat - input.centerPoint.lat;
  const lngDelta = input.point.lng - input.centerPoint.lng;
  const absLatDelta = Math.abs(latDelta);
  const absLngDelta = Math.abs(lngDelta);

  if (absLatDelta === 0 && absLngDelta === 0) {
    return "unknown";
  }

  const farPrefix = input.distanceKm >= FAR_DIRECTION_DISTANCE_KM ? "far_" : "";

  if (absLatDelta >= absLngDelta) {
    if (latDelta >= 0) {
      return farPrefix === "far_" ? "far_north" : "north";
    }
    return farPrefix === "far_" ? "far_south" : "south";
  }

  if (lngDelta >= 0) {
    return farPrefix === "far_" ? "far_east" : "east";
  }
  return farPrefix === "far_" ? "far_west" : "west";
}

export function detectDynamicOutliers(args: {
  snapshots: DeliveryAgentLearningCoordinateSnapshot[];
  centerPoint: GeoPoint | null;
  minDistanceFromCenterKm?: number;
  topN?: number;
}): DeliveryAgentLearningGeoFeatures["dynamicOutliers"] {
  const centerPoint = args.centerPoint;
  if (!centerPoint) {
    return [];
  }

  const minDistance = args.minDistanceFromCenterKm ?? DEFAULT_MIN_DISTANCE_FROM_CENTER_KM;
  const topN = args.topN ?? DEFAULT_TOP_N;

  const candidates = args.snapshots
    .filter(
      (snapshot) =>
        ELIGIBLE_REF_TYPES.has(snapshot.refType) && hasFiniteLatLng(snapshot)
    )
    .map((snapshot) => {
      const point = { lat: snapshot.lat as number, lng: snapshot.lng as number };
      const distanceFromCenterKm = haversineDistanceKm(centerPoint, point);
      const direction = classifyOutlierDirection({
        point,
        centerPoint,
        distanceKm: distanceFromCenterKm,
      });

      return {
        ref: snapshot.ref,
        orderId: snapshot.orderId ?? null,
        distanceFromCenterKm,
        direction,
        reason: `distance_from_center_${distanceFromCenterKm.toFixed(1)}km`,
      };
    })
    .filter((candidate) => candidate.distanceFromCenterKm >= minDistance)
    .sort((a, b) => b.distanceFromCenterKm - a.distanceFromCenterKm)
    .slice(0, topN);

  return candidates;
}
