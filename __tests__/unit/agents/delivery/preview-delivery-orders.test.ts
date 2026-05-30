const { getDeliveryOrdersForRoutingMock, getDailyOrdersBaseMock } = vi.hoisted(() => ({
  getDeliveryOrdersForRoutingMock: vi.fn(),
  getDailyOrdersBaseMock: vi.fn(),
}));

vi.mock("@/lib/agents/delivery/get-delivery-orders-for-routing", () => ({
  getDeliveryOrdersForRouting: getDeliveryOrdersForRoutingMock,
}));

vi.mock("@/lib/order-data/get-daily-orders-base", () => ({
  getDailyOrdersBase: getDailyOrdersBaseMock,
}));

import { previewDeliveryOrdersForAgent } from "@/lib/agents/delivery/preview-delivery-orders";
import { createRoutingTestOrder } from "./test-fixtures";

function buildRoutingResult(
  overrides: Partial<Awaited<ReturnType<typeof getDeliveryOrdersForRoutingMock>>> = {}
) {
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
        mongoId: "507f1f77bcf86cd799439011",
        customerName: "Alice Customer",
        customerPhone: "416-555-0100",
        customerEmail: "alice@example.com",
        area: "Downtown Toronto",
        formattedAddress: "Unit 1001, 123 Main St, Downtown Toronto M5V 1A1, Canada",
        deliveryAddress: {},
        notes: "",
        specialInstructions: "",
        deliveryDate: "2026-06-09",
        deliveryWindow: "11am – 1pm",
        mealSummary: "Combo 1 (2 dishes) x2",
        totalMealQuantity: 2,
        items: [],
        status: "confirmed",
        hasAdminOverride: false,
        routeOptimizer: {},
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
    ...overrides,
  };
}

describe("lib/agents/delivery/preview-delivery-orders", () => {
  beforeEach(() => {
    getDeliveryOrdersForRoutingMock.mockReset();
    getDailyOrdersBaseMock.mockReset();
  });

  it("calls routing with confirmed status only and returns pending separately", async () => {
    getDeliveryOrdersForRoutingMock.mockResolvedValue(buildRoutingResult());
    getDailyOrdersBaseMock.mockResolvedValue({
      queriedAt: "2026-06-08T12:00:00.000Z",
      timezone: "America/Toronto",
      filters: {},
      summary: { orderCount: 1, itemCount: 1, totalMealQuantity: 1, byStatus: {}, byArea: {} },
      orders: [
        createRoutingTestOrder({
          orderId: "DD-90000002",
          status: "pending",
          customer: {
            ...createRoutingTestOrder().customer,
            name: "Bob Pending",
          },
        }),
      ],
    });

    const result = await previewDeliveryOrdersForAgent("2026-06-09");

    expect(getDeliveryOrdersForRoutingMock).toHaveBeenCalledWith({
      deliveryDate: "2026-06-09",
      statuses: ["confirmed"],
    });
    expect(getDailyOrdersBaseMock).toHaveBeenCalledWith({
      deliveryDate: "2026-06-09",
      statuses: ["pending"],
      sliceItemsToDeliveryDate: true,
      includeValidation: false,
    });
    expect(result.confirmed.validStops).toBe(1);
    expect(result.pending.count).toBe(1);
    expect(result.pending.orders[0]?.orderId).toBe("DD-90000002");
    expect(result.canContinueToPlanning).toBe(false);
    expect(result.blockingReasons.some((reason) => reason.includes("pending"))).toBe(true);
  });

  it("blocks planning when confirmed orders are invalid", async () => {
    getDeliveryOrdersForRoutingMock.mockResolvedValue(
      buildRoutingResult({
        summary: {
          totalOrders: 1,
          validStops: 0,
          invalidStops: 1,
          warningStops: 0,
          byArea: {},
          byStatus: { confirmed: 1 },
          totalMealQuantity: 0,
        },
        stops: [],
        invalid: [
          {
            orderId: "DD-90000003",
            errors: [{ code: "ROUTING_MISSING_PHONE", message: "Missing phone number" }],
            warnings: [],
          },
        ],
      })
    );
    getDailyOrdersBaseMock.mockResolvedValue({
      queriedAt: "2026-06-08T12:00:00.000Z",
      timezone: "America/Toronto",
      filters: {},
      summary: { orderCount: 0, itemCount: 0, totalMealQuantity: 0, byStatus: {}, byArea: {} },
      orders: [],
    });

    const result = await previewDeliveryOrdersForAgent("2026-06-09");

    expect(result.canContinueToPlanning).toBe(false);
    expect(result.blockingReasons.some((reason) => reason.includes("blocking validation errors"))).toBe(
      true
    );
    expect(result.blockingReasons.some((reason) => reason.includes("No confirmed valid stops"))).toBe(
      true
    );
  });

  it("allows planning when warnings exist but no invalid or pending orders", async () => {
    getDeliveryOrdersForRoutingMock.mockResolvedValue(
      buildRoutingResult({
        summary: {
          totalOrders: 1,
          validStops: 1,
          invalidStops: 0,
          warningStops: 1,
          byArea: { "Downtown Toronto": 1 },
          byStatus: { confirmed: 1 },
          totalMealQuantity: 2,
        },
        warnings: [
          {
            orderId: "DD-90000001",
            warnings: [
              {
                code: "ROUTING_MISSING_POSTAL_CODE",
                message: "Postal code is missing; geocoding may be less reliable",
              },
            ],
          },
        ],
      })
    );
    getDailyOrdersBaseMock.mockResolvedValue({
      queriedAt: "2026-06-08T12:00:00.000Z",
      timezone: "America/Toronto",
      filters: {},
      summary: { orderCount: 0, itemCount: 0, totalMealQuantity: 0, byStatus: {}, byArea: {} },
      orders: [],
    });

    const result = await previewDeliveryOrdersForAgent("2026-06-09");

    expect(result.canContinueToPlanning).toBe(true);
    expect(result.blockingReasons).toEqual([]);
    expect(result.confirmed.stops[0]?.warningsCount).toBe(1);
  });

  it("returns zeroed confirmed shape when no confirmed orders exist", async () => {
    getDeliveryOrdersForRoutingMock.mockResolvedValue(
      buildRoutingResult({
        summary: {
          totalOrders: 0,
          validStops: 0,
          invalidStops: 0,
          warningStops: 0,
          byArea: {},
          byStatus: {},
          totalMealQuantity: 0,
        },
        stops: [],
      })
    );
    getDailyOrdersBaseMock.mockResolvedValue({
      queriedAt: "2026-06-08T12:00:00.000Z",
      timezone: "America/Toronto",
      filters: {},
      summary: { orderCount: 0, itemCount: 0, totalMealQuantity: 0, byStatus: {}, byArea: {} },
      orders: [],
    });

    const result = await previewDeliveryOrdersForAgent("2026-06-09");

    expect(result.confirmed.totalStops).toBe(0);
    expect(result.confirmed.byArea).toEqual({});
    expect(result.canContinueToPlanning).toBe(false);
    expect(result.notes).toContain("Route planning");
  });
});
