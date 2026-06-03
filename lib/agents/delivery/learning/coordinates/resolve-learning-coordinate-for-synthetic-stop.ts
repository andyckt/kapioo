import type { DeliveryAgentLearningCoordinateSnapshot } from "@/lib/contracts/delivery-agent-learning";

import { hasFiniteLatLng } from "@/lib/agents/delivery/learning/coordinates/is-finite-coordinate";
import type { FlattenedRouteOptimizerCustomerStop } from "@/lib/agents/delivery/learning/matching/types";

function readTrimmedAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildSyntheticRef(roStop: FlattenedRouteOptimizerCustomerStop): string {
  if (roStop.roStopType === "handoff" || roStop.isSynthetic) {
    return `handoff:${roStop.roRunId}:${roStop.roStopSequence}`;
  }

  return `synthetic:${roStop.roRunId}:${roStop.roStopSequence}`;
}

export function resolveLearningCoordinateForSyntheticStop(args: {
  roStop: FlattenedRouteOptimizerCustomerStop;
}): DeliveryAgentLearningCoordinateSnapshot {
  const { roStop } = args;
  const warnings: string[] = [];
  const ref = buildSyntheticRef(roStop);
  const refType = roStop.roStopType === "handoff" || roStop.isSynthetic ? "handoff" : "ro_stop";
  const address = readTrimmedAddress(roStop.customerAddress);

  if (hasFiniteLatLng(roStop)) {
    return {
      ref,
      refType,
      orderId: null,
      roRunId: roStop.roRunId,
      roStopSequence: roStop.roStopSequence,
      address,
      lat: roStop.lat ?? null,
      lng: roStop.lng ?? null,
      coordinateSource: "route_optimizer_historical",
      coordinateConfidence: "high",
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  if (address) {
    warnings.push("coordinate_missing_address_only");
    return {
      ref,
      refType,
      orderId: null,
      roRunId: roStop.roRunId,
      roStopSequence: roStop.roStopSequence,
      address,
      lat: null,
      lng: null,
      coordinateSource: "address_only",
      coordinateConfidence: "none",
      warnings,
    };
  }

  warnings.push("coordinate_unavailable");
  return {
    ref,
    refType,
    orderId: null,
    roRunId: roStop.roRunId,
    roStopSequence: roStop.roStopSequence,
    address: null,
    lat: null,
    lng: null,
    coordinateSource: "unavailable",
    coordinateConfidence: "none",
    warnings,
  };
}
