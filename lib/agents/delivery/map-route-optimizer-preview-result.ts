import type { DeliveryAgentSimpleRoutePreviewResult } from "@/lib/contracts/delivery-agent";
import {
  computeTorontoEstimatedFinishIso,
  computeTorontoStopArrivalIsos,
  DEFAULT_ROUTE_PREVIEW_SERVICE_TIME_MINUTES,
} from "@/lib/agents/delivery/route-preview-time";
import type { RouteOptimizerRunResult } from "@/lib/integrations/route-optimizer/types";

export type RouteOptimizerPreviewMapContext = {
  deliveryDate: string;
  startTime: string;
};

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptimizedRouteObject(
  result: RouteOptimizerRunResult
): Record<string, unknown> | null {
  const route = result.optimized_route;

  if (route && typeof route === "object" && !Array.isArray(route)) {
    return route as Record<string, unknown>;
  }

  const camelRoute = (result as Record<string, unknown>).optimizedRoute;
  if (camelRoute && typeof camelRoute === "object" && !Array.isArray(camelRoute)) {
    return camelRoute as Record<string, unknown>;
  }

  return null;
}

export function extractOptimizedRouteStops(result: RouteOptimizerRunResult): unknown[] {
  const routeObject = readOptimizedRouteObject(result);
  if (routeObject && Array.isArray(routeObject.stops)) {
    return routeObject.stops;
  }

  if (Array.isArray(result.optimized_route)) {
    return result.optimized_route;
  }

  const camelRoute = (result as Record<string, unknown>).optimizedRoute;
  if (Array.isArray(camelRoute)) {
    return camelRoute;
  }

  return [];
}

function canRecomputeTorontoTimes(
  context: RouteOptimizerPreviewMapContext | undefined,
  optimizedRouteStops: unknown[]
): context is RouteOptimizerPreviewMapContext {
  if (!context || optimizedRouteStops.length === 0) {
    return false;
  }

  return optimizedRouteStops.every((stop) => {
    if (!stop || typeof stop !== "object") {
      return false;
    }

    return readNumber((stop as Record<string, unknown>).duration_from_previous) !== undefined;
  });
}

export function mapRouteOptimizerPreviewResult(
  result: RouteOptimizerRunResult,
  context?: RouteOptimizerPreviewMapContext
): DeliveryAgentSimpleRoutePreviewResult {
  const routeObject = readOptimizedRouteObject(result);
  const optimizedRouteStops = extractOptimizedRouteStops(result);
  const totalDurationMinutes =
    readNumber(result.total_duration_minutes) ??
    readNumber(routeObject?.total_duration_minutes);

  const stopTimingInputs = optimizedRouteStops.map((stop) => {
    const record = stop && typeof stop === "object" ? (stop as Record<string, unknown>) : {};

    return {
      durationFromPreviousMinutes: readNumber(record.duration_from_previous),
      serviceTimeMinutes: readNumber(record.service_time_minutes),
    };
  });

  const torontoArrivalIsos = canRecomputeTorontoTimes(context, optimizedRouteStops)
    ? computeTorontoStopArrivalIsos({
        deliveryDate: context.deliveryDate,
        startTime: context.startTime,
        stops: stopTimingInputs,
      })
    : [];

  const optimizedStops = optimizedRouteStops.map((stop, index) => {
    const record = stop && typeof stop === "object" ? (stop as Record<string, unknown>) : {};

    const recomputedEta = torontoArrivalIsos[index];

    return {
      sequence: readNumber(record.sequence) ?? index + 1,
      name: readString(record.customer_name ?? record.name),
      address: readString(record.customer_address ?? record.address),
      eta:
        recomputedEta ||
        readString(record.eta) ||
        readString(record.arrival_time) ||
        readString(record.estimated_arrival_time) ||
        readString(record.estimatedArrivalTime),
      orderIds: readStringArray(record.order_ids ?? record.orderIds),
    };
  });

  const estimatedFinishTime =
    context &&
    typeof totalDurationMinutes === "number" &&
    canRecomputeTorontoTimes(context, optimizedRouteStops)
      ? computeTorontoEstimatedFinishIso({
          deliveryDate: context.deliveryDate,
          startTime: context.startTime,
          totalDurationMinutes,
        })
      : readString(result.estimated_finish_time);

  return {
    status: readString(result.status),
    totalDurationMinutes,
    totalDistanceKm:
      readNumber(result.total_distance_km) ?? readNumber(routeObject?.total_distance_km),
    estimatedFinishTime,
    stopCount: optimizedStops.length,
    optimizedStops,
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    validationErrors: Array.isArray(result.validation_errors) ? result.validation_errors : [],
    geocodeFailures: Array.isArray(result.geocode_failures) ? result.geocode_failures : [],
    googleCostEstimate: result.google_cost_estimate,
  };
}

export { DEFAULT_ROUTE_PREVIEW_SERVICE_TIME_MINUTES };
