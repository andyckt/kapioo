import {
  buildRouteOptimizerUrl,
  getRouteOptimizerConfig,
} from "@/lib/integrations/route-optimizer/config";
import {
  RouteOptimizerAuthError,
  RouteOptimizerError,
  RouteOptimizerNetworkError,
  RouteOptimizerResponseError,
  RouteOptimizerValidationError,
} from "@/lib/integrations/route-optimizer/errors";
import {
  ROUTE_OPTIMIZER_PATHS,
  type RouteOptimizerBatchCreateRequest,
  type RouteOptimizerBatchResult,
  type RouteOptimizerCreateRequest,
  type RouteOptimizerPreviewRequest,
  type RouteOptimizerRunResult,
} from "@/lib/integrations/route-optimizer/types";

function parseResponseBody(rawBody: string, path: string, status: number): unknown {
  if (!rawBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch (error) {
    throw new RouteOptimizerResponseError("Route Optimizer returned invalid JSON", {
      path,
      status,
      rawBody,
      cause: error,
    });
  }
}

function throwForErrorStatus(path: string, status: number, body: unknown, rawBody: string): never {
  const message =
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message?: unknown }).message === "string"
      ? (body as { message: string }).message
      : `Route Optimizer request failed with status ${status}`;

  if (status === 401 || status === 403) {
    throw new RouteOptimizerAuthError(message, { status, path, body, rawBody });
  }

  if (status === 400 || status === 422) {
    throw new RouteOptimizerValidationError(message, { status, path, body, rawBody });
  }

  throw new RouteOptimizerResponseError(message, { status, path, body, rawBody });
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
    const body = parseResponseBody(rawBody, path, response.status);

    if (!response.ok) {
      throwForErrorStatus(path, response.status, body, rawBody);
    }

    return body as TResponse;
  } catch (error) {
    if (error instanceof RouteOptimizerError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Route Optimizer network request failed";

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
