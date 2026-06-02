import type { RoutingStop } from "@/lib/agents/delivery/types";
import type {
  CoordinateConfidence,
  CoordinateSource,
  CoordinateStatus,
} from "@/lib/agents/delivery/geocode/types";

export function readFiniteCoordinate(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function overlayCoordinatesOnRoutingStop(
  stop: RoutingStop,
  input: {
    lat?: number;
    lng?: number;
    source: CoordinateSource;
    status: CoordinateStatus;
    confidence?: CoordinateConfidence;
    geocodeStatus?: string;
  }
): RoutingStop {
  const lat = readFiniteCoordinate(input.lat);
  const lng = readFiniteCoordinate(input.lng);
  const hasCoords = lat !== undefined && lng !== undefined;

  return {
    ...stop,
    lat: hasCoords ? lat : undefined,
    lng: hasCoords ? lng : undefined,
    coordinateSource: input.source,
    coordinateStatus: input.status,
    coordinateConfidence: input.confidence,
    routeOptimizer: {
      ...stop.routeOptimizer,
      ...(hasCoords
        ? {
            lat,
            lng,
            geocode_status: input.geocodeStatus ?? "OK",
          }
        : {}),
    },
  };
}

export function routingStopHasCoordinates(stop: RoutingStop): boolean {
  return readFiniteCoordinate(stop.lat) !== undefined && readFiniteCoordinate(stop.lng) !== undefined;
}
