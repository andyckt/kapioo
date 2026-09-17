import { NextResponse } from "next/server";

import {
  errorJson,
  handleRouteError,
  parseJsonBody,
  parseSearchParams,
  successJson,
} from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import {
  adminCreditPurchaseActionBodySchema,
  adminCreditPurchaseRequestsQuerySchema,
} from "@/lib/contracts/credit-request";
import connectToDatabase from "@/lib/db";
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import {
  approveVoucherPurchase,
  declineVoucherPurchase,
  VoucherApprovalError,
} from "@/lib/etransfer/approval";
import { processVoucherApprovalNotifications } from "@/lib/etransfer/notifications";

// GET handler - get all credit purchase requests with filtering and pagination
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: query, error: queryError } = parseSearchParams(
      request,
      adminCreditPurchaseRequestsQuerySchema
    );
    if (queryError) {
      return queryError;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { status } = query;
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const mongoQuery: Record<string, unknown> = {};

    if (status) {
      mongoQuery.status = status;
    }

    const requests = await CreditPurchaseRequest.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email userID address.province");

    const totalRequests = await CreditPurchaseRequest.countDocuments(mongoQuery);

    return successJson({
      requests,
      page,
      limit,
      total: totalRequests,
      pages: Math.ceil(totalRequests / limit),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/credits/request/admin");
  }
}

// POST handler - approve or decline a credit purchase request
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error: bodyError } = await parseJsonBody(
      request,
      adminCreditPurchaseActionBodySchema
    );
    if (bodyError) {
      return bodyError;
    }

    await connectToDatabase();

    const updatedRequest = data.action === "approve"
      ? (await approveVoucherPurchase({
          kind: "weekly",
          requestId: data.requestId,
          source: "manual",
          actor,
          adminNotes: data.adminNotes,
        })).request
      : await declineVoucherPurchase({
          kind: "weekly",
          requestId: data.requestId,
          reason: data.adminNotes || "Declined by administrator",
          actor,
        });

    await processVoucherApprovalNotifications(1);
    return successJson({ request: updatedRequest });
  } catch (error) {
    if (error instanceof VoucherApprovalError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    return handleRouteError(error, "POST /api/credits/request/admin");
  }
}
