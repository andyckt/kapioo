import { NextResponse } from "next/server";

import { handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { correctPaymentInfoBodySchema } from "@/lib/contracts/payment-correction";
import { VoucherApprovalError } from "@/lib/etransfer/approval";
import { correctVoucherPurchasePayerEmail } from "@/lib/etransfer/customer-correction";
import connectToDatabase from "@/lib/db";

export async function POST(request: Request) {
  const { actor, response } = await requireUser();
  if (!actor || response) return response;

  try {
    const { data, error } = await parseJsonBody(request, correctPaymentInfoBodySchema);
    if (error) return error;

    await connectToDatabase();
    const updatedRequest = await correctVoucherPurchasePayerEmail({
      kind: data.requestKind,
      requestId: data.requestId,
      payerEmail: data.payerEmail,
      actor,
    });

    return successJson({ request: updatedRequest });
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
