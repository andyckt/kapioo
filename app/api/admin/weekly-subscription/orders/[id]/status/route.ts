import { NextResponse } from "next/server";
import { errorJson, handleRouteError, parseJsonBody, type RouteContext } from "@/lib/api";
import { updateWeeklyOrderStatusBodySchema } from "@/lib/contracts/weekly-order";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import {
  resolveWeeklyStatusTransition,
  WEEKLY_OPERATOR_ORDER_STATUSES,
} from "@/lib/orders/weekly-status";
import { sendDailyOrderStatusUpdateNotification } from "@/lib/services/notifications";
import User from "@/models/User";
import WeeklyOrder from "@/models/WeeklyOrder";

export async function PATCH(request: Request, ctx: RouteContext<{ id: string }>) {
  try {
    const { id } = await ctx.params;
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error: bodyError } = await parseJsonBody(request, updateWeeklyOrderStatusBodySchema);
    if (bodyError || !data) {
      return bodyError;
    }

    const { status } = data;

    await connectToDatabase();

    const order = await WeeklyOrder.findOne({ orderId: id });

    if (!order) {
      return errorJson("Order not found", 404);
    }

    const transition = resolveWeeklyStatusTransition(order, status);
    if (!transition.ok) {
      return errorJson(transition.error ?? "Invalid status transition", 409, {
        extra: {
          allowedNextStatuses: transition.allowedNextStatuses,
          validStatuses: WEEKLY_OPERATOR_ORDER_STATUSES,
          currentStatus: transition.currentStatus,
        },
      });
    }

    if (transition.noOp) {
      return NextResponse.json({
        success: true,
        data: order,
        meta: {
          currentStatus: transition.currentStatus,
          nextStatus: transition.nextStatus,
          noOp: true,
          allowedNextStatuses: transition.allowedNextStatuses,
        },
      });
    }

    const updateData = transition.patch || { status: transition.nextStatus };
    const updatedOrder = await WeeklyOrder.findOneAndUpdate(
      { orderId: id },
      { $set: updateData },
      { new: true }
    );

    if (!updatedOrder) {
      return errorJson("Order not found after update attempt", 404);
    }

    if (transition.nextStatus !== "confirmed" && transition.nextStatus !== "delivered") {
      try {
        const user = await User.findById(order.userId);
        if (user && user.email) {
          await sendDailyOrderStatusUpdateNotification(
            user.email,
            user.name,
            id,
            transition.nextStatus,
            order.items,
            order.status,
            user.languagePreference || "zh",
            order.createdAt
          );
        }
      } catch (notificationError) {
        console.error("Failed to send status update notification:", notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      meta: {
        currentStatus: transition.currentStatus,
        nextStatus: transition.nextStatus,
        noOp: false,
        allowedNextStatuses: transition.allowedNextStatuses,
      },
    });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/weekly-subscription/orders/[id]/status");
  }
}
