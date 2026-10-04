import {
  approveVoucherPurchase,
  declineVoucherPurchase,
  resolveManuallyFulfilledVoucherPurchase,
} from "@/lib/etransfer/approval";
import {
  correctVoucherPurchasePayerEmail,
  requestVoucherPurchaseCorrection,
} from "@/lib/etransfer/customer-correction";
import { saveInteracReceipt } from "@/lib/etransfer/mailbox";
import AuditLog from "@/models/AuditLog";
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import InteracPayerEmail from "@/models/InteracPayerEmail";
import InteracReceipt from "@/models/InteracReceipt";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import VoucherApprovalGrant from "@/models/VoucherApprovalGrant";
import VoucherApprovalNotification from "@/models/VoucherApprovalNotification";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db";
import { createTestUser } from "../helpers/factories";

const MAILBOX = "kapioomeal@gmail.com";

async function createReceipt(options: {
  reference: string;
  payerEmail: string;
  amountCents: number;
}) {
  return InteracReceipt.create({
    provider: "interac",
    mailbox: MAILBOX,
    reference: options.reference,
    referenceNormalized: options.reference,
    gmailMessageId: `<${options.reference}@payments.interac.ca>`,
    imapUid: Math.floor(Math.random() * 1_000_000) + 1,
    uidValidity: "1",
    payerEmail: options.payerEmail,
    payerEmailNormalized: options.payerEmail.toLowerCase(),
    senderName: "Test Customer",
    recipientEmail: MAILBOX,
    amountCents: options.amountCents,
    currency: "CAD",
    depositedAt: new Date(),
    receivedAt: new Date(),
    accountLast4: "4994",
    subject: "Authenticated completed deposit",
    rawSha256: `sha256-${options.reference}`,
    parserVersion: "1",
    authenticationVerified: true,
    status: "unmatched",
  });
}

async function createVerifiedPayerEmail(user: { _id: unknown; email: string }) {
  const verifiedAt = new Date();
  const identity = await InteracPayerEmail.create({
    userId: user._id,
    slot: 1,
    email: user.email,
    emailNormalized: user.email.toLowerCase(),
    status: "verified",
    failedAttempts: 0,
    verifiedAt,
  });
  return { identity, verifiedAt };
}

describe("voucher auto approval accounting boundary", () => {
  beforeAll(async () => {
    process.env.ETRANSFER_RECIPIENT_EMAIL = MAILBOX;
    process.env.EMAIL_USER = MAILBOX;
    process.env.ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT = "2020-01-01T00:00:00.000Z";
    await setupTestDb();
    await Promise.all([
      InteracReceipt.syncIndexes(),
      VoucherApprovalGrant.syncIndexes(),
      VoucherApprovalNotification.syncIndexes(),
      VoucherPurchaseRequest.syncIndexes(),
      CreditPurchaseRequest.syncIndexes(),
      Transaction.syncIndexes(),
    ]);
  });

  beforeEach(async () => {
    await clearCollections();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("issues a daily entitlement and accounting record exactly once", async () => {
    const user = await createTestUser({
      email: "daily-customer@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    const request = await VoucherPurchaseRequest.create({
      requestId: "VPR-2001",
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 147,
      finalTotal: 147,
      amountCents: 14700,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      interacReference: "CA20010001",
      interacReferenceNormalized: "CA20010001",
      paymentVerificationStatus: "pending",
      status: "pending",
    });
    const receipt = await createReceipt({
      reference: "CA20010001",
      payerEmail: user.email,
      amountCents: 14700,
    });

    const [first, second] = await Promise.all([
      approveVoucherPurchase({
        kind: "daily",
        requestId: request.requestId,
        source: "automatic",
        receiptId: String(receipt._id),
      }),
      approveVoucherPurchase({
        kind: "daily",
        requestId: request.requestId,
        source: "automatic",
        receiptId: String(receipt._id),
      }),
    ]);

    const reloadedUser = await User.findById(user._id).lean() as Record<string, any> | null;
    expect([first.alreadyApproved, second.alreadyApproved].sort()).toEqual([false, true]);
    expect((reloadedUser as Record<string, any> | null)?.twoDishVoucher).toBe(6);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
    expect(await Transaction.countDocuments()).toBe(1);
    expect(await VoucherApprovalNotification.countDocuments()).toBe(1);
    expect(await AuditLog.countDocuments({ action: "voucher-request.approved" })).toBe(1);
  });

  it("prevents one authenticated transfer from funding two requests", async () => {
    const user = await createTestUser({
      email: "duplicate-customer@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    const base = {
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 147,
      finalTotal: 147,
      amountCents: 14700,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      interacReference: "CA20020001",
      interacReferenceNormalized: "CA20020001",
      paymentVerificationStatus: "pending",
      status: "pending",
    } as const;
    await VoucherPurchaseRequest.create([
      { ...base, requestId: "VPR-2002" },
      { ...base, requestId: "VPR-2003" },
    ]);
    const receipt = await createReceipt({
      reference: "CA20020001",
      payerEmail: user.email,
      amountCents: 14700,
    });

    await approveVoucherPurchase({
      kind: "daily",
      requestId: "VPR-2002",
      source: "automatic",
      receiptId: String(receipt._id),
    });
    await expect(
      approveVoucherPurchase({
        kind: "daily",
        requestId: "VPR-2003",
        source: "automatic",
        receiptId: String(receipt._id),
      })
    ).rejects.toMatchObject({ code: "PAYMENT_ALREADY_USED" });

    const reloadedUser = await User.findById(user._id).lean() as Record<string, any> | null;
    expect(reloadedUser?.twoDishVoucher).toBe(6);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
    expect(await Transaction.countDocuments()).toBe(1);
  });

  it("fails closed when payer email or amount does not match", async () => {
    const user = await createTestUser({
      email: "mismatch-customer@example.com",
      weeklySIXmeals: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    await CreditPurchaseRequest.create({
      requestId: "CR-REQ-2001",
      userId: user._id,
      planId: "weekly-6x2",
      amount: 250,
      finalTotal: 250,
      amountCents: 25000,
      originalPrice: 219,
      paymentMethod: "emt",
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      interacReference: "CA20030001",
      interacReferenceNormalized: "CA20030001",
      mealPlanType: "6aweek",
      mealPlanQuantity: 2,
      paymentVerificationStatus: "pending",
      status: "pending",
    });
    const receipt = await createReceipt({
      reference: "CA20030001",
      payerEmail: "someone-else@example.com",
      amountCents: 25000,
    });

    await expect(
      approveVoucherPurchase({
        kind: "weekly",
        requestId: "CR-REQ-2001",
        source: "automatic",
        receiptId: String(receipt._id),
      })
    ).rejects.toMatchObject({ code: "PAYMENT_MISMATCH" });

    const reloadedUser = await User.findById(user._id).lean() as Record<string, any> | null;
    expect(reloadedUser?.weeklySIXmeals).toBe(0);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);
    expect(await Transaction.countDocuments()).toBe(0);
  });

  it("closes an already fulfilled request without adding vouchers twice", async () => {
    const user = await createTestUser({
      email: "manual-override@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    const request = await VoucherPurchaseRequest.create({
      requestId: "VPR-OVERRIDE-1",
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 148.03,
      finalTotal: 148.03,
      amountCents: 14803,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      paymentVerificationStatus: "not_found",
      status: "pending",
    });
    const receipt = await createReceipt({
      reference: "CAOVERRIDE001",
      payerEmail: "different-sender@example.com",
      amountCents: 14803,
    });

    const userDocument = await User.findById(user._id);
    if (!userDocument) throw new Error("Expected user");
    userDocument.twoDishVoucher = 6;
    await userDocument.save();
    const manualAdd = await Transaction.create({
      transactionId: "CR-MANUAL-OVERRIDE-1",
      userId: user._id,
      type: "Add",
      amount: 6,
      description: "Added 6 twoDishVoucher",
    });
    await AuditLog.create({
      actorRole: "admin",
      action: "balance.add",
      targetType: "user-balance",
      targetId: String(user._id),
      metadata: {
        mutations: [{ field: "twoDishVoucher", amount: 6, operation: "add" }],
        transactionId: manualAdd.transactionId,
        source: "admin-update-balance",
        description: "Added 6 twoDishVoucher",
      },
    });

    const first = await resolveManuallyFulfilledVoucherPurchase({
      kind: "daily",
      requestId: request.requestId,
      actor: { role: "admin", user: { email: "admin@example.com" } },
      adminNotes: "Confirmed payment under a different sender email.",
    });
    const second = await resolveManuallyFulfilledVoucherPurchase({
      kind: "daily",
      requestId: request.requestId,
      actor: { role: "admin", user: { email: "admin@example.com" } },
      adminNotes: "Confirmed payment under a different sender email.",
    });

    const [reloadedUser, reloadedRequest, reloadedReceipt, grant] = await Promise.all([
      User.findById(user._id).lean(),
      VoucherPurchaseRequest.findOne({ requestId: request.requestId }).lean(),
      InteracReceipt.findById(receipt._id).lean(),
      VoucherApprovalGrant.findOne({ requestKey: `daily:${request.requestId}` }).lean(),
    ]);
    expect([first.alreadyApproved, second.alreadyApproved].sort()).toEqual([false, true]);
    expect((reloadedUser as Record<string, any> | null)?.twoDishVoucher).toBe(6);
    expect(reloadedRequest).toMatchObject({
      status: "approved",
      approvalSource: "manual",
      paymentVerificationStatus: "manual",
    });
    expect(reloadedReceipt).toMatchObject({
      status: "allocated",
      allocatedRequestKey: `daily:${request.requestId}`,
    });
    expect(grant?.balanceTransactionId).toBe(manualAdd.transactionId);
    expect(await Transaction.countDocuments()).toBe(1);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
    expect(await VoucherApprovalNotification.countDocuments()).toBe(1);
    expect(
      await AuditLog.countDocuments({ action: "voucher-request.manual-override-resolved" })
    ).toBe(1);
  });

  it("refuses the human override until the exact vouchers were added manually", async () => {
    const user = await createTestUser({
      email: "override-without-balance@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    const request = await VoucherPurchaseRequest.create({
      requestId: "VPR-OVERRIDE-2",
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 148.03,
      finalTotal: 148.03,
      amountCents: 14803,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      paymentVerificationStatus: "not_found",
      status: "pending",
    });
    const receipt = await createReceipt({
      reference: "CAOVERRIDE002",
      payerEmail: "different-sender-2@example.com",
      amountCents: 14803,
    });

    await expect(
      resolveManuallyFulfilledVoucherPurchase({
        kind: "daily",
        requestId: request.requestId,
        actor: { role: "admin", user: { email: "admin@example.com" } },
        adminNotes: "Confirmed payment under a different sender email.",
      })
    ).rejects.toMatchObject({ code: "MANUAL_OVERRIDE_BALANCE_NOT_FOUND" });

    expect(await User.findById(user._id).then((document) => document?.twoDishVoucher)).toBe(0);
    expect(await VoucherPurchaseRequest.findById(request._id).then((document) => document?.status)).toBe("pending");
    expect(await InteracReceipt.findById(receipt._id).then((document) => document?.status)).toBe("unmatched");
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);
  });

  it("allocates unique accounting IDs concurrently and bootstraps by numeric value", async () => {
    const user = await createTestUser();
    await Transaction.create([
      {
        transactionId: "CR-9999",
        userId: user._id,
        type: "Add",
        amount: 1,
        description: "Existing transaction",
      },
      {
        transactionId: "CR-10000",
        userId: user._id,
        type: "Add",
        amount: 1,
        description: "Existing transaction",
      },
    ]);

    const ids = await Promise.all(
      Array.from({ length: 12 }, () => Transaction.generateTransactionId("Add"))
    );

    expect(new Set(ids).size).toBe(12);
    expect(ids).toContain("CR-10001");
    expect(ids).toContain("CR-10012");
  });

  it("refuses manual Interac approval until a signed Gmail receipt exists", async () => {
    const user = await createTestUser({
      email: "manual-then-signed@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    const request = await VoucherPurchaseRequest.create({
      requestId: "VPR-2004",
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 148.03,
      finalTotal: 148.03,
      amountCents: 14803,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      paymentVerificationStatus: "manual",
      status: "pending",
    });

    await expect(
      approveVoucherPurchase({ kind: "daily", requestId: request.requestId, source: "manual" })
    ).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });

    await saveInteracReceipt(
      {
        reference: "CA20040001",
        referenceNormalized: "CA20040001",
        gmailMessageId: "<signed-CA20040001@payments.interac.ca>",
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
        rawSha256: "signed-sha256-CA20040001",
        parserVersion: "1",
        authenticationVerified: true,
      },
      MAILBOX,
      2004,
      "1"
    );

    await approveVoucherPurchase({
      kind: "daily",
      requestId: request.requestId,
      source: "manual",
    });

    const receipt = await InteracReceipt.findOne({ referenceNormalized: "CA20040001" }).lean();
    expect(receipt).toMatchObject({
      status: "allocated",
      allocatedRequestKey: "daily:VPR-2004",
      parserVersion: "1",
      authenticationVerified: true,
      accountLast4: "4994",
      gmailMessageId: "<signed-CA20040001@payments.interac.ca>",
    });
  });

  it("uses the recipient receipt reference internally and cannot reuse one deposit", async () => {
    const user = await createTestUser({
      email: "manual-reference@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    const receipt = await createReceipt({
      reference: "C1ARYTDCHDSB",
      payerEmail: user.email,
      amountCents: 14803,
    });
    const base = {
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 148.03,
      finalTotal: 148.03,
      amountCents: 14803,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      interacReference: "H090061752026091701151110",
      interacReferenceNormalized: "H090061752026091701151110",
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      matchedPaymentReceiptId: receipt._id,
      paymentVerificationStatus: "matched",
      status: "pending",
    } as const;
    await VoucherPurchaseRequest.create([
      { ...base, requestId: "VPR-2005" },
      { ...base, requestId: "VPR-2006" },
    ]);

    await approveVoucherPurchase({
      kind: "daily",
      requestId: "VPR-2005",
      source: "manual",
    });
    await expect(
      approveVoucherPurchase({
        kind: "daily",
        requestId: "VPR-2006",
        source: "manual",
      })
    ).rejects.toMatchObject({ code: "PAYMENT_ALREADY_USED" });

    expect((await User.findById(user._id).lean() as Record<string, any>)?.twoDishVoucher).toBe(6);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
    expect(
      (await VoucherPurchaseRequest.findOne({ requestId: "VPR-2005" }).lean() as Record<string, any>)
        ?.interacReferenceNormalized
    ).toBe("C1ARYTDCHDSB");
  });

  it("rejects an Interac receipt that did not pass email authentication", async () => {
    const user = await createTestUser({
      email: "unverified-receipt@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    const receipt = await createReceipt({
      reference: "CA20070001",
      payerEmail: user.email,
      amountCents: 14803,
    });
    receipt.authenticationVerified = false;
    await receipt.save();
    await VoucherPurchaseRequest.create({
      requestId: "VPR-2007",
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 148.03,
      finalTotal: 148.03,
      amountCents: 14803,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      matchedPaymentReceiptId: receipt._id,
      paymentVerificationStatus: "matched",
      status: "pending",
    });

    await expect(
      approveVoucherPurchase({ kind: "daily", requestId: "VPR-2007", source: "manual" })
    ).rejects.toMatchObject({ code: "UNVERIFIED_PAYMENT" });
    expect((await User.findById(user._id).lean() as Record<string, any>)?.twoDishVoucher).toBe(0);
  });

  it("keeps approval pending when more than one real deposit could match", async () => {
    const user = await createTestUser({
      email: "ambiguous-deposits@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    await Promise.all([
      createReceipt({ reference: "CA20080001", payerEmail: user.email, amountCents: 14803 }),
      createReceipt({ reference: "CA20080002", payerEmail: user.email, amountCents: 14803 }),
    ]);
    await VoucherPurchaseRequest.create({
      requestId: "VPR-2008",
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 148.03,
      finalTotal: 148.03,
      amountCents: 14803,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      paymentVerificationStatus: "review",
      status: "pending",
    });

    await expect(
      approveVoucherPurchase({ kind: "daily", requestId: "VPR-2008", source: "manual" })
    ).rejects.toMatchObject({ code: "PAYMENT_AMBIGUOUS" });
    expect((await User.findById(user._id).lean() as Record<string, any>)?.twoDishVoucher).toBe(0);
  });

  it("lets an administrator approve one authenticated exact-amount deposit with a mismatched sender email", async () => {
    const user = await createTestUser({
      email: "manual-payment-override@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    const request = await VoucherPurchaseRequest.create({
      requestId: "VPR-MANUAL-PAYMENT-1",
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 148.03,
      finalTotal: 148.03,
      amountCents: 14803,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      paymentVerificationStatus: "review",
      status: "pending",
    });
    const receipt = await createReceipt({
      reference: "CAMANUALPAYMENT001",
      payerEmail: "actual-sender@example.com",
      amountCents: 14803,
    });

    const first = await approveVoucherPurchase({
      kind: "daily",
      requestId: request.requestId,
      source: "manual",
      actor: { role: "admin", user: { email: "admin@example.com" } },
      adminNotes: "Confirmed the sender and deposit in the authenticated bank email.",
      manualPaymentOverride: true,
    });
    const second = await approveVoucherPurchase({
      kind: "daily",
      requestId: request.requestId,
      source: "manual",
      actor: { role: "admin", user: { email: "admin@example.com" } },
      adminNotes: "Confirmed the sender and deposit in the authenticated bank email.",
      manualPaymentOverride: true,
    });

    expect([first.alreadyApproved, second.alreadyApproved].sort()).toEqual([false, true]);
    expect((await User.findById(user._id).lean() as Record<string, any>)?.twoDishVoucher).toBe(6);
    expect(await Transaction.countDocuments()).toBe(1);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
    expect(await AuditLog.countDocuments({
      action: "voucher-request.manual-payment-override-approved",
    })).toBe(1);
    expect(await VoucherPurchaseRequest.findById(request._id).lean()).toMatchObject({
      status: "approved",
      approvalSource: "manual",
      paymentVerificationStatus: "manual",
      matchedPaymentReceiptId: receipt._id,
    });
    expect(await InteracReceipt.findById(receipt._id).lean()).toMatchObject({
      status: "allocated",
      allocatedRequestKey: `daily:${request.requestId}`,
    });
  });

  it("refuses a manual payment override when more than one exact deposit is possible", async () => {
    const user = await createTestUser({
      email: "manual-payment-ambiguous@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    const request = await VoucherPurchaseRequest.create({
      requestId: "VPR-MANUAL-PAYMENT-2",
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 149.04,
      finalTotal: 149.04,
      amountCents: 14904,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      paymentVerificationStatus: "review",
      status: "pending",
    });
    await Promise.all([
      createReceipt({
        reference: "CAMANUALAMBIGUOUS001",
        payerEmail: "sender-one@example.com",
        amountCents: 14904,
      }),
      createReceipt({
        reference: "CAMANUALAMBIGUOUS002",
        payerEmail: "sender-two@example.com",
        amountCents: 14904,
      }),
    ]);

    await expect(approveVoucherPurchase({
      kind: "daily",
      requestId: request.requestId,
      source: "manual",
      actor: { role: "admin", user: { email: "admin@example.com" } },
      adminNotes: "Confirmed the sender and deposit in the authenticated bank email.",
      manualPaymentOverride: true,
    })).rejects.toMatchObject({ code: "MANUAL_OVERRIDE_PAYMENT_AMBIGUOUS" });
    expect((await User.findById(user._id).lean() as Record<string, any>)?.twoDishVoucher).toBe(0);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);
  });

  it("refuses an override when its receipt matches another open request", async () => {
    const overrideUser = await createTestUser({
      email: "override-request@example.com",
      twoDishVoucher: 0,
    });
    const rightfulUser = await createTestUser({
      email: "rightful-sender@example.com",
      twoDishVoucher: 0,
    });
    const overrideIdentity = await createVerifiedPayerEmail(overrideUser);
    const rightfulIdentity = await createVerifiedPayerEmail(rightfulUser);
    const base = {
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 150.05,
      finalTotal: 150.05,
      amountCents: 15005,
      imageProof: "https://example.com/proof.jpg",
      paymentVerificationStatus: "review",
      status: "pending",
    } as const;
    await VoucherPurchaseRequest.create([
      {
        ...base,
        requestId: "VPR-OVERRIDE-COMPETING-1",
        userId: overrideUser._id,
        referenceNumber: overrideUser.email,
        payerEmailIdentityId: overrideIdentity.identity._id,
        payerEmailVerifiedAt: overrideIdentity.verifiedAt,
      },
      {
        ...base,
        requestId: "VPR-OVERRIDE-COMPETING-2",
        userId: rightfulUser._id,
        referenceNumber: rightfulUser.email,
        payerEmailIdentityId: rightfulIdentity.identity._id,
        payerEmailVerifiedAt: rightfulIdentity.verifiedAt,
      },
    ]);
    await createReceipt({
      reference: "CAMANUALRIGHTFUL001",
      payerEmail: rightfulUser.email,
      amountCents: 15005,
    });

    await expect(approveVoucherPurchase({
      kind: "daily",
      requestId: "VPR-OVERRIDE-COMPETING-1",
      source: "manual",
      actor: { role: "admin", user: { email: "admin@example.com" } },
      adminNotes: "Confirmed the sender and deposit in the authenticated bank email.",
      manualPaymentOverride: true,
    })).rejects.toMatchObject({
      code: "MANUAL_OVERRIDE_PAYMENT_BELONGS_TO_ANOTHER_REQUEST",
    });
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);
  });

  it("lets the customer correct a verified sender email and schedules automatic review again", async () => {
    const user = await createTestUser({
      email: "correction-owner@example.com",
      twoDishVoucher: 0,
    });
    const otherUser = await createTestUser({ email: "correction-other@example.com" });
    const original = await createVerifiedPayerEmail(user);
    const correctedAt = new Date();
    const correctedIdentity = await InteracPayerEmail.create({
      userId: user._id,
      slot: 2,
      email: "actual-correction-sender@example.com",
      emailNormalized: "actual-correction-sender@example.com",
      status: "verified",
      failedAttempts: 0,
      verifiedAt: correctedAt,
    });
    const request = await VoucherPurchaseRequest.create({
      requestId: "VPR-CORRECTION-1",
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 151.06,
      finalTotal: 151.06,
      amountCents: 15106,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: original.identity._id,
      payerEmailVerifiedAt: original.verifiedAt,
      paymentVerificationStatus: "review",
      status: "pending",
    });

    await requestVoucherPurchaseCorrection({
      kind: "daily",
      requestId: request.requestId,
      reason: "payer_email_mismatch",
      message: "Please use the email that actually sent the transfer.",
      actor: { role: "admin", user: { email: "admin@example.com" } },
    });
    expect(await VoucherPurchaseRequest.findById(request._id).lean()).toMatchObject({
      customerActionRequired: true,
      customerFeedbackReason: "payer_email_mismatch",
      paymentVerificationStatus: "review",
      paymentReviewRequired: true,
    });
    expect(await VoucherApprovalNotification.countDocuments({
      requestId: request.requestId,
      status: "correction_required",
    })).toBe(1);

    await expect(correctVoucherPurchasePayerEmail({
      kind: "daily",
      requestId: request.requestId,
      payerEmail: correctedIdentity.email,
      actor: { role: "user", user: { _id: otherUser._id, email: otherUser.email } },
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await correctVoucherPurchasePayerEmail({
      kind: "daily",
      requestId: request.requestId,
      payerEmail: correctedIdentity.email,
      actor: { role: "user", user: { _id: user._id, email: user.email } },
    });

    const corrected = await VoucherPurchaseRequest.findById(request._id).lean() as Record<string, any>;
    expect(corrected).toMatchObject({
      referenceNumber: correctedIdentity.emailNormalized,
      customerActionRequired: false,
      paymentVerificationStatus: "pending",
      paymentReviewRequired: false,
      payerEmailIdentityId: correctedIdentity._id,
    });
    expect(corrected.nextPaymentCheckAt).toBeInstanceOf(Date);
    expect(await AuditLog.countDocuments({
      action: "voucher-request.customer-corrected-payment-info",
    })).toBe(1);
    expect(await InteracPayerEmail.countDocuments({ userId: user._id, status: "verified" })).toBe(2);
  });

  it("lets an administrator decline a blocked request and closes customer correction", async () => {
    const user = await createTestUser({
      email: "decline-correction@example.com",
      twoDishVoucher: 0,
    });
    const { identity, verifiedAt } = await createVerifiedPayerEmail(user);
    const request = await VoucherPurchaseRequest.create({
      requestId: "VPR-CORRECTION-DECLINE-1",
      userId: user._id,
      planId: "daily-2dish-6",
      type: "twoDish",
      quantity: 6,
      amount: 152.07,
      finalTotal: 152.07,
      amountCents: 15207,
      imageProof: "https://example.com/proof.jpg",
      referenceNumber: user.email,
      payerEmailIdentityId: identity._id,
      payerEmailVerifiedAt: verifiedAt,
      paymentVerificationStatus: "review",
      status: "pending",
    });
    await requestVoucherPurchaseCorrection({
      kind: "daily",
      requestId: request.requestId,
      reason: "payer_email_mismatch",
      actor: { role: "admin", user: { email: "admin@example.com" } },
    });

    await declineVoucherPurchase({
      kind: "daily",
      requestId: request.requestId,
      reason: "Customer asked us to cancel this request.",
      actor: { role: "admin", user: { email: "admin@example.com" } },
    });

    expect(await VoucherPurchaseRequest.findById(request._id).lean()).toMatchObject({
      status: "declined",
      customerActionRequired: false,
      paymentReviewRequired: false,
      paymentVerificationStatus: "manual",
    });
    expect((await User.findById(user._id).lean() as Record<string, any>)?.twoDishVoucher).toBe(0);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(0);
  });

  it("keeps existing manual WeChat approvals working without an Interac reference", async () => {
    const user = await createTestUser({
      email: "wechat-manual@example.com",
      weeklySIXmeals: 0,
    });
    await CreditPurchaseRequest.create({
      requestId: "CR-REQ-2002",
      userId: user._id,
      planId: "weekly-6x2",
      amount: 219,
      finalTotal: 219,
      amountCents: 21900,
      originalPrice: 219,
      paymentMethod: "wechat",
      imageProof: "https://example.com/wechat-proof.jpg",
      referenceNumber: user.email,
      mealPlanType: "6aweek",
      mealPlanQuantity: 2,
      paymentVerificationStatus: "manual",
      status: "pending",
    });

    await approveVoucherPurchase({
      kind: "weekly",
      requestId: "CR-REQ-2002",
      source: "manual",
    });

    expect((await User.findById(user._id).lean() as Record<string, any>)?.weeklySIXmeals).toBe(2);
    expect(await VoucherApprovalGrant.countDocuments()).toBe(1);
  });
});
