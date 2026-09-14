import type { Model } from "mongoose";

import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import InteracReceipt from "@/models/InteracReceipt";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";

import {
  approveVoucherPurchase,
  declineVoucherPurchase,
  VoucherApprovalError,
  type VoucherRequestKind,
} from "./approval";
import {
  assertMailboxConfiguration,
  getEtransferAutomationConfig,
  getNextPaymentCheckAt,
  moneyToCents,
  normalizeEmail,
} from "./config";
import { syncInteracReceipts } from "./mailbox";

const REQUESTS_PER_RUN = 25;

function modelFor(kind: VoucherRequestKind): Model<any> {
  return (kind === "daily" ? VoucherPurchaseRequest : CreditPurchaseRequest) as Model<any>;
}

function amountCents(request: Record<string, any>) {
  return request.amountCents || moneyToCents(Number(request.finalTotal || request.amount));
}

function hasSameEntitlement(
  kind: VoucherRequestKind,
  left: Record<string, any>,
  right: Record<string, any>
) {
  if (String(left.planId || "") !== String(right.planId || "")) return false;
  return kind === "daily"
    ? left.type === right.type && Number(left.quantity) === Number(right.quantity)
    : left.mealPlanType === right.mealPlanType &&
        Number(left.mealPlanQuantity) === Number(right.mealPlanQuantity);
}

async function findEarliestIdenticalPendingRequest(
  kind: VoucherRequestKind,
  current: Record<string, any>,
  activationAt: Date,
  includeObservedMatches = false
) {
  const planFilter = current.planId
    ? { planId: current.planId }
    : { planId: { $exists: false } };
  const candidates = await modelFor(kind)
    .find({
      status: "pending",
      paymentVerificationStatus: {
        $in: [
          "pending",
          "not_found",
          "failed",
          ...(includeObservedMatches ? ["matched"] : []),
        ],
      },
      createdAt: { $gte: activationAt },
      interacReferenceNormalized: current.interacReferenceNormalized,
      userId: current.userId,
      amountCents: amountCents(current),
      ...planFilter,
    })
    .sort({ createdAt: 1, requestId: 1 })
    .lean();

  return candidates.find(
    (candidate) =>
      normalizeEmail(candidate.referenceNumber || "") ===
        normalizeEmail(current.referenceNumber || "") &&
      hasSameEntitlement(kind, current, candidate as Record<string, any>)
  ) as Record<string, any> | undefined;
}

async function updateCheckResult(
  kind: VoucherRequestKind,
  requestId: string,
  update: Record<string, unknown>
) {
  await modelFor(kind).updateOne(
    { requestId, status: "pending" },
    {
      $set: { lastPaymentCheckedAt: new Date(), ...update },
      $inc: { paymentCheckAttempts: 1 },
    }
  );
}

async function getDueRequests(activationAt: Date) {
  const now = new Date();
  const filter = {
    status: "pending",
    paymentVerificationStatus: { $in: ["pending", "not_found", "failed"] },
    nextPaymentCheckAt: { $lte: now },
    interacReferenceNormalized: { $type: "string" },
    createdAt: { $gte: activationAt },
  };
  const [daily, weekly] = await Promise.all([
    VoucherPurchaseRequest.find(filter)
      .sort({ nextPaymentCheckAt: 1, createdAt: 1, requestId: 1 })
      .limit(REQUESTS_PER_RUN)
      .lean(),
    CreditPurchaseRequest.find({ ...filter, paymentMethod: "emt" })
      .sort({ nextPaymentCheckAt: 1, createdAt: 1, requestId: 1 })
      .limit(REQUESTS_PER_RUN)
      .lean(),
  ]);
  return [
    ...daily.map((request) => ({ kind: "daily" as const, request })),
    ...weekly.map((request) => ({ kind: "weekly" as const, request })),
  ]
    .sort(
      (left, right) =>
        new Date(left.request.nextPaymentCheckAt || 0).getTime() -
          new Date(right.request.nextPaymentCheckAt || 0).getTime() ||
        new Date(left.request.createdAt || 0).getTime() -
          new Date(right.request.createdAt || 0).getTime() ||
        String(left.request.requestId).localeCompare(String(right.request.requestId))
    )
    .slice(0, REQUESTS_PER_RUN);
}

function requestMatchesReceipt(
  request: Record<string, any>,
  receipt: Record<string, any>,
  activationAt: Date
) {
  const earliestEligibleReceipt = Math.max(
    activationAt.getTime(),
    new Date(request.createdAt).getTime() - 24 * 60 * 60_000
  );
  return (
    request.interacReferenceNormalized === receipt.referenceNormalized &&
    normalizeEmail(request.referenceNumber || "") === receipt.payerEmailNormalized &&
    amountCents(request) === receipt.amountCents &&
    receipt.currency === "CAD" &&
    receipt.authenticationVerified === true &&
    receipt.status !== "conflict" &&
    new Date(receipt.receivedAt).getTime() >= earliestEligibleReceipt
  );
}

async function isIdenticalDuplicate(
  currentKind: VoucherRequestKind,
  current: Record<string, any>,
  receipt: Record<string, any>
) {
  if (!receipt.allocatedRequestId || !receipt.allocatedRequestKind) return false;
  const allocated = await modelFor(receipt.allocatedRequestKind).findOne({
    requestId: receipt.allocatedRequestId,
  }).lean() as Record<string, any> | null;
  if (!allocated) return false;
  return (
    currentKind === receipt.allocatedRequestKind &&
    String(current.userId) === String(allocated.userId) &&
    String(current.planId || "") === String(allocated.planId || "") &&
    amountCents(current) === amountCents(allocated as Record<string, any>)
  );
}

export async function reconcileEtransferPurchases() {
  const config = getEtransferAutomationConfig();
  if (config.mode === "off") {
    return { mode: config.mode, due: 0, synced: null, approved: 0, duplicates: 0, reviewed: 0, pending: 0 };
  }
  assertMailboxConfiguration(config);

  const due = await getDueRequests(config.activationAt as Date);
  if (due.length === 0) {
    return { mode: config.mode, due: 0, synced: null, approved: 0, duplicates: 0, reviewed: 0, pending: 0 };
  }

  let synced: Awaited<ReturnType<typeof syncInteracReceipts>> | null = null;
  try {
    synced = await syncInteracReceipts();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mailbox synchronization failed";
    await Promise.all(
      due.map(({ kind, request }) =>
        updateCheckResult(kind, request.requestId, {
          paymentVerificationStatus: "failed",
          paymentCheckError: message,
          nextPaymentCheckAt: getNextPaymentCheckAt(request.createdAt),
          paymentReviewRequired:
            Date.now() - new Date(request.createdAt).getTime() >= 72 * 60 * 60_000,
        })
      )
    );
    throw error;
  }

  let approved = 0;
  let duplicates = 0;
  let reviewed = 0;
  let pending = 0;

  for (const { kind, request } of due) {
    const receipt = await InteracReceipt.findOne({
      provider: "interac",
      mailbox: config.mailbox,
      referenceNormalized: request.interacReferenceNormalized,
    }).lean();

    if (!receipt) {
      pending += 1;
      await updateCheckResult(kind, request.requestId, {
        paymentVerificationStatus: "not_found",
        paymentCheckError: "No completed Interac deposit found yet",
        nextPaymentCheckAt: getNextPaymentCheckAt(request.createdAt),
        paymentReviewRequired:
          Date.now() - new Date(request.createdAt).getTime() >= 72 * 60 * 60_000,
      });
      continue;
    }

    if (!requestMatchesReceipt(
      request as Record<string, any>,
      receipt as Record<string, any>,
      config.activationAt as Date
    )) {
      reviewed += 1;
      await updateCheckResult(kind, request.requestId, {
        paymentVerificationStatus: "review",
        paymentCheckError: "Receipt exists but its authenticated payment details do not match the request",
        paymentReviewRequired: true,
        nextPaymentCheckAt: null,
      });
      continue;
    }

    if (receipt.allocatedRequestKey && receipt.allocatedRequestId !== request.requestId) {
      if (await isIdenticalDuplicate(kind, request as Record<string, any>, receipt as Record<string, any>)) {
        if (config.mode === "observe") {
          await updateCheckResult(kind, request.requestId, {
            paymentVerificationStatus: "duplicate",
            paymentCheckError: `Payment is already applied to ${receipt.allocatedRequestId}`,
            paymentReviewRequired: true,
            duplicateOfRequestId: receipt.allocatedRequestId,
            nextPaymentCheckAt: null,
          });
        } else {
          await declineVoucherPurchase({
            kind,
            requestId: request.requestId,
            reason: `Duplicate request for payment already applied to ${receipt.allocatedRequestId}`,
            duplicateOfRequestId: receipt.allocatedRequestId,
          });
        }
        duplicates += 1;
      } else {
        reviewed += 1;
        await updateCheckResult(kind, request.requestId, {
          paymentVerificationStatus: "review",
          paymentCheckError: "Payment is already allocated to a different request",
          paymentReviewRequired: true,
          nextPaymentCheckAt: null,
        });
      }
      continue;
    }

    const earliestIdentical = await findEarliestIdenticalPendingRequest(
      kind,
      request as Record<string, any>,
      config.activationAt as Date,
      config.mode === "observe"
    );
    if (earliestIdentical && earliestIdentical.requestId !== request.requestId) {
      if (config.mode === "observe") {
        await Promise.all([
          modelFor(kind).updateOne(
            { requestId: earliestIdentical.requestId, status: "pending" },
            {
              $set: {
                paymentVerificationStatus: "matched",
                paymentCheckError: "Observation mode: verified match recorded without issuing vouchers",
                matchedPaymentReceiptId: receipt._id,
                nextPaymentCheckAt: null,
              },
            }
          ),
          updateCheckResult(kind, request.requestId, {
            paymentVerificationStatus: "duplicate",
            paymentCheckError: `Duplicate of earlier request ${earliestIdentical.requestId}`,
            paymentReviewRequired: true,
            duplicateOfRequestId: earliestIdentical.requestId,
            nextPaymentCheckAt: null,
          }),
        ]);
        duplicates += 1;
        continue;
      }
      await Promise.all([
        modelFor(kind).updateOne(
          { requestId: earliestIdentical.requestId, status: "pending" },
          {
            $set: {
              paymentVerificationStatus: "pending",
              paymentCheckError: "Prior identical request moved forward for payment allocation",
              nextPaymentCheckAt: new Date(),
            },
          }
        ),
        updateCheckResult(kind, request.requestId, {
          paymentVerificationStatus: "pending",
          paymentCheckError: `Waiting for earlier identical request ${earliestIdentical.requestId}`,
          nextPaymentCheckAt: getNextPaymentCheckAt(request.createdAt),
        }),
      ]);
      pending += 1;
      continue;
    }

    if (config.mode === "observe") {
      await updateCheckResult(kind, request.requestId, {
        paymentVerificationStatus: "matched",
        paymentCheckError: "Observation mode: verified match recorded without issuing vouchers",
        matchedPaymentReceiptId: receipt._id,
        nextPaymentCheckAt: null,
      });
      continue;
    }

    try {
      await approveVoucherPurchase({
        kind,
        requestId: request.requestId,
        source: "automatic",
        receiptId: String(receipt._id),
      });
      approved += 1;
    } catch (error) {
      if (error instanceof VoucherApprovalError && error.code === "PAYMENT_ALREADY_USED") {
        const latestReceipt = await InteracReceipt.findById(receipt._id).lean();
        if (
          latestReceipt &&
          await isIdenticalDuplicate(
            kind,
            request as Record<string, any>,
            latestReceipt as Record<string, any>
          )
        ) {
          await declineVoucherPurchase({
            kind,
            requestId: request.requestId,
            reason: `Duplicate request for payment already applied to ${latestReceipt.allocatedRequestId}`,
            duplicateOfRequestId: latestReceipt.allocatedRequestId,
          });
          duplicates += 1;
          continue;
        }
      }
      reviewed += 1;
      await updateCheckResult(kind, request.requestId, {
        paymentVerificationStatus: "review",
        paymentCheckError: error instanceof Error ? error.message : "Automatic approval failed",
        paymentReviewRequired: true,
        nextPaymentCheckAt: null,
      });
    }
  }

  return { mode: config.mode, due: due.length, synced, approved, duplicates, reviewed, pending };
}
