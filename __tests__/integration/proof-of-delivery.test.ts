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

import { POST } from "@/app/api/integrations/route-optimizer/proof-of-delivery/route";
import {
  applyProofOfDelivery,
  applyProofOfDeliveryToOrder,
} from "@/lib/orders/apply-proof-of-delivery";

const capturedAt = "2026-05-17T22:31:00.000Z";

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    orderIds: ["POD-D-1"],
    podImage: {
      url: "https://r2.kapioo.com/pod/2026/05/abc.jpg",
      key: "pod/2026/05/abc.jpg",
    },
    capturedAt,
    stopId: "stop_123",
    driverId: "driver_42",
    ...overrides,
  };
}

async function createDailyOrder(userId: unknown, overrides: Record<string, unknown> = {}) {
  return DailyDeliveryOrder.create({
    userId,
    orderId: "POD-D-1",
    items: [
      {
        day: "Monday",
        date: "May 18",
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
    orderId: "POD-W-1",
    items: [
      {
        dayId: "sunday",
        optionId: "option-1",
        optionName: "Korean Chicken",
        quantity: 2,
        date: "May 18",
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

function signedRequest(payload: unknown, signatureSecret = "pod-secret") {
  const rawBody = JSON.stringify(payload);
  const signature = `sha256=${crypto
    .createHmac("sha256", signatureSecret)
    .update(rawBody)
    .digest("hex")}`;

  return new NextRequest("http://localhost:3000/api/integrations/route-optimizer/proof-of-delivery", {
    method: "POST",
    headers: {
      authorization: "Bearer pod-token",
      "content-type": "application/json",
      "x-ro-signature": signature,
    },
    body: rawBody,
  });
}

describe("proof of delivery ingestion", () => {
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
    process.env.ROUTE_OPTIMIZER_INGEST_TOKEN = "pod-token";
    process.env.ROUTE_OPTIMIZER_INGEST_SECRET = "pod-secret";
    process.env.POD_IMAGE_HOST_ALLOWLIST = "r2.kapioo.com,img.kapioo.com";
    process.env.POD_NOTIFY_CUSTOMER = "false";
  });

  afterAll(async () => {
    process.env = originalEnv;
    await teardownTestDb();
  });

  it("dedupes orderIds and reports updated, skipped, and missing orders", async () => {
    const user = await createTestUser();
    const deliveredAt = new Date("2026-05-17T12:00:00.000Z");
    await createDailyOrder(user._id, { orderId: "POD-D-1" });
    await createWeeklyOrder(user._id, {
      orderId: "POD-W-1",
      status: "delivered",
      deliveredAt,
    });
    await createDailyOrder(user._id, {
      orderId: "POD-D-CANCELLED",
      status: "cancelled",
    });

    const result = await applyProofOfDelivery({
      payload: basePayload({
        orderIds: ["POD-D-1", "POD-D-1", "POD-W-1", "POD-D-CANCELLED", "MISSING-1"],
      }),
    });

    expect(result.updated).toEqual([
      { orderId: "POD-D-1", service: "daily" },
      { orderId: "POD-W-1", service: "weekly" },
    ]);
    expect(result.skipped).toEqual([
      {
        orderId: "POD-D-CANCELLED",
        service: "daily",
        reason: "terminal-status",
        status: "cancelled",
      },
    ]);
    expect(result.missing).toEqual([{ orderId: "MISSING-1" }]);

    const daily = await DailyDeliveryOrder.findOne({ orderId: "POD-D-1" }).lean();
    const weekly = await WeeklyOrder.findOne({ orderId: "POD-W-1" }).lean();

    expect(daily).toMatchObject({
      status: "delivered",
      proofOfDelivery: {
        imageUrl: "https://r2.kapioo.com/pod/2026/05/abc.jpg",
        imageKey: "pod/2026/05/abc.jpg",
        source: "route-optimizer",
        stopId: "stop_123",
      },
    });
    expect(daily?.deliveredAt?.toISOString()).toBe(capturedAt);
    expect(weekly?.proofOfDelivery?.imageUrl).toBe("https://r2.kapioo.com/pod/2026/05/abc.jpg");
    expect(weekly?.deliveredAt?.toISOString()).toBe(deliveredAt.toISOString());
  });

  it("does not overwrite an existing POD on an already delivered order", async () => {
    const user = await createTestUser();
    await createDailyOrder(user._id, {
      status: "delivered",
      deliveredAt: new Date("2026-05-17T12:00:00.000Z"),
      proofOfDelivery: {
        imageUrl: "https://r2.kapioo.com/pod/original.jpg",
        imageKey: "pod/original.jpg",
        capturedAt: new Date("2026-05-17T12:00:00.000Z"),
        receivedAt: new Date("2026-05-17T12:01:00.000Z"),
        source: "route-optimizer",
      },
    });

    const result = await applyProofOfDelivery({
      payload: basePayload(),
    });

    expect(result.updated).toEqual([]);
    expect(result.skipped).toEqual([
      {
        orderId: "POD-D-1",
        service: "daily",
        reason: "already-delivered-with-pod",
        status: "delivered",
      },
    ]);

    const order = await DailyDeliveryOrder.findOne({ orderId: "POD-D-1" }).lean();
    expect(order?.proofOfDelivery?.imageUrl).toBe("https://r2.kapioo.com/pod/original.jpg");
  });

  it("rejects missing bearer and invalid HMAC before processing", async () => {
    const payload = basePayload();
    const missingBearer = signedRequest(payload);
    missingBearer.headers.set("authorization", "Bearer wrong");

    const missingBearerResponse = await POST(missingBearer);
    expect(missingBearerResponse.status).toBe(401);

    const badSignatureResponse = await POST(signedRequest(payload, "wrong-secret"));
    expect(badSignatureResponse.status).toBe(401);
  });

  it("applies admin-manual POD to a single order and marks it delivered", async () => {
    const user = await createTestUser();
    await createDailyOrder(user._id, { status: "delivery" });

    const result = await applyProofOfDeliveryToOrder({
      orderId: "POD-D-1",
      proofOfDelivery: {
        imageUrl: "https://cdn.kapioo.com/proof-of-delivery/POD-D-1/photo.jpg",
        imageKey: "proof-of-delivery/POD-D-1/photo.jpg",
        capturedAt: new Date(capturedAt),
        receivedAt: new Date(),
        source: "admin-manual",
        note: "Hand delivered",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      orderId: "POD-D-1",
      service: "daily",
      previousStatus: "delivery",
    });

    const order = await DailyDeliveryOrder.findOne({ orderId: "POD-D-1" }).lean();
    expect(order).toMatchObject({
      status: "delivered",
      proofOfDelivery: {
        imageUrl: "https://cdn.kapioo.com/proof-of-delivery/POD-D-1/photo.jpg",
        source: "admin-manual",
        note: "Hand delivered",
      },
    });
    expect(order?.deliveredAt?.toISOString()).toBe(capturedAt);
  });

  it("accepts a valid signed webhook and returns the Route Optimizer response shape", async () => {
    const user = await createTestUser();
    await createDailyOrder(user._id);

    const response = await POST(signedRequest(basePayload()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      updated: [{ orderId: "POD-D-1", service: "daily" }],
      skipped: [],
      missing: [],
      stopId: "stop_123",
    });
  });
});
