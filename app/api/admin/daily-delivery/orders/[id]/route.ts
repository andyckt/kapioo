import { NextResponse } from "next/server";

import { errorJson, handleRouteError, successJson, type RouteContext } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { enrichAdminOrderResponse } from "@/lib/orders/admin-order-response";
import { deleteDailyOrder } from "@/lib/orders/daily-admin-mutations";
import { withRewrittenProofOfDeliveryUrl } from "@/lib/orders/proof-of-delivery-response";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";

export async function GET(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = "";
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    ({ id } = await params);

    const order = await DailyDeliveryOrder.findOne({ orderId: id }).lean();

    if (!order) {
      return errorJson("Order not found", 404);
    }

    return successJson(await enrichAdminOrderResponse(withRewrittenProofOfDeliveryUrl(order)));
  } catch (error: unknown) {
    return handleRouteError(error, `GET /api/admin/daily-delivery/orders/${id || "[id]"}`);
  }
}

export async function DELETE(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = "";
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    ({ id } = await params);

    const url = new URL(request.url);
    const returnVouchers = url.searchParams.get("returnVouchers") === "true";

    const order = await DailyDeliveryOrder.findOne({ orderId: id });

    if (!order) {
      return errorJson("Order not found", 404);
    }

    await deleteDailyOrder({
      orderId: id,
      returnVouchers,
      actor,
      request,
    });

    return NextResponse.json({
      success: true,
      message: `Order deleted successfully without notification${returnVouchers ? " (vouchers returned)" : ""}`,
    });
  } catch (error: unknown) {
    return handleRouteError(error, `DELETE /api/admin/daily-delivery/orders/${id || "[id]"}`);
  }
}
