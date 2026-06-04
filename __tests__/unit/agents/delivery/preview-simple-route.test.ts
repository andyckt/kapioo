const {
  previewDeliveryOrdersForAgentMock,
  getEnrichedDeliveryOrdersForRoutingMock,
  getKapiooKitchenStartLocationMock,
  previewRouteOptimizerRunMock,
} = vi.hoisted(() => ({
  previewDeliveryOrdersForAgentMock: vi.fn(),
  getEnrichedDeliveryOrdersForRoutingMock: vi.fn(),
  getKapiooKitchenStartLocationMock: vi.fn(),
  previewRouteOptimizerRunMock: vi.fn(),
}));

vi.mock("@/lib/agents/delivery/preview-delivery-orders", () => ({
  previewDeliveryOrdersForAgent: previewDeliveryOrdersForAgentMock,
}));

vi.mock("@/lib/agents/delivery/geocode/get-enriched-delivery-orders-for-routing", () => ({
  getEnrichedDeliveryOrdersForRouting: getEnrichedDeliveryOrdersForRoutingMock,
}));

vi.mock("@/lib/agents/delivery/kitchen-start-location", () => ({
  getKapiooKitchenStartLocation: getKapiooKitchenStartLocationMock,
  KitchenStartLocationConfigError: class KitchenStartLocationConfigError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "KitchenStartLocationConfigError";
    }
  },
}));

vi.mock("@/lib/integrations/route-optimizer/client", () => ({
  previewRouteOptimizerRun: previewRouteOptimizerRunMock,
}));

import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { KitchenStartLocationConfigError } from "@/lib/agents/delivery/kitchen-start-location";
import { previewSimpleRouteForAgent } from "@/lib/agents/delivery/preview-simple-route";
import {
  RouteOptimizerConfigError,
  RouteOptimizerValidationError,
} from "@/lib/integrations/route-optimizer/errors";

function buildOrderPreview(
  overrides: Partial<Awaited<ReturnType<typeof previewDeliveryOrdersForAgentMock>>> = {}
) {
  return {
    deliveryDate: "2026-06-09",
    queriedAt: "2026-06-08T12:00:00.000Z",
    confirmed: {
      totalStops: 1,
      validStops: 1,
      invalidStops: 0,
      warningStops: 0,
      totalMealQuantity: 2,
      byArea: { "Downtown Toronto": 1 },
      byStatus: { confirmed: 1 },
      stops: [],
      invalid: [],
      warnings: [],
    },
    pending: {
      count: 0,
      orders: [],
    },
    canContinueToPlanning: true,
    blockingReasons: [],
    notes: "Order preview only.",
    ...overrides,
  };
}

function buildRoutingResult() {
  return {
    deliveryDate: "2026-06-09",
    profileId: "daily-default",
    queriedAt: "2026-06-08T12:00:00.000Z",
    timezone: "America/Toronto",
    summary: {
      totalOrders: 1,
      validStops: 1,
      invalidStops: 0,
      warningStops: 0,
      byArea: { "Downtown Toronto": 1 },
      byStatus: { confirmed: 1 },
      totalMealQuantity: 2,
    },
    stops: [
      {
        orderId: "DD-90000001",
        routeOptimizer: {
          name: "Alice Customer",
          phone: "416-555-0100",
          address: "Unit 1001, 123 Main St, Downtown Toronto M5V 1A1, Canada",
          notes: "Leave at door",
          order_ids: ["DD-90000001"],
        },
      },
    ],
    invalid: [],
    warnings: [],
    sourceOrderResultSummary: {
      orderCount: 1,
      excludedCount: 0,
      itemCount: 1,
      totalMealQuantity: 2,
      byStatus: { confirmed: 1 },
      byArea: { "Downtown Toronto": 1 },
    },
  };
}

function buildEnrichedRoutingResult() {
  const routing = buildRoutingResult();
  const coverage = {
    totalValidStops: routing.stops.length,
    stopsWithCoordinates: routing.stops.length,
    stopsFallback: 0,
    stopsGeocodeFailed: 0,
    coveragePercent: 100,
    recommendationConfidence: "high" as const,
  };
  return {
    routing,
    coordinateCoverage: coverage,
    geocodeEnrichment: {
      artifactVersion: "1" as const,
      enrichedAt: "2026-06-08T12:00:00.000Z",
      provider: "route_optimizer" as const,
      stopCoordinates: [],
      coordinateCoverage: coverage,
    },
  };
}

describe("lib/agents/delivery/preview-simple-route", () => {
  beforeEach(() => {
    previewDeliveryOrdersForAgentMock.mockReset();
    getEnrichedDeliveryOrdersForRoutingMock.mockReset();
    getKapiooKitchenStartLocationMock.mockReset();
    previewRouteOptimizerRunMock.mockReset();
  });

  it("blocks when pending orders exist and does not call Route Optimizer", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(
      buildOrderPreview({
        canContinueToPlanning: false,
        blockingReasons: ["1 pending order(s) must be confirmed before planning."],
        pending: { count: 1, orders: [] },
      })
    );

    await expect(previewSimpleRouteForAgent("2026-06-09")).rejects.toBeInstanceOf(
      DeliveryAgentPlanningBlockedError
    );

    expect(getEnrichedDeliveryOrdersForRoutingMock).not.toHaveBeenCalled();
    expect(previewRouteOptimizerRunMock).not.toHaveBeenCalled();
  });

  it("blocks when confirmed orders are invalid and does not call Route Optimizer", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(
      buildOrderPreview({
        canContinueToPlanning: false,
        blockingReasons: ["1 confirmed order(s) have blocking validation errors."],
        confirmed: {
          ...buildOrderPreview().confirmed,
          validStops: 0,
          invalidStops: 1,
        },
      })
    );

    await expect(previewSimpleRouteForAgent("2026-06-09")).rejects.toBeInstanceOf(
      DeliveryAgentPlanningBlockedError
    );

    expect(getEnrichedDeliveryOrdersForRoutingMock).not.toHaveBeenCalled();
    expect(previewRouteOptimizerRunMock).not.toHaveBeenCalled();
  });

  it("blocks when there are zero valid stops and does not call Route Optimizer", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(
      buildOrderPreview({
        canContinueToPlanning: false,
        blockingReasons: ["No confirmed valid stops for this delivery date."],
        confirmed: {
          ...buildOrderPreview().confirmed,
          validStops: 0,
        },
      })
    );

    await expect(previewSimpleRouteForAgent("2026-06-09")).rejects.toBeInstanceOf(
      DeliveryAgentPlanningBlockedError
    );

    expect(getEnrichedDeliveryOrdersForRoutingMock).not.toHaveBeenCalled();
    expect(previewRouteOptimizerRunMock).not.toHaveBeenCalled();
  });

  it("builds the simple preview payload and maps the Route Optimizer result", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(buildOrderPreview());
    getEnrichedDeliveryOrdersForRoutingMock.mockResolvedValue(buildEnrichedRoutingResult());
    getKapiooKitchenStartLocationMock.mockReturnValue(
      "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada"
    );
    previewRouteOptimizerRunMock.mockResolvedValue({
      status: "preview",
      total_duration_minutes: 95,
      total_distance_km: 18.4,
      estimated_finish_time: "2026-05-31T14:15:24.600Z",
      optimized_route: {
        total_duration_minutes: 95,
        total_distance_km: 18.4,
        stops: [
          {
            customer_name: "Alice Customer",
            customer_address: "Unit 1001, 123 Main St, Downtown Toronto M5V 1A1, Canada",
            duration_from_previous: 12.5,
            service_time_minutes: 5,
            arrival_time: "2026-06-09T14:12:00.000Z",
            order_ids: ["DD-90000001"],
          },
        ],
      },
      warnings: [],
      validation_errors: [],
      geocode_failures: [],
    });

    const result = await previewSimpleRouteForAgent("2026-06-09");

    expect(getEnrichedDeliveryOrdersForRoutingMock).toHaveBeenCalledWith({
      deliveryDate: "2026-06-09",
      statuses: ["confirmed"],
    });
    expect(previewRouteOptimizerRunMock).toHaveBeenCalledWith({
      created_by_integration: "kapioo-admin",
      external_id: "kapioo-simple-preview:2026-06-09",
      planning_session_id: expect.any(String),
      idempotency_key: expect.any(String),
      run: {
        run_date: "2026-06-09",
        driver_name: "Simple Preview",
        start_location: "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada",
        start_time: "10:00",
        travel_mode: "driving",
      },
      customers: [
        {
          name: "Alice Customer",
          phone: "416-555-0100",
          address: "Unit 1001, 123 Main St, Downtown Toronto M5V 1A1, Canada",
          notes: "Leave at door",
          order_ids: ["DD-90000001"],
        },
      ],
    });
    expect(result.routePreview.status).toBe("preview");
    expect(result.routePreview.stopCount).toBe(1);
    expect(result.routePreview.optimizedStops[0]).toEqual({
      sequence: 1,
      name: "Alice Customer",
      address: "Unit 1001, 123 Main St, Downtown Toronto M5V 1A1, Canada",
      eta: "2026-06-09T14:12:30.000Z",
      orderIds: ["DD-90000001"],
    });
    expect(result.sourceSummary.validStops).toBe(1);
    expect(result.notes).toContain("Smart DT/UT/Self planning");
  });

  it("throws when kitchen start location is not configured", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(buildOrderPreview());
    getEnrichedDeliveryOrdersForRoutingMock.mockResolvedValue(buildEnrichedRoutingResult());
    getKapiooKitchenStartLocationMock.mockImplementation(() => {
      throw new KitchenStartLocationConfigError("KAPIOO_KITCHEN_START_LOCATION is not configured");
    });

    await expect(previewSimpleRouteForAgent("2026-06-09")).rejects.toBeInstanceOf(
      KitchenStartLocationConfigError
    );
    expect(previewRouteOptimizerRunMock).not.toHaveBeenCalled();
  });

  it("propagates Route Optimizer validation errors", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(buildOrderPreview());
    getEnrichedDeliveryOrdersForRoutingMock.mockResolvedValue(buildEnrichedRoutingResult());
    getKapiooKitchenStartLocationMock.mockReturnValue(
      "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada"
    );
    previewRouteOptimizerRunMock.mockRejectedValue(
      new RouteOptimizerValidationError("Invalid customer address")
    );

    await expect(previewSimpleRouteForAgent("2026-06-09")).rejects.toBeInstanceOf(
      RouteOptimizerValidationError
    );
  });

  it("propagates Route Optimizer config errors", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(buildOrderPreview());
    getEnrichedDeliveryOrdersForRoutingMock.mockResolvedValue(buildEnrichedRoutingResult());
    getKapiooKitchenStartLocationMock.mockReturnValue(
      "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada"
    );
    previewRouteOptimizerRunMock.mockRejectedValue(
      new RouteOptimizerConfigError("ROUTE_OPTIMIZER_BASE_URL is not configured")
    );

    await expect(previewSimpleRouteForAgent("2026-06-09")).rejects.toBeInstanceOf(
      RouteOptimizerConfigError
    );
  });
});
