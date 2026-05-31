import {
  buildRouteOptimizerUrl,
  getRouteOptimizerConfig,
} from "@/lib/integrations/route-optimizer/config";
import {
  RouteOptimizerAuthError,
  RouteOptimizerError,
  RouteOptimizerNetworkError,
  RouteOptimizerRateLimitError,
  RouteOptimizerResponseError,
  RouteOptimizerValidationError,
} from "@/lib/integrations/route-optimizer/errors";
import {
  ROUTE_OPTIMIZER_PATHS,
  type RouteOptimizerBatchCreateRequest,
  type RouteOptimizerBatchResult,
  type RouteOptimizerCreateRequest,
  type RouteOptimizerGeocodeAddressesRequest,
  type RouteOptimizerGeocodeAddressesResponse,
  type RouteOptimizerPreviewRequest,
  type RouteOptimizerRunResult,
} from "@/lib/integrations/route-optimizer/types";

type RouteOptimizerResponseDebug = {
  url: string;
  status: number;
  contentType: string | null;
};

function truncateForDebug(value: string, maxLength = 300): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength)}…`;
}

function logRouteOptimizerDebug(
  context: string,
  debug: RouteOptimizerResponseDebug & { bodyPreview?: string }
): void {
  console.error(`[Route Optimizer] ${context}`, {
    url: debug.url,
    status: debug.status,
    contentType: debug.contentType ?? "(none)",
    ...(debug.bodyPreview !== undefined ? { bodyPreview: debug.bodyPreview } : {}),
  });
}

function parseResponseBody(
  rawBody: string,
  path: string,
  status: number,
  debug: RouteOptimizerResponseDebug
): unknown {
  if (!rawBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch (error) {
    const bodyPreview = truncateForDebug(rawBody);
    if (status >= 400) {
      return { message: bodyPreview };
    }

    logRouteOptimizerDebug("JSON parse failed", {
      ...debug,
      bodyPreview,
    });

    throw new RouteOptimizerResponseError(
      `Route Optimizer returned invalid JSON (status ${status}, content-type: ${debug.contentType ?? "(none)"}, body preview: ${bodyPreview})`,
      {
        path,
        status,
        rawBody,
        cause: error,
      }
    );
  }
}

function readResponseMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["message", "error", "code"]) {
      if (typeof record[key] === "string" && record[key].trim()) {
        return record[key];
      }
    }
  }

  return `Route Optimizer request failed with status ${status}`;
}

function throwForErrorStatus(
  path: string,
  status: number,
  body: unknown,
  rawBody: string,
  debug: RouteOptimizerResponseDebug
): never {
  const message = readResponseMessage(body, status);

  if (status === 401 || status === 403) {
    throw new RouteOptimizerAuthError(message, { status, path, body, rawBody });
  }

  if (status === 429) {
    logRouteOptimizerDebug("Rate limited", {
      ...debug,
      bodyPreview: truncateForDebug(rawBody),
    });
    throw new RouteOptimizerRateLimitError(message, { status, path, body, rawBody });
  }

  if (status === 400 || status === 422) {
    throw new RouteOptimizerValidationError(message, { status, path, body, rawBody });
  }

  logRouteOptimizerDebug("Unexpected response status", {
    ...debug,
    bodyPreview: truncateForDebug(rawBody),
  });

  throw new RouteOptimizerResponseError(
    `${message} (status ${status}, content-type: ${debug.contentType ?? "(none)"}, body preview: ${truncateForDebug(rawBody)})`,
    { status, path, body, rawBody }
  );
}

async function routeOptimizerPost<TResponse>(
  path: string,
  payload: unknown
): Promise<TResponse> {
  const { baseUrl, apiKey } = getRouteOptimizerConfig();
  const url = buildRouteOptimizerUrl(baseUrl, path);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text();
    const debug: RouteOptimizerResponseDebug = {
      url,
      status: response.status,
      contentType: response.headers.get("content-type"),
    };
    const body = parseResponseBody(rawBody, path, response.status, debug);

    if (!response.ok) {
      throwForErrorStatus(path, response.status, body, rawBody, debug);
    }

    return body as TResponse;
  } catch (error) {
    if (error instanceof RouteOptimizerError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Route Optimizer network request failed";

    console.error("[Route Optimizer] Network request failed", { url, message });

    throw new RouteOptimizerNetworkError(message, {
      path,
      cause: error,
    });
  }
}

export async function previewRouteOptimizerRun(
  payload: RouteOptimizerPreviewRequest
): Promise<RouteOptimizerRunResult> {
  return routeOptimizerPost<RouteOptimizerRunResult>(
    ROUTE_OPTIMIZER_PATHS.optimizePreview,
    payload
  );
}

export async function createAndOptimizeRouteOptimizerRun(
  payload: RouteOptimizerCreateRequest
): Promise<RouteOptimizerRunResult> {
  return routeOptimizerPost<RouteOptimizerRunResult>(
    ROUTE_OPTIMIZER_PATHS.createAndOptimize,
    payload
  );
}

export async function batchCreateAndOptimizeRouteOptimizerRuns(
  payload: RouteOptimizerBatchCreateRequest
): Promise<RouteOptimizerBatchResult> {
  return routeOptimizerPost<RouteOptimizerBatchResult>(
    ROUTE_OPTIMIZER_PATHS.batchCreateAndOptimize,
    payload
  );
}

export async function geocodeAddressesBatch(
  payload: RouteOptimizerGeocodeAddressesRequest
): Promise<RouteOptimizerGeocodeAddressesResponse> {
  return routeOptimizerPost<RouteOptimizerGeocodeAddressesResponse>(
    ROUTE_OPTIMIZER_PATHS.geocodeAddresses,
    payload
  );
}
