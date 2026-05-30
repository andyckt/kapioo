import { formatDateTime } from "@/lib/format";
import {
  extractOptimizedRouteStops,
  mapRouteOptimizerPreviewResult,
} from "@/lib/agents/delivery/map-route-optimizer-preview-result";
import type { RouteOptimizerRunResult } from "@/lib/integrations/route-optimizer/types";

const mapContext = {
  deliveryDate: "2026-05-31",
  startTime: "10:00",
};

function buildRouteOptimizerPreviewResult(
  overrides: Partial<RouteOptimizerRunResult> = {}
): RouteOptimizerRunResult {
  return {
    preview: true,
    persisted: false,
    status: "preview",
    total_duration_minutes: 95,
    total_distance_km: 18.4,
    estimated_finish_time: "2026-05-31T14:15:24.600Z",
    optimized_route: {
      total_duration_minutes: 95,
      total_distance_km: 18.4,
      stops: [
        {
          customer_index: 0,
          customer_name: "Alice Customer",
          customer_address: "Unit 1001, 123 Main St, Downtown Toronto M5V 1A1, Canada",
          duration_from_previous: 12.5,
          service_time_minutes: 5,
          eta: "10:12 AM",
          arrival_time: "2026-05-31T14:12:00.000Z",
          order_ids: ["DD-90000001"],
        },
        {
          customer_index: 1,
          customer_name: "Bob Customer",
          customer_address: "456 Side St, Toronto M4B 1B2, Canada",
          duration_from_previous: 8.25,
          service_time_minutes: 5,
          arrival_time: "2026-05-31T14:25:15.000Z",
          order_ids: ["DD-90000002"],
        },
      ],
    },
    warnings: [],
    validation_errors: [],
    geocode_failures: [],
    ...overrides,
  };
}

describe("lib/agents/delivery/map-route-optimizer-preview-result", () => {
  it("maps optimized stops from optimized_route.stops", () => {
    const mapped = mapRouteOptimizerPreviewResult(buildRouteOptimizerPreviewResult(), mapContext);

    expect(mapped.stopCount).toBe(2);
    expect(mapped.optimizedStops[0]?.name).toBe("Alice Customer");
    expect(mapped.optimizedStops[1]?.name).toBe("Bob Customer");
  });

  it("recomputes Toronto-local finish and stop ETAs when route context is provided", () => {
    const mapped = mapRouteOptimizerPreviewResult(
      buildRouteOptimizerPreviewResult({
        total_duration_minutes: 255.41,
        estimated_finish_time: "2026-05-31T14:15:24.600Z",
        optimized_route: {
          total_duration_minutes: 255.41,
          stops: [
            {
              customer_name: "Alice Customer",
              customer_address: "123 Main St",
              duration_from_previous: 4.11,
              service_time_minutes: 5,
              arrival_time: "2026-05-31T14:04:06.600Z",
              order_ids: ["DD-90000001"],
            },
          ],
        },
      }),
      mapContext
    );

    expect(formatDateTime(mapped.estimatedFinishTime!)).toBe("May 31, 2026, 2:15 PM");
    expect(formatDateTime(mapped.optimizedStops[0]!.eta!)).toBe("May 31, 2026, 10:04 AM");
  });

  it("keeps duration, distance, and status from the Route Optimizer response", () => {
    const mapped = mapRouteOptimizerPreviewResult(buildRouteOptimizerPreviewResult(), mapContext);

    expect(mapped.totalDurationMinutes).toBe(95);
    expect(mapped.totalDistanceKm).toBe(18.4);
    expect(mapped.status).toBe("preview");
    expect(formatDateTime(mapped.estimatedFinishTime!)).toBe("May 31, 2026, 11:35 AM");
  });

  it("returns zero optimized stops when optimized_route has an empty stops array", () => {
    const mapped = mapRouteOptimizerPreviewResult(
      buildRouteOptimizerPreviewResult({
        optimized_route: {
          total_duration_minutes: 95,
          total_distance_km: 18.4,
          stops: [],
        },
      }),
      mapContext
    );

    expect(mapped.stopCount).toBe(0);
    expect(mapped.optimizedStops).toEqual([]);
  });

  it("returns zero optimized stops when optimized_route is null", () => {
    const mapped = mapRouteOptimizerPreviewResult(
      buildRouteOptimizerPreviewResult({
        optimized_route: null,
      }),
      mapContext
    );

    expect(mapped.stopCount).toBe(0);
    expect(mapped.optimizedStops).toEqual([]);
  });

  it("falls back to Route Optimizer timestamps when Toronto recompute context is missing", () => {
    const mapped = mapRouteOptimizerPreviewResult(buildRouteOptimizerPreviewResult());

    expect(mapped.estimatedFinishTime).toBe("2026-05-31T14:15:24.600Z");
    expect(mapped.optimizedStops[0]?.eta).toBe("10:12 AM");
  });

  it("still supports a legacy flat optimized_route array", () => {
    const mapped = mapRouteOptimizerPreviewResult(
      buildRouteOptimizerPreviewResult({
        optimized_route: [
          {
            name: "Legacy Stop",
            address: "789 Legacy Ave, Toronto",
            eta: "11:20",
            order_ids: ["DD-90000003"],
          },
        ],
      }),
      mapContext
    );

    expect(mapped.stopCount).toBe(1);
    expect(mapped.optimizedStops[0]).toEqual({
      sequence: 1,
      name: "Legacy Stop",
      address: "789 Legacy Ave, Toronto",
      eta: "11:20",
      orderIds: ["DD-90000003"],
    });
  });

  it("extractOptimizedRouteStops reads nested stops", () => {
    const stops = extractOptimizedRouteStops(buildRouteOptimizerPreviewResult());

    expect(stops).toHaveLength(2);
  });
});
