import type { ClientSession } from "mongoose";

import EtransferPaymentIntent, {
  type EtransferPaymentIntentKind,
} from "@/models/EtransferPaymentIntent";

import { normalizeEmail } from "./config";
import { findVerifiedInteracPayerEmail } from "./payer-email";

export const PAYMENT_INTENT_TTL_MS = 7 * 24 * 60 * 60_000;
export const PAYMENT_FIRST_MATCH_WINDOW_MS = 7 * 24 * 60 * 60_000;

export async function recordEtransferPaymentIntent(options: {
  userId: string;
  submissionKey: string;
  requestKind: EtransferPaymentIntentKind;
  planId: string;
  amountCents: number;
  payerEmail: string;
}) {
  const verifiedEmail = await findVerifiedInteracPayerEmail(
    options.userId,
    options.payerEmail
  );
  if (!verifiedEmail) return null;

  const now = new Date();
  const fields = {
    requestKind: options.requestKind,
    planId: options.planId,
    amountCents: options.amountCents,
    payerEmailIdentityId: verifiedEmail._id,
    payerEmailNormalized: normalizeEmail(options.payerEmail),
    status: "open" as const,
    expiresAt: new Date(now.getTime() + PAYMENT_INTENT_TTL_MS),
    lastSeenAt: now,
  };

  const updated = await EtransferPaymentIntent.findOneAndUpdate(
    {
      userId: options.userId,
      submissionKey: options.submissionKey,
      status: { $in: ["open", "expired"] },
    },
    { $set: fields },
    { new: true }
  );
  if (updated) return updated;

  const existing = await EtransferPaymentIntent.findOne({
    userId: options.userId,
    submissionKey: options.submissionKey,
  });
  if (existing) return existing;

  try {
    return await EtransferPaymentIntent.create({
      userId: options.userId,
      submissionKey: options.submissionKey,
      ...fields,
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    return EtransferPaymentIntent.findOne({
      userId: options.userId,
      submissionKey: options.submissionKey,
    });
  }
}

export async function findBindablePaymentIntent(options: {
  userId: string;
  submissionKey?: string;
  requestKind: EtransferPaymentIntentKind;
  planId: string;
  amountCents: number;
  payerEmailIdentityId?: unknown;
  payerEmail: string;
}) {
  if (!options.submissionKey || !options.payerEmailIdentityId) return null;
  return EtransferPaymentIntent.findOne({
    userId: options.userId,
    submissionKey: options.submissionKey,
    requestKind: options.requestKind,
    planId: options.planId,
    amountCents: options.amountCents,
    payerEmailIdentityId: options.payerEmailIdentityId,
    payerEmailNormalized: normalizeEmail(options.payerEmail),
    status: "open",
    expiresAt: { $gte: new Date() },
  });
}

export async function markPaymentIntentSubmitted(options: {
  intentId: unknown;
  requestId: string;
  session: ClientSession;
}) {
  await EtransferPaymentIntent.updateOne(
    { _id: options.intentId, status: "open" },
    { $set: { status: "submitted", requestId: options.requestId } },
    { session: options.session }
  );
}
