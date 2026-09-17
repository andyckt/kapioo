import { approveVoucherPurchase } from "@/lib/etransfer/approval";
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
    expect(reloadedUser?.twoDishVoucher).toBe(6);
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
