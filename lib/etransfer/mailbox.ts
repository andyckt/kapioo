import { randomUUID } from "node:crypto";

import { ImapFlow } from "imapflow";

import AuditLog from "@/models/AuditLog";
import InteracMailboxState from "@/models/InteracMailboxState";
import InteracReceipt from "@/models/InteracReceipt";

import {
  assertMailboxConfiguration,
  getEtransferAutomationConfig,
} from "./config";
import { parseInteracReceipt } from "./receipt-parser";

const LOCK_MS = 2 * 60_000;
// cron-job.org's free runner stops waiting after 30 seconds. Keep each IMAP
// batch small so a burst is drained safely across consecutive five-minute
// runs without the scheduler treating a healthy Gmail scan as a failure.
const MAX_MESSAGES_PER_RUN = 8;

export async function saveInteracReceipt(
  receipt: Awaited<ReturnType<typeof parseInteracReceipt>>,
  mailbox: string,
  imapUid: number,
  uidValidity: string
) {
  const key = {
    provider: "interac" as const,
    mailbox,
    referenceNormalized: receipt.referenceNormalized,
  };
  let existing = await InteracReceipt.findOne(key);
  if (!existing) {
    try {
      return await InteracReceipt.create({
        ...receipt,
        ...key,
        imapUid,
        uidValidity,
        status: "unmatched",
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      existing = await InteracReceipt.findOne(key);
    }
  }

  if (!existing) throw new Error("Receipt disappeared during duplicate resolution");
  if (existing.parserVersion === "manual") {
    const manualReceiptMatches =
      existing.payerEmailNormalized === receipt.payerEmailNormalized &&
      existing.amountCents === receipt.amountCents &&
      existing.recipientEmail === receipt.recipientEmail;
    if (!manualReceiptMatches) {
      existing.status = "conflict";
      existing.conflictReason =
        "The signed Interac receipt conflicts with the payment details used for manual approval";
      await existing.save();
      return existing;
    }

    Object.assign(existing, {
      reference: receipt.reference,
      gmailMessageId: receipt.gmailMessageId,
      imapUid,
      uidValidity,
      payerEmail: receipt.payerEmail,
      payerEmailNormalized: receipt.payerEmailNormalized,
      senderName: receipt.senderName,
      depositedAt: receipt.depositedAt,
      receivedAt: receipt.receivedAt,
      accountLast4: receipt.accountLast4,
      subject: receipt.subject,
      rawSha256: receipt.rawSha256,
      parserVersion: receipt.parserVersion,
      authenticationVerified: receipt.authenticationVerified,
      conflictReason: undefined,
    });
    await existing.save();
    return existing;
  }

  const samePayment =
    existing.payerEmailNormalized === receipt.payerEmailNormalized &&
    existing.amountCents === receipt.amountCents &&
    existing.recipientEmail === receipt.recipientEmail &&
    (!existing.accountLast4 ||
      !receipt.accountLast4 ||
      existing.accountLast4 === receipt.accountLast4);
  if (!samePayment) {
    existing.status = "conflict";
    existing.conflictReason = "Same Interac reference arrived with conflicting signed payment details";
    await existing.save();
  }
  return existing;
}

export async function syncInteracReceipts() {
  const config = getEtransferAutomationConfig();
  assertMailboxConfiguration(config);

  await InteracMailboxState.updateOne(
    { mailbox: config.mailbox },
    { $setOnInsert: { mailbox: config.mailbox, lastUid: 0 } },
    { upsert: true }
  );
  const lockOwner = randomUUID();
  const now = new Date();
  const state = await InteracMailboxState.findOneAndUpdate(
    {
      mailbox: config.mailbox,
      $or: [
        { lockExpiresAt: { $exists: false } },
        { lockExpiresAt: null },
        { lockExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        lockOwner,
        lockExpiresAt: new Date(now.getTime() + LOCK_MS),
      },
    },
    { new: true }
  );
  if (!state) return { skipped: true, processed: 0, accepted: 0, rejected: 0 };

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: config.mailbox, pass: config.password },
    logger: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  let processed = 0;
  let accepted = 0;
  let rejected = 0;
  let lastError: string | undefined;

  try {
    await client.connect();
    const mailboxes = await client.list();
    const allMail = mailboxes.find((mailbox) => mailbox.specialUse === "\\All");
    const mailboxPath = allMail?.path || "INBOX";
    const lock = await client.getMailboxLock(mailboxPath, { readOnly: true });
    try {
      const uidValidity = String((client.mailbox && client.mailbox.uidValidity) || "");
      const sameMailboxGeneration = state.uidValidity === uidValidity;
      if (!sameMailboxGeneration) {
        state.lastUid = 0;
        await InteracMailboxState.updateOne(
          { mailbox: config.mailbox, lockOwner },
          { $set: { uidValidity, lastUid: 0 } }
        );
      }
      const search = sameMailboxGeneration && state.lastUid > 0
        ? { uid: `${state.lastUid + 1}:*`, from: "notify@payments.interac.ca" }
        : {
            since: new Date((config.activationAt?.getTime() || Date.now()) - 24 * 60 * 60_000),
            from: "notify@payments.interac.ca",
          };
      const found = await client.search(search, { uid: true });
      const uids = Array.isArray(found)
        ? found
            .filter((uid) => !sameMailboxGeneration || uid > state.lastUid)
            .sort((a, b) => a - b)
            .slice(0, MAX_MESSAGES_PER_RUN)
        : [];

      for (const uid of uids) {
        const message = await client.fetchOne(
          uid,
          { uid: true, source: true, envelope: true, internalDate: true },
          { uid: true }
        );
        if (!message || !message.source) continue;

        try {
          const receipt = await parseInteracReceipt(message.source, {
            expectedRecipient: config.recipientEmail,
            expectedAccountLast4: config.accountLast4 || undefined,
            receivedAt: message.internalDate ? new Date(message.internalDate) : undefined,
          });
          await saveInteracReceipt(receipt, config.mailbox, uid, uidValidity);
          accepted += 1;
        } catch (error) {
          rejected += 1;
          lastError = error instanceof Error ? error.message : "Unknown receipt validation error";
          await AuditLog.create({
            actorRole: "system",
            action: "interac-receipt.rejected",
            targetType: "gmail-message",
            targetId: message.id || String(uid),
            metadata: {
              uid,
              uidValidity,
              subject: message.envelope?.subject,
              reason: lastError,
            },
          });
        }

        processed += 1;
        await InteracMailboxState.updateOne(
          { mailbox: config.mailbox, lockOwner },
          {
            $set: {
              mailboxPath,
              uidValidity,
              lastUid: uid,
              lockExpiresAt: new Date(Date.now() + LOCK_MS),
            },
          }
        );
      }

      await InteracMailboxState.updateOne(
        { mailbox: config.mailbox, lockOwner },
        {
          $set: {
            mailboxPath,
            uidValidity,
            lastSuccessfulAt: new Date(),
            ...(lastError ? { lastError } : {}),
          },
          ...(!lastError ? { $unset: { lastError: 1 } } : {}),
        }
      );
    } finally {
      lock.release();
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Unknown mailbox synchronization error";
    await InteracMailboxState.updateOne(
      { mailbox: config.mailbox, lockOwner },
      { $set: { lastError } }
    );
    throw error;
  } finally {
    await InteracMailboxState.updateOne(
      { mailbox: config.mailbox, lockOwner },
      { $unset: { lockOwner: 1, lockExpiresAt: 1 } }
    );
    if (client.usable) await client.logout();
  }

  return { skipped: false, processed, accepted, rejected };
}
