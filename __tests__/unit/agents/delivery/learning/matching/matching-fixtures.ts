import type { DeliveryAgentLearningOrderSnapshot } from "@/lib/contracts/delivery-agent-learning";
import type {
  RouteOptimizerHistoricalRun,
  RouteOptimizerHistoricalStop,
  RouteOptimizerRunsByDateResponse,
} from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";
import { parseRouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

import {
  emptyRunsByDateResponse,
  oneRunOneStopResponse,
} from "@/__tests__/unit/integrations/route-optimizer/runs-by-date-fixtures";

export function makeLearningOrder(
  overrides: Partial<DeliveryAgentLearningOrderSnapshot> = {}
): DeliveryAgentLearningOrderSnapshot {
  return {
    orderId: "DD-90000001",
    customerName: "Donald",
    customerPhone: "4379891111",
    formattedAddress: "123 Main St, Toronto",
    status: "delivered",
    deliveryDate: "2026-05-31",
    ...overrides,
  };
}

export function makeRoResponse(
  overrides: Partial<RouteOptimizerRunsByDateResponse> = {}
): RouteOptimizerRunsByDateResponse {
  return parseRouteOptimizerRunsByDateResponse({
    ...oneRunOneStopResponse,
    ...overrides,
  });
}

export function makeCustomerStop(
  sequence: number,
  overrides: Partial<RouteOptimizerHistoricalStop> = {}
): RouteOptimizerHistoricalStop {
  return {
    sequence,
    customer_index: sequence,
    customer_name: "Donald-1111",
    customer_phone: "4379891111",
    customer_address: "123 Main St, Toronto",
    notes: null,
    lat: 43.65,
    lng: -79.38,
    order_ids: ["DD-90000001"],
    is_synthetic: false,
    stop_type: "customer",
    is_first_stop: false,
    is_end_point: false,
    fixed_stop_position: null,
    ...overrides,
  };
}

export function makeSyntheticHandoffStop(
  sequence: number,
  overrides: Partial<RouteOptimizerHistoricalStop> = {}
): RouteOptimizerHistoricalStop {
  return makeCustomerStop(sequence, {
    customer_name: "Handoff Point",
    customer_phone: null,
    customer_address: "Meetup Location",
    order_ids: [],
    is_synthetic: true,
    stop_type: "handoff",
    ...overrides,
  });
}

export function makeRunWithStops(
  runId: string,
  stops: RouteOptimizerHistoricalStop[],
  runOverrides: Partial<RouteOptimizerHistoricalRun> = {}
): RouteOptimizerHistoricalRun {
  return {
    run_id: runId,
    run_date: "2026-05-31",
    driver_name: "DT",
    status: "completed",
    stops,
    customers: [],
    ...runOverrides,
  };
}

export const parsedEmptyRunsByDateResponse = parseRouteOptimizerRunsByDateResponse(
  emptyRunsByDateResponse
);
export const parsedOneRunOneStopResponse = parseRouteOptimizerRunsByDateResponse(
  oneRunOneStopResponse
);

export { emptyRunsByDateResponse, oneRunOneStopResponse };
