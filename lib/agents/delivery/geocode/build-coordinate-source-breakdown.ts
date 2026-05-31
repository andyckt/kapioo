import type {
  CoordinateSource,
  CoordinateSourceBreakdown,
  DeliveryAgentStopCoordinateRecord,
} from "@/lib/agents/delivery/geocode/types";

const SOURCE_KEYS: Record<CoordinateSource, keyof CoordinateSourceBreakdown> = {
  order_data: "orderData",
  delivery_agent_cache: "cache",
  route_optimizer_geocode: "routeOptimizerGeocode",
  fallback_unavailable: "fallbackUnavailable",
};

export function buildCoordinateSourceBreakdown(
  stopCoordinates: DeliveryAgentStopCoordinateRecord[]
): CoordinateSourceBreakdown {
  const breakdown: CoordinateSourceBreakdown = {
    orderData: 0,
    cache: 0,
    routeOptimizerGeocode: 0,
    fallbackUnavailable: 0,
  };

  for (const record of stopCoordinates) {
    const key = SOURCE_KEYS[record.source];
    breakdown[key] += 1;
  }

  return breakdown;
}
