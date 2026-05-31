import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import WeeklyOrder from "@/models/WeeklyOrder";

import { clearCollections, setupTestDb, teardownTestDb } from "../../../helpers/db";
import { createTestUser } from "../../../helpers/factories";

const { connectToDatabaseMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}));

import { GET } from "@/app/internal-api/kitchen/orders/route";

const KITCHEN_API_KEY = "test-kitchen-api-key";

function buildKitchenRequest(url: string, apiKey?: string) {
  const headers = new Headers();
  if (apiKey !== undefined) {
    headers.set("authorization", `Bearer ${apiKey}`);
  }
  return new Request(url, { method: "GET", headers });
}

async function createDailyOrderForDate(params: {
  userId: unknown;
  orderId: string;
  status: string;
  date: string;
  comboName?: string;
  type?: string;
  quantity?: number;
  dishes?: string[];
}) {
  return DailyDeliveryOrder.create({
    userId: params.userId,
    orderId: params.orderId,
    items: [
      {
        day: "sunday-w1",
        date: params.date,
        comboId: "combo-1",
        comboName: params.comboName ?? "套1",
        type: params.type ?? "A",
        quantity: params.quantity ?? 2,
        voucherType: params.type === "B" ? "threeDish" : "twoDish",
        dishes: params.dishes ?? ["板栗炖鸡", "时蔬"],
      },
    ],
    status: params.status,
    voucherCost: { twoDish: 2, threeDish: 0 },
    deliveryAddress: {
      streetAddress: "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M5V1A1",
      country: "Canada",
    },
    phoneNumber: "4165550100",
    area: "Downtown Toronto",
  });
}

async function createWeeklyOrderForDate(params: {
  userId: unknown;
  orderId: string;
  status: string;
  date: string;
  optionName?: string;
  quantity?: number;
}) {
  return WeeklyOrder.create({
    userId: params.userId,
    orderId: params.orderId,
    items: [
      {
        dayId: "sunday",
        optionId: "option-1",
        optionName: params.optionName ?? "豆花水煮牛肉 + 红烧白萝卜香菇 + 糙米饭",
        quantity: params.quantity ?? 3,
        date: params.date,
      },
    ],
    status: params.status,
    creditCost: 3,
    deliveryAddress: {
      streetAddress: "456 King St",
      province: "ON",
      postalCode: "M5V2B2",
      country: "Canada",
    },
    phoneNumber: "4165550200",
    area: "North York",
  });
}

describe("GET /internal-api/kitchen/orders", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    connectToDatabaseMock.mockReset();
    connectToDatabaseMock.mockResolvedValue(undefined);
    process.env.KITCHEN_API_KEY = KITCHEN_API_KEY;
  });

  afterAll(async () => {
    delete process.env.KITCHEN_API_KEY;
    await teardownTestDb();
  });

  it("returns 401 when API key is missing", async () => {
    const response = await GET(
      buildKitchenRequest("http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31")
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when API key is wrong", async () => {
    const response = await GET(
      buildKitchenRequest(
        "http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31",
        "wrong-key"
      )
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when date is missing", async () => {
    const response = await GET(
      buildKitchenRequest(
        "http://localhost:3000/internal-api/kitchen/orders",
        KITCHEN_API_KEY
      )
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid date format. Expected YYYY-MM-DD.",
    });
  });

  it("returns 400 when date format is invalid", async () => {
    const response = await GET(
      buildKitchenRequest(
        "http://localhost:3000/internal-api/kitchen/orders?date=05-31-2026",
        KITCHEN_API_KEY
      )
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid date format. Expected YYYY-MM-DD.",
    });
  });

  it("returns daily combos for a valid date with daily orders", async () => {
    const user = await createTestUser();
    await createDailyOrderForDate({
      userId: user._id,
      orderId: "DD-80000001",
      status: "confirmed",
      date: "May 31",
      type: "A",
      quantity: 10,
      dishes: ["板栗炖鸡", "时蔬"],
    });
    await createDailyOrderForDate({
      userId: user._id,
      orderId: "DD-80000002",
      status: "pending",
      date: "May 31",
      type: "B",
      quantity: 6,
      dishes: ["冬瓜丸子汤", "板栗炖鸡", "时蔬"],
    });

    const response = await GET(
      buildKitchenRequest(
        "http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31&source=daily",
        KITCHEN_API_KEY
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.target_delivery_date).toBe("2026-05-31");
    expect(body.daily.orders_count).toBe(2);
    expect(body.daily.combos).toHaveLength(1);
    expect(body.daily.combos[0].dishes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dish_name: "冬瓜丸子汤", servings: 6, dish_role: "extra" }),
        expect.objectContaining({ dish_name: "板栗炖鸡", servings: 16, dish_role: "common" }),
      ])
    );
    expect(body.weekly.orders_count).toBe(0);
    expect(body.weekly.combos).toEqual([]);
    expect(body.debug.included_order_ids).toEqual(
      expect.arrayContaining(["DD-80000001", "DD-80000002"])
    );
  });

  it("returns weekly combos for a valid date with weekly orders", async () => {
    const user = await createTestUser();
    await createWeeklyOrderForDate({
      userId: user._id,
      orderId: "WO-80000001",
      status: "confirmed",
      date: "May 31",
      quantity: 7,
    });

    const response = await GET(
      buildKitchenRequest(
        "http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31&source=weekly",
        KITCHEN_API_KEY
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.weekly.orders_count).toBe(1);
    expect(body.weekly.combos[0].dishes).toEqual([
      { dish_name: "豆花水煮牛肉", servings: 7 },
      { dish_name: "红烧白萝卜香菇", servings: 7 },
      { dish_name: "糙米饭", servings: 7 },
    ]);
    expect(body.daily.orders_count).toBe(0);
  });

  it("returns both daily and weekly data for Sunday delivery date", async () => {
    const user = await createTestUser();
    await createDailyOrderForDate({
      userId: user._id,
      orderId: "DD-80000003",
      status: "confirmed",
      date: "May 31",
      quantity: 2,
    });
    await createWeeklyOrderForDate({
      userId: user._id,
      orderId: "WO-80000002",
      status: "pending",
      date: "May 31",
      quantity: 4,
    });

    const response = await GET(
      buildKitchenRequest(
        "http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31",
        KITCHEN_API_KEY
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.daily.orders_count).toBe(1);
    expect(body.weekly.orders_count).toBe(1);
  });

  it("returns empty combos when there are no orders for the date", async () => {
    const response = await GET(
      buildKitchenRequest(
        "http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31",
        KITCHEN_API_KEY
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.daily).toEqual({
      source_type: "daily",
      orders_count: 0,
      combos: [],
    });
    expect(body.weekly).toEqual({
      source_type: "weekly",
      orders_count: 0,
      combos: [],
    });
  });

  it("excludes cancelled and refunded orders", async () => {
    const user = await createTestUser();
    await createDailyOrderForDate({
      userId: user._id,
      orderId: "DD-80000004",
      status: "confirmed",
      date: "May 31",
    });
    await createDailyOrderForDate({
      userId: user._id,
      orderId: "DD-80000005",
      status: "cancelled",
      date: "May 31",
    });
    await createWeeklyOrderForDate({
      userId: user._id,
      orderId: "WO-80000003",
      status: "refunded",
      date: "May 31",
    });

    const response = await GET(
      buildKitchenRequest(
        "http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31",
        KITCHEN_API_KEY
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.daily.orders_count).toBe(1);
    expect(body.weekly.orders_count).toBe(0);
    expect(body.debug.included_order_ids).toEqual(["DD-80000004"]);
    expect(body.debug.excluded_order_summary.cancelled).toBe(1);
    expect(body.debug.excluded_order_summary.refunded).toBe(1);
  });

  it("excludes orders from other delivery dates", async () => {
    const user = await createTestUser();
    await createDailyOrderForDate({
      userId: user._id,
      orderId: "DD-80000006",
      status: "confirmed",
      date: "Jun 1",
    });
    await createWeeklyOrderForDate({
      userId: user._id,
      orderId: "WO-80000004",
      status: "confirmed",
      date: "Jun 2",
    });

    const response = await GET(
      buildKitchenRequest(
        "http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31",
        KITCHEN_API_KEY
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.daily.orders_count).toBe(0);
    expect(body.weekly.orders_count).toBe(0);
    expect(body.debug.included_order_ids).toEqual([]);
  });
});
