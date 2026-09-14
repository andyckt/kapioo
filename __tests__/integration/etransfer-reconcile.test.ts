import InteracReceipt from "@/models/InteracReceipt";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import VoucherApprovalGrant from "@/models/VoucherApprovalGrant";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db";
import { createTestUser } from "../helpers/factories";

const { syncInteracReceiptsMock } = vi.hoisted(() => ({
  syncInteracReceiptsMock: vi.fn(),
}));

vi.mock("@/lib/etransfer/mailbox", () => ({
  syncInteracReceipts: syncInteracReceiptsMock,
}));

import { reconcileEtransferPurchases } from "@/lib/etransfer/reconcile";

const MAILBOX = "kapioomeal@gmail.com";

async function createDueDailyRequest(options: {
  requestId: string;
  userId: unknown;
  payerEmail: string;
  reference: string;
  createdAt?: Date;
  nextPaymentCheckAt?: Date;
}) {
  return VoucherPurchaseRequest.create({
    requestId: options.requestId,
    userId: options.userId,
    planId: "daily-2dish-6",
    type: "twoDish",
    quantity: 6,
    amount: 148.03,
    finalTotal: 148.03,
    amountCents: 14803,
    imageProof: "https://example.com/proof.jpg",
    referenceNumber: options.payerEmail,
    interacReference: options.reference,
    interacReferenceNormalized: options.reference,
    paymentVerificationStatus: "pending",
    nextPaymentCheckAt: options.nextPaymentCheckAt || new Date(Date.now() - 60_000),
    createdAt: options.createdAt,
    status: "pending",
  });
}

describe("e-Transfer reconciliation", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    syncInteracReceiptsMock.mockReset();
    syncInteracReceiptsMock.mockResolvedValue({
      skipped: false,
      processed: 0,
      accepted: 0,
      rejected: 0,
    });
    process.env.EMAIL_USER = MAILBOX;
    process.env.EMAIL_PASS = "test-app-password";
    process.env.ETRANSFER_RECIPIENT_EMAIL = MAILBOX;
    process.env.ETRANSFER_ACCOUNT_LAST4 = "4994";
    process.env.ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT = new Date(
      Date.now() - 7 * 24 * 60 * 60_000
    ).toISOString();
    process.env.ETRANSFER_AUTO_APPROVAL_MODE = "live";
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("keeps retrying a transfer after 72 hours while flagging it for review", async () => {
    const user = await createTestUser({ email: "delayed@example.com" });
    const createdAt = new Date(Date.now() - 73 * 60 * 60_000);
    await createDueDailyRequest({
      requestId: "VPR-5001",
      userId: user._id,
      payerEmail: user.email,
      reference: "CA50010001",
      createdAt,
    });

    const result = await reconcileEtransferPurchases();
    const request = await VoucherPurchaseRequest.findOne({ requestId: "VPR-5001" }).lean();

    expect(result.pending).toBe(1);
    expect(request).toMatchObject({
      status: "pending",
      paymentVerificationStatus: "not_found",
      paymentReviewRequired: true,
      paymentCheckAttempts: 1,
    });
    const retryDelay = new Date(request?.nextPaymentCheckAt as Date).getTime() - Date.now();
    expect(retryDelay).toBeGreaterThan(59 * 60_000);
    expect(retryDelay).toBeLessThanOrEqual(60 * 60_000);
  });

  it("approves the first identical ticket and declines the duplicate", async () => {
    const user = await createTestUser({
      email: "duplicate-worker@example.com",
      twoDishVoucher: 0,
    });
    const firstCreatedAt = new Date(Date.now() - 20 * 60_000);
    const secondCreatedAt = new Date(firstCreatedAt.getTime() + 1_000);
    await createDueDailyRequest({
      requestId: "VPR-5002",
      userId: user._id,
      payerEmail: user.email,
      reference: "CA50020001",
      createdAt: firstCreatedAt,
    });
    await createDueDailyRequest({
      requestId: "VPR-5003",
      userId: user._id,
      payerEmail: user.email,
      reference: "CA50020001",
      createdAt: secondCreatedAt,
    });
    await InteracReceipt.create({
      provider: "interac",
      mailbox: MAILBOX,
      reference: "CA50020001",
      referenceNormalized: "CA50020001",
      gmailMessageId: "<CA50020001@payments.interac.ca>",
      imapUid: 5002,
      uidValidity: "1",
      payerEmail: user.email,
      payerEmailNormalized: user.email,
      senderName: user.name,
      recipientEmail: MAILBOX,
      amountCents: 14803,
      currency: "CAD",
      depositedAt: new Date(),
      receivedAt: new Date(),
      accountLast4: "4994",
      subject: "Authenticated completed deposit",
      rawSha256: "sha256-CA50020001",
      parserVersion: "1",
      authenticationVerified: true,
      status: "unmatched",
    });

    const result = await reconcileEtransferPurchases();
    const [first, duplicate, reloadedUser] = await Promise.all([
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5002" }).lean(),
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5003" }).lean(),
      User.findById(user._id).lean() as Promise<Record<string, any> | null>,
    ]);

    expect(result).toMatchObject({ approved: 1, duplicates: 1 });
    expect(first?.status).toBe("approved");
    expect(duplicate).toMatchObject({
      status: "declined",
      paymentVerificationStatus: "duplicate",
      duplicateOfRequestId: "VPR-5002",
    });
    expect(reloadedUser?.twoDishVoucher).toBe(6);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
    expect(await Transaction.countDocuments()).toBe(1);
  });

  it("never lets a newer duplicate win because its retry became due first", async () => {
    const user = await createTestUser({
      email: "retry-order@example.com",
      twoDishVoucher: 0,
    });
    const firstCreatedAt = new Date(Date.now() - 25 * 60_000);
    const secondCreatedAt = new Date(firstCreatedAt.getTime() + 1_000);
    await createDueDailyRequest({
      requestId: "VPR-5005",
      userId: user._id,
      payerEmail: user.email,
      reference: "CA50050001",
      createdAt: firstCreatedAt,
      nextPaymentCheckAt: new Date(Date.now() + 6 * 60 * 60_000),
    });
    await createDueDailyRequest({
      requestId: "VPR-5006",
      userId: user._id,
      payerEmail: user.email,
      reference: "CA50050001",
      createdAt: secondCreatedAt,
    });
    await InteracReceipt.create({
      provider: "interac",
      mailbox: MAILBOX,
      reference: "CA50050001",
      referenceNormalized: "CA50050001",
      gmailMessageId: "<CA50050001@payments.interac.ca>",
      imapUid: 5005,
      uidValidity: "1",
      payerEmail: user.email,
      payerEmailNormalized: user.email,
      senderName: user.name,
      recipientEmail: MAILBOX,
      amountCents: 14803,
      currency: "CAD",
      depositedAt: new Date(),
      receivedAt: new Date(),
      accountLast4: "4994",
      subject: "Authenticated completed deposit",
      rawSha256: "sha256-CA50050001",
      parserVersion: "1",
      authenticationVerified: true,
      status: "unmatched",
    });

    const firstPass = await reconcileEtransferPurchases();
    const promotedFirst = await VoucherPurchaseRequest.findOne({ requestId: "VPR-5005" }).lean();
    expect(firstPass).toMatchObject({ approved: 0, pending: 1 });
    expect(new Date(promotedFirst?.nextPaymentCheckAt as Date).getTime()).toBeLessThanOrEqual(Date.now());
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);

    await reconcileEtransferPurchases();
    await VoucherPurchaseRequest.updateOne(
      { requestId: "VPR-5006" },
      { $set: { nextPaymentCheckAt: new Date(Date.now() - 1) } }
    );
    await reconcileEtransferPurchases();

    const [first, duplicate, reloadedUser] = await Promise.all([
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5005" }).lean(),
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5006" }).lean(),
      User.findById(user._id).lean() as Promise<Record<string, any> | null>,
    ]);
    expect(first?.status).toBe("approved");
    expect(duplicate).toMatchObject({
      status: "declined",
      paymentVerificationStatus: "duplicate",
      duplicateOfRequestId: "VPR-5005",
    });
    expect(reloadedUser?.twoDishVoucher).toBe(6);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
    expect(await Transaction.countDocuments()).toBe(1);
  });

  it("records a verified match without issuing vouchers in observation mode", async () => {
    process.env.ETRANSFER_AUTO_APPROVAL_MODE = "observe";
    const user = await createTestUser({ email: "observe@example.com", twoDishVoucher: 0 });
    await createDueDailyRequest({
      requestId: "VPR-5004",
      userId: user._id,
      payerEmail: user.email,
      reference: "CA50040001",
    });
    await InteracReceipt.create({
      provider: "interac",
      mailbox: MAILBOX,
      reference: "CA50040001",
      referenceNormalized: "CA50040001",
      gmailMessageId: "<CA50040001@payments.interac.ca>",
      imapUid: 5004,
      uidValidity: "1",
      payerEmail: user.email,
      payerEmailNormalized: user.email,
      senderName: user.name,
      recipientEmail: MAILBOX,
      amountCents: 14803,
      currency: "CAD",
      depositedAt: new Date(),
      receivedAt: new Date(),
      accountLast4: "4994",
      subject: "Authenticated completed deposit",
      rawSha256: "sha256-CA50040001",
      parserVersion: "1",
      authenticationVerified: true,
      status: "unmatched",
    });

    await reconcileEtransferPurchases();

    expect((await VoucherPurchaseRequest.findOne({ requestId: "VPR-5004" }).lean())).toMatchObject({
      status: "pending",
      paymentVerificationStatus: "matched",
    });
    const reloadedUser = await User.findById(user._id).lean() as Record<string, any> | null;
    expect(reloadedUser?.twoDishVoucher).toBe(0);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);
    expect(await Transaction.countDocuments()).toBe(0);
  });

  it("reports observation-mode duplicates without approving or declining them", async () => {
    process.env.ETRANSFER_AUTO_APPROVAL_MODE = "observe";
    const user = await createTestUser({ email: "observe-duplicate@example.com", twoDishVoucher: 0 });
    const firstCreatedAt = new Date(Date.now() - 20 * 60_000);
    await createDueDailyRequest({
      requestId: "VPR-5007",
      userId: user._id,
      payerEmail: user.email,
      reference: "CA50070001",
      createdAt: firstCreatedAt,
    });
    await createDueDailyRequest({
      requestId: "VPR-5008",
      userId: user._id,
      payerEmail: user.email,
      reference: "CA50070001",
      createdAt: new Date(firstCreatedAt.getTime() + 1_000),
    });
    await InteracReceipt.create({
      provider: "interac",
      mailbox: MAILBOX,
      reference: "CA50070001",
      referenceNormalized: "CA50070001",
      gmailMessageId: "<CA50070001@payments.interac.ca>",
      imapUid: 5007,
      uidValidity: "1",
      payerEmail: user.email,
      payerEmailNormalized: user.email,
      senderName: user.name,
      recipientEmail: MAILBOX,
      amountCents: 14803,
      currency: "CAD",
      depositedAt: new Date(),
      receivedAt: new Date(),
      accountLast4: "4994",
      subject: "Authenticated completed deposit",
      rawSha256: "sha256-CA50070001",
      parserVersion: "1",
      authenticationVerified: true,
      status: "unmatched",
    });

    const result = await reconcileEtransferPurchases();
    const [first, duplicate] = await Promise.all([
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5007" }).lean(),
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5008" }).lean(),
    ]);

    expect(result).toMatchObject({ approved: 0, duplicates: 1 });
    expect(first).toMatchObject({ status: "pending", paymentVerificationStatus: "matched" });
    expect(duplicate).toMatchObject({
      status: "pending",
      paymentVerificationStatus: "duplicate",
      duplicateOfRequestId: "VPR-5007",
    });
    expect((await User.findById(user._id).lean() as Record<string, any>)?.twoDishVoucher).toBe(0);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);
    expect(await Transaction.countDocuments()).toBe(0);
  });
});
