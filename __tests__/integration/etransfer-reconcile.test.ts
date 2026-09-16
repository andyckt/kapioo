import InteracReceipt from "@/models/InteracReceipt";
import InteracPayerEmail from "@/models/InteracPayerEmail";
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
  reference?: string;
  createdAt?: Date;
  nextPaymentCheckAt?: Date;
}) {
  const payerEmail = options.payerEmail.toLowerCase();
  let identity = await InteracPayerEmail.findOne({ emailNormalized: payerEmail });
  if (!identity) {
    identity = await InteracPayerEmail.create({
      userId: options.userId,
      slot: 1,
      email: payerEmail,
      emailNormalized: payerEmail,
      status: "verified",
      verifiedAt: new Date(Date.now() - 60_000),
    });
  }
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
    payerEmailIdentityId: identity._id,
    payerEmailVerifiedAt: identity.verifiedAt,
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

  it("syncs the mailbox even when no request is due", async () => {
    syncInteracReceiptsMock.mockResolvedValueOnce({
      skipped: false,
      processed: 1,
      accepted: 1,
      rejected: 0,
    });

    const result = await reconcileEtransferPurchases();

    expect(syncInteracReceiptsMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      due: 0,
      synced: { processed: 1, accepted: 1, rejected: 0 },
      approved: 0,
    });
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

  it("approves a reference-free request only from its verified sender email", async () => {
    const user = await createTestUser({ email: "linked-sender@example.com", twoDishVoucher: 0 });
    await createDueDailyRequest({
      requestId: "VPR-5010",
      userId: user._id,
      payerEmail: user.email,
    });
    await InteracReceipt.create({
      provider: "interac",
      mailbox: MAILBOX,
      reference: "CA50100001",
      referenceNormalized: "CA50100001",
      gmailMessageId: "<CA50100001@payments.interac.ca>",
      imapUid: 5010,
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
      rawSha256: "sha256-CA50100001",
      parserVersion: "1",
      authenticationVerified: true,
      status: "unmatched",
    });

    const result = await reconcileEtransferPurchases();
    const [request, reloadedUser] = await Promise.all([
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5010" }).lean(),
      User.findById(user._id).lean() as Promise<Record<string, any> | null>,
    ]);

    expect(result.approved).toBe(1);
    expect(request).toMatchObject({
      status: "approved",
      interacReferenceNormalized: "CA50100001",
    });
    expect(reloadedUser?.twoDishVoucher).toBe(6);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
  });

  it("approves a payment-first request when the completed deposit arrived three days earlier", async () => {
    process.env.ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT = new Date(
      Date.now() - 30 * 24 * 60 * 60_000
    ).toISOString();
    const user = await createTestUser({ email: "payment-first@example.com", twoDishVoucher: 0 });
    await createDueDailyRequest({
      requestId: "VPR-5016",
      userId: user._id,
      payerEmail: user.email,
      createdAt: new Date(),
    });
    const paidAt = new Date(Date.now() - 3 * 24 * 60 * 60_000);
    await InteracReceipt.create({
      provider: "interac",
      mailbox: MAILBOX,
      reference: "CA50160001",
      referenceNormalized: "CA50160001",
      gmailMessageId: "<CA50160001@payments.interac.ca>",
      imapUid: 5016,
      uidValidity: "1",
      payerEmail: user.email,
      payerEmailNormalized: user.email,
      senderName: user.name,
      recipientEmail: MAILBOX,
      amountCents: 14803,
      currency: "CAD",
      depositedAt: paidAt,
      receivedAt: paidAt,
      accountLast4: "4994",
      subject: "Authenticated completed deposit",
      rawSha256: "sha256-CA50160001",
      parserVersion: "1",
      authenticationVerified: true,
      status: "unmatched",
    });

    const result = await reconcileEtransferPurchases();
    const [request, reloadedUser] = await Promise.all([
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5016" }).lean(),
      User.findById(user._id).lean() as Promise<Record<string, any> | null>,
    ]);

    expect(result.approved).toBe(1);
    expect(request).toMatchObject({
      status: "approved",
      interacReferenceNormalized: "CA50160001",
    });
    expect(reloadedUser?.twoDishVoucher).toBe(6);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
  });

  it("does not match an old deposit outside the seven-day payment-first window", async () => {
    process.env.ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT = new Date(
      Date.now() - 30 * 24 * 60 * 60_000
    ).toISOString();
    const user = await createTestUser({ email: "old-payment@example.com", twoDishVoucher: 0 });
    await createDueDailyRequest({
      requestId: "VPR-5017",
      userId: user._id,
      payerEmail: user.email,
      createdAt: new Date(),
    });
    const paidAt = new Date(Date.now() - 8 * 24 * 60 * 60_000);
    await InteracReceipt.create({
      provider: "interac",
      mailbox: MAILBOX,
      reference: "CA50170001",
      referenceNormalized: "CA50170001",
      gmailMessageId: "<CA50170001@payments.interac.ca>",
      imapUid: 5017,
      uidValidity: "1",
      payerEmail: user.email,
      payerEmailNormalized: user.email,
      senderName: user.name,
      recipientEmail: MAILBOX,
      amountCents: 14803,
      currency: "CAD",
      depositedAt: paidAt,
      receivedAt: paidAt,
      accountLast4: "4994",
      subject: "Authenticated completed deposit",
      rawSha256: "sha256-CA50170001",
      parserVersion: "1",
      authenticationVerified: true,
      status: "unmatched",
    });

    const result = await reconcileEtransferPurchases();
    const [request, reloadedUser, receipt] = await Promise.all([
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5017" }).lean(),
      User.findById(user._id).lean() as Promise<Record<string, any> | null>,
      InteracReceipt.findOne({ referenceNormalized: "CA50170001" }).lean(),
    ]);

    expect(result).toMatchObject({ approved: 0, pending: 1 });
    expect(request).toMatchObject({ status: "pending", paymentVerificationStatus: "not_found" });
    expect(reloadedUser?.twoDishVoucher).toBe(0);
    expect(receipt?.status).toBe("unmatched");
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);
  });

  it("issues only one grant when duplicate reference-free tickets share one payment", async () => {
    const user = await createTestUser({ email: "no-ref-duplicate@example.com", twoDishVoucher: 0 });
    const createdAt = new Date(Date.now() - 20 * 60_000);
    await createDueDailyRequest({
      requestId: "VPR-5011",
      userId: user._id,
      payerEmail: user.email,
      createdAt,
    });
    await createDueDailyRequest({
      requestId: "VPR-5012",
      userId: user._id,
      payerEmail: user.email,
      createdAt: new Date(createdAt.getTime() + 1_000),
    });
    await InteracReceipt.create({
      provider: "interac",
      mailbox: MAILBOX,
      reference: "CA50110001",
      referenceNormalized: "CA50110001",
      gmailMessageId: "<CA50110001@payments.interac.ca>",
      imapUid: 5011,
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
      rawSha256: "sha256-CA50110001",
      parserVersion: "1",
      authenticationVerified: true,
      status: "unmatched",
    });

    const result = await reconcileEtransferPurchases();
    const [first, second, reloadedUser] = await Promise.all([
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5011" }).lean(),
      VoucherPurchaseRequest.findOne({ requestId: "VPR-5012" }).lean(),
      User.findById(user._id).lean() as Promise<Record<string, any> | null>,
    ]);

    expect(result.approved).toBe(1);
    expect(first?.status).toBe("approved");
    expect(second?.status).toBe("pending");
    expect(reloadedUser?.twoDishVoucher).toBe(6);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
    expect(await Transaction.countDocuments()).toBe(1);
  });

  it("stops automatic approval after the sender email is unlinked", async () => {
    const user = await createTestUser({ email: "unlinked@example.com", twoDishVoucher: 0 });
    const request = await createDueDailyRequest({
      requestId: "VPR-5013",
      userId: user._id,
      payerEmail: user.email,
      reference: "CA50130001",
    });
    await InteracPayerEmail.deleteOne({ _id: request.payerEmailIdentityId });
    await InteracReceipt.create({
      provider: "interac",
      mailbox: MAILBOX,
      reference: "CA50130001",
      referenceNormalized: "CA50130001",
      gmailMessageId: "<CA50130001@payments.interac.ca>",
      imapUid: 5013,
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
      rawSha256: "sha256-CA50130001",
      parserVersion: "1",
      authenticationVerified: true,
      status: "unmatched",
    });

    const result = await reconcileEtransferPurchases();
    const reloaded = await VoucherPurchaseRequest.findById(request._id).lean();

    expect(result.reviewed).toBe(1);
    expect(reloaded).toMatchObject({ status: "pending", paymentVerificationStatus: "review" });
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);
  });

  it("approves neither request when a reference-free payment could buy different plans", async () => {
    const user = await createTestUser({ email: "ambiguous@example.com", twoDishVoucher: 0 });
    const first = await createDueDailyRequest({
      requestId: "VPR-5014",
      userId: user._id,
      payerEmail: user.email,
    });
    const second = await createDueDailyRequest({
      requestId: "VPR-5015",
      userId: user._id,
      payerEmail: user.email,
    });
    await VoucherPurchaseRequest.updateOne(
      { _id: second._id },
      { $set: { planId: "daily-3dish-6", type: "threeDish" } }
    );
    await InteracReceipt.create({
      provider: "interac",
      mailbox: MAILBOX,
      reference: "CA50140001",
      referenceNormalized: "CA50140001",
      gmailMessageId: "<CA50140001@payments.interac.ca>",
      imapUid: 5014,
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
      rawSha256: "sha256-CA50140001",
      parserVersion: "1",
      authenticationVerified: true,
      status: "unmatched",
    });

    const result = await reconcileEtransferPurchases();
    const [reloadedFirst, reloadedSecond] = await Promise.all([
      VoucherPurchaseRequest.findById(first._id).lean(),
      VoucherPurchaseRequest.findById(second._id).lean(),
    ]);

    expect(result).toMatchObject({ approved: 0, reviewed: 2 });
    expect(reloadedFirst?.paymentVerificationStatus).toBe("review");
    expect(reloadedSecond?.paymentVerificationStatus).toBe("review");
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);
  });

  it("fails the run when a purported Interac notification is rejected", async () => {
    syncInteracReceiptsMock.mockResolvedValueOnce({
      skipped: false,
      processed: 1,
      accepted: 0,
      rejected: 1,
    });

    await expect(reconcileEtransferPurchases()).rejects.toThrow("Interac notification was rejected");
  });
});
