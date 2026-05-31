import type { PlanningStop } from "@/lib/agents/delivery/candidate-plans/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";

import type {
  DeliveryAgentCoordinateCoverageSummary,
  DeliveryAgentStopCoordinateRecord,
  GeocodeEnrichmentAlert,
  RecommendationConfidence,
} from "@/lib/agents/delivery/geocode/types";
import { buildCoordinateSourceBreakdown } from "@/lib/agents/delivery/geocode/build-coordinate-source-breakdown";

function isFlexibleStop(stop: Pick<RoutingStop, "area">): boolean {
  const area = stop.area.trim().toLowerCase();
  return area === "north york" || area === "unknown" || area === "";
}

function hasCoordinates(record: Pick<DeliveryAgentStopCoordinateRecord, "lat" | "lng" | "status">): boolean {
  return (
    record.status !== "failed" &&
    typeof record.lat === "number" &&
    Number.isFinite(record.lat) &&
    typeof record.lng === "number" &&
    Number.isFinite(record.lng)
  );
}

function resolveRecommendationConfidence(input: {
  coveragePercent: number;
  stopsGeocodeFailed: number;
  stopsFallback: number;
  hasApproximate: boolean;
  flexibleStopMissingCoords: number;
  rateLimited?: boolean;
}): RecommendationConfidence {
  if (input.rateLimited || input.flexibleStopMissingCoords > 0 || input.coveragePercent < 70) {
    return "low";
  }

  if (
    input.coveragePercent >= 95 &&
    input.stopsGeocodeFailed === 0 &&
    !input.hasApproximate &&
    input.stopsFallback === 0
  ) {
    return "high";
  }

  if (input.coveragePercent >= 70) {
    return "medium";
  }

  return "low";
}

export function buildCoordinateCoverageSummary(input: {
  stops: RoutingStop[];
  stopCoordinates: DeliveryAgentStopCoordinateRecord[];
  rateLimited?: boolean;
  alerts?: GeocodeEnrichmentAlert[];
  failedStopOrderIds?: string[];
}): DeliveryAgentCoordinateCoverageSummary {
  const totalValidStops = input.stops.length;
  const recordByOrderId = new Map(input.stopCoordinates.map((record) => [record.orderId, record]));

  let stopsWithCoordinates = 0;
  let stopsFallback = 0;
  let stopsGeocodeFailed = 0;
  let hasApproximate = false;
  let flexibleStopMissingCoords = 0;

  for (const stop of input.stops) {
    const record = recordByOrderId.get(stop.orderId);

    if (!record) {
      stopsFallback += 1;
      if (isFlexibleStop(stop)) {
        flexibleStopMissingCoords += 1;
      }
      continue;
    }

    if (record.status === "failed" || record.source === "fallback_unavailable") {
      stopsGeocodeFailed += 1;
      stopsFallback += 1;
      if (isFlexibleStop(stop)) {
        flexibleStopMissingCoords += 1;
      }
      continue;
    }

    if (hasCoordinates(record)) {
      stopsWithCoordinates += 1;
      if (record.status === "approximate") {
        hasApproximate = true;
      }
      continue;
    }

    stopsFallback += 1;
    if (isFlexibleStop(stop)) {
      flexibleStopMissingCoords += 1;
    }
  }

  const coveragePercent =
    totalValidStops === 0
      ? 0
      : Math.round((stopsWithCoordinates / totalValidStops) * 100);

  const failedFromRecords = input.stopCoordinates
    .filter((record) => record.source === "fallback_unavailable" || record.status === "failed")
    .map((record) => record.orderId);
  const failedStopOrderIds = [
    ...new Set([...(input.failedStopOrderIds ?? []), ...failedFromRecords]),
  ];

  return {
    totalValidStops,
    stopsWithCoordinates,
    stopsFallback,
    stopsGeocodeFailed,
    coveragePercent,
    recommendationConfidence: resolveRecommendationConfidence({
      coveragePercent,
      stopsGeocodeFailed,
      stopsFallback,
      hasApproximate,
      flexibleStopMissingCoords,
      rateLimited: input.rateLimited,
    }),
    sourceBreakdown: buildCoordinateSourceBreakdown(input.stopCoordinates),
    ...(input.alerts && input.alerts.length > 0 ? { alerts: input.alerts } : {}),
    ...(failedStopOrderIds.length > 0 ? { failedStopOrderIds } : {}),
    ...(input.rateLimited ? { rateLimited: true } : {}),
  };
}

export function buildCoordinateCoverageFromPlanningStops(
  stops: PlanningStop[],
  stopCoordinates: DeliveryAgentStopCoordinateRecord[],
  rateLimited?: boolean
): DeliveryAgentCoordinateCoverageSummary {
  const routingLike = stops.map((stop) => ({
    orderId: stop.orderId,
    area: stop.area,
  }));

  return buildCoordinateCoverageSummary({
    stops: routingLike as RoutingStop[],
    stopCoordinates,
    rateLimited,
  });
}
