import type { Model } from "mongoose";

import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import InteracPayerEmail from "@/models/InteracPayerEmail";
import InteracReceipt from "@/models/InteracReceipt";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";

import {
  approveVoucherPurchase,
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
import { PAYMENT_FIRST_MATCH_WINDOW_MS } from "./payment-intent";

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
    paymentVerificationStatus: { $in: ["pending", "not_found", "failed", "review"] },
    nextPaymentCheckAt: { $lte: now },
    payerEmailIdentityId: { $type: "objectId" },
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
    new Date(request.createdAt).getTime() - PAYMENT_FIRST_MATCH_WINDOW_MS
  );
  return (
    normalizeEmail(request.referenceNumber || "") === receipt.payerEmailNormalized &&
    amountCents(request) === receipt.amountCents &&
    receipt.currency === "CAD" &&
    receipt.authenticationVerified === true &&
    receipt.status !== "conflict" &&
    new Date(receipt.receivedAt).getTime() >= earliestEligibleReceipt
  );
}

type ReceiptResolution =
  | { status: "found"; receipt: Record<string, any> }
  | { status: "not_found" }
  | { status: "waiting"; requestId: string }
  | { status: "ambiguous"; reason: string };

function envelopeKey(kind: VoucherRequestKind, request: Record<string, any>) {
  return `${kind}:${request.requestId}`;
}

async function getCandidateRequestsForReceipt(
  receipt: Record<string, any>,
  identityId: unknown,
  activationAt: Date
) {
  // Returning customers sometimes pay before opening the checkout. Keep a bounded
  // payment-first window; activation, verified ownership, exact cents, and a
  // single unallocated receipt are still required before approval.
  const latestRequestTime = new Date(
    new Date(receipt.receivedAt).getTime() + PAYMENT_FIRST_MATCH_WINDOW_MS
  );
  const filter = {
    status: "pending",
    // Keep already-reviewed candidates in the ambiguity set. Otherwise the
    // first candidate can be moved to review and the next candidate can then
    // appear unique during the same reconciliation run.
    paymentVerificationStatus: { $in: ["pending", "not_found", "failed", "review"] },
    payerEmailIdentityId: identityId,
    amountCents: receipt.amountCents,
    createdAt: { $gte: activationAt, $lte: latestRequestTime },
  };
  const [daily, weekly] = await Promise.all([
    VoucherPurchaseRequest.find(filter).lean(),
    CreditPurchaseRequest.find({ ...filter, paymentMethod: "emt" }).lean(),
  ]);
  return [
    ...daily.map((request) => ({ kind: "daily" as const, request: request as Record<string, any> })),
    ...weekly.map((request) => ({ kind: "weekly" as const, request: request as Record<string, any> })),
  ]
    .filter(
      ({ request }) =>
        normalizeEmail(request.referenceNumber || "") === receipt.payerEmailNormalized &&
        new Date(receipt.receivedAt).getTime() >=
          Math.max(
            activationAt.getTime(),
            new Date(request.createdAt).getTime() - PAYMENT_FIRST_MATCH_WINDOW_MS
          )
    )
    .sort(
      (left, right) =>
        new Date(left.request.createdAt).getTime() - new Date(right.request.createdAt).getTime() ||
        String(left.request.requestId).localeCompare(String(right.request.requestId))
    );
}

async function resolveReceiptForRequest(
  kind: VoucherRequestKind,
  request: Record<string, any>,
  activationAt: Date
): Promise<ReceiptResolution> {
  const earliestEligibleReceipt = new Date(
    Math.max(
      activationAt.getTime(),
      new Date(request.createdAt).getTime() - PAYMENT_FIRST_MATCH_WINDOW_MS
    )
  );
  const receipts = await InteracReceipt.find({
    provider: "interac",
    mailbox: getEtransferAutomationConfig().mailbox,
    payerEmailNormalized: normalizeEmail(request.referenceNumber || ""),
    amountCents: amountCents(request),
    currency: "CAD",
    authenticationVerified: true,
    status: "unmatched",
    receivedAt: { $gte: earliestEligibleReceipt },
  })
    .sort({ receivedAt: 1, referenceNormalized: 1 })
    .limit(10)
    .lean();

  for (const rawReceipt of receipts) {
    const receipt = rawReceipt as Record<string, any>;
    const candidates = await getCandidateRequestsForReceipt(
      receipt,
      request.payerEmailIdentityId,
      activationAt
    );
    if (candidates.length === 0) continue;
    const first = candidates[0];
    const differentEntitlement = candidates.some(
      (candidate) =>
        candidate.kind !== first.kind ||
        !hasSameEntitlement(first.kind, first.request, candidate.request)
    );
    if (differentEntitlement) {
      return {
        status: "ambiguous",
        reason:
          "More than one different open voucher request matches this sender and amount; review the real recipient receipts",
      };
    }
    if (envelopeKey(first.kind, first.request) !== envelopeKey(kind, request)) {
      return { status: "waiting", requestId: first.request.requestId };
    }
    return { status: "found", receipt };
  }

  // A second ticket that was already open when the receipt was allocated is a
  // duplicate candidate. Do not use older allocated payments for requests made
  // later, because that could consume a customer's new legitimate purchase.
  const allocatedReceipts = await InteracReceipt.find({
    provider: "interac",
    mailbox: getEtransferAutomationConfig().mailbox,
    payerEmailNormalized: normalizeEmail(request.referenceNumber || ""),
    amountCents: amountCents(request),
    currency: "CAD",
    authenticationVerified: true,
    status: "allocated",
    allocatedAt: { $gte: new Date(request.createdAt) },
    receivedAt: { $gte: earliestEligibleReceipt },
  })
    .sort({ allocatedAt: 1, referenceNormalized: 1 })
    .limit(10)
    .lean();
  for (const allocatedReceipt of allocatedReceipts) {
    if (
      await isIdenticalDuplicate(
        kind,
        request,
        allocatedReceipt as Record<string, any>
      )
    ) {
      return { status: "found", receipt: allocatedReceipt as Record<string, any> };
    }
  }
  return { status: "not_found" };
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
    return { mode: config.mode, due: 0, synced: null, approved: 0, duplicates: 0, reviewed: 0, pending: 0, unmatchedReceipts: null, conflictingReceipts: null };
  }
  assertMailboxConfiguration(config);

  const due = await getDueRequests(config.activationAt as Date);

  let synced: Awaited<ReturnType<typeof syncInteracReceipts>> | null = null;
  try {
    synced = await syncInteracReceipts();
    if (synced.rejected > 0) {
      throw new Error(
        `${synced.rejected} Interac notification${synced.rejected === 1 ? " was" : "s were"} rejected; review the mailbox parser audit before approving payments`
      );
    }
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

  if (due.length === 0) {
    const [unmatchedReceipts, conflictingReceipts] = await Promise.all([
      InteracReceipt.countDocuments({ status: "unmatched" }),
      InteracReceipt.countDocuments({ status: "conflict" }),
    ]);
    return { mode: config.mode, due: 0, synced, approved: 0, duplicates: 0, reviewed: 0, pending: 0, unmatchedReceipts, conflictingReceipts };
  }

  let approved = 0;
  let duplicates = 0;
  let reviewed = 0;
  let pending = 0;

  for (const { kind, request } of due) {
    const linkedEmail = await InteracPayerEmail.findOne({
      _id: request.payerEmailIdentityId,
      userId: request.userId,
      emailNormalized: normalizeEmail(request.referenceNumber || ""),
      status: "verified",
    }).lean();
    if (!linkedEmail) {
      reviewed += 1;
      await updateCheckResult(kind, request.requestId, {
        paymentVerificationStatus: "review",
        paymentCheckError: "The Interac sender email is no longer verified for this account",
        paymentReviewRequired: true,
        nextPaymentCheckAt: null,
      });
      continue;
    }

    const resolution = await resolveReceiptForRequest(
      kind,
      request as Record<string, any>,
      config.activationAt as Date
    );

    if (resolution.status === "not_found") {
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

    if (resolution.status === "waiting") {
      pending += 1;
      await Promise.all([
        modelFor(kind).updateOne(
          { requestId: resolution.requestId, status: "pending" },
          { $set: { nextPaymentCheckAt: new Date() } }
        ),
        updateCheckResult(kind, request.requestId, {
          paymentVerificationStatus: "pending",
          paymentCheckError: `Waiting for earlier matching request ${resolution.requestId}`,
          nextPaymentCheckAt: getNextPaymentCheckAt(request.createdAt),
        }),
      ]);
      continue;
    }

    if (resolution.status === "ambiguous") {
      reviewed += 1;
      await updateCheckResult(kind, request.requestId, {
        paymentVerificationStatus: "review",
        paymentCheckError: resolution.reason,
        paymentReviewRequired: true,
        nextPaymentCheckAt: null,
      });
      continue;
    }

    const receipt = resolution.receipt;

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
        await updateCheckResult(kind, request.requestId, {
          paymentVerificationStatus: "duplicate",
          paymentCheckError: `Payment is already applied to ${receipt.allocatedRequestId}`,
          paymentReviewRequired: true,
          duplicateOfRequestId: receipt.allocatedRequestId,
          nextPaymentCheckAt: null,
        });
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

    const earliestIdentical = request.interacReferenceNormalized
      ? await findEarliestIdenticalPendingRequest(
          kind,
          request as Record<string, any>,
          config.activationAt as Date,
          config.mode === "observe"
        )
      : null;
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
          await updateCheckResult(kind, request.requestId, {
            paymentVerificationStatus: "duplicate",
            paymentCheckError: `Payment is already applied to ${latestReceipt.allocatedRequestId}`,
            paymentReviewRequired: true,
            duplicateOfRequestId: latestReceipt.allocatedRequestId,
            nextPaymentCheckAt: null,
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

  const [unmatchedReceipts, conflictingReceipts] = await Promise.all([
    InteracReceipt.countDocuments({ status: "unmatched" }),
    InteracReceipt.countDocuments({ status: "conflict" }),
  ]);
  return { mode: config.mode, due: due.length, synced, approved, duplicates, reviewed, pending, unmatchedReceipts, conflictingReceipts };
}
