import { errorJson } from "@/lib/api";
import {
  GEOCODE_AUTH_FAILED_MESSAGE,
  GEOCODE_RATE_LIMIT_MESSAGE,
} from "@/lib/agents/delivery/geocode/geocode-enrichment-alerts";
import {
  RouteOptimizerAuthError,
  RouteOptimizerRateLimitError,
} from "@/lib/integrations/route-optimizer/errors";

export function mapGeocodeEnrichmentRouteError(error: unknown) {
  if (error instanceof RouteOptimizerRateLimitError) {
    return errorJson(GEOCODE_RATE_LIMIT_MESSAGE, 429, { details: error.message });
  }

  if (error instanceof RouteOptimizerAuthError) {
    return errorJson(GEOCODE_AUTH_FAILED_MESSAGE, 502, { details: error.message });
  }

  return null;
}
