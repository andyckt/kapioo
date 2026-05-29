const { buildAdminDailyOrdersMongoQueryMock } = vi.hoisted(() => ({
  buildAdminDailyOrdersMongoQueryMock: vi.fn(),
}));

vi.mock("@/lib/orders/admin-daily-query", () => ({
  buildAdminDailyOrdersMongoQuery: buildAdminDailyOrdersMongoQueryMock,
}));

import { OrderDataError } from "@/lib/order-data/errors";
import {
  buildDailyOrdersQuery,
  normalizeDailyOrdersFilters,
} from "@/lib/order-data/build-daily-orders-query";

describe("lib/order-data/build-daily-orders-query", () => {
  beforeEach(() => {
    buildAdminDailyOrdersMongoQueryMock.mockReset();
    buildAdminDailyOrdersMongoQueryMock.mockResolvedValue({
      items: {
        $elemMatch: {
          date: { $in: ["Jun 09", "Jun 9"] },
        },
      },
    });
  });

  it("throws when no narrow filter is provided", async () => {
    await expect(buildDailyOrdersQuery({})).rejects.toBeInstanceOf(OrderDataError);
    await expect(buildDailyOrdersQuery({})).rejects.toMatchObject({
      code: "ORDER_DATA_UNSAFE_QUERY",
    });
  });

  it("defaults sliceItemsToDeliveryDate from deliveryDate", () => {
    expect(normalizeDailyOrdersFilters({ deliveryDate: "2026-06-09" }).sliceItemsToDeliveryDate).toBe(
      true
    );
    expect(normalizeDailyOrdersFilters({ userId: "abc" }).sliceItemsToDeliveryDate).toBe(false);
  });

  it("wraps admin date query and merges extended filters", async () => {
    const { query } = await buildDailyOrdersQuery({
      deliveryDate: "2026-06-09",
      statuses: ["pending", "confirmed"],
      areas: ["Downtown Toronto", "Midtown"],
      orderIds: ["DD-10000001"],
      userId: "507f1f77bcf86cd799439011",
      comboName: "Combo 1",
    });

    expect(buildAdminDailyOrdersMongoQueryMock).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      deliveryDate: "2026-06-09",
      deliveryDateEnd: undefined,
      comboName: "Combo 1",
    });

    expect(query.status).toEqual({ $in: ["pending", "confirmed"] });
    expect(query.area).toEqual({ $in: ["Downtown Toronto", "Midtown"] });
    expect(query.orderId).toEqual({ $in: ["DD-10000001"] });
    expect(String(query.userId)).toBe("507f1f77bcf86cd799439011");
    expect(query.items).toMatchObject({
      $elemMatch: {
        date: { $in: ["Jun 09", "Jun 9"] },
      },
    });
  });

  it("uses excludeStatuses when statuses are not provided", async () => {
    const { query } = await buildDailyOrdersQuery({
      userId: "507f1f77bcf86cd799439011",
      excludeStatuses: ["cancelled", "refunded"],
    });

    expect(query.status).toEqual({ $nin: ["cancelled", "refunded"] });
  });
});
