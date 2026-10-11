import { NextResponse } from "next/server";

import { handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { correctPaymentInfoBodySchema } from "@/lib/contracts/payment-correction";
import { VoucherApprovalError } from "@/lib/etransfer/approval";
import { correctVoucherPurchasePayerEmail } from "@/lib/etransfer/customer-correction";
import { processVoucherApprovalNotifications } from "@/lib/etransfer/notifications";
import { reconcileEtransferPurchases } from "@/lib/etransfer/reconcile";
import connectToDatabase from "@/lib/db";
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";

export async function POST(request: Request) {
  const { actor, response } = await requireUser();
  if (!actor || response) return response;

  try {
    const { data, error } = await parseJsonBody(request, correctPaymentInfoBodySchema);
    if (error) return error;

    await connectToDatabase();
    const correctedRequest = await correctVoucherPurchasePayerEmail({
      kind: data.requestKind,
      requestId: data.requestId,
      payerEmail: data.payerEmail,
      actor,
    });

    let recheckCompleted = true;
    try {
      await reconcileEtransferPurchases({
        only: { kind: data.requestKind, requestId: data.requestId },
      });
      await processVoucherApprovalNotifications(1, {
        eventKey: `${data.requestKind}:${data.requestId}:approved`,
      });
    } catch (error) {
      recheckCompleted = false;
      console.error("Immediate corrected-payment recheck failed; scheduled retry remains active", error);
    }

    const latestRequest = data.requestKind === "daily"
      ? await VoucherPurchaseRequest.findOne({ requestId: data.requestId })
      : await CreditPurchaseRequest.findOne({ requestId: data.requestId });

    return successJson({
      request: latestRequest || correctedRequest,
      recheckCompleted,
    });
  } catch (error) {
    if (error instanceof VoucherApprovalError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }
    return handleRouteError(error, "POST /api/etransfer/request-corrections");
  }
}
