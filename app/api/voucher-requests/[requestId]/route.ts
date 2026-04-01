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
import {
  applyBalanceMutations,
  BalanceMutationError,
} from "@/lib/balances/mutations";
import connectToDatabase from "@/lib/db";
import { logAuditEvent } from "@/lib/security/audit";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";
import User from "@/models/User";
import mongoose from "mongoose";
import { sendVoucherPurchaseStatusEmail } from "@/lib/services/email";

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

    const voucherRequest = await VoucherPurchaseRequest.findOne({ requestId });

    if (!voucherRequest) {
      return errorJson("Voucher purchase request not found", 404);
    }

    if (voucherRequest.status !== "pending") {
      return errorJson("Request has already been processed", 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    let updatedRequest: unknown = null;

    try {
      const updateData: Record<string, unknown> = {
        status,
        adminNotes: adminNotes || undefined,
      };

      if (status === "approved") {
        updateData.approvedAt = new Date();
      } else if (status === "declined") {
        updateData.declinedAt = new Date();
      }

      updatedRequest = await VoucherPurchaseRequest.findOneAndUpdate(
        { requestId },
        updateData,
        { new: true, session }
      ).populate("userId", "name email");

      if (status === "approved") {
        const user = await User.findById(voucherRequest.userId).session(session);

        if (!user) {
          throw new BalanceMutationError("User not found", {
            status: 404,
            code: "USER_NOT_FOUND",
          });
        }

        await applyBalanceMutations({
          user,
          mutations: [
            {
              field:
                voucherRequest.type === "twoDish" ? "twoDishVoucher" : "threeDishVoucher",
              amount: voucherRequest.quantity,
              operation: "add",
            },
          ],
          description: `Voucher purchase approved (Request ID: ${requestId})`,
          session,
        });

        try {
          await sendVoucherPurchaseStatusEmail(
            user.email,
            user.name,
            requestId,
            "approved",
            voucherRequest.type,
            voucherRequest.quantity,
            adminNotes,
            user.languagePreference || "zh"
          );
        } catch (emailError) {
          console.error("Failed to send approval email to user:", emailError);
        }
      } else if (status === "declined") {
        try {
          const user = await User.findById(voucherRequest.userId);
          if (user) {
            await sendVoucherPurchaseStatusEmail(
              user.email,
              user.name,
              requestId,
              "declined",
              voucherRequest.type,
              voucherRequest.quantity,
              adminNotes,
              user.languagePreference || "zh"
            );
          }
        } catch (emailError) {
          console.error("Failed to send decline email to user:", emailError);
        }
      }

      await session.commitTransaction();
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

    await logAuditEvent({
      actor,
      action: `voucher-request.${status}`,
      targetType: "voucher-request",
      targetId: requestId,
      metadata: {
        status,
        adminNotes: adminNotes || null,
        voucherType: voucherRequest.type,
        quantity: voucherRequest.quantity,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Voucher purchase request ${status}`,
    });
  } catch (error) {
    if (error instanceof BalanceMutationError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.details },
        { status: error.status }
      );
    }

    return handleRouteError(error, "PUT /api/voucher-requests/[requestId]");
  }
}
