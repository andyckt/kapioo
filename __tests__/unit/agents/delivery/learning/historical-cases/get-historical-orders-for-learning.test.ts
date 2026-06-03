const { getDailyOrdersBaseMock } = vi.hoisted(() => ({
  getDailyOrdersBaseMock: vi.fn(),
}));

vi.mock("@/lib/order-data/get-daily-orders-base", () => ({
  getDailyOrdersBase: getDailyOrdersBaseMock,
}));

import { getHistoricalOrdersForLearning } from "@/lib/agents/delivery/learning/historical-cases/get-historical-orders-for-learning";
import { HISTORICAL_LEARNING_ORDER_STATUSES } from "@/lib/agents/delivery/learning/historical-cases/historical-learning-statuses";
import { OrderDataError } from "@/lib/order-data/errors";
import { createRoutingTestOrder } from "@/__tests__/unit/agents/delivery/test-fixtures";

describe("getHistoricalOrdersForLearning", () => {
  beforeEach(() => {
    getDailyOrdersBaseMock.mockReset();
  });

  it("calls getDailyOrdersBase with deliveryDate and historical statuses", async () => {
    getDailyOrdersBaseMock.mockResolvedValue({
      queriedAt: "2026-05-31T12:00:00.000Z",
      timezone: "America/Toronto",
      filters: {},
      summary: {
        orderCount: 0,
        itemCount: 0,
        totalMealQuantity: 0,
        byStatus: {},
        byArea: {},
      },
      orders: [],
    });

    await getHistoricalOrdersForLearning({ deliveryDate: "2026-05-31" });

    expect(getDailyOrdersBaseMock).toHaveBeenCalledWith({
      deliveryDate: "2026-05-31",
      statuses: [...HISTORICAL_LEARNING_ORDER_STATUSES],
      dailyDeliveryAreasOnly: true,
      sliceItemsToDeliveryDate: true,
      includeValidation: true,
      sort: { orderId: 1 },
    });
  });

  it("does not include pending in historical statuses", async () => {
    getDailyOrdersBaseMock.mockResolvedValue({
      queriedAt: "2026-05-31T12:00:00.000Z",
      timezone: "America/Toronto",
      filters: {},
      summary: {
        orderCount: 0,
        itemCount: 0,
        totalMealQuantity: 0,
        byStatus: {},
        byArea: {},
      },
      orders: [],
    });

    await getHistoricalOrdersForLearning({ deliveryDate: "2026-05-31" });

    const call = getDailyOrdersBaseMock.mock.calls[0]?.[0] as { statuses: string[] };
    expect(call.statuses).not.toContain("pending");
  });

  it("maps returned orders through mapOrderToLearningOrderSnapshot", async () => {
    const order = createRoutingTestOrder({
      orderId: "DD-90000002",
      status: "delivered",
    });

    getDailyOrdersBaseMock.mockResolvedValue({
      queriedAt: "2026-05-31T12:00:00.000Z",
      timezone: "America/Toronto",
      filters: {},
      summary: {
        orderCount: 1,
        itemCount: 1,
        totalMealQuantity: 2,
        byStatus: { delivered: 1 },
        byArea: { "Downtown Toronto": 1 },
      },
      orders: [order],
    });

    const result = await getHistoricalOrdersForLearning({ deliveryDate: "2026-05-31" });

    expect(result).toHaveLength(1);
    expect(result[0]?.orderId).toBe("DD-90000002");
    expect(result[0]?.status).toBe("delivered");
    expect(result[0]?.customerName).toBe("Alice Customer");
  });

  it("returns empty array when no orders", async () => {
    getDailyOrdersBaseMock.mockResolvedValue({
      queriedAt: "2026-05-31T12:00:00.000Z",
      timezone: "America/Toronto",
      filters: {},
      summary: {
        orderCount: 0,
        itemCount: 0,
        totalMealQuantity: 0,
        byStatus: {},
        byArea: {},
      },
      orders: [],
    });

    const result = await getHistoricalOrdersForLearning({ deliveryDate: "2026-05-31" });

    expect(result).toEqual([]);
  });

  it("propagates fetch errors", async () => {
    getDailyOrdersBaseMock.mockRejectedValue(new Error("database unavailable"));

    await expect(getHistoricalOrdersForLearning({ deliveryDate: "2026-05-31" })).rejects.toThrow(
      "database unavailable"
    );
  });

  it("rejects invalid deliveryDate before fetch", async () => {
    await expect(getHistoricalOrdersForLearning({ deliveryDate: "" })).rejects.toBeInstanceOf(
      OrderDataError
    );
    expect(getDailyOrdersBaseMock).not.toHaveBeenCalled();
  });

  it("does not import Route Optimizer client", async () => {
    const module = await import(
      "@/lib/agents/delivery/learning/historical-cases/get-historical-orders-for-learning?raw"
    );
    const source = String(module.default);

    expect(source).not.toContain("fetchRouteOptimizerRunsByDate");
    expect(source).not.toContain("route-optimizer");
  });

  it("does not import geocode or DeliveryAgentLearningCase model", async () => {
    const module = await import(
      "@/lib/agents/delivery/learning/historical-cases/get-historical-orders-for-learning?raw"
    );
    const source = String(module.default);

    expect(source).not.toContain("enrichRoutingStops");
    expect(source).not.toContain("DeliveryAgentLearningCase");
  });
});
