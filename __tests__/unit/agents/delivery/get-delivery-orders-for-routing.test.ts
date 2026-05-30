const { getDailyOrdersBaseMock } = vi.hoisted(() => ({
  getDailyOrdersBaseMock: vi.fn(),
}));

vi.mock("@/lib/order-data/get-daily-orders-base", () => ({
  getDailyOrdersBase: getDailyOrdersBaseMock,
}));

import { getDeliveryOrdersForRouting } from "@/lib/agents/delivery/get-delivery-orders-for-routing";
import { OrderDataError } from "@/lib/order-data/errors";
import { createRoutingTestOrder } from "./test-fixtures";

describe("lib/agents/delivery/get-delivery-orders-for-routing", () => {
  beforeEach(() => {
    getDailyOrdersBaseMock.mockReset();
  });

  it("throws when deliveryDate is missing", async () => {
    await expect(getDeliveryOrdersForRouting({ deliveryDate: "" })).rejects.toBeInstanceOf(
      OrderDataError
    );
    expect(getDailyOrdersBaseMock).not.toHaveBeenCalled();
  });

  it("calls getDailyOrdersBase with routing defaults", async () => {
    getDailyOrdersBaseMock.mockResolvedValue({
      queriedAt: "2026-05-10T12:00:00.000Z",
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

    await getDeliveryOrdersForRouting({ deliveryDate: "2026-06-09" });

    expect(getDailyOrdersBaseMock).toHaveBeenCalledWith({
      deliveryDate: "2026-06-09",
      statuses: ["pending", "confirmed"],
      areas: undefined,
      dailyDeliveryAreasOnly: true,
      sliceItemsToDeliveryDate: true,
      now: undefined,
      includeValidation: true,
    });
  });

  it("returns valid stops, invalid orders, warnings, and summary counts", async () => {
    const validOrder = createRoutingTestOrder();
    const missingPhoneOrder = createRoutingTestOrder({
      orderId: "DD-90000002",
      mongoId: "507f1f77bcf86cd799439033",
      customer: {
        ...createRoutingTestOrder().customer,
        phone: "",
      },
    });
    const warningOrder = createRoutingTestOrder({
      orderId: "DD-90000003",
      mongoId: "507f1f77bcf86cd799439044",
      deliveryAddress: {
        ...createRoutingTestOrder().deliveryAddress,
        postalCode: "",
      },
    });

    getDailyOrdersBaseMock.mockResolvedValue({
      queriedAt: "2026-05-10T12:00:00.000Z",
      timezone: "America/Toronto",
      filters: {},
      summary: {
        orderCount: 3,
        itemCount: 3,
        totalMealQuantity: 6,
        byStatus: { confirmed: 3 },
        byArea: { "Downtown Toronto": 3 },
      },
      excluded: [
        {
          orderId: "DD-90000004",
          mongoId: "507f1f77bcf86cd799439055",
          reason: "NON_DAILY_DELIVERY_AREA",
        },
      ],
      orders: [validOrder, missingPhoneOrder, warningOrder],
    });

    const result = await getDeliveryOrdersForRouting({
      deliveryDate: "2026-06-09",
      profileId: "daily-default",
    });

    expect(result.stops).toHaveLength(2);
    expect(result.stops[0].orderId).toBe("DD-90000001");
    expect(result.stops[1].orderId).toBe("DD-90000003");
    expect(result.invalid).toHaveLength(2);
    expect(result.invalid.some((entry) => entry.orderId === "DD-90000002")).toBe(true);
    expect(result.invalid.some((entry) => entry.orderId === "DD-90000004")).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].orderId).toBe("DD-90000003");
    expect(result.summary).toEqual({
      totalOrders: 4,
      validStops: 2,
      invalidStops: 2,
      warningStops: 1,
      byArea: {
        "Downtown Toronto": 3,
        Unknown: 1,
      },
      byStatus: {
        confirmed: 2,
      },
      totalMealQuantity: 4,
    });
    expect(result.sourceOrderResultSummary.excludedCount).toBe(1);
  });
});
