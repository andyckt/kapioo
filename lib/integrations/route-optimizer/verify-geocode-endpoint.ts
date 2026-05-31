import { geocodeAddressesBatch } from "@/lib/integrations/route-optimizer/client";
import { buildRouteOptimizerUrl, getRouteOptimizerConfig } from "@/lib/integrations/route-optimizer/config";
import {
  RouteOptimizerAuthError,
  RouteOptimizerConfigError,
  RouteOptimizerError,
  RouteOptimizerRateLimitError,
  RouteOptimizerResponseError,
} from "@/lib/integrations/route-optimizer/errors";
import { ROUTE_OPTIMIZER_PATHS } from "@/lib/integrations/route-optimizer/types";

import {
  GEOCODE_AUTH_FAILED_MESSAGE,
  GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE,
  GEOCODE_RATE_LIMIT_MESSAGE,
} from "@/lib/agents/delivery/geocode/geocode-enrichment-alerts";

export type VerifyRouteOptimizerGeocodeEndpointResult = {
  reachable: boolean;
  endpointPath: string;
  endpointUrl: string;
  httpStatus?: number;
  authAccepted: boolean;
  sampleGeocoded: boolean;
  responseShapeValid: boolean;
  message: string;
  errorCode?: string;
};

const SAMPLE_GEOCODE_ADDRESS = "100 Queen St W, Toronto, ON M5H 2N2, Canada";

export async function verifyRouteOptimizerGeocodeEndpoint(): Promise<VerifyRouteOptimizerGeocodeEndpointResult> {
  const endpointPath = ROUTE_OPTIMIZER_PATHS.geocodeAddresses;

  let endpointUrl: string;
  try {
    const { baseUrl } = getRouteOptimizerConfig();
    endpointUrl = buildRouteOptimizerUrl(baseUrl, endpointPath);
  } catch (error) {
    const message =
      error instanceof RouteOptimizerConfigError
        ? error.message
        : "Route Optimizer configuration is missing.";
    return {
      reachable: false,
      endpointPath,
      endpointUrl: "",
      authAccepted: false,
      sampleGeocoded: false,
      responseShapeValid: false,
      message,
      errorCode: "ROUTE_OPTIMIZER_CONFIG_ERROR",
    };
  }

  try {
    const response = await geocodeAddressesBatch({
      created_by_integration: "kapioo-admin-health-check",
      idempotency_key: `kapioo-geocode-health-check:${Date.now()}`,
      addresses: [
        {
          client_ref: "health-check-sample",
          address: SAMPLE_GEOCODE_ADDRESS,
          area: "Downtown Toronto",
          country: "Canada",
        },
      ],
    });

    const firstResult = response.results?.[0];
    const sampleGeocoded =
      typeof firstResult?.lat === "number" &&
      Number.isFinite(firstResult.lat) &&
      typeof firstResult?.lng === "number" &&
      Number.isFinite(firstResult.lng);
    const responseShapeValid = Array.isArray(response.results);

    return {
      reachable: true,
      endpointPath,
      endpointUrl,
      httpStatus: 200,
      authAccepted: true,
      sampleGeocoded,
      responseShapeValid,
      message: sampleGeocoded
        ? "Route Optimizer geocode endpoint is reachable and returned coordinates for the sample address."
        : "Route Optimizer geocode endpoint responded, but the sample address did not return coordinates.",
    };
  } catch (error) {
    if (error instanceof RouteOptimizerAuthError) {
      return {
        reachable: true,
        endpointPath,
        endpointUrl,
        httpStatus: error.status,
        authAccepted: false,
        sampleGeocoded: false,
        responseShapeValid: false,
        message: GEOCODE_AUTH_FAILED_MESSAGE,
        errorCode: error.code,
      };
    }

    if (error instanceof RouteOptimizerRateLimitError) {
      return {
        reachable: true,
        endpointPath,
        endpointUrl,
        httpStatus: error.status,
        authAccepted: true,
        sampleGeocoded: false,
        responseShapeValid: false,
        message: GEOCODE_RATE_LIMIT_MESSAGE,
        errorCode: error.code,
      };
    }

    if (error instanceof RouteOptimizerResponseError && error.status === 404) {
      return {
        reachable: false,
        endpointPath,
        endpointUrl,
        httpStatus: 404,
        authAccepted: false,
        sampleGeocoded: false,
        responseShapeValid: false,
        message: GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE,
        errorCode: error.code,
      };
    }

    const message =
      error instanceof RouteOptimizerError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Route Optimizer geocode health check failed.";

    return {
      reachable: false,
      endpointPath,
      endpointUrl,
      httpStatus: error instanceof RouteOptimizerError ? error.status : undefined,
      authAccepted: false,
      sampleGeocoded: false,
      responseShapeValid: false,
      message,
      errorCode: error instanceof RouteOptimizerError ? error.code : undefined,
    };
  }
}
