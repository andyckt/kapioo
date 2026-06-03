import type {
  DeliveryAgentLearningCoordinateCoverage,
  DeliveryAgentLearningCoordinateSnapshot,
  DeliveryAgentLearningCoordinateSource,
} from "@/lib/contracts/delivery-agent-learning";

import { hasFiniteLatLng } from "@/lib/agents/delivery/learning/coordinates/is-finite-coordinate";

const LOW_COVERAGE_THRESHOLD_PERCENT = 50;

function incrementSourceBreakdown(
  breakdown: Partial<Record<DeliveryAgentLearningCoordinateSource, number>>,
  source: DeliveryAgentLearningCoordinateSource
): void {
  breakdown[source] = (breakdown[source] ?? 0) + 1;
}

export function buildLearningCoordinateCoverage(
  snapshots: DeliveryAgentLearningCoordinateSnapshot[]
): DeliveryAgentLearningCoordinateCoverage {
  const warnings: string[] = [];
  const sourceBreakdown: Partial<Record<DeliveryAgentLearningCoordinateSource, number>> = {};

  if (snapshots.length === 0) {
    warnings.push("no_coordinate_snapshots");
    return {
      totalStops: 0,
      stopsWithCoordinates: 0,
      stopsAddressOnly: 0,
      coveragePercent: 0,
      sourceBreakdown,
      handoffCoordinatesPresent: false,
      kitchenCoordinatesPresent: false,
      recommendationConfidence: "low",
      warnings,
    };
  }

  let stopsWithCoordinates = 0;
  let stopsAddressOnly = 0;
  let handoffSnapshotPresent = false;
  let handoffCoordinatesPresent = false;
  let kitchenSnapshotPresent = false;
  let kitchenCoordinatesPresent = false;

  for (const snapshot of snapshots) {
    incrementSourceBreakdown(sourceBreakdown, snapshot.coordinateSource);

    if (hasFiniteLatLng(snapshot)) {
      stopsWithCoordinates += 1;
    }

    if (snapshot.coordinateSource === "address_only") {
      stopsAddressOnly += 1;
    }

    if (snapshot.refType === "handoff") {
      handoffSnapshotPresent = true;
      if (hasFiniteLatLng(snapshot)) {
        handoffCoordinatesPresent = true;
      }
    }

    if (snapshot.refType === "kitchen") {
      kitchenSnapshotPresent = true;
      if (hasFiniteLatLng(snapshot)) {
        kitchenCoordinatesPresent = true;
      }
    }
  }

  const totalStops = snapshots.length;
  const coveragePercent = Math.round((stopsWithCoordinates / totalStops) * 100);

  let recommendationConfidence: DeliveryAgentLearningCoordinateCoverage["recommendationConfidence"] =
    "low";
  if (coveragePercent >= 80) {
    recommendationConfidence = "high";
  } else if (coveragePercent >= 50) {
    recommendationConfidence = "medium";
  }

  if (coveragePercent < LOW_COVERAGE_THRESHOLD_PERCENT) {
    warnings.push("low_coordinate_coverage");
  }

  if (handoffSnapshotPresent && !handoffCoordinatesPresent) {
    warnings.push("handoff_coordinates_missing");
  }

  if (kitchenSnapshotPresent && !kitchenCoordinatesPresent) {
    warnings.push("kitchen_coordinates_missing");
  }

  return {
    totalStops,
    stopsWithCoordinates,
    stopsAddressOnly,
    coveragePercent,
    sourceBreakdown,
    handoffCoordinatesPresent,
    kitchenCoordinatesPresent,
    recommendationConfidence,
    warnings,
  };
}
