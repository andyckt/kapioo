import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db";
import { createTestUser } from "../helpers/factories";
import { buildJsonRequest, buildRequest } from "../helpers/request";

const { connectToDatabaseMock, requireUserMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  requireUserMock: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireUser: requireUserMock,
}));

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}));

vi.mock("@/lib/services/email", () => ({
  sendAdminCreditRequestNotification: vi.fn().mockResolvedValue(undefined),
  sendAdminVoucherRequestNotification: vi.fn().mockResolvedValue(undefined),
  sendUserCreditRequestConfirmation: vi.fn().mockResolvedValue(undefined),
  sendUserVoucherRequestConfirmation: vi.fn().mockResolvedValue(undefined),
}));

import { GET as getWeeklyRequests, POST as postWeeklyRequest } from "@/app/api/credits/request/route";
import { POST as postDailyRequest } from "@/app/api/voucher-requests/route";

function actorFor(user: Record<string, unknown>) {
  return {
    user: user as never,
    role: "user" as const,
    sessionVersion: Number(user.sessionVersion || 1),
  };
}

describe("voucher request submission safety", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    connectToDatabaseMock.mockReset();
    connectToDatabaseMock.mockResolvedValue(undefined);
    requireUserMock.mockReset();
    process.env.ETRANSFER_AUTO_APPROVAL_MODE = "live";
    process.env.ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT = "2026-01-01T00:00:00.000Z";
    process.env.EMAIL_USER = "kapioomeal@gmail.com";
    process.env.EMAIL_PASS = "test-app-password";
    process.env.ETRANSFER_RECIPIENT_EMAIL = "kapioomeal@gmail.com";
    process.env.ETRANSFER_ACCOUNT_LAST4 = "4994";
    process.env.ETRANSFER_CRON_SECRET = "a".repeat(32);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("uses server pricing and turns duplicate daily submissions into one request", async () => {
    const user = await createTestUser({ phone: "+14165550100" });
    requireUserMock.mockResolvedValue({ actor: actorFor(user.toObject()), response: null });
    const body = {
      userId: String(user._id),
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 0.01,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      interacReference: "CA40010001",
      submissionKey: "f4db283f-1f55-4651-9ef5-6a8f39b5f19d",
    };

    const firstResponse = await postDailyRequest(
      buildJsonRequest("http://localhost/api/voucher-requests", body)
    );
    const secondResponse = await postDailyRequest(
      buildJsonRequest("http://localhost/api/voucher-requests", body)
    );
    const saved = await VoucherPurchaseRequest.find().lean();

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(200);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      planId: "daily-2dish-6",
      amount: 148.03,
      finalTotal: 148.03,
      amountCents: 14803,
      paymentVerificationStatus: "pending",
      interacReferenceNormalized: "CA40010001",
    });
    expect(new Date(saved[0].nextPaymentCheckAt as Date).getTime()).toBeGreaterThan(
      new Date(saved[0].createdAt).getTime() + 9 * 60_000
    );
  });

  it("rejects a tampered weekly plan combination", async () => {
    const user = await createTestUser({ phone: "+14165550101" });
    requireUserMock.mockResolvedValue({ actor: actorFor(user.toObject()), response: null });

    const response = await postWeeklyRequest(
      buildJsonRequest("http://localhost/api/credits/request", {
        userId: String(user._id),
        planId: "weekly-6x2",
        mealsPerWeek: 16,
        duration: 8,
        mealPlanType: "16aweek",
        mealPlanQuantity: 8,
        paymentMethod: "emt",
        imageProof: "https://example.com/proof.jpg",
        referenceNumber: user.email,
        interacReference: "CA40020001",
        submissionKey: "02214c8c-c1b8-4456-a891-bc48480187f3",
      })
    );

    expect(response.status).toBe(400);
    expect(await CreditPurchaseRequest.countDocuments()).toBe(0);
  });

  it("does not let a customer list another customer's weekly requests", async () => {
    const user = await createTestUser({ phone: "+14165550102" });
    const otherUser = await createTestUser({ phone: "+14165550103" });
    requireUserMock.mockResolvedValue({ actor: actorFor(user.toObject()), response: null });

    const response = await getWeeklyRequests(
      buildRequest(`http://localhost/api/credits/request?userId=${String(otherUser._id)}`)
    );

    expect(response.status).toBe(403);
  });
});
