import { timingSafeEqual } from "node:crypto";

import { errorJson, successJson } from "@/lib/api";
import connectToDatabase from "@/lib/db";
import { processVoucherApprovalNotifications } from "@/lib/etransfer/notifications";
import { reconcileEtransferPurchases } from "@/lib/etransfer/reconcile";

export const maxDuration = 60;
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.ETRANSFER_CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const supplied = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return (
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
}

export async function POST(request: Request) {
  if ((process.env.ETRANSFER_CRON_SECRET || "").length < 32) {
    return errorJson("e-Transfer reconciliation is not configured", 503);
  }
  if (!isAuthorized(request)) return errorJson("Unauthorized", 401);

  try {
    await connectToDatabase();
    let reconciliation: Awaited<ReturnType<typeof reconcileEtransferPurchases>> | null = null;
    let reconciliationFailed = false;
    try {
      reconciliation = await reconcileEtransferPurchases();
    } catch (error) {
      reconciliationFailed = true;
      console.error("e-Transfer reconciliation failed", error);
    }
    const notifications = await processVoucherApprovalNotifications(3);
    if (reconciliationFailed) {
      return errorJson("e-Transfer reconciliation failed", 500);
    }
    return successJson({ reconciliation, notifications });
  } catch (error) {
    console.error("e-Transfer cron failed", error);
    return errorJson("e-Transfer cron failed", 500);
  }
}
