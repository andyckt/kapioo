import { handleRouteError, successJson } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { getEtransferAutomationConfig } from "@/lib/etransfer/config";
import { PAYMENT_FIRST_MATCH_WINDOW_MS } from "@/lib/etransfer/payment-intent";
import EtransferPaymentIntent from "@/models/EtransferPaymentIntent";
import InteracMailboxState from "@/models/InteracMailboxState";
import InteracReceipt from "@/models/InteracReceipt";

export async function GET(request: Request) {
  const { actor, response } = await requireAdminMfa(request);
  if (!actor || response) return response;

  try {
    await connectToDatabase();
    const { recipientEmail: configuredMailbox } = getEtransferAutomationConfig();
    const receiptFilter = { mailbox: configuredMailbox };
    const [unmatched, conflicts, recent, mailboxState] = await Promise.all([
      InteracReceipt.countDocuments({ ...receiptFilter, status: "unmatched" }),
      InteracReceipt.countDocuments({ ...receiptFilter, status: "conflict" }),
      InteracReceipt.find({ ...receiptFilter, status: { $in: ["unmatched", "conflict"] } })
        .sort({ receivedAt: -1 })
        .limit(50)
        .select(
          "reference referenceNormalized payerEmail senderName amountCents currency receivedAt status conflictReason"
        )
        .lean(),
      InteracMailboxState.findOne({ mailbox: configuredMailbox }).lean(),
    ]);

    const intentCandidates = recent.length
      ? await EtransferPaymentIntent.find({
          status: "open",
          expiresAt: { $gte: new Date() },
          $or: recent.map((receipt) => ({
            payerEmailNormalized: receipt.payerEmail.toLowerCase(),
            amountCents: receipt.amountCents,
            createdAt: {
              $gte: new Date(
                new Date(receipt.receivedAt).getTime() - PAYMENT_FIRST_MATCH_WINDOW_MS
              ),
              $lte: new Date(
                new Date(receipt.receivedAt).getTime() + PAYMENT_FIRST_MATCH_WINDOW_MS
              ),
            },
          })),
        })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    return successJson({
      counts: { unmatched, conflicts },
      mailbox: mailboxState
        ? {
            mailbox: mailboxState.mailbox,
            lastSuccessfulAt: mailboxState.lastSuccessfulAt || null,
            lastError: mailboxState.lastError || null,
          }
        : null,
      receipts: recent.map((receipt) => {
        const candidates = intentCandidates.filter(
          (intent) =>
            intent.payerEmailNormalized === receipt.payerEmail.toLowerCase() &&
            intent.amountCents === receipt.amountCents &&
            Math.abs(
              new Date(intent.createdAt).getTime() - new Date(receipt.receivedAt).getTime()
            ) <= PAYMENT_FIRST_MATCH_WINDOW_MS
        );
        return {
          id: String(receipt._id),
          reference: receipt.reference,
          payerEmail: receipt.payerEmail,
          senderName: receipt.senderName,
          amountCents: receipt.amountCents,
          currency: receipt.currency,
          receivedAt: receipt.receivedAt,
          status: receipt.status,
          conflictReason: receipt.conflictReason || null,
          possibleCheckout:
            candidates.length === 1
              ? {
                  requestKind: candidates[0].requestKind,
                  planId: candidates[0].planId,
                  seenAt: candidates[0].lastSeenAt,
                }
              : null,
          possibleCheckoutAmbiguous: candidates.length > 1,
        };
      }),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/etransfer/receipts");
  }
}
