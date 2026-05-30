import { RouteOptimizerConfigError } from "@/lib/integrations/route-optimizer/errors";

export type RouteOptimizerConfig = {
  baseUrl: string;
  apiKey: string;
};

export function getRouteOptimizerConfig(): RouteOptimizerConfig {
  const baseUrl = process.env.ROUTE_OPTIMIZER_BASE_URL?.trim();
  const apiKey = process.env.ROUTE_OPTIMIZER_API_KEY?.trim();

  if (!baseUrl) {
    throw new RouteOptimizerConfigError("ROUTE_OPTIMIZER_BASE_URL is not configured");
  }

  if (!apiKey) {
    throw new RouteOptimizerConfigError("ROUTE_OPTIMIZER_API_KEY is not configured");
  }

  return { baseUrl, apiKey };
}

export function buildRouteOptimizerUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
