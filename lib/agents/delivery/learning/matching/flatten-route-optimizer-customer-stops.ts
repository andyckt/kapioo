import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

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

export function flattenRouteOptimizerCustomerStops(
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse
): FlattenedRouteOptimizerCustomerStop[] {
  const flattened: FlattenedRouteOptimizerCustomerStop[] = [];

  for (const run of routeOptimizerResponse.runs) {
    for (const stop of run.stops) {
      flattened.push({
        roRunId: run.run_id,
        roRunDate: run.run_date,
        roDriverName: run.driver_name,
        roStopSequence: stop.sequence,
        roCustomerIndex: stop.customer_index ?? null,
        roStopType: stop.stop_type ?? null,
        isSynthetic: isSyntheticRouteOptimizerStop(stop),
        orderIds: [...(stop.order_ids ?? [])],
        customerName: stop.customer_name ?? null,
        customerPhone: stop.customer_phone ?? null,
        customerAddress: stop.customer_address ?? null,
        notes: stop.notes ?? null,
        lat: stop.lat ?? null,
        lng: stop.lng ?? null,
        fixedStopPosition: stop.fixed_stop_position ?? null,
        isFirstStop: stop.is_first_stop ?? false,
        isEndPoint: stop.is_end_point ?? false,
      });
    }
  }

  return flattened;
}
