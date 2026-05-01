import {
  errorJson,
  handleRouteError,
  parseJsonBody,
  successJson,
  type RouteContext,
} from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import { updateDailyOrderStatusBodySchema } from "@/lib/contracts/daily-order";
import connectToDatabase from "@/lib/db";
import { enrichAdminOrderResponse } from "@/lib/orders/admin-order-response";
import { refundDailyOrder } from "@/lib/orders/daily-admin-mutations";
import { sendDailyOrderStatusUpdateNotification } from "@/lib/services/notifications";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import User from "@/models/User";

export async function PATCH(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = "";
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    ({ id } = await params);

    const { data, error } = await parseJsonBody(request, updateDailyOrderStatusBodySchema);
    if (error) {
      return error;
    }

    const { status } = data;

    const order = await DailyDeliveryOrder.findOne({ orderId: id });

    if (!order) {
      return errorJson("Order not found", 404);
    }

    let updatedOrder = order;

    if (status === "refunded") {
      const refundResult = await refundDailyOrder({
        orderId: id,
        actor,
        request,
      });
      updatedOrder = refundResult.updatedOrder;
    } else {
      const updateData: Record<string, unknown> = { status };

      if (status === "confirmed") {
        updateData.confirmedAt = new Date();
      } else if (status === "delivered") {
        updateData.deliveredAt = new Date();
      }

      const savedOrder = await DailyDeliveryOrder.findOneAndUpdate(
        { orderId: id },
        { $set: updateData },
        { new: true }
      );

      if (!savedOrder) {
        return errorJson("Order not found after update attempt", 404);
      }

      updatedOrder = savedOrder;
    }

    if (status !== "confirmed" && status !== "delivered") {
      try {
        const user = await User.findById(order.userId);
        if (user && user.email) {
          await sendDailyOrderStatusUpdateNotification(
            user.email,
            user.name,
            id,
            status,
            order.items,
            order.status,
            user.languagePreference || "zh",
            order.createdAt,
            order.voucherCost
          );
        }
      } catch (notificationError) {
        console.error("Failed to send status update notification:", notificationError);
      }
    }

    return successJson(await enrichAdminOrderResponse(updatedOrder.toObject()));
  } catch (error: unknown) {
    return handleRouteError(error, `PATCH /api/admin/daily-delivery/orders/${id || "[id]"}/status`);
  }
}
