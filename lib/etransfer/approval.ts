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
import InteracPayerEmail from "@/models/InteracPayerEmail";
import InteracReceipt from "@/models/InteracReceipt";
import Transaction from "@/models/Transaction";
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
import { PAYMENT_FIRST_MATCH_WINDOW_MS } from "./payment-intent";

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

async function ensureManualWechatReceipt(
  kind: VoucherRequestKind,
  request: Record<string, any>,
  session: mongoose.ClientSession
) {
  const config = getEtransferAutomationConfig();
  if (kind !== "weekly" || request.paymentMethod !== "wechat") {
    throw new VoucherApprovalError(
      "A verified Interac deposit must be matched before approval",
      "PAYMENT_NOT_FOUND"
    );
  }
  const suppliedReference = `manual-wechat-${request.requestId}`;
  const normalizedReference = `MANUALWECHAT${normalizeInteracReference(request.requestId)}`;
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
        reference: suppliedReference,
        referenceNormalized: normalizedReference,
        gmailMessageId: `manual:${normalizedReference}`,
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
        rawSha256: `manual:${normalizedReference}`,
        parserVersion: "manual",
        authenticationVerified: false,
        status: "unmatched",
      },
    ],
    { session }
  );
  return created[0];
}

async function findVerifiedInteracReceipt(
  kind: VoucherRequestKind,
  request: Record<string, any>,
  session: mongoose.ClientSession
) {
  const config = getEtransferAutomationConfig();
  const mailbox = config.mailbox || config.recipientEmail;

  if (request.matchedPaymentReceiptId) {
    const matched = await InteracReceipt.findOne({
      _id: request.matchedPaymentReceiptId,
      provider: "interac",
      mailbox,
    }).session(session);
    if (!matched) {
      throw new VoucherApprovalError(
        "The matched Interac deposit can no longer be found",
        "PAYMENT_NOT_FOUND"
      );
    }
    return matched;
  }

  const earliestEligibleReceipt = new Date(
    Math.max(
      config.activationAt?.getTime() || 0,
      new Date(request.createdAt).getTime() - PAYMENT_FIRST_MATCH_WINDOW_MS
    )
  );
  const receipts = await InteracReceipt.find({
    provider: "interac",
    mailbox,
    payerEmailNormalized: normalizeEmail(request.referenceNumber || ""),
    amountCents: getRequestAmountCents(request),
    currency: "CAD",
    authenticationVerified: true,
    status: "unmatched",
    receivedAt: { $gte: earliestEligibleReceipt },
  })
    .sort({ receivedAt: 1, referenceNormalized: 1 })
    .limit(2)
    .session(session);

  if (receipts.length === 0) {
    throw new VoucherApprovalError(
      "No verified Interac deposit matches this email and amount yet",
      "PAYMENT_NOT_FOUND"
    );
  }
  if (receipts.length > 1) {
    throw new VoucherApprovalError(
      "More than one Interac deposit matches this request. Leave it pending for payment review",
      "PAYMENT_AMBIGUOUS"
    );
  }

  const competingFilter = {
    status: "pending",
    payerEmailIdentityId: request.payerEmailIdentityId,
    amountCents: getRequestAmountCents(request),
    createdAt: {
      $gte: earliestEligibleReceipt,
      $lte: new Date(new Date(receipts[0].receivedAt).getTime() + PAYMENT_FIRST_MATCH_WINDOW_MS),
    },
  };
  const [dailyMatches, weeklyMatches] = await Promise.all([
    VoucherPurchaseRequest.countDocuments(competingFilter).session(session),
    CreditPurchaseRequest.countDocuments({
      ...competingFilter,
      paymentMethod: "emt",
    }).session(session),
  ]);
  if (dailyMatches + weeklyMatches !== 1) {
    throw new VoucherApprovalError(
      "More than one open voucher request matches this deposit. Leave it pending for duplicate review",
      "PAYMENT_AMBIGUOUS"
    );
  }

  return receipts[0];
}

function assertReceiptMatchesRequest(
  kind: VoucherRequestKind,
  request: Record<string, any>,
  receipt: Record<string, any>,
  options?: { allowPayerEmailMismatch?: boolean }
) {
  const isEtransfer = kind === "daily" || request.paymentMethod !== "wechat";
  if (receipt.status === "conflict") {
    throw new VoucherApprovalError("Payment receipt has conflicting evidence", "PAYMENT_CONFLICT");
  }
  if (isEtransfer && !receipt.authenticationVerified) {
    throw new VoucherApprovalError("Payment receipt is not cryptographically verified", "UNVERIFIED_PAYMENT");
  }
  if (
    !options?.allowPayerEmailMismatch &&
    receipt.payerEmailNormalized !== normalizeEmail(request.referenceNumber)
  ) {
    throw new VoucherApprovalError("Payment sender email does not match request", "PAYMENT_MISMATCH");
  }
  if (receipt.amountCents !== getRequestAmountCents(request) || receipt.currency !== "CAD") {
    throw new VoucherApprovalError("Payment amount or currency does not match request", "PAYMENT_MISMATCH");
  }
}

async function findManualPaymentOverrideReceipt(
  request: Record<string, any>,
  session: mongoose.ClientSession
) {
  const config = getEtransferAutomationConfig();
  const mailbox = config.mailbox || config.recipientEmail;
  const earliestEligibleReceipt = new Date(
    Math.max(
      config.activationAt?.getTime() || 0,
      new Date(request.createdAt).getTime() - PAYMENT_FIRST_MATCH_WINDOW_MS
    )
  );
  const receipts = await InteracReceipt.find({
    provider: "interac",
    mailbox,
    amountCents: getRequestAmountCents(request),
    currency: "CAD",
    authenticationVerified: true,
    status: "unmatched",
    receivedAt: { $gte: earliestEligibleReceipt },
  })
    .sort({ receivedAt: 1, referenceNormalized: 1 })
    .limit(2)
    .session(session);

  if (receipts.length === 0) {
    throw new VoucherApprovalError(
      "No authenticated exact-amount Interac deposit is available for this override",
      "MANUAL_OVERRIDE_PAYMENT_NOT_FOUND"
    );
  }
  if (receipts.length > 1) {
    throw new VoucherApprovalError(
      "More than one authenticated exact-amount deposit could fund this request; do not guess",
      "MANUAL_OVERRIDE_PAYMENT_AMBIGUOUS"
    );
  }
  return receipts[0];
}

async function assertManualOverrideReceiptIsNotAnotherRequestMatch(
  kind: VoucherRequestKind,
  request: Record<string, any>,
  receipt: Record<string, any>,
  session: mongoose.ClientSession
) {
  const config = getEtransferAutomationConfig();
  const latestRequestTime = new Date(
    new Date(receipt.receivedAt).getTime() + PAYMENT_FIRST_MATCH_WINDOW_MS
  );
  const receiptIdentity = await InteracPayerEmail.findOne({
    emailNormalized: receipt.payerEmailNormalized,
    status: "verified",
  }).session(session);
  if (!receiptIdentity) return;
  const competingFilter = {
    status: "pending",
    amountCents: receipt.amountCents,
    payerEmailIdentityId: receiptIdentity._id,
    createdAt: {
      $gte: config.activationAt || new Date(0),
      $lte: latestRequestTime,
    },
  };
  const [dailyMatches, weeklyMatches] = await Promise.all([
    VoucherPurchaseRequest.find(competingFilter, { requestId: 1 }).session(session).lean(),
    CreditPurchaseRequest.find(
      { ...competingFilter, paymentMethod: "emt" },
      { requestId: 1 }
    ).session(session).lean(),
  ]);
  const currentKey = requestKey(kind, request.requestId);
  const competingKeys = [
    ...dailyMatches.map((candidate) => requestKey("daily", String(candidate.requestId))),
    ...weeklyMatches.map((candidate) => requestKey("weekly", String(candidate.requestId))),
  ].filter((candidateKey) => candidateKey !== currentKey);

  if (competingKeys.length > 0) {
    throw new VoucherApprovalError(
      "This deposit matches another open request by sender email and amount; resolve that request first",
      "MANUAL_OVERRIDE_PAYMENT_BELONGS_TO_ANOTHER_REQUEST"
    );
  }
}

export async function approveVoucherPurchase(options: {
  kind: VoucherRequestKind;
  requestId: string;
  source: ApprovalSource;
  receiptId?: string;
  actor?: { user?: { _id?: unknown; email?: string }; role?: "admin" | "user" } | null;
  adminNotes?: string;
  manualPaymentOverride?: boolean;
}) {
  const manualPaymentOverride = options.manualPaymentOverride === true;
  if (manualPaymentOverride) {
    if (options.source !== "manual" || options.actor?.role !== "admin") {
      throw new VoucherApprovalError(
        "Only an authenticated administrator can use the payment override",
        "MANUAL_OVERRIDE_FORBIDDEN",
        403
      );
    }
    if (!options.adminNotes || options.adminNotes.trim().length < 10) {
      throw new VoucherApprovalError(
        "Explain how you verified the deposit before approving",
        "MANUAL_OVERRIDE_REASON_REQUIRED"
      );
    }
  }
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
      const isEtransfer = options.kind === "daily" || requestObject.paymentMethod !== "wechat";
      if (manualPaymentOverride && !isEtransfer) {
        throw new VoucherApprovalError(
          "The Interac payment override cannot be used for a WeChat request",
          "MANUAL_OVERRIDE_NOT_AVAILABLE"
        );
      }
      if (isEtransfer && !manualPaymentOverride) {
        const linkedEmail = requestObject.payerEmailIdentityId
          ? await InteracPayerEmail.findOne({
              _id: requestObject.payerEmailIdentityId,
              userId: purchaseRequest.userId,
              emailNormalized: normalizeEmail(requestObject.referenceNumber || ""),
              status: "verified",
            }).session(session)
          : null;
        if (!linkedEmail) {
          throw new VoucherApprovalError(
            "The customer's Interac email must be verified before this request can be approved",
            "PAYER_EMAIL_NOT_VERIFIED"
          );
        }
      }
      let receipt = options.receiptId
        ? await InteracReceipt.findById(options.receiptId).session(session)
        : null;
      if (!receipt && options.source === "manual") {
        receipt = manualPaymentOverride
          ? await findManualPaymentOverrideReceipt(requestObject, session)
          : options.kind === "weekly" && requestObject.paymentMethod === "wechat"
            ? await ensureManualWechatReceipt(options.kind, requestObject, session)
            : await findVerifiedInteracReceipt(options.kind, requestObject, session);
      }
      if (!receipt) {
        throw new VoucherApprovalError("Verified payment receipt not found", "PAYMENT_NOT_FOUND");
      }
      assertReceiptMatchesRequest(options.kind, requestObject, receipt.toObject(), {
        allowPayerEmailMismatch: manualPaymentOverride,
      });
      if (manualPaymentOverride) {
        await assertManualOverrideReceiptIsNotAnotherRequestMatch(
          options.kind,
          requestObject,
          receipt.toObject(),
          session
        );
      }

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
      purchaseRequest.paymentVerificationStatus = manualPaymentOverride ? "manual" : "matched";
      purchaseRequest.paymentReviewRequired = false;
      purchaseRequest.customerActionRequired = false;
      purchaseRequest.matchedPaymentReceiptId = claimed._id;
      if (options.kind === "daily" || requestObject.paymentMethod !== "wechat") {
        purchaseRequest.interacReference = claimed.reference;
        purchaseRequest.interacReferenceNormalized = claimed.referenceNormalized;
      }
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
            action: manualPaymentOverride
              ? "voucher-request.manual-payment-override-approved"
              : "voucher-request.approved",
            targetType: "voucher-request",
            targetId: options.requestId,
            metadata: {
              source: options.source,
              manualPaymentOverride,
              requestKind: options.kind,
              paymentReference: claimed.referenceNormalized,
              receiptEmailMatches:
                claimed.payerEmailNormalized === normalizeEmail(requestObject.referenceNumber || ""),
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

const MANUAL_OVERRIDE_RECEIPT_WINDOW_MS = 24 * 60 * 60_000;

function isExactManualBalanceAdd(
  event: Record<string, any>,
  field: string,
  amount: number
) {
  const metadata = (event.metadata || {}) as Record<string, any>;
  const mutations = Array.isArray(metadata.mutations) ? metadata.mutations : [];
  return (
    metadata.source === "admin-update-balance" &&
    typeof metadata.transactionId === "string" &&
    metadata.transactionId.length > 0 &&
    mutations.length === 1 &&
    mutations[0]?.field === field &&
    Number(mutations[0]?.amount) === amount &&
    mutations[0]?.operation === "add"
  );
}

/**
 * Close a request after an administrator has already added its exact entitlement
 * through the balance screen. This consumes one authenticated exact-amount
 * receipt but deliberately performs no balance mutation, preventing a double grant.
 */
export async function resolveManuallyFulfilledVoucherPurchase(options: {
  kind: VoucherRequestKind;
  requestId: string;
  actor: { user?: { _id?: unknown; email?: string }; role?: "admin" | "user" };
  adminNotes: string;
}) {
  const notes = options.adminNotes.trim();
  if (notes.length < 10) {
    throw new VoucherApprovalError(
      "Explain how the payment was verified before closing an already fulfilled request",
      "MANUAL_OVERRIDE_REASON_REQUIRED"
    );
  }

  const RequestModel = modelFor(options.kind);
  const reqKey = requestKey(options.kind, options.requestId);
  const session = await mongoose.startSession();
  let result: { request: any; alreadyApproved: boolean } | null = null;

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
      const entitlement = getEntitlement(options.kind, requestObject, "manual");
      const config = getEtransferAutomationConfig();
      const mailbox = config.mailbox || config.recipientEmail;
      const requestCreatedAt = new Date(requestObject.createdAt);
      const receiptCandidates = await InteracReceipt.find({
        provider: "interac",
        mailbox,
        amountCents: getRequestAmountCents(requestObject),
        currency: "CAD",
        authenticationVerified: true,
        status: "unmatched",
        receivedAt: {
          $gte: new Date(requestCreatedAt.getTime() - MANUAL_OVERRIDE_RECEIPT_WINDOW_MS),
          $lte: new Date(requestCreatedAt.getTime() + MANUAL_OVERRIDE_RECEIPT_WINDOW_MS),
        },
      })
        .sort({ receivedAt: 1, referenceNormalized: 1 })
        .limit(2)
        .session(session);

      if (receiptCandidates.length === 0) {
        throw new VoucherApprovalError(
          "No authenticated exact-amount deposit is available for this manual resolution",
          "MANUAL_OVERRIDE_PAYMENT_NOT_FOUND"
        );
      }
      if (receiptCandidates.length > 1) {
        throw new VoucherApprovalError(
          "More than one authenticated exact-amount deposit could fund this request; do not guess",
          "MANUAL_OVERRIDE_PAYMENT_AMBIGUOUS"
        );
      }

      const balanceEvents = await AuditLog.find({
        action: "balance.add",
        targetId: String(purchaseRequest.userId),
        createdAt: { $gte: requestCreatedAt },
      })
        .sort({ createdAt: 1, _id: 1 })
        .session(session)
        .lean();
      const matchingBalanceEvents = balanceEvents.filter((event) =>
        isExactManualBalanceAdd(
          event as Record<string, any>,
          entitlement.mutation.field,
          entitlement.mutation.amount
        )
      );
      const unusedBalanceEvents: Record<string, any>[] = [];
      for (const event of matchingBalanceEvents) {
        const transactionId = String((event.metadata as Record<string, any>).transactionId);
        const alreadyUsed = await VoucherApprovalGrant.exists({ balanceTransactionId: transactionId })
          .session(session);
        if (!alreadyUsed) unusedBalanceEvents.push(event as Record<string, any>);
      }

      if (unusedBalanceEvents.length === 0) {
        throw new VoucherApprovalError(
          "The exact vouchers have not been recorded as a manual balance addition yet",
          "MANUAL_OVERRIDE_BALANCE_NOT_FOUND"
        );
      }
      if (unusedBalanceEvents.length > 1) {
        throw new VoucherApprovalError(
          "More than one manual balance addition could satisfy this request; review the account history",
          "MANUAL_OVERRIDE_BALANCE_AMBIGUOUS"
        );
      }

      const balanceEvent = unusedBalanceEvents[0];
      const balanceTransactionId = String(
        (balanceEvent.metadata as Record<string, any>).transactionId
      );
      const balanceTransaction = await Transaction.findOne({
        transactionId: balanceTransactionId,
        userId: purchaseRequest.userId,
        type: "Add",
        amount: entitlement.mutation.amount,
      }).session(session);
      if (!balanceTransaction) {
        throw new VoucherApprovalError(
          "The manual balance accounting record could not be verified",
          "MANUAL_OVERRIDE_BALANCE_NOT_FOUND"
        );
      }

      const receipt = receiptCandidates[0];
      const claimed = await InteracReceipt.findOneAndUpdate(
        {
          _id: receipt._id,
          status: "unmatched",
          allocatedRequestKey: { $exists: false },
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
        throw new VoucherApprovalError(
          "Payment was claimed concurrently",
          "PAYMENT_ALREADY_USED"
        );
      }

      const user = await User.findById(purchaseRequest.userId).session(session);
      if (!user) {
        throw new VoucherApprovalError("User not found", "USER_NOT_FOUND", 404);
      }

      const now = new Date();
      purchaseRequest.status = "approved";
      purchaseRequest.approvedAt = now;
      purchaseRequest.adminNotes = notes;
      purchaseRequest.approvalSource = "manual";
      purchaseRequest.paymentVerificationStatus = "manual";
      purchaseRequest.paymentReviewRequired = false;
      purchaseRequest.customerActionRequired = false;
      purchaseRequest.matchedPaymentReceiptId = claimed._id;
      purchaseRequest.interacReference = claimed.reference;
      purchaseRequest.interacReferenceNormalized = claimed.referenceNormalized;
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
            userId: purchaseRequest.userId,
            paymentKey: `${claimed.mailbox}:${claimed.referenceNormalized}`,
            paymentReceiptId: claimed._id,
            planId: entitlement.planId,
            entitlementField: entitlement.mutation.field,
            entitlementAmount: entitlement.mutation.amount,
            amountCents: claimed.amountCents,
            balanceTransactionId,
            approvalSource: "manual",
          },
        ],
        { session }
      );

      await AuditLog.create(
        [
          {
            actorUserId: options.actor.user?._id,
            actorRole: options.actor.role || "admin",
            actorEmail: options.actor.user?.email,
            action: "voucher-request.manual-override-resolved",
            targetType: "voucher-request",
            targetId: options.requestId,
            metadata: {
              source: "already-fulfilled-human-override",
              requestKind: options.kind,
              reason: notes,
              receiptId: String(claimed._id),
              receiptEmailMatches:
                claimed.payerEmailNormalized === normalizeEmail(requestObject.referenceNumber),
              amountCents: claimed.amountCents,
              balanceTransactionId,
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
            adminNotes: notes,
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
    throw new VoucherApprovalError(
      "Manual resolution did not complete",
      "MANUAL_OVERRIDE_FAILED",
      500
    );
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
      purchaseRequest.paymentReviewRequired = false;
      purchaseRequest.customerActionRequired = false;
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
