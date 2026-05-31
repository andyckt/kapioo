import { geocodeAddressesBatch } from "@/lib/integrations/route-optimizer/client";
import { buildRouteOptimizerUrl } from "@/lib/integrations/route-optimizer/config";
import {
  RouteOptimizerRateLimitError,
} from "@/lib/integrations/route-optimizer/errors";
import { ROUTE_OPTIMIZER_PATHS } from "@/lib/integrations/route-optimizer/types";

describe("lib/integrations/route-optimizer/geocode client", () => {
  const fetchMock = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.ROUTE_OPTIMIZER_BASE_URL = "https://ro.example.com/";
    process.env.ROUTE_OPTIMIZER_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.stubGlobal("fetch", originalFetch);
    delete process.env.ROUTE_OPTIMIZER_BASE_URL;
    delete process.env.ROUTE_OPTIMIZER_API_KEY;
  });

  it("posts to geocode-addresses path", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      text: async () =>
        JSON.stringify({
          status: "completed",
          total_requested: 1,
          total_succeeded: 1,
          total_failed: 0,
          results: [
            {
              client_ref: "DD-1",
              address: "123 Main St",
              lat: 43.7,
              lng: -79.4,
              geocode_status: "OK",
            },
          ],
        }),
    });

    const result = await geocodeAddressesBatch({
      created_by_integration: "kapioo-admin",
      idempotency_key: "kapioo-geocode:test",
      addresses: [{ client_ref: "DD-1", address: "123 Main St" }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      buildRouteOptimizerUrl("https://ro.example.com/", ROUTE_OPTIMIZER_PATHS.geocodeAddresses),
      expect.objectContaining({ method: "POST" })
    );
    expect(result.results[0]?.lat).toBe(43.7);
  });

  it("throws RouteOptimizerRateLimitError on 429", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => "application/json" },
      text: async () => JSON.stringify({ message: "Rate limited" }),
    });

    await expect(
      geocodeAddressesBatch({
        addresses: [{ client_ref: "DD-1", address: "123 Main St" }],
      })
    ).rejects.toBeInstanceOf(RouteOptimizerRateLimitError);
  });

  it("throws RouteOptimizerAuthError on 401", async () => {
    const { RouteOptimizerAuthError } = await import("@/lib/integrations/route-optimizer/errors");

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => "application/json" },
      text: async () => JSON.stringify({ message: "Unauthorized" }),
    });

    await expect(
      geocodeAddressesBatch({
        addresses: [{ client_ref: "DD-1", address: "123 Main St" }],
      })
    ).rejects.toBeInstanceOf(RouteOptimizerAuthError);
  });

  it("throws RouteOptimizerResponseError on 404", async () => {
    const { RouteOptimizerResponseError } = await import(
      "@/lib/integrations/route-optimizer/errors"
    );

    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => "text/html" },
      text: async () => "<html>not found</html>",
    });

    await expect(
      geocodeAddressesBatch({
        addresses: [{ client_ref: "DD-1", address: "123 Main St" }],
      })
    ).rejects.toBeInstanceOf(RouteOptimizerResponseError);
  });

  it("sends Bearer auth header", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      text: async () =>
        JSON.stringify({
          status: "completed",
          results: [{ client_ref: "DD-1", lat: 43.7, lng: -79.4, geocode_status: "OK" }],
        }),
    });

    await geocodeAddressesBatch({
      addresses: [{ client_ref: "DD-1", address: "123 Main St" }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      })
    );
  });
});
