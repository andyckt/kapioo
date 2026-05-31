import { geocodeAddressesBatch } from "@/lib/integrations/route-optimizer/client";
import { verifyRouteOptimizerGeocodeEndpoint } from "@/lib/integrations/route-optimizer/verify-geocode-endpoint";
import { GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE } from "@/lib/agents/delivery/geocode/geocode-enrichment-alerts";

vi.mock("@/lib/integrations/route-optimizer/client", () => ({
  geocodeAddressesBatch: vi.fn(),
}));

describe("verifyRouteOptimizerGeocodeEndpoint", () => {
  const geocodeAddressesBatchMock = vi.mocked(geocodeAddressesBatch);

  beforeEach(() => {
    geocodeAddressesBatchMock.mockReset();
    process.env.ROUTE_OPTIMIZER_BASE_URL = "https://ro.example.com";
    process.env.ROUTE_OPTIMIZER_API_KEY = "test-key";
  });

  afterEach(() => {
    delete process.env.ROUTE_OPTIMIZER_BASE_URL;
    delete process.env.ROUTE_OPTIMIZER_API_KEY;
  });

  it("reports success when sample address geocodes", async () => {
    geocodeAddressesBatchMock.mockResolvedValue({
      status: "completed",
      results: [
        {
          client_ref: "health-check-sample",
          address: "100 Queen St W, Toronto, ON M5H 2N2, Canada",
          lat: 43.653,
          lng: -79.384,
          geocode_status: "OK",
        },
      ],
    });

    const result = await verifyRouteOptimizerGeocodeEndpoint();

    expect(result.reachable).toBe(true);
    expect(result.authAccepted).toBe(true);
    expect(result.sampleGeocoded).toBe(true);
    expect(result.endpointUrl).toContain("/api/integrations/geocode-addresses");
  });

  it("reports endpoint unavailable on 404-shaped client failure", async () => {
    const { RouteOptimizerResponseError } = await import(
      "@/lib/integrations/route-optimizer/errors"
    );

    geocodeAddressesBatchMock.mockRejectedValue(
      new RouteOptimizerResponseError("missing", { status: 404 })
    );

    const result = await verifyRouteOptimizerGeocodeEndpoint();

    expect(result.reachable).toBe(false);
    expect(result.message).toBe(GEOCODE_ENDPOINT_UNAVAILABLE_MESSAGE);
  });
});
