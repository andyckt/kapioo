export { buildCoordinateSourceBreakdown } from "@/lib/agents/delivery/geocode/build-coordinate-source-breakdown";
export { buildCoordinateCoverageSummary, buildCoordinateCoverageFromPlanningStops } from "@/lib/agents/delivery/geocode/build-coordinate-coverage-summary";
export {
  buildGeocodeBatchFailureAlert,
  buildPartialGeocodeFailureAlert,
  collectCoordinateCoverageWarnings,
  GEOCODE_AUTH_FAILED_MESSAGE,
  GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE,
  GEOCODE_RATE_LIMIT_MESSAGE,
} from "@/lib/agents/delivery/geocode/geocode-enrichment-alerts";
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
  CoordinateSourceBreakdown,
  CoordinateStatus,
  DeliveryAgentCoordinateCoverageSummary,
  DeliveryAgentGeocodeEnrichment,
  DeliveryAgentStopCoordinateRecord,
  GeocodeEnrichmentAlert,
  GeocodeEnrichmentRunStats,
  RecommendationConfidence,
} from "@/lib/agents/delivery/geocode/types";
