import type {
  PlanningAreaBucket,
  PlanningRunLean,
  PlanningStop,
} from "@/lib/agents/delivery/candidate-plans/types";
import { DOWNTOWN_REFERENCE } from "@/lib/agents/delivery/candidate-plans/types";
import { DAILY_DELIVERY_AREAS } from "@/lib/constants/areas";
import type { RoutingStop } from "@/lib/agents/delivery/types";

const CORE_DT_AREAS = new Set(["Downtown Toronto", "Midtown"]);
const CORE_UPTOWN_AREAS = new Set(["Markham", "Richmond Hill"]);

function normalizeArea(area: string): string {
  const trimmed = area.trim();
  const match = DAILY_DELIVERY_AREAS.find(
    (candidate) => candidate.toLowerCase() === trimmed.toLowerCase()
  );
  return match ?? trimmed;
}

function classifyAreaBucket(normalizedArea: string): PlanningAreaBucket {
  if (CORE_DT_AREAS.has(normalizedArea)) {
    return "core_dt";
  }

  if (CORE_UPTOWN_AREAS.has(normalizedArea)) {
    return "core_uptown";
  }

  if (normalizedArea === "North York") {
    return "flexible_north_york";
  }

  return "unknown";
}

function readOptionalCoordinate(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptionalCoordinatesFromStop(stop: RoutingStop): { lat?: number; lng?: number } {
  const raw = stop as RoutingStop & {
    lat?: number;
    lng?: number;
    deliveryAddress?: { lat?: number; lng?: number };
  };

  return {
    lat: readOptionalCoordinate(raw.lat ?? raw.deliveryAddress?.lat),
    lng: readOptionalCoordinate(raw.lng ?? raw.deliveryAddress?.lng),
  };
}

function inferNorthYorkLeanFromAddress(formattedAddress: string): PlanningRunLean {
  const upper = formattedAddress.toUpperCase();

  if (/\bM3H\b|\bM2N\b|\bM2M\b|\bM3K\b/.test(upper)) {
    return "dt";
  }

  if (/\bM2J\b|\bM2H\b|\bM2K\b|\bM3A\b/.test(upper)) {
    return "marco";
  }

  return "dt";
}

export function inferNorthYorkLean(stop: Pick<PlanningStop, "lat" | "lng" | "formattedAddress" | "orderId">): PlanningRunLean {
  if (typeof stop.lat === "number" && typeof stop.lng === "number") {
    const latDelta = stop.lat - DOWNTOWN_REFERENCE.lat;
    const lngDelta = stop.lng - DOWNTOWN_REFERENCE.lng;
    const score = latDelta * 2 + lngDelta;

    return score <= 0 ? "dt" : "marco";
  }

  const addressLean = inferNorthYorkLeanFromAddress(stop.formattedAddress);
  if (addressLean) {
    return addressLean;
  }

  return stop.orderId.charCodeAt(stop.orderId.length - 1) % 2 === 0 ? "marco" : "dt";
}

export function toPlanningStop(stop: RoutingStop): PlanningStop {
  const area = normalizeArea(stop.area);
  const areaBucket = classifyAreaBucket(area);
  const coordinates = readOptionalCoordinatesFromStop(stop);
  const planningTags: string[] = [];

  if (areaBucket === "core_dt") {
    planningTags.push("core_dt", "area_primary");
  } else if (areaBucket === "core_uptown") {
    planningTags.push("core_uptown", "area_primary");
  } else if (areaBucket === "flexible_north_york") {
    planningTags.push("flexible_north_york");
  } else {
    planningTags.push("area_unknown");
  }

  let defaultRunLean: PlanningRunLean | null = null;

  if (areaBucket === "core_dt") {
    defaultRunLean = "dt";
  } else if (areaBucket === "core_uptown") {
    defaultRunLean = "marco";
  } else if (areaBucket === "flexible_north_york" || areaBucket === "unknown") {
    defaultRunLean = inferNorthYorkLean({
      orderId: stop.orderId,
      formattedAddress: stop.formattedAddress,
      lat: coordinates.lat,
      lng: coordinates.lng,
    });

    if (coordinates.lat !== undefined && coordinates.lng !== undefined) {
      planningTags.push(defaultRunLean === "dt" ? "lat_lng_lean_dt" : "lat_lng_lean_marco");
    } else {
      planningTags.push("address_fallback_lean");
    }
  }

  return {
    orderId: stop.orderId,
    customerName: stop.customerName,
    area,
    formattedAddress: stop.formattedAddress,
    lat: coordinates.lat,
    lng: coordinates.lng,
    totalMealQuantity: stop.totalMealQuantity,
    planningTags,
    areaBucket,
    defaultRunLean,
  };
}

export function toPlanningStops(stops: RoutingStop[]): PlanningStop[] {
  return stops.map(toPlanningStop);
}

export function hasLatLngFallback(stops: PlanningStop[]): boolean {
  return stops.some(
    (stop) =>
      (stop.areaBucket === "flexible_north_york" || stop.areaBucket === "unknown") &&
      (stop.lat === undefined || stop.lng === undefined)
  );
}
