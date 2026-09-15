import { handleRouteError, successJson } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { getEtransferAutomationConfig } from "@/lib/etransfer/config";
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

    return successJson({
      counts: { unmatched, conflicts },
      mailbox: mailboxState
        ? {
            mailbox: mailboxState.mailbox,
            lastSuccessfulAt: mailboxState.lastSuccessfulAt || null,
            lastError: mailboxState.lastError || null,
          }
        : null,
      receipts: recent.map((receipt) => ({
        id: String(receipt._id),
        reference: receipt.reference,
        payerEmail: receipt.payerEmail,
        senderName: receipt.senderName,
        amountCents: receipt.amountCents,
        currency: receipt.currency,
        receivedAt: receipt.receivedAt,
        status: receipt.status,
        conflictReason: receipt.conflictReason || null,
      })),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/etransfer/receipts");
  }
}
