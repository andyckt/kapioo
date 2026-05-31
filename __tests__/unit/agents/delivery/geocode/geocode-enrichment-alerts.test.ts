import { describe, expect, it } from "vitest";

import {
  buildGeocodeBatchFailureAlert,
  buildPartialGeocodeFailureAlert,
  collectCoordinateCoverageWarnings,
  GEOCODE_AUTH_FAILED_MESSAGE,
  GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE,
  GEOCODE_RATE_LIMIT_MESSAGE,
} from "@/lib/agents/delivery/geocode/geocode-enrichment-alerts";
import {
  RouteOptimizerAuthError,
  RouteOptimizerRateLimitError,
  RouteOptimizerResponseError,
} from "@/lib/integrations/route-optimizer/errors";

describe("geocode-enrichment-alerts", () => {
  it("maps 404 to endpoint unavailable message", () => {
    const alert = buildGeocodeBatchFailureAlert(
      new RouteOptimizerResponseError("not found", { status: 404, path: "/api/integrations/geocode-addresses" })
    );

    expect(alert.code).toBe("endpoint_unavailable");
    expect(alert.message).toBe(GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE);
  });

  it("maps auth errors to auth failed message", () => {
    const alert = buildGeocodeBatchFailureAlert(
      new RouteOptimizerAuthError("Unauthorized", { status: 401 })
    );

    expect(alert.code).toBe("auth_failed");
    expect(alert.message).toBe(GEOCODE_AUTH_FAILED_MESSAGE);
  });

  it("maps rate limit errors", () => {
    const alert = buildGeocodeBatchFailureAlert(
      new RouteOptimizerRateLimitError("Rate limited", { status: 429 })
    );

    expect(alert.code).toBe("rate_limited");
    expect(alert.message).toBe(GEOCODE_RATE_LIMIT_MESSAGE);
  });

  it("builds partial failure alert with order ids", () => {
    const alert = buildPartialGeocodeFailureAlert(["DD-1", "DD-2"]);

    expect(alert?.code).toBe("partial_failure");
    expect(alert?.message).toContain("DD-1");
    expect(alert?.failedStopOrderIds).toEqual(["DD-1", "DD-2"]);
  });

  it("collects coverage warnings without duplicates", () => {
    const warnings = collectCoordinateCoverageWarnings({
      alerts: [{ code: "endpoint_unavailable", message: GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE }],
      stopsFallback: 3,
      recommendationConfidence: "low",
    });

    expect(warnings).toContain(GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE);
    expect(warnings.some((warning) => warning.includes("3 stop"))).toBe(true);
  });
});
