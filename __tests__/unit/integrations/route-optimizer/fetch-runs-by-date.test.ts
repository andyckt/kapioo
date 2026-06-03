import { fetchRouteOptimizerRunsByDate } from "@/lib/integrations/route-optimizer/fetch-runs-by-date";
import { fetchRouteOptimizerRunsByDate as fetchFromClientBarrel } from "@/lib/integrations/route-optimizer/client";
import { buildRouteOptimizerUrl } from "@/lib/integrations/route-optimizer/config";
import {
  RouteOptimizerAuthError,
  RouteOptimizerConfigError,
  RouteOptimizerNetworkError,
  RouteOptimizerRateLimitError,
  RouteOptimizerResponseError,
  RouteOptimizerValidationError,
} from "@/lib/integrations/route-optimizer/errors";
import { ROUTE_OPTIMIZER_PATHS } from "@/lib/integrations/route-optimizer/types";
import { oneRunOneStopResponse } from "@/__tests__/unit/integrations/route-optimizer/runs-by-date-fixtures";

describe("lib/integrations/route-optimizer/fetch-runs-by-date", () => {
  const fetchMock = vi.fn();
  const originalFetch = global.fetch;
  const apiKey = "test-key-should-not-leak";

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.ROUTE_OPTIMIZER_BASE_URL = "https://ro.example.com/";
    process.env.ROUTE_OPTIMIZER_API_KEY = apiKey;
  });

  afterEach(() => {
    vi.stubGlobal("fetch", originalFetch);
    delete process.env.ROUTE_OPTIMIZER_BASE_URL;
    delete process.env.ROUTE_OPTIMIZER_API_KEY;
  });

  it("builds URL with runs-by-date path and date query", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(oneRunOneStopResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await fetchRouteOptimizerRunsByDate("2026-05-31");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `${buildRouteOptimizerUrl("https://ro.example.com/", ROUTE_OPTIMIZER_PATHS.runsByDate)}?date=2026-05-31`
    );
  });

  it("sends Authorization Bearer header", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(oneRunOneStopResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await fetchRouteOptimizerRunsByDate("2026-05-31");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect(init.headers).toMatchObject({
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    });
    expect(init.body).toBeUndefined();
  });

  it("does not include include_drafts unless requested", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(oneRunOneStopResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await fetchRouteOptimizerRunsByDate("2026-05-31");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("include_drafts");
    expect(url).not.toContain("require_route");
  });

  it("includes include_drafts=true when requested", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(oneRunOneStopResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await fetchRouteOptimizerRunsByDate("2026-05-31", { includeDrafts: true });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("include_drafts=true");
  });

  it("includes require_route=false when requested", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(oneRunOneStopResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await fetchRouteOptimizerRunsByDate("2026-05-31", { requireRoute: false });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("require_route=false");
  });

  it("rejects invalid date before fetch", async () => {
    await expect(fetchRouteOptimizerRunsByDate("05-31-2026")).rejects.toBeInstanceOf(
      RouteOptimizerValidationError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses successful response", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(oneRunOneStopResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await fetchRouteOptimizerRunsByDate("2026-05-31");

    expect(result.status).toBe("success");
    expect(result.runs[0]?.run_id).toBe("run-abc123");
  });

  it("maps 401 to RouteOptimizerAuthError", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchRouteOptimizerRunsByDate("2026-05-31")).rejects.toBeInstanceOf(
      RouteOptimizerAuthError
    );
  });

  it("maps 403 to RouteOptimizerAuthError", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchRouteOptimizerRunsByDate("2026-05-31")).rejects.toBeInstanceOf(
      RouteOptimizerAuthError
    );
  });

  it("maps 429 to RouteOptimizerRateLimitError", async () => {
    fetchMock.mockResolvedValue(
      new Response("RATE_LIMITED", {
        status: 429,
        headers: { "Content-Type": "text/plain" },
      })
    );

    await expect(fetchRouteOptimizerRunsByDate("2026-05-31")).rejects.toBeInstanceOf(
      RouteOptimizerRateLimitError
    );
  });

  it("maps 500 to RouteOptimizerResponseError", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchRouteOptimizerRunsByDate("2026-05-31")).rejects.toBeInstanceOf(
      RouteOptimizerResponseError
    );
  });

  it("maps invalid JSON to RouteOptimizerResponseError", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    fetchMock.mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchRouteOptimizerRunsByDate("2026-05-31")).rejects.toMatchObject({
      name: "RouteOptimizerResponseError",
      message: expect.stringContaining("invalid JSON"),
    });

    consoleErrorSpy.mockRestore();
  });

  it("maps invalid response shape to RouteOptimizerResponseError", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "success", date: "2026-05-31" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchRouteOptimizerRunsByDate("2026-05-31")).rejects.toBeInstanceOf(
      RouteOptimizerResponseError
    );
  });

  it("maps network failure to RouteOptimizerNetworkError", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(fetchRouteOptimizerRunsByDate("2026-05-31")).rejects.toBeInstanceOf(
      RouteOptimizerNetworkError
    );
  });

  it("does not leak API key in thrown error message", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    try {
      await fetchRouteOptimizerRunsByDate("2026-05-31");
      throw new Error("Expected network error");
    } catch (error) {
      expect(error).toBeInstanceOf(RouteOptimizerNetworkError);
      expect(String(error)).not.toContain(apiKey);
    }
  });

  it("throws RouteOptimizerConfigError when env is missing", async () => {
    delete process.env.ROUTE_OPTIMIZER_BASE_URL;

    await expect(fetchRouteOptimizerRunsByDate("2026-05-31")).rejects.toBeInstanceOf(
      RouteOptimizerConfigError
    );
  });

  it("is re-exported from client.ts barrel", () => {
    expect(fetchFromClientBarrel).toBe(fetchRouteOptimizerRunsByDate);
  });
});
