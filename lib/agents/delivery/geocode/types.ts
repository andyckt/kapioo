export type CoordinateSource =
  | "order_data"
  | "delivery_agent_cache"
  | "route_optimizer_geocode"
  | "fallback_unavailable";

export type CoordinateStatus = "ok" | "failed" | "approximate";

export type CoordinateConfidence = "high" | "medium" | "low";

export type RecommendationConfidence = "high" | "medium" | "low";

export type GeocodeEnrichmentAlertCode =
  | "endpoint_unavailable"
  | "auth_failed"
  | "rate_limited"
  | "batch_failed"
  | "partial_failure";

export type GeocodeEnrichmentAlert = {
  code: GeocodeEnrichmentAlertCode;
  message: string;
  failedStopOrderIds?: string[];
};

export type CoordinateSourceBreakdown = {
  orderData: number;
  cache: number;
  routeOptimizerGeocode: number;
  fallbackUnavailable: number;
};

export type GeocodeEnrichmentRunStats = {
  totalStops: number;
  cacheHits: number;
  roGeocodeRequested: number;
  roGeocodeSucceeded: number;
  roGeocodeFailed: number;
  endpointPath: string;
  endpointUrl?: string;
};

export type DeliveryAgentStopCoordinateRecord = {
  orderId: string;
  normalizedAddressKey: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  source: CoordinateSource;
  status: CoordinateStatus;
  confidence?: CoordinateConfidence;
  geocodeStatus?: string;
  geocodedAt?: string;
};

export type DeliveryAgentCoordinateCoverageSummary = {
  totalValidStops: number;
  stopsWithCoordinates: number;
  stopsFallback: number;
  stopsGeocodeFailed: number;
  coveragePercent: number;
  recommendationConfidence: RecommendationConfidence;
  rateLimited?: boolean;
  sourceBreakdown?: CoordinateSourceBreakdown;
  alerts?: GeocodeEnrichmentAlert[];
  failedStopOrderIds?: string[];
};

export type DeliveryAgentGeocodeEnrichment = {
  artifactVersion: "1";
  enrichedAt: string;
  provider: "route_optimizer";
  stopCoordinates: DeliveryAgentStopCoordinateRecord[];
  coordinateCoverage: DeliveryAgentCoordinateCoverageSummary;
  runStats?: GeocodeEnrichmentRunStats;
};

export const GEOCODE_CACHE_SUCCESS_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const GEOCODE_CACHE_FAILURE_TTL_MS = 24 * 60 * 60 * 1000;
