import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import type mongoose from "mongoose";

import InteracPayerEmail from "@/models/InteracPayerEmail";

import { normalizeEmail } from "./config";

export const MAX_INTERAC_PAYER_EMAILS = 3;
export const INTERAC_EMAIL_CODE_TTL_MS = 10 * 60_000;
export const INTERAC_EMAIL_SEND_COOLDOWN_MS = 60_000;
export const MAX_INTERAC_EMAIL_CODE_ATTEMPTS = 5;

export class InteracPayerEmailError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "InteracPayerEmailError";
    this.code = code;
    this.status = status;
  }
}

function getVerificationSecret() {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ETRANSFER_CRON_SECRET ||
    "";
  if (secret.length < 32) {
    throw new InteracPayerEmailError(
      "Email verification is not configured",
      "VERIFICATION_NOT_CONFIGURED",
      503
    );
  }
  return secret;
}

function hashCode(userId: string, email: string, code: string) {
  return createHmac("sha256", getVerificationSecret())
    .update(`${userId}:${normalizeEmail(email)}:${code}`)
    .digest("hex");
}

function safeEqualHex(left: string, right: string) {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function createInteracEmailVerificationCode() {
  return randomInt(100000, 1000000).toString();
}

export function toSafeInteracPayerEmail(record: Record<string, any>) {
  return {
    id: String(record._id),
    email: record.email,
    status: record.status as "pending" | "verified",
    verifiedAt: record.verifiedAt || null,
    verificationSentAt: record.verificationSentAt || null,
  };
}

export async function listInteracPayerEmails(userId: mongoose.Types.ObjectId | string) {
  const records = await InteracPayerEmail.find({ userId }).sort({ slot: 1 }).lean();
  return records.map((record) => toSafeInteracPayerEmail(record as Record<string, any>));
}

export async function beginInteracPayerEmailVerification(options: {
  userId: mongoose.Types.ObjectId | string;
  email: string;
  sendCode: (code: string) => Promise<unknown>;
}) {
  const userId = String(options.userId);
  const emailNormalized = normalizeEmail(options.email);
  const existing = await InteracPayerEmail.findOne({ emailNormalized });

  if (existing && String(existing.userId) !== userId) {
    throw new InteracPayerEmailError(
      "This email cannot be linked to this account",
      "EMAIL_ALREADY_LINKED",
      409
    );
  }
  if (existing?.status === "verified") {
    return { record: existing, alreadyVerified: true, sent: false };
  }
  if (
    existing?.verificationSentAt &&
    Date.now() - existing.verificationSentAt.getTime() < INTERAC_EMAIL_SEND_COOLDOWN_MS
  ) {
    throw new InteracPayerEmailError(
      "Please wait before requesting another code",
      "CODE_SEND_RATE_LIMITED",
      429
    );
  }

  const code = createInteracEmailVerificationCode();
  const verificationCodeHash = hashCode(userId, emailNormalized, code);
  const verificationExpiresAt = new Date(Date.now() + INTERAC_EMAIL_CODE_TTL_MS);
  let record = existing;

  if (record) {
    record.email = emailNormalized;
    record.verificationCodeHash = verificationCodeHash;
    record.verificationExpiresAt = verificationExpiresAt;
    record.verificationSentAt = undefined;
    record.failedAttempts = 0;
    await record.save();
  } else {
    for (let slot = 1; slot <= MAX_INTERAC_PAYER_EMAILS; slot += 1) {
      try {
        record = await InteracPayerEmail.create({
          userId,
          slot,
          email: emailNormalized,
          emailNormalized,
          status: "pending",
          verificationCodeHash,
          verificationExpiresAt,
          failedAttempts: 0,
        });
        break;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        const emailOwner = await InteracPayerEmail.findOne({ emailNormalized }).lean();
        if (emailOwner) {
          if (String(emailOwner.userId) !== userId) {
            throw new InteracPayerEmailError(
              "This email cannot be linked to this account",
              "EMAIL_ALREADY_LINKED",
              409
            );
          }
          // Another request for the same address won the unique insert. Do not
          // send this request's different code because it is not the hash saved
          // on that record.
          throw new InteracPayerEmailError(
            "Verification is already in progress for this email",
            "VERIFICATION_IN_PROGRESS",
            409
          );
        }
      }
    }
  }

  if (!record) {
    throw new InteracPayerEmailError(
      "You can link up to three Interac sender emails",
      "EMAIL_LIMIT_REACHED",
      409
    );
  }

  try {
    await options.sendCode(code);
  } catch (error) {
    await InteracPayerEmail.updateOne(
      { _id: record._id, status: "pending" },
      { $unset: { verificationSentAt: 1 } }
    );
    throw error;
  }
  record.verificationSentAt = new Date();
  await record.save();
  return { record, alreadyVerified: false, sent: true };
}

export async function verifyInteracPayerEmail(options: {
  userId: mongoose.Types.ObjectId | string;
  email: string;
  code: string;
}) {
  const userId = String(options.userId);
  const emailNormalized = normalizeEmail(options.email);
  const record = await InteracPayerEmail.findOne({ userId, emailNormalized });
  if (!record) {
    throw new InteracPayerEmailError("Verification request not found", "EMAIL_NOT_FOUND", 404);
  }
  if (record.status === "verified") return record;
  const candidateHash = hashCode(userId, emailNormalized, options.code);
  // Reserve every verification attempt atomically, including a correct one.
  // At most five concurrent requests can pass this gate.
  const attempt = await InteracPayerEmail.findOneAndUpdate(
    {
      _id: record._id,
      userId,
      status: "pending",
      verificationCodeHash: { $exists: true },
      verificationExpiresAt: { $gte: new Date() },
      failedAttempts: { $lt: MAX_INTERAC_EMAIL_CODE_ATTEMPTS },
    },
    { $inc: { failedAttempts: 1 } },
    { new: true }
  );
  if (!attempt) {
    const current = await InteracPayerEmail.findById(record._id);
    if (current?.status === "verified") return current;
    if (!current?.verificationExpiresAt || current.verificationExpiresAt.getTime() < Date.now()) {
      throw new InteracPayerEmailError(
        "Verification code has expired. Request a new code.",
        "CODE_EXPIRED"
      );
    }
    throw new InteracPayerEmailError(
      "Too many incorrect attempts. Request a new code.",
      "CODE_ATTEMPTS_EXCEEDED",
      429
    );
  }

  if (!attempt.verificationCodeHash || !safeEqualHex(candidateHash, attempt.verificationCodeHash)) {
    throw new InteracPayerEmailError("Incorrect verification code", "CODE_INVALID");
  }

  const verified = await InteracPayerEmail.findOneAndUpdate(
    {
      _id: attempt._id,
      userId,
      status: "pending",
      verificationCodeHash: candidateHash,
    },
    {
      $set: { status: "verified", verifiedAt: new Date(), failedAttempts: 0 },
      $unset: { verificationCodeHash: 1, verificationExpiresAt: 1 },
    },
    { new: true }
  );
  if (!verified) {
    const current = await InteracPayerEmail.findById(attempt._id);
    if (current?.status === "verified") return current;
    throw new InteracPayerEmailError(
      "Verification code expired or too many attempts were made. Request a new code.",
      "CODE_NOT_ACCEPTED",
      409
    );
  }
  return verified;
}

export async function unlinkInteracPayerEmail(options: {
  userId: mongoose.Types.ObjectId | string;
  email: string;
}) {
  const deleted = await InteracPayerEmail.findOneAndDelete({
    userId: options.userId,
    emailNormalized: normalizeEmail(options.email),
  });
  if (!deleted) {
    throw new InteracPayerEmailError("Linked email not found", "EMAIL_NOT_FOUND", 404);
  }
  return deleted;
}

export async function findVerifiedInteracPayerEmail(
  userId: mongoose.Types.ObjectId | string,
  email: string
) {
  return InteracPayerEmail.findOne({
    userId,
    emailNormalized: normalizeEmail(email),
    status: "verified",
  });
}
