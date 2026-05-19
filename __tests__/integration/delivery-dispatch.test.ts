import crypto from "node:crypto";

import { NextRequest } from "next/server";

import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import WeeklyOrder from "@/models/WeeklyOrder";

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db";
import { createTestUser } from "../helpers/factories";

const { connectToDatabaseMock, sendDailyOrderStatusUpdateNotificationMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  sendDailyOrderStatusUpdateNotificationMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}));

vi.mock("@/lib/services/notifications", () => ({
  sendDailyOrderStatusUpdateNotification: sendDailyOrderStatusUpdateNotificationMock,
}));

import { POST } from "@/app/api/integrations/route-optimizer/delivery-started/route";
import { applyDeliveryDispatch } from "@/lib/orders/apply-delivery-dispatch";

const eta = "2026-05-19T17:30:00.000Z";
const startedAt = "2026-05-19T17:00:00.000Z";

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    orderIds: ["DD-DISPATCH-1"],
    eta,
    startedAt,
    stopId: "stop_456",
    driverId: "driver_42",
    ...overrides,
  };
}

async function createDailyOrder(userId: unknown, overrides: Record<string, unknown> = {}) {
  return DailyDeliveryOrder.create({
    userId,
    orderId: "DD-DISPATCH-1",
    items: [
      {
        day: "Monday",
        date: "May 19",
        comboId: "combo-1",
        comboName: "Chicken Combo",
        type: "two",
        quantity: 1,
        voucherType: "twoDish",
      },
    ],
    status: "pending",
    voucherCost: {
      twoDish: 1,
      threeDish: 0,
    },
    taxIncluded: true,
    taxRate: 0.13,
    phoneNumber: "4165551234",
    area: "North York",
    deliveryAddress: {
      streetAddress: "123 Daily St",
      province: "ON",
      postalCode: "M1M1M1",
      country: "Canada",
    },
    ...overrides,
  });
}

async function createWeeklyOrder(userId: unknown, overrides: Record<string, unknown> = {}) {
  return WeeklyOrder.create({
    userId,
    orderId: "WS-DISPATCH-1",
    items: [
      {
        dayId: "sunday",
        optionId: "option-1",
        optionName: "Korean Chicken",
        quantity: 2,
        date: "May 19",
      },
    ],
    status: "pending",
    creditCost: 2,
    voucherDeducted: true,
    phoneNumber: "4165551234",
    area: "North York",
    deliveryAddress: {
      streetAddress: "123 Weekly Ave",
      province: "ON",
      postalCode: "M1M1M1",
      country: "Canada",
    },
    ...overrides,
  });
}

function signedRequest(payload: unknown, signatureSecret = "dispatch-secret") {
  const rawBody = JSON.stringify(payload);
  const signature = `sha256=${crypto
    .createHmac("sha256", signatureSecret)
    .update(rawBody)
    .digest("hex")}`;

  return new NextRequest(
    "http://localhost:3000/api/integrations/route-optimizer/delivery-started",
    {
      method: "POST",
      headers: {
        authorization: "Bearer dispatch-token",
        "content-type": "application/json",
        "x-ro-signature": signature,
      },
      body: rawBody,
    }
  );
}

describe("delivery dispatch ingestion", () => {
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    connectToDatabaseMock.mockReset();
    connectToDatabaseMock.mockResolvedValue(undefined);
    sendDailyOrderStatusUpdateNotificationMock.mockReset();
    sendDailyOrderStatusUpdateNotificationMock.mockResolvedValue(undefined);
    process.env.ROUTE_OPTIMIZER_INGEST_TOKEN = "dispatch-token";
    process.env.ROUTE_OPTIMIZER_INGEST_SECRET = "dispatch-secret";
  });

  afterAll(async () => {
    process.env = originalEnv;
    await teardownTestDb();
  });

  it("marks pending order as delivery and stores ETA", async () => {
    const user = await createTestUser();
    await createDailyOrder(user._id, { status: "pending" });

    const result = await applyDeliveryDispatch({ payload: basePayload() });

    expect(result.updated).toEqual([{ orderId: "DD-DISPATCH-1" }]);
    expect(result.skipped).toEqual([]);
    expect(result.missing).toEqual([]);

    const order = await DailyDeliveryOrder.findOne({ orderId: "DD-DISPATCH-1" }).lean();
    expect(order).toMatchObject({
      status: "delivery",
      deliveryDispatch: {
        source: "route-optimizer",
        stopId: "stop_456",
        driverId: "driver_42",
      },
    });
    expect(order?.deliveryDispatch?.eta?.toISOString()).toBe(eta);
    expect(order?.deliveryDispatch?.dispatchedAt?.toISOString()).toBe(startedAt);
    expect(order?.deliveryDispatch?.receivedAt).toBeInstanceOf(Date);
    expect(sendDailyOrderStatusUpdateNotificationMock).not.toHaveBeenCalled();
  });

  it("marks confirmed order as delivery", async () => {
    const user = await createTestUser();
    await createDailyOrder(user._id, { status: "confirmed" });

    const result = await applyDeliveryDispatch({ payload: basePayload() });

    expect(result.updated).toEqual([{ orderId: "DD-DISPATCH-1" }]);
    const order = await DailyDeliveryOrder.findOne({ orderId: "DD-DISPATCH-1" }).lean();
    expect(order?.status).toBe("delivery");
  });

  it("overwrites ETA when order is already in delivery", async () => {
    const user = await createTestUser();
    const oldEta = new Date("2026-05-19T16:00:00.000Z");
    await createDailyOrder(user._id, {
      status: "delivery",
      deliveryDispatch: {
        eta: oldEta,
        dispatchedAt: new Date("2026-05-19T15:30:00.000Z"),
        receivedAt: new Date("2026-05-19T15:30:05.000Z"),
        source: "route-optimizer",
      },
    });

    const newEta = "2026-05-19T18:00:00.000Z";
    const result = await applyDeliveryDispatch({
      payload: basePayload({ eta: newEta }),
    });

    expect(result.updated).toEqual([{ orderId: "DD-DISPATCH-1" }]);
    const order = await DailyDeliveryOrder.findOne({ orderId: "DD-DISPATCH-1" }).lean();
    expect(order?.status).toBe("delivery");
    expect(order?.deliveryDispatch?.eta?.toISOString()).toBe(newEta);
  });

  it.each(["delivered", "cancelled", "refunded"] as const)(
    "skips %s orders without changing status or ETA",
    async (status) => {
      const user = await createTestUser();
      await createDailyOrder(user._id, {
        orderId: `DD-DISPATCH-${status}`,
        status,
        deliveryDispatch: undefined,
      });

      const result = await applyDeliveryDispatch({
        payload: basePayload({ orderIds: [`DD-DISPATCH-${status}`] }),
      });

      expect(result.updated).toEqual([]);
      expect(result.skipped).toEqual([
        {
          orderId: `DD-DISPATCH-${status}`,
          reason: "terminal-status",
          status,
        },
      ]);

      const order = await DailyDeliveryOrder.findOne({ orderId: `DD-DISPATCH-${status}` }).lean();
      expect(order?.status).toBe(status);
      expect(order?.deliveryDispatch).toBeUndefined();
    }
  );

  it("reports weekly orderId as missing (daily-only scope)", async () => {
    const user = await createTestUser();
    await createWeeklyOrder(user._id, { orderId: "WS-DISPATCH-1" });

    const result = await applyDeliveryDispatch({
      payload: basePayload({ orderIds: ["WS-DISPATCH-1"] }),
    });

    expect(result.missing).toEqual([{ orderId: "WS-DISPATCH-1" }]);
    expect(result.updated).toEqual([]);
  });

  it("dedupes orderIds and reports updated, skipped, and missing in one batch", async () => {
    const user = await createTestUser();
    await createDailyOrder(user._id, { orderId: "DD-DISPATCH-1", status: "pending" });
    await createDailyOrder(user._id, {
      orderId: "DD-DISPATCH-DELIVERED",
      status: "delivered",
    });

    const result = await applyDeliveryDispatch({
      payload: basePayload({
        orderIds: [
          "DD-DISPATCH-1",
          "DD-DISPATCH-1",
          "DD-DISPATCH-DELIVERED",
          "MISSING-1",
        ],
      }),
    });

    expect(result.updated).toEqual([{ orderId: "DD-DISPATCH-1" }]);
    expect(result.skipped).toEqual([
      {
        orderId: "DD-DISPATCH-DELIVERED",
        reason: "terminal-status",
        status: "delivered",
      },
    ]);
    expect(result.missing).toEqual([{ orderId: "MISSING-1" }]);
  });

  it("ignores receivedAt in request body and stamps server-side", async () => {
    const user = await createTestUser();
    await createDailyOrder(user._id);

    const clientReceivedAt = "2020-01-01T00:00:00.000Z";
    const before = Date.now();
    await applyDeliveryDispatch({
      payload: {
        ...basePayload(),
        receivedAt: clientReceivedAt,
      } as ReturnType<typeof basePayload> & { receivedAt: string },
    });
    const after = Date.now();

    const order = await DailyDeliveryOrder.findOne({ orderId: "DD-DISPATCH-1" }).lean();
    const receivedAtMs = order?.deliveryDispatch?.receivedAt?.getTime() ?? 0;
    expect(receivedAtMs).toBeGreaterThanOrEqual(before);
    expect(receivedAtMs).toBeLessThanOrEqual(after);
    expect(order?.deliveryDispatch?.receivedAt?.toISOString()).not.toBe(clientReceivedAt);
  });

  it("rejects missing bearer and invalid HMAC", async () => {
    const payload = basePayload();
    const missingBearer = signedRequest(payload);
    missingBearer.headers.set("authorization", "Bearer wrong");

    const missingBearerResponse = await POST(missingBearer);
    expect(missingBearerResponse.status).toBe(401);

    const badSignatureResponse = await POST(signedRequest(payload, "wrong-secret"));
    expect(badSignatureResponse.status).toBe(401);
  });

  it("returns 503 when env vars are unset", async () => {
    delete process.env.ROUTE_OPTIMIZER_INGEST_TOKEN;
    delete process.env.ROUTE_OPTIMIZER_INGEST_SECRET;

    const response = await POST(signedRequest(basePayload()));
    expect(response.status).toBe(503);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      signedRequest({
        orderIds: [],
        eta,
        startedAt,
      })
    );
    expect(response.status).toBe(400);
  });

  it("accepts a valid signed webhook and returns the response shape", async () => {
    const user = await createTestUser();
    await createDailyOrder(user._id);

    const response = await POST(signedRequest(basePayload()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      updated: [{ orderId: "DD-DISPATCH-1" }],
      skipped: [],
      missing: [],
      stopId: "stop_456",
    });
    expect(sendDailyOrderStatusUpdateNotificationMock).not.toHaveBeenCalled();
  });
});
