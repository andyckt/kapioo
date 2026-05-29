import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db";
import { createTestUser } from "../helpers/factories";

const { connectToDatabaseMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}));

import { getDailyOrdersBase } from "@/lib/order-data/get-daily-orders-base";
import { OrderDataError } from "@/lib/order-data/errors";

describe("lib/order-data/get-daily-orders-base", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    connectToDatabaseMock.mockReset();
    connectToDatabaseMock.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("throws when no narrow filter is provided", async () => {
    await expect(getDailyOrdersBase({})).rejects.toBeInstanceOf(OrderDataError);
  });

  it("returns enriched daily orders for a delivery date with effective customer info", async () => {
    const user = await createTestUser({
      name: "Alice Customer",
      email: "alice@example.com",
      phone: "416-555-0100",
    });

    await DailyDeliveryOrder.create({
      userId: user._id,
      orderId: "DD-90000001",
      items: [
        {
          day: "monday-w1",
          date: "Jun 9",
          comboId: "combo-1",
          comboName: "Combo 1",
          type: "A",
          quantity: 2,
          voucherType: "twoDish",
          dishes: ["Dish A"],
        },
        {
          day: "tuesday-w1",
          date: "Jun 10",
          comboId: "combo-2",
          comboName: "Combo 2",
          type: "B",
          quantity: 1,
          voucherType: "threeDish",
          dishes: ["Dish B"],
        },
      ],
      status: "confirmed",
      voucherCost: { twoDish: 2, threeDish: 0 },
      specialInstructions: "Leave at door",
      deliveryAddress: {
        unitNumber: "1001",
        streetAddress: "123 Main St",
        city: "Toronto",
        province: "ON",
        postalCode: "M5V 1A1",
        country: "Canada",
        buzzCode: "1234",
      },
      phoneNumber: "416-555-0100",
      area: "Downtown Toronto",
    });

    const result = await getDailyOrdersBase({
      deliveryDate: "2026-06-09",
      statuses: ["confirmed"],
      now: new Date("2026-05-10T12:00:00.000Z"),
    });

    expect(result.orders).toHaveLength(1);
    expect(result.summary.orderCount).toBe(1);
    expect(result.summary.itemCount).toBe(1);
    expect(result.summary.totalMealQuantity).toBe(2);

    const order = result.orders[0];
    expect(order.orderId).toBe("DD-90000001");
    expect(order.customer.name).toBe("Alice Customer");
    expect(order.customer.email).toBe("alice@example.com");
    expect(order.customer.phone).toBe("416-555-0100");
    expect(order.delivery.dateIso).toBe("2026-06-09");
    expect(order.delivery.dateDisplay).toBe("Jun 9");
    expect(order.items).toHaveLength(1);
    expect(order.mealSummary.totalQuantity).toBe(2);
    expect(order.deliveryAddress.formatted).toContain("Downtown Toronto");
    expect(order.validation.valid).toBe(true);
  });

  it("excludes non-daily areas when dailyDeliveryAreasOnly is enabled", async () => {
    const user = await createTestUser({ name: "Weekly User" });

    await DailyDeliveryOrder.create({
      userId: user._id,
      orderId: "DD-90000002",
      items: [
        {
          day: "monday-w1",
          date: "Jun 9",
          comboId: "combo-1",
          comboName: "Combo 1",
          type: "A",
          quantity: 1,
          voucherType: "twoDish",
        },
      ],
      status: "confirmed",
      voucherCost: { twoDish: 1, threeDish: 0 },
      deliveryAddress: {
        streetAddress: "1 Main St",
        province: "ON",
        postalCode: "M1M 1M1",
        country: "Canada",
      },
      phoneNumber: "416-555-0200",
      area: "Scarborough",
    });

    const result = await getDailyOrdersBase({
      deliveryDate: "2026-06-09",
      dailyDeliveryAreasOnly: true,
      now: new Date("2026-05-10T12:00:00.000Z"),
    });

    expect(result.orders).toHaveLength(0);
    expect(result.excluded).toEqual([
      expect.objectContaining({
        orderId: "DD-90000002",
        reason: "NON_DAILY_DELIVERY_AREA",
      }),
    ]);
  });

  it("merges admin customer overrides into effective customer fields", async () => {
    const user = await createTestUser({
      name: "Stored Name",
      email: "stored@example.com",
      phone: "416-555-0000",
    });

    await DailyDeliveryOrder.create({
      userId: user._id,
      orderId: "DD-90000003",
      items: [
        {
          day: "monday-w1",
          date: "Jun 9",
          comboId: "combo-1",
          comboName: "Combo 1",
          type: "A",
          quantity: 1,
          voucherType: "twoDish",
        },
      ],
      status: "pending",
      voucherCost: { twoDish: 1, threeDish: 0 },
      deliveryAddress: {
        streetAddress: "123 Main St",
        province: "ON",
        postalCode: "M5V 1A1",
        country: "Canada",
      },
      phoneNumber: "416-555-0000",
      area: "Midtown",
      orderCustomerOverride: {
        name: "Override Name",
        phoneNumber: "416-555-9999",
        area: "Downtown Toronto",
        specialInstructions: "Use side door",
        deliveryAddress: {
          streetAddress: "999 Override St",
          province: "ON",
          postalCode: "M5V 9Z9",
          country: "Canada",
        },
        updatedBy: "admin",
      },
    });

    const result = await getDailyOrdersBase({
      deliveryDate: "2026-06-09",
      now: new Date("2026-05-10T12:00:00.000Z"),
    });

    const order = result.orders[0];
    expect(order.customer.name).toBe("Override Name");
    expect(order.customer.phone).toBe("416-555-9999");
    expect(order.customer.area).toBe("Downtown Toronto");
    expect(order.customer.specialInstructions).toBe("Use side door");
    expect(order.deliveryAddress.streetAddress).toBe("999 Override St");
    expect(order.customer.hasAdminOverride).toBe(true);
    expect(order.validation.warnings.some((issue) => issue.code === "HAS_ADMIN_OVERRIDE")).toBe(
      true
    );
  });
});
