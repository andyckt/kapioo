import { NextResponse } from "next/server";

import { errorJson, handleRouteError, successJson, type RouteContext } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { deleteDailyOrder } from "@/lib/orders/daily-admin-mutations";
import {
  getOrderOnlyOverrideMeta,
  hasOrderCustomerOverride,
  resolveEffectiveOrderCustomerInfo,
} from "@/lib/orders/effective-customer-info";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import User from "@/models/User";

type AdminDailyOrderUser = {
  _id?: unknown;
  name?: string;
  email?: string;
} | null;

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

    const user = (await User.findById(order.userId).select("name email").lean()) as AdminDailyOrderUser;

    const orderWithUserInfo = {
      ...order,
      user,
      effectiveCustomerInfo: resolveEffectiveOrderCustomerInfo(order, user),
      hasOrderOnlyOverride: hasOrderCustomerOverride(order),
      orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order),
    };

    return successJson(orderWithUserInfo);
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
