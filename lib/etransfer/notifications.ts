import {
  sendCreditPurchaseStatusEmail,
  sendVoucherPurchaseStatusEmail,
} from "@/lib/services/email";
import VoucherApprovalNotification from "@/models/VoucherApprovalNotification";

const LOCK_MS = 2 * 60_000;

export async function processVoucherApprovalNotifications(limit = 10) {
  let sent = 0;
  let failed = 0;
  for (let index = 0; index < limit; index += 1) {
    const now = new Date();
    const notification = await VoucherApprovalNotification.findOneAndUpdate(
      {
        deliveryStatus: { $in: ["pending", "failed", "processing"] },
        nextAttemptAt: { $lte: now },
        $or: [
          { lockExpiresAt: { $exists: false } },
          { lockExpiresAt: null },
          { lockExpiresAt: { $lte: now } },
        ],
      },
      {
        $set: {
          deliveryStatus: "processing",
          lockExpiresAt: new Date(now.getTime() + LOCK_MS),
        },
        $inc: { attempts: 1 },
      },
      { sort: { nextAttemptAt: 1 }, new: true }
    );
    if (!notification) break;

    try {
      if (notification.requestKind === "daily") {
        if (!notification.voucherType || !notification.quantity) {
          throw new Error("Daily notification lacks voucher entitlement");
        }
        await sendVoucherPurchaseStatusEmail(
          notification.recipientEmail,
          notification.recipientName,
          notification.requestId,
          notification.status,
          notification.voucherType,
          notification.quantity,
          notification.adminNotes,
          notification.language,
          notification.eventKey
        );
      } else {
        await sendCreditPurchaseStatusEmail(
          notification.recipientEmail,
          notification.recipientName,
          notification.requestId,
          notification.status,
          undefined,
          notification.planDescription,
          notification.language,
          notification.eventKey
        );
      }
      notification.deliveryStatus = "sent";
      notification.sentAt = new Date();
      notification.lockExpiresAt = undefined;
      notification.lastError = undefined;
      await notification.save();
      sent += 1;
    } catch (error) {
      notification.deliveryStatus = "failed";
      notification.lastError = error instanceof Error ? error.message : "Unknown notification error";
      notification.lockExpiresAt = undefined;
      const backoffMinutes = Math.min(60, 2 ** Math.min(notification.attempts, 6));
      notification.nextAttemptAt = new Date(Date.now() + backoffMinutes * 60_000);
      await notification.save();
      failed += 1;
    }
  }
  return { sent, failed };
}
