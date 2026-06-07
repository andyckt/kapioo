import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";
import type {
  RouteOptimizerHistoricalCustomer,
  RouteOptimizerHistoricalStop,
} from "@/lib/integrations/route-optimizer/runs-by-date-types";

import type { FlattenedRouteOptimizerCustomerStop } from "@/lib/agents/delivery/learning/matching/types";

const KNOWN_STOP_TYPES = new Set(["customer", "handoff"]);

export function isSyntheticRouteOptimizerStop(input: {
  is_synthetic?: boolean;
  stop_type?: string | null;
}): boolean {
  if (input.is_synthetic === true) {
    return true;
  }

  return input.stop_type === "handoff";
}

export function isUnsupportedStopType(stopType: string | null | undefined): boolean {
  if (!stopType) {
    return false;
  }

  return !KNOWN_STOP_TYPES.has(stopType);
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function mergeOrderIds(
  stop: RouteOptimizerHistoricalStop,
  customer?: RouteOptimizerHistoricalCustomer
): string[] {
  const ids = new Set<string>();

  for (const id of [...(stop.order_ids ?? []), ...(customer?.order_ids ?? [])]) {
    const trimmed = id.trim();
    if (trimmed) {
      ids.add(trimmed);
    }
  }

  return [...ids];
}

function getCustomerForStop(
  customers: RouteOptimizerHistoricalCustomer[],
  stop: RouteOptimizerHistoricalStop
): RouteOptimizerHistoricalCustomer | undefined {
  if (typeof stop.customer_index !== "number") {
    return undefined;
  }

  return customers[stop.customer_index];
}

export function flattenRouteOptimizerCustomerStops(
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse
): FlattenedRouteOptimizerCustomerStop[] {
  const flattened: FlattenedRouteOptimizerCustomerStop[] = [];

  for (const run of routeOptimizerResponse.runs) {
    for (const stop of run.stops) {
      const customer = getCustomerForStop(run.customers ?? [], stop);

      flattened.push({
        roRunId: run.run_id,
        roRunDate: run.run_date,
        roDriverName: run.driver_name,
        roStopSequence: stop.sequence,
        roCustomerIndex: stop.customer_index ?? null,
        roStopType: stop.stop_type ?? null,
        isSynthetic: isSyntheticRouteOptimizerStop(stop),
        orderIds: mergeOrderIds(stop, customer),
        customerName: readString(stop.customer_name) ?? readString(customer?.name),
        customerPhone: readString(stop.customer_phone) ?? readString(customer?.phone),
        customerAddress: readString(stop.customer_address) ?? readString(customer?.address),
        notes: readString(stop.notes) ?? readString(customer?.notes),
        lat: readFiniteNumber(stop.lat) ?? readFiniteNumber(customer?.lat),
        lng: readFiniteNumber(stop.lng) ?? readFiniteNumber(customer?.lng),
        fixedStopPosition:
          readFiniteNumber(stop.fixed_stop_position) ??
          readFiniteNumber(customer?.fixed_stop_position),
        isFirstStop: stop.is_first_stop ?? customer?.is_first_stop ?? false,
        isEndPoint: stop.is_end_point ?? customer?.is_end_point ?? false,
      });
    }
  }

  return flattened;
}
