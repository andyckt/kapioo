import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";
import { parseRouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";
import { parseTorontoLocalDateTime } from "@/lib/agents/delivery/route-preview-time";

import {
  makeCustomerStop,
  makeRoResponse,
  makeRunWithStops,
  makeSyntheticHandoffStop,
} from "@/__tests__/unit/agents/delivery/learning/matching/matching-fixtures";

export const DELIVERY_DATE = "2026-05-31";

export function torontoIso(date: string, time24Hour: string): string {
  return parseTorontoLocalDateTime(date, time24Hour).toISOString();
}

export function buildOnTimeSingleRunResponse(): RouteOptimizerRunsByDateResponse {
  return makeRoResponse({
    count: 1,
    runs: [
      makeRunWithStops("run-on-time", [
        makeCustomerStop(0, {
          arrival_time: torontoIso(DELIVERY_DATE, "11:30"),
          completed_at: torontoIso(DELIVERY_DATE, "11:35"),
          eta_basis: "post_start",
        }),
      ], {
        driver_name: "DT",
        start_time: "10:00",
        actual_start_time: torontoIso(DELIVERY_DATE, "10:00"),
        run_completed_at: torontoIso(DELIVERY_DATE, "12:30"),
        eta_basis: "post_start",
      }),
    ],
  });
}

export function buildLateDriverGoodRouteResponse(): RouteOptimizerRunsByDateResponse {
  return makeRoResponse({
    count: 1,
    runs: [
      makeRunWithStops("run-late-start", [makeCustomerStop(0)], {
        driver_name: "DT",
        start_time: "10:00",
        actual_start_time: torontoIso(DELIVERY_DATE, "10:30"),
        run_completed_at: torontoIso(DELIVERY_DATE, "13:15"),
        eta_basis: "post_start",
      }),
    ],
  });
}

export function buildTwoRunHandoffResponse(): RouteOptimizerRunsByDateResponse {
  return makeRoResponse({
    count: 2,
    runs: [
      makeRunWithStops(
        "run-provider",
        [
          makeCustomerStop(0, { order_ids: ["DD-1"] }),
          makeCustomerStop(1, { order_ids: ["DD-2"], sequence: 1, customer_index: 1 }),
          makeSyntheticHandoffStop(2, { lat: 43.7, lng: -79.4 }),
        ],
        {
          driver_name: "DT",
          start_location: "Kitchen",
          start_time: "10:00",
          actual_start_time: torontoIso(DELIVERY_DATE, "10:30"),
          run_completed_at: torontoIso(DELIVERY_DATE, "12:00"),
          eta_basis: "post_start",
        }
      ),
      makeRunWithStops(
        "run-receiver",
        [
          makeSyntheticHandoffStop(0, { lat: 43.7, lng: -79.4 }),
          makeCustomerStop(1, {
            sequence: 1,
            customer_index: 1,
            order_ids: ["DD-3"],
            customer_name: "Alice-2222",
          }),
        ],
        {
          driver_name: "Marco",
          start_time: "10:00",
          actual_start_time: torontoIso(DELIVERY_DATE, "10:45"),
          run_completed_at: torontoIso(DELIVERY_DATE, "12:45"),
          eta_basis: "post_start",
        }
      ),
    ],
  });
}

export function buildPlannedOnlyResponse(): RouteOptimizerRunsByDateResponse {
  return parseRouteOptimizerRunsByDateResponse({
    status: "success",
    date: DELIVERY_DATE,
    count: 1,
    runs: [
      {
        run_id: "run-planned",
        run_date: DELIVERY_DATE,
        driver_name: "DT",
        status: "planned",
        start_time: "10:00",
        actual_start_time: null,
        run_completed_at: null,
        eta_basis: "planned",
        stops: [makeCustomerStop(0, { eta_basis: "planned", completed: false })],
        customers: [],
      },
    ],
    warnings: [],
  });
}

export function buildFixedStopResponse(): RouteOptimizerRunsByDateResponse {
  return makeRoResponse({
    count: 1,
    runs: [
      makeRunWithStops(
        "run-fixed",
        [
          makeCustomerStop(0, { fixed_stop_position: 2, is_first_stop: true }),
          makeCustomerStop(1, {
            sequence: 1,
            customer_index: 1,
            is_end_point: true,
          }),
        ],
        {
          driver_name: "UT",
          end_location: "Kitchen",
        }
      ),
    ],
  });
}

export function buildSelfRunResponse(): RouteOptimizerRunsByDateResponse {
  return makeRoResponse({
    count: 1,
    runs: [
      makeRunWithStops("run-self", [makeCustomerStop(0)], {
        driver_name: "Self",
      }),
    ],
  });
}
