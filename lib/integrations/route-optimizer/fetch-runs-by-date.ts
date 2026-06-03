/**
 * Read-only GET client for Route Optimizer historical runs by delivery date.
 *
 * RO `run_date` is the Kapioo business delivery date.
 * `eta_basis` on runs/stops indicates post_start vs planned ETAs for learning.
 */
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
import { parseRouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";
import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/runs-by-date-types";
import { ROUTE_OPTIMIZER_PATHS } from "@/lib/integrations/route-optimizer/types";

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

type RouteOptimizerResponseDebug = {
  url: string;
  status: number;
  contentType: string | null;
};

type FetchRouteOptimizerRunsByDateOptions = {
  includeDrafts?: boolean;
  requireRoute?: boolean;
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

function assertValidDeliveryDate(date: string): string {
  const trimmed = date.trim();
  if (!DATE_YYYY_MM_DD.test(trimmed)) {
    throw new RouteOptimizerValidationError("date must be YYYY-MM-DD", {
      path: ROUTE_OPTIMIZER_PATHS.runsByDate,
    });
  }

  return trimmed;
}

function buildRunsByDateUrl(
  baseUrl: string,
  date: string,
  options?: FetchRouteOptimizerRunsByDateOptions
): string {
  const url = new URL(buildRouteOptimizerUrl(baseUrl, ROUTE_OPTIMIZER_PATHS.runsByDate));
  url.searchParams.set("date", date);

  if (options?.includeDrafts === true) {
    url.searchParams.set("include_drafts", "true");
  }

  if (options?.requireRoute === false) {
    url.searchParams.set("require_route", "false");
  }

  return url.toString();
}

export async function fetchRouteOptimizerRunsByDate(
  date: string,
  options?: FetchRouteOptimizerRunsByDateOptions
): Promise<RouteOptimizerRunsByDateResponse> {
  const normalizedDate = assertValidDeliveryDate(date);
  const { baseUrl, apiKey } = getRouteOptimizerConfig();
  const path = ROUTE_OPTIMIZER_PATHS.runsByDate;
  const url = buildRunsByDateUrl(baseUrl, normalizedDate, options);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
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

    return parseRouteOptimizerRunsByDateResponse(body);
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
