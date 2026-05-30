import {
  batchCreateAndOptimizeRouteOptimizerRuns,
  createAndOptimizeRouteOptimizerRun,
  previewRouteOptimizerRun,
} from "@/lib/integrations/route-optimizer/client";
import { buildRouteOptimizerUrl } from "@/lib/integrations/route-optimizer/config";
import {
  RouteOptimizerAuthError,
  RouteOptimizerConfigError,
  RouteOptimizerNetworkError,
  RouteOptimizerResponseError,
  RouteOptimizerValidationError,
} from "@/lib/integrations/route-optimizer/errors";
import { ROUTE_OPTIMIZER_PATHS } from "@/lib/integrations/route-optimizer/types";

const samplePayload = {
  run: {
    run_date: "2026-06-09",
    driver_name: "DT Driver",
    start_location: "Kitchen",
    start_time: "10:30",
  },
  customers: [
    {
      name: "Alice Customer",
      phone: "416-555-0100",
      address: "123 Main St, Downtown Toronto M5V 1A1, Canada",
      order_ids: ["DD-90000001"],
    },
  ],
};

describe("lib/integrations/route-optimizer/config", () => {
  it("builds URLs without double slashes", () => {
    expect(
      buildRouteOptimizerUrl("https://ro.example.com/", ROUTE_OPTIMIZER_PATHS.optimizePreview)
    ).toBe("https://ro.example.com/api/integrations/runs/optimize-preview");
    expect(
      buildRouteOptimizerUrl("https://ro.example.com", ROUTE_OPTIMIZER_PATHS.optimizePreview)
    ).toBe("https://ro.example.com/api/integrations/runs/optimize-preview");
  });
});

describe("lib/integrations/route-optimizer/client", () => {
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

  it("throws RouteOptimizerConfigError when base URL is missing", async () => {
    delete process.env.ROUTE_OPTIMIZER_BASE_URL;

    await expect(previewRouteOptimizerRun(samplePayload)).rejects.toBeInstanceOf(
      RouteOptimizerConfigError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws RouteOptimizerConfigError when API key is missing", async () => {
    delete process.env.ROUTE_OPTIMIZER_API_KEY;

    await expect(previewRouteOptimizerRun(samplePayload)).rejects.toBeInstanceOf(
      RouteOptimizerConfigError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls preview endpoint with Authorization header and returns parsed JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ preview: true, status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await previewRouteOptimizerRun(samplePayload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://ro.example.com/api/integrations/runs/optimize-preview");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual(samplePayload);
    expect(result).toEqual({ preview: true, status: "ok" });
  });

  it("calls create-and-optimize endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ persisted: true, run_id: "run-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await createAndOptimizeRouteOptimizerRun(samplePayload);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ro.example.com/api/integrations/runs/create-and-optimize",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.run_id).toBe("run-123");
  });

  it("calls batch-create-and-optimize endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "completed", results: [{ run_id: "run-1" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await batchCreateAndOptimizeRouteOptimizerRuns({ runs: [samplePayload] });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ro.example.com/api/integrations/runs/batch-create-and-optimize",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("completed");
    expect(result.results).toHaveLength(1);
  });

  it("throws RouteOptimizerValidationError on 422 with structured JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid customers payload" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(previewRouteOptimizerRun(samplePayload)).rejects.toBeInstanceOf(
      RouteOptimizerValidationError
    );
  });

  it("throws RouteOptimizerAuthError on 401", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(previewRouteOptimizerRun(samplePayload)).rejects.toBeInstanceOf(
      RouteOptimizerAuthError
    );
  });

  it("throws RouteOptimizerResponseError on invalid JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(previewRouteOptimizerRun(samplePayload)).rejects.toBeInstanceOf(
      RouteOptimizerResponseError
    );
  });

  it("throws RouteOptimizerNetworkError when fetch fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(previewRouteOptimizerRun(samplePayload)).rejects.toBeInstanceOf(
      RouteOptimizerNetworkError
    );
  });
});
