import mongoose from "mongoose";

import { applyBalanceMutations, type BalanceMutationEntry } from "@/lib/balances/mutations";
import { getLegacyWeeklyBalanceField } from "@/lib/plans/balances";
import {
  getDailyPlanBy,
  getDailyPlanById,
  getWeeklyPlanBy,
  getWeeklyPlanById,
} from "@/lib/plans/service";
import AuditLog from "@/models/AuditLog";
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import InteracReceipt from "@/models/InteracReceipt";
import User from "@/models/User";
import VoucherApprovalGrant from "@/models/VoucherApprovalGrant";
import VoucherApprovalNotification from "@/models/VoucherApprovalNotification";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";

import {
  getEtransferAutomationConfig,
  moneyToCents,
  normalizeEmail,
  normalizeInteracReference,
} from "./config";

export type VoucherRequestKind = "daily" | "weekly";
export type ApprovalSource = "automatic" | "manual";

const FINANCIAL_TRANSACTION_OPTIONS = {
  readConcern: { level: "snapshot" as const },
  writeConcern: { w: "majority" as const },
  readPreference: "primary" as const,
};

export class VoucherApprovalError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "VoucherApprovalError";
    this.code = code;
    this.status = status;
  }
}

function modelFor(kind: VoucherRequestKind): mongoose.Model<any> {
  return (kind === "daily" ? VoucherPurchaseRequest : CreditPurchaseRequest) as mongoose.Model<any>;
}

function requestKey(kind: VoucherRequestKind, requestId: string) {
  return `${kind}:${requestId}`;
}

function getRequestAmountCents(request: Record<string, any>) {
  return request.amountCents || moneyToCents(Number(request.finalTotal || request.amount));
}

function getEntitlement(
  kind: VoucherRequestKind,
  request: Record<string, any>,
  source: ApprovalSource
) {
  if (kind === "daily") {
    const plan = request.planId
      ? getDailyPlanById(request.planId)
      : source === "manual"
        ? getDailyPlanBy(request.type, Number(request.quantity))
        : null;
    if (!plan || plan.dishType !== request.type || plan.credits !== Number(request.quantity)) {
      throw new VoucherApprovalError(
        "Saved daily request does not match an active server plan",
        "INVALID_SAVED_PLAN"
      );
    }
    return {
      planId: plan.id,
      mutation: {
        field: plan.dishType === "twoDish" ? "twoDishVoucher" : "threeDishVoucher",
        amount: plan.credits,
        operation: "add",
      } as BalanceMutationEntry,
      weeklyFields: null,
    };
  }

  const legacyMealsPerWeek = Number(String(request.mealPlanType || "").replace("aweek", ""));
  const plan = request.planId
    ? getWeeklyPlanById(request.planId)
    : source === "manual"
      ? getWeeklyPlanBy(legacyMealsPerWeek, Number(request.mealPlanQuantity))
      : null;
  const expectedMealType = plan ? `${plan.mealsPerWeek}aweek` : "";
  if (
    !plan ||
    request.mealPlanType !== expectedMealType ||
    Number(request.mealPlanQuantity) !== plan.weeks
  ) {
    throw new VoucherApprovalError(
      "Saved weekly request does not match an active server plan",
      "INVALID_SAVED_PLAN"
    );
  }
  const field = getLegacyWeeklyBalanceField(plan.mealsPerWeek);
  if (!field) {
    throw new VoucherApprovalError("Weekly plan has no supported balance field", "INVALID_SAVED_PLAN");
  }
  return {
    planId: plan.id,
    mutation: { field, amount: plan.weeks, operation: "add" } as BalanceMutationEntry,
    weeklyFields: {
      approvedSixMeals: plan.mealsPerWeek === 6 ? plan.weeks : 0,
      approvedEightMeals: plan.mealsPerWeek === 8 ? plan.weeks : 0,
      approvedTenMeals: plan.mealsPerWeek === 10 ? plan.weeks : 0,
      approvedTwelveMeals: plan.mealsPerWeek === 12 ? plan.weeks : 0,
      approvedSixteenMeals: plan.mealsPerWeek === 16 ? plan.weeks : 0,
      approvedCredits: 0,
      approvedPlans: [{ planId: `weekly-${plan.mealsPerWeek}x1`, quantity: plan.weeks }],
    },
  };
}

async function ensureManualReceipt(
  kind: VoucherRequestKind,
  request: Record<string, any>,
  session: mongoose.ClientSession
) {
  const config = getEtransferAutomationConfig();
  const normalizedReference = request.interacReferenceNormalized ||
    normalizeInteracReference(request.interacReference || "") ||
    `LEGACY${kind.toUpperCase()}${normalizeInteracReference(request.requestId)}`;
  const existing = await InteracReceipt.findOne({
    provider: "interac",
    mailbox: config.recipientEmail,
    referenceNormalized: normalizedReference,
  }).session(session);
  if (existing) return existing;

  const created = await InteracReceipt.create(
    [
      {
        provider: "interac",
        mailbox: config.recipientEmail,
        reference: request.interacReference || normalizedReference,
        referenceNormalized: normalizedReference,
        gmailMessageId: `manual:${kind}:${request.requestId}`,
        imapUid: 0,
        uidValidity: "manual",
        payerEmail: request.referenceNumber,
        payerEmailNormalized: normalizeEmail(request.referenceNumber),
        senderName: "Manually verified by administrator",
        recipientEmail: config.recipientEmail,
        amountCents: getRequestAmountCents(request),
        currency: "CAD",
        depositedAt: new Date(),
        receivedAt: new Date(),
        subject: "Manual payment verification",
        rawSha256: `manual:${kind}:${request.requestId}`,
        parserVersion: "manual",
        authenticationVerified: false,
        status: "unmatched",
      },
    ],
    { session }
  );
  return created[0];
}

function assertReceiptMatchesRequest(
  request: Record<string, any>,
  receipt: Record<string, any>,
  source: ApprovalSource
) {
  if (receipt.status === "conflict") {
    throw new VoucherApprovalError("Payment receipt has conflicting evidence", "PAYMENT_CONFLICT");
  }
  if (source === "automatic" && !receipt.authenticationVerified) {
    throw new VoucherApprovalError("Payment receipt is not cryptographically verified", "UNVERIFIED_PAYMENT");
  }
  if (
    !(source === "manual" && !request.interacReferenceNormalized) &&
    receipt.referenceNormalized !== request.interacReferenceNormalized
  ) {
    throw new VoucherApprovalError("Payment reference does not match request", "PAYMENT_MISMATCH");
  }
  if (receipt.payerEmailNormalized !== normalizeEmail(request.referenceNumber)) {
    throw new VoucherApprovalError("Payment sender email does not match request", "PAYMENT_MISMATCH");
  }
  if (receipt.amountCents !== getRequestAmountCents(request) || receipt.currency !== "CAD") {
    throw new VoucherApprovalError("Payment amount or currency does not match request", "PAYMENT_MISMATCH");
  }
}

export async function approveVoucherPurchase(options: {
  kind: VoucherRequestKind;
  requestId: string;
  source: ApprovalSource;
  receiptId?: string;
  actor?: { user?: { _id?: unknown; email?: string }; role?: "admin" | "user" } | null;
  adminNotes?: string;
}) {
  const RequestModel = modelFor(options.kind);
  const reqKey = requestKey(options.kind, options.requestId);
  let result: { request: any; alreadyApproved: boolean } | null = null;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const existingGrant = await VoucherApprovalGrant.findOne({ requestKey: reqKey }).session(session);
      if (existingGrant) {
        const existingRequest = await RequestModel.findOne({ requestId: options.requestId }).session(session);
        result = { request: existingRequest, alreadyApproved: true };
        return;
      }

      const purchaseRequest = await RequestModel.findOne({ requestId: options.requestId }).session(session);
      if (!purchaseRequest) {
        throw new VoucherApprovalError("Voucher purchase request not found", "REQUEST_NOT_FOUND", 404);
      }
      if (purchaseRequest.status !== "pending") {
        throw new VoucherApprovalError(
          `Request is already ${purchaseRequest.status}`,
          "REQUEST_ALREADY_PROCESSED"
        );
      }

      const requestObject = purchaseRequest.toObject() as Record<string, any>;
      const entitlement = getEntitlement(options.kind, requestObject, options.source);
      let receipt = options.receiptId
        ? await InteracReceipt.findById(options.receiptId).session(session)
        : null;
      if (!receipt && options.source === "manual") {
        receipt = await ensureManualReceipt(options.kind, requestObject, session);
      }
      if (!receipt) {
        throw new VoucherApprovalError("Verified payment receipt not found", "PAYMENT_NOT_FOUND");
      }
      assertReceiptMatchesRequest(requestObject, receipt.toObject(), options.source);

      if (receipt.allocatedRequestKey && receipt.allocatedRequestKey !== reqKey) {
        throw new VoucherApprovalError("Payment was already used for another request", "PAYMENT_ALREADY_USED");
      }

      const claimed = await InteracReceipt.findOneAndUpdate(
        {
          _id: receipt._id,
          $or: [{ allocatedRequestKey: { $exists: false } }, { allocatedRequestKey: reqKey }],
          status: { $ne: "conflict" },
        },
        {
          $set: {
            status: "allocated",
            allocatedRequestKey: reqKey,
            allocatedRequestId: options.requestId,
            allocatedRequestKind: options.kind,
            allocatedUserId: purchaseRequest.userId,
            allocatedAt: new Date(),
          },
        },
        { new: true, session }
      );
      if (!claimed) {
        throw new VoucherApprovalError("Payment was claimed concurrently", "PAYMENT_ALREADY_USED");
      }

      const user = await User.findById(purchaseRequest.userId).session(session);
      if (!user) {
        throw new VoucherApprovalError("User not found", "USER_NOT_FOUND", 404);
      }
      const balanceResult = await applyBalanceMutations({
        user,
        mutations: [entitlement.mutation],
        description: `Voucher purchase approved (Request ID: ${options.requestId})`,
        session,
      });
      if (!balanceResult.transaction) {
        throw new VoucherApprovalError("Accounting record was not created", "ACCOUNTING_FAILED", 500);
      }

      const now = new Date();
      purchaseRequest.status = "approved";
      purchaseRequest.approvedAt = now;
      purchaseRequest.adminNotes = options.adminNotes ||
        (options.source === "automatic" ? "Automatically approved from verified Interac deposit" : "");
      purchaseRequest.approvalSource = options.source;
      purchaseRequest.paymentVerificationStatus = "matched";
      purchaseRequest.matchedPaymentReceiptId = claimed._id;
      purchaseRequest.nextPaymentCheckAt = undefined;
      purchaseRequest.paymentCheckError = undefined;
      if (options.kind === "weekly" && entitlement.weeklyFields) {
        Object.assign(purchaseRequest, entitlement.weeklyFields);
      }
      await purchaseRequest.save({ session });

      await VoucherApprovalGrant.create(
        [
          {
            requestKey: reqKey,
            requestId: options.requestId,
            requestKind: options.kind,
            userId: user._id,
            paymentKey: `${claimed.mailbox}:${claimed.referenceNormalized}`,
            paymentReceiptId: claimed._id,
            planId: entitlement.planId,
            entitlementField: entitlement.mutation.field,
            entitlementAmount: entitlement.mutation.amount,
            amountCents: claimed.amountCents,
            balanceTransactionId: balanceResult.transaction.transactionId,
            approvalSource: options.source,
          },
        ],
        { session }
      );

      await AuditLog.create(
        [
          {
            actorUserId: options.actor?.user?._id,
            actorRole: options.actor?.role || "system",
            actorEmail: options.actor?.user?.email,
            action: "voucher-request.approved",
            targetType: "voucher-request",
            targetId: options.requestId,
            metadata: {
              source: options.source,
              requestKind: options.kind,
              paymentReference: claimed.referenceNormalized,
              amountCents: claimed.amountCents,
              balanceTransactionId: balanceResult.transaction.transactionId,
              entitlement: entitlement.mutation,
            },
          },
        ],
        { session }
      );

      await VoucherApprovalNotification.create(
        [
          {
            eventKey: `${reqKey}:approved`,
            requestKey: reqKey,
            requestId: options.requestId,
            requestKind: options.kind,
            status: "approved",
            recipientEmail: user.email,
            recipientName: user.name || user.userID,
            language: user.languagePreference || "zh",
            planDescription: requestObject.planDescription,
            voucherType: requestObject.type,
            quantity: requestObject.quantity,
            adminNotes: purchaseRequest.adminNotes,
            deliveryStatus: "pending",
            attempts: 0,
            nextAttemptAt: now,
          },
        ],
        { session }
      );

      result = { request: purchaseRequest, alreadyApproved: false };
    }, FINANCIAL_TRANSACTION_OPTIONS);
  } finally {
    await session.endSession();
  }

  const finalResult = result as { request: any; alreadyApproved: boolean } | null;
  if (!finalResult) {
    throw new VoucherApprovalError("Approval did not complete", "APPROVAL_FAILED", 500);
  }
  return finalResult;
}

export async function declineVoucherPurchase(options: {
  kind: VoucherRequestKind;
  requestId: string;
  reason: string;
  duplicateOfRequestId?: string;
  actor?: { user?: { _id?: unknown; email?: string }; role?: "admin" | "user" } | null;
}) {
  const RequestModel = modelFor(options.kind);
  const reqKey = requestKey(options.kind, options.requestId);
  const session = await mongoose.startSession();
  let declined: any = null;
  try {
    await session.withTransaction(async () => {
      const purchaseRequest = await RequestModel.findOne({ requestId: options.requestId }).session(session);
      if (!purchaseRequest) {
        throw new VoucherApprovalError("Voucher purchase request not found", "REQUEST_NOT_FOUND", 404);
      }
      if (purchaseRequest.status !== "pending") {
        throw new VoucherApprovalError(
          `Request is already ${purchaseRequest.status}`,
          "REQUEST_ALREADY_PROCESSED"
        );
      }
      const user = await User.findById(purchaseRequest.userId).session(session);
      if (!user) throw new VoucherApprovalError("User not found", "USER_NOT_FOUND", 404);

      purchaseRequest.status = "declined";
      purchaseRequest.declinedAt = new Date();
      purchaseRequest.adminNotes = options.reason;
      purchaseRequest.duplicateOfRequestId = options.duplicateOfRequestId;
      purchaseRequest.paymentVerificationStatus = options.duplicateOfRequestId ? "duplicate" : "manual";
      purchaseRequest.nextPaymentCheckAt = undefined;
      await purchaseRequest.save({ session });

      await AuditLog.create(
        [
          {
            actorUserId: options.actor?.user?._id,
            actorRole: options.actor?.role || "system",
            actorEmail: options.actor?.user?.email,
            action: options.duplicateOfRequestId
              ? "voucher-request.duplicate-declined"
              : "voucher-request.declined",
            targetType: "voucher-request",
            targetId: options.requestId,
            metadata: {
              requestKind: options.kind,
              reason: options.reason,
              duplicateOfRequestId: options.duplicateOfRequestId,
            },
          },
        ],
        { session }
      );

      await VoucherApprovalNotification.create(
        [
          {
            eventKey: `${reqKey}:declined`,
            requestKey: reqKey,
            requestId: options.requestId,
            requestKind: options.kind,
            status: "declined",
            recipientEmail: user.email,
            recipientName: user.name || user.userID,
            language: user.languagePreference || "zh",
            planDescription: purchaseRequest.planDescription,
            voucherType: purchaseRequest.type,
            quantity: purchaseRequest.quantity,
            adminNotes: options.reason,
            deliveryStatus: "pending",
            attempts: 0,
            nextAttemptAt: new Date(),
          },
        ],
        { session }
      );
      declined = purchaseRequest;
    }, FINANCIAL_TRANSACTION_OPTIONS);
  } finally {
    await session.endSession();
  }
  return declined;
}
