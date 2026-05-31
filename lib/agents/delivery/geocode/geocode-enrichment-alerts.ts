import {
  RouteOptimizerAuthError,
  RouteOptimizerRateLimitError,
  RouteOptimizerResponseError,
} from "@/lib/integrations/route-optimizer/errors";

import type { GeocodeEnrichmentAlert } from "@/lib/agents/delivery/geocode/types";

export const GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE =
  "Route Optimizer geocode endpoint is not available. Coordinate enrichment could not run.";

export const GEOCODE_AUTH_FAILED_MESSAGE =
  "Route Optimizer geocode auth failed. Check ROUTE_OPTIMIZER_API_KEY.";

export const GEOCODE_RATE_LIMIT_MESSAGE =
  "Route Optimizer geocode rate limit reached. Try again later.";

export function buildGeocodeBatchFailureAlert(error: unknown): GeocodeEnrichmentAlert {
  if (error instanceof RouteOptimizerAuthError) {
    return { code: "auth_failed", message: GEOCODE_AUTH_FAILED_MESSAGE };
  }

  if (error instanceof RouteOptimizerRateLimitError) {
    return { code: "rate_limited", message: GEOCODE_RATE_LIMIT_MESSAGE };
  }

  if (error instanceof RouteOptimizerResponseError && error.status === 404) {
    return { code: "endpoint_unavailable", message: GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE };
  }

  return {
    code: "batch_failed",
    message: "Route Optimizer geocode batch failed. Coordinate enrichment used area fallback.",
  };
}

export function buildPartialGeocodeFailureAlert(failedOrderIds: string[]): GeocodeEnrichmentAlert | undefined {
  if (failedOrderIds.length === 0) {
    return undefined;
  }

  const preview = failedOrderIds.slice(0, 5).join(", ");
  const suffix = failedOrderIds.length > 5 ? ` (+${failedOrderIds.length - 5} more)` : "";

  return {
    code: "partial_failure",
    message: `Geocode failed for ${failedOrderIds.length} stop(s): ${preview}${suffix}.`,
    failedStopOrderIds: failedOrderIds,
  };
}

export function buildLowCoverageWarning(stopsWithoutCoordinates: number): string | undefined {
  if (stopsWithoutCoordinates <= 0) {
    return undefined;
  }

  return `Recommendation is lower confidence because ${stopsWithoutCoordinates} stop(s) do not have coordinates.`;
}

export function collectCoordinateCoverageWarnings(input: {
  alerts?: GeocodeEnrichmentAlert[];
  stopsFallback: number;
  recommendationConfidence: string;
}): string[] {
  const warnings = (input.alerts ?? []).map((alert) => alert.message);
  const lowCoverage = buildLowCoverageWarning(input.stopsFallback);

  if (lowCoverage && input.recommendationConfidence !== "high") {
    warnings.push(lowCoverage);
  }

  return [...new Set(warnings)];
}
