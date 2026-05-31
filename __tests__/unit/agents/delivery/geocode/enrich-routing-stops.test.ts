const {
  geocodeAddressesBatchMock,
  readGeocodeCacheBatchMock,
  writeGeocodeCacheEntryMock,
} = vi.hoisted(() => ({
  geocodeAddressesBatchMock: vi.fn(),
  readGeocodeCacheBatchMock: vi.fn(),
  writeGeocodeCacheEntryMock: vi.fn(),
}));

vi.mock("@/lib/integrations/route-optimizer/client", () => ({
  geocodeAddressesBatch: geocodeAddressesBatchMock,
}));

vi.mock("@/lib/agents/delivery/geocode/geocode-cache", () => ({
  readGeocodeCacheBatch: readGeocodeCacheBatchMock,
  writeGeocodeCacheEntry: writeGeocodeCacheEntryMock,
}));

import { enrichRoutingStops } from "@/lib/agents/delivery/geocode/enrich-routing-stops";
import type { RoutingStop } from "@/lib/agents/delivery/types";

function buildStop(overrides: Partial<RoutingStop> = {}): RoutingStop {
  return {
    orderId: "DD-90000001",
    mongoId: "mongo-1",
    customerName: "Customer",
    customerPhone: "4165550100",
    customerEmail: "test@example.com",
    area: "North York",
    formattedAddress: "Unit 5, 123 Main St, North York M2N 1A1, Canada",
    deliveryAddress: {
      unitNumber: "5",
      streetAddress: "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M2N 1A1",
      country: "Canada",
      buzzCode: "",
    },
    notes: "",
    specialInstructions: "",
    deliveryDate: "2026-06-09",
    deliveryWindow: "11:00-13:00",
    mealSummary: "2 meals",
    totalMealQuantity: 2,
    items: [],
    status: "confirmed",
    hasAdminOverride: false,
    routeOptimizer: {
      name: "Customer",
      phone: "4165550100",
      address: "Unit 5, 123 Main St, North York M2N 1A1, Canada",
      notes: "",
      order_ids: ["DD-90000001"],
    },
    ...overrides,
  };
}

describe("enrichRoutingStops", () => {
  beforeEach(() => {
    geocodeAddressesBatchMock.mockReset();
    readGeocodeCacheBatchMock.mockReset();
    writeGeocodeCacheEntryMock.mockReset();
    readGeocodeCacheBatchMock.mockResolvedValue(new Map());
    writeGeocodeCacheEntryMock.mockResolvedValue(undefined);
  });

  it("uses order_data coordinates without calling Route Optimizer", async () => {
    const stop = buildStop({
      lat: 43.7615,
      lng: -79.4111,
      coordinateSource: "order_data",
      coordinateStatus: "ok",
      coordinateConfidence: "high",
    });

    const result = await enrichRoutingStops({
      deliveryDate: "2026-06-09",
      stops: [stop],
    });

    expect(geocodeAddressesBatchMock).not.toHaveBeenCalled();
    expect(result.stops[0]?.lat).toBe(43.7615);
    expect(result.stops[0]?.coordinateSource).toBe("order_data");
    expect(result.geocodeEnrichment.coordinateCoverage.stopsWithCoordinates).toBe(1);
  });

  it("uses cache before calling Route Optimizer", async () => {
    const stop = buildStop();
    readGeocodeCacheBatchMock.mockImplementation(async (keys: string[]) => {
      const map = new Map();
      for (const key of keys) {
        map.set(key, {
          normalizedAddressKey: key,
          formattedAddress: stop.formattedAddress,
          lat: 43.77,
          lng: -79.42,
          status: "ok",
          confidence: "high",
          geocodedAt: new Date(),
        });
      }
      return map;
    });

    const result = await enrichRoutingStops({
      deliveryDate: "2026-06-09",
      stops: [stop],
    });

    expect(geocodeAddressesBatchMock).not.toHaveBeenCalled();
    expect(result.stops[0]?.coordinateSource).toBe("delivery_agent_cache");
    expect(result.stops[0]?.lat).toBe(43.77);
  });

  it("calls Route Optimizer only for missing coordinates", async () => {
    geocodeAddressesBatchMock.mockResolvedValue({
      status: "completed",
      total_requested: 1,
      total_succeeded: 1,
      total_failed: 0,
      results: [
        {
          client_ref: "DD-90000001",
          address: "Unit 5, 123 Main St, North York M2N 1A1, Canada",
          lat: 43.7615,
          lng: -79.4111,
          geocode_status: "OK",
          confidence: "high",
        },
      ],
    });

    const result = await enrichRoutingStops({
      deliveryDate: "2026-06-09",
      stops: [buildStop()],
    });

    expect(geocodeAddressesBatchMock).toHaveBeenCalledTimes(1);
    expect(result.stops[0]?.coordinateSource).toBe("route_optimizer_geocode");
    expect(writeGeocodeCacheEntryMock).toHaveBeenCalled();
  });

  it("handles partial geocode failure per stop", async () => {
    geocodeAddressesBatchMock.mockResolvedValue({
      status: "completed",
      total_requested: 1,
      total_failed: 1,
      total_succeeded: 0,
      results: [
        {
          client_ref: "DD-90000001",
          address: "Unit 5, 123 Main St, North York M2N 1A1, Canada",
          geocode_status: "ZERO_RESULTS",
          error: "Address could not be geocoded",
        },
      ],
    });

    const result = await enrichRoutingStops({
      deliveryDate: "2026-06-09",
      stops: [buildStop()],
    });

    expect(result.stops[0]?.coordinateSource).toBe("fallback_unavailable");
    expect(result.geocodeEnrichment.coordinateCoverage.stopsGeocodeFailed).toBe(1);
    expect(writeGeocodeCacheEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });

  it("falls back when geocode batch endpoint is unavailable", async () => {
    const { RouteOptimizerResponseError } = await import(
      "@/lib/integrations/route-optimizer/errors"
    );
    const { GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE } = await import(
      "@/lib/agents/delivery/geocode/geocode-enrichment-alerts"
    );

    geocodeAddressesBatchMock.mockRejectedValue(
      new RouteOptimizerResponseError("Geocode endpoint not found", { status: 404 })
    );

    const result = await enrichRoutingStops({
      deliveryDate: "2026-06-09",
      stops: [buildStop()],
    });

    expect(result.stops[0]?.coordinateSource).toBe("fallback_unavailable");
    expect(result.geocodeEnrichment.coordinateCoverage.alerts?.[0]?.message).toBe(
      GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE
    );
    expect(result.geocodeEnrichment.coordinateCoverage.recommendationConfidence).toBe("low");
    expect(writeGeocodeCacheEntryMock).not.toHaveBeenCalled();
    expect(result.geocodeEnrichment.runStats?.roGeocodeRequested).toBe(1);
  });

  it("records partial geocode failures per stop", async () => {
    geocodeAddressesBatchMock.mockResolvedValue({
      status: "completed",
      total_requested: 1,
      total_failed: 1,
      total_succeeded: 0,
      results: [
        {
          client_ref: "DD-90000001",
          address: "Unit 5, 123 Main St, North York M2N 1A1, Canada",
          geocode_status: "ZERO_RESULTS",
          error: "Address could not be geocoded",
        },
      ],
    });

    const result = await enrichRoutingStops({
      deliveryDate: "2026-06-09",
      stops: [buildStop()],
    });

    expect(result.geocodeEnrichment.coordinateCoverage.alerts?.[0]?.code).toBe("partial_failure");
    expect(result.geocodeEnrichment.coordinateCoverage.failedStopOrderIds).toContain("DD-90000001");
  });
});
