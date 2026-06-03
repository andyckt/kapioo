import type {
  DeliveryAgentLearningCoordinateSnapshot,
  DeliveryAgentLearningMatchedStop,
  DeliveryAgentLearningOrderSnapshot,
} from "@/lib/contracts/delivery-agent-learning";

import { hasFiniteLatLng } from "@/lib/agents/delivery/learning/coordinates/is-finite-coordinate";
import type { FlattenedRouteOptimizerCustomerStop } from "@/lib/agents/delivery/learning/matching/types";

function readTrimmedAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveLearningCoordinateForMatchedStop(args: {
  matchedStop: DeliveryAgentLearningMatchedStop;
  order?: DeliveryAgentLearningOrderSnapshot | null;
  roStop?: FlattenedRouteOptimizerCustomerStop | null;
}): DeliveryAgentLearningCoordinateSnapshot {
  const { matchedStop, order, roStop } = args;
  const warnings: string[] = [];

  const ref = matchedStop.coordinateRef ?? `order:${matchedStop.kapiooOrderId}`;

  if (roStop && hasFiniteLatLng(roStop)) {
    return {
      ref,
      refType: "order",
      orderId: matchedStop.kapiooOrderId,
      roRunId: matchedStop.roRunId,
      roStopSequence: matchedStop.roStopSequence,
      address: readTrimmedAddress(roStop.customerAddress),
      lat: roStop.lat ?? null,
      lng: roStop.lng ?? null,
      coordinateSource: "route_optimizer_historical",
      coordinateConfidence: "high",
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  if (order && hasFiniteLatLng(order)) {
    return {
      ref,
      refType: "order",
      orderId: matchedStop.kapiooOrderId,
      roRunId: matchedStop.roRunId,
      roStopSequence: matchedStop.roStopSequence,
      address: readTrimmedAddress(order.formattedAddress),
      lat: order.lat ?? null,
      lng: order.lng ?? null,
      coordinateSource: "order_data",
      coordinateConfidence: "high",
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  const roAddress = readTrimmedAddress(roStop?.customerAddress);
  const orderAddress = readTrimmedAddress(order?.formattedAddress);
  const address = roAddress ?? orderAddress;

  if (address) {
    warnings.push("coordinate_missing_address_only");
    return {
      ref,
      refType: "order",
      orderId: matchedStop.kapiooOrderId,
      roRunId: matchedStop.roRunId,
      roStopSequence: matchedStop.roStopSequence,
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
    refType: "order",
    orderId: matchedStop.kapiooOrderId,
    roRunId: matchedStop.roRunId,
    roStopSequence: matchedStop.roStopSequence,
    address: null,
    lat: null,
    lng: null,
    coordinateSource: "unavailable",
    coordinateConfidence: "none",
    warnings,
  };
}
