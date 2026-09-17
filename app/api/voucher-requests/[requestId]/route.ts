import { NextRequest, NextResponse } from "next/server";

import {
  errorJson,
  handleRouteError,
  parseInput,
  parseJsonBody,
  type RouteContext,
} from "@/lib/api";
import { requireAdminMfa, requireUser } from "@/lib/auth/guards";
import {
  updateVoucherPurchaseRequestBodySchema,
  voucherRequestIdParamSchema,
} from "@/lib/contracts/voucher-request";
import connectToDatabase from "@/lib/db";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";
import {
  approveVoucherPurchase,
  declineVoucherPurchase,
  VoucherApprovalError,
} from "@/lib/etransfer/approval";
import { processVoucherApprovalNotifications } from "@/lib/etransfer/notifications";

// GET handler - fetch a single voucher purchase request by ID
export async function GET(
  request: NextRequest,
  context: RouteContext<{ requestId: string }>
) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const resolvedParams = await context.params;
    const { data: params, error: paramError } = parseInput(
      resolvedParams,
      voucherRequestIdParamSchema
    );
    if (paramError) {
      return paramError;
    }
    const { requestId } = params;

    await connectToDatabase();

    const voucherRequest = await VoucherPurchaseRequest.findOne({ requestId }).populate(
      "userId",
      "name email"
    );

    if (!voucherRequest) {
      return errorJson("Voucher purchase request not found", 404);
    }

    if (
      actor.role !== "admin" &&
      String((voucherRequest as { userId?: { _id?: unknown } }).userId?._id || (voucherRequest as { userId?: unknown }).userId) !==
        String(actor.user._id)
    ) {
      return errorJson("You do not have access to this voucher request", 403);
    }

    return NextResponse.json({
      success: true,
      data: voucherRequest,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/voucher-requests/[requestId]");
  }
}

// PUT handler - update a voucher purchase request (approve/decline)
export async function PUT(
  request: NextRequest,
  context: RouteContext<{ requestId: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const resolvedParams = await context.params;
    const { data: params, error: paramError } = parseInput(
      resolvedParams,
      voucherRequestIdParamSchema
    );
    if (paramError) {
      return paramError;
    }
    const { requestId } = params;

    const { data: body, error: bodyError } = await parseJsonBody(
      request,
      updateVoucherPurchaseRequestBodySchema
    );
    if (bodyError) {
      return bodyError;
    }

    const { status, adminNotes } = body;

    await connectToDatabase();

    const updatedRequest = status === "approved"
      ? (await approveVoucherPurchase({
          kind: "daily",
          requestId,
          source: "manual",
          actor,
          adminNotes,
        })).request
      : await declineVoucherPurchase({
          kind: "daily",
          requestId,
          reason: adminNotes || "Declined by administrator",
          actor,
        });

    await processVoucherApprovalNotifications(1);

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Voucher purchase request ${status}`,
    });
  } catch (error) {
    if (error instanceof VoucherApprovalError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    return handleRouteError(error, "PUT /api/voucher-requests/[requestId]");
  }
}
