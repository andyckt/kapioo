import mongoose, { type Model } from "mongoose";

import AuditLog from "@/models/AuditLog";
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import InteracPayerEmail from "@/models/InteracPayerEmail";
import User from "@/models/User";
import VoucherApprovalNotification from "@/models/VoucherApprovalNotification";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";

import { getEtransferAutomationConfig, moneyToCents, normalizeEmail } from "./config";
import { VoucherApprovalError, type VoucherRequestKind } from "./approval";

export type PaymentCorrectionReason =
  | "payer_email_mismatch"
  | "payment_not_found"
  | "amount_mismatch"
  | "other";

type Actor = {
  user?: { _id?: unknown; email?: string };
  role?: "admin" | "user";
};

function modelFor(kind: VoucherRequestKind): Model<any> {
  return (kind === "daily" ? VoucherPurchaseRequest : CreditPurchaseRequest) as Model<any>;
}

function requestKey(kind: VoucherRequestKind, requestId: string) {
  return `${kind}:${requestId}`;
}

function assertEtransferRequest(kind: VoucherRequestKind, request: Record<string, any>) {
  if (kind === "weekly" && request.paymentMethod !== "emt") {
    throw new VoucherApprovalError(
      "Customer payment correction is only available for Interac e-Transfer requests",
      "CORRECTION_NOT_AVAILABLE"
    );
  }
}

export async function requestVoucherPurchaseCorrection(options: {
  kind: VoucherRequestKind;
  requestId: string;
  reason: PaymentCorrectionReason;
  message?: string;
  actor: Actor;
}) {
  const message = String(options.message || "").trim();
  if (options.reason === "other" && message.length < 5) {
    throw new VoucherApprovalError(
      "Add a short explanation for the customer",
      "CORRECTION_MESSAGE_REQUIRED"
    );
  }

  const RequestModel = modelFor(options.kind);
  const session = await mongoose.startSession();
  let result: any = null;

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

      const requestObject = purchaseRequest.toObject() as Record<string, any>;
      assertEtransferRequest(options.kind, requestObject);
      if (requestObject.paymentVerificationStatus === "matched") {
        throw new VoucherApprovalError(
          "This request already has a verified payment match and does not need customer correction",
          "CORRECTION_NOT_AVAILABLE"
        );
      }
      const config = getEtransferAutomationConfig();
      if (!config.activationAt || new Date(requestObject.createdAt) < config.activationAt) {
        throw new VoucherApprovalError(
          "This older request cannot be returned to automatic payment review",
          "CORRECTION_NOT_AVAILABLE"
        );
      }

      const user = await User.findById(purchaseRequest.userId).session(session);
      if (!user) throw new VoucherApprovalError("User not found", "USER_NOT_FOUND", 404);

      const now = new Date();
      const version = Number(purchaseRequest.customerCorrectionVersion || 0) + 1;
      purchaseRequest.customerActionRequired = true;
      purchaseRequest.customerFeedbackReason = options.reason;
      purchaseRequest.customerFeedbackMessage = message || undefined;
      purchaseRequest.customerFeedbackAt = now;
      purchaseRequest.customerCorrectionVersion = version;
      purchaseRequest.paymentVerificationStatus = "review";
      purchaseRequest.paymentReviewRequired = true;
      purchaseRequest.paymentCheckError = "Waiting for the customer to correct payment information";
      purchaseRequest.nextPaymentCheckAt = undefined;
      await purchaseRequest.save({ session });

      await AuditLog.create(
        [
          {
            actorUserId: options.actor.user?._id,
            actorRole: options.actor.role || "admin",
            actorEmail: options.actor.user?.email,
            action: "voucher-request.customer-correction-requested",
            targetType: "voucher-request",
            targetId: options.requestId,
            metadata: {
              requestKind: options.kind,
              reason: options.reason,
              message,
              correctionVersion: version,
            },
          },
        ],
        { session }
      );

      const reqKey = requestKey(options.kind, options.requestId);
      await VoucherApprovalNotification.create(
        [
          {
            eventKey: `${reqKey}:correction-required:${version}`,
            requestKey: reqKey,
            requestId: options.requestId,
            requestKind: options.kind,
            status: "correction_required",
            recipientEmail: user.email,
            recipientName: user.name || user.userID,
            language: user.languagePreference || "zh",
            planDescription: requestObject.planDescription,
            voucherType: requestObject.type,
            quantity: requestObject.quantity,
            feedbackReason: options.reason,
            feedbackMessage: message,
            deliveryStatus: "pending",
            attempts: 0,
            nextAttemptAt: now,
          },
        ],
        { session }
      );

      result = purchaseRequest;
    });
  } finally {
    await session.endSession();
  }

  return result;
}

export async function correctVoucherPurchasePayerEmail(options: {
  kind: VoucherRequestKind;
  requestId: string;
  payerEmail: string;
  actor: Actor;
}) {
  const RequestModel = modelFor(options.kind);
  const session = await mongoose.startSession();
  let result: any = null;

  try {
    await session.withTransaction(async () => {
      const purchaseRequest = await RequestModel.findOne({ requestId: options.requestId }).session(session);
      if (!purchaseRequest) {
        throw new VoucherApprovalError("Voucher purchase request not found", "REQUEST_NOT_FOUND", 404);
      }
      if (String(purchaseRequest.userId) !== String(options.actor.user?._id)) {
        throw new VoucherApprovalError("You do not have access to this request", "FORBIDDEN", 403);
      }
      if (purchaseRequest.status !== "pending" || purchaseRequest.customerActionRequired !== true) {
        throw new VoucherApprovalError(
          "This request is not waiting for a customer correction",
          "CORRECTION_NOT_AVAILABLE"
        );
      }

      const requestObject = purchaseRequest.toObject() as Record<string, any>;
      assertEtransferRequest(options.kind, requestObject);
      const emailNormalized = normalizeEmail(options.payerEmail);
      const identity = await InteracPayerEmail.findOne({
        userId: purchaseRequest.userId,
        emailNormalized,
        status: "verified",
      }).session(session);
      if (!identity) {
        throw new VoucherApprovalError(
          "Verify this Interac sender email before resubmitting",
          "PAYER_EMAIL_NOT_VERIFIED"
        );
      }

      const now = new Date();
      purchaseRequest.referenceNumber = identity.emailNormalized;
      purchaseRequest.payerEmailIdentityId = identity._id;
      purchaseRequest.payerEmailVerifiedAt = identity.verifiedAt || now;
      purchaseRequest.amountCents =
        requestObject.amountCents || moneyToCents(Number(requestObject.finalTotal || requestObject.amount));
      purchaseRequest.customerActionRequired = false;
      purchaseRequest.customerCorrectedAt = now;
      purchaseRequest.paymentVerificationStatus = "pending";
      purchaseRequest.paymentReviewRequired = false;
      purchaseRequest.nextPaymentCheckAt = now;
      purchaseRequest.lastPaymentCheckedAt = undefined;
      purchaseRequest.paymentCheckError = undefined;
      purchaseRequest.matchedPaymentReceiptId = undefined;
      purchaseRequest.duplicateOfRequestId = undefined;
      purchaseRequest.interacReference = undefined;
      purchaseRequest.interacReferenceNormalized = undefined;
      await purchaseRequest.save({ session });

      await AuditLog.create(
        [
          {
            actorUserId: options.actor.user?._id,
            actorRole: options.actor.role || "user",
            actorEmail: options.actor.user?.email,
            action: "voucher-request.customer-corrected-payment-info",
            targetType: "voucher-request",
            targetId: options.requestId,
            metadata: {
              requestKind: options.kind,
              correctionVersion: Number(purchaseRequest.customerCorrectionVersion || 0),
              payerEmailIdentityId: String(identity._id),
            },
          },
        ],
        { session }
      );

      result = purchaseRequest;
    });
  } finally {
    await session.endSession();
  }

  return result;
}
