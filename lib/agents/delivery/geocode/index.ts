export { buildCoordinateCoverageSummary, buildCoordinateCoverageFromPlanningStops } from "@/lib/agents/delivery/geocode/build-coordinate-coverage-summary";
export { enrichRoutingStops, type EnrichRoutingStopsResult } from "@/lib/agents/delivery/geocode/enrich-routing-stops";
export { readGeocodeCacheBatch, writeGeocodeCacheEntry } from "@/lib/agents/delivery/geocode/geocode-cache";
export {
  getEnrichedDeliveryOrdersForRouting,
  type GetEnrichedDeliveryOrdersForRoutingResult,
} from "@/lib/agents/delivery/geocode/get-enriched-delivery-orders-for-routing";
export {
  buildGeocodeIdempotencyKey,
  buildNormalizedAddressKey,
} from "@/lib/agents/delivery/geocode/normalize-address-key";
export type {
  CoordinateConfidence,
  CoordinateSource,
  CoordinateStatus,
  DeliveryAgentCoordinateCoverageSummary,
  DeliveryAgentGeocodeEnrichment,
  DeliveryAgentStopCoordinateRecord,
  RecommendationConfidence,
} from "@/lib/agents/delivery/geocode/types";
