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

    const updateData: Record<string, unknown> = { status };

    if (status === "confirmed") {
      updateData.confirmedAt = new Date();
    } else if (status === "delivered") {
      updateData.deliveredAt = new Date();
    } else if (status === "refunded") {
      updateData.refundedAt = new Date();

      if (order.status !== "refunded") {
        const user = await User.findById(order.userId);
        if (user) {
          user.twoDishVoucher += order.voucherCost.twoDish || 0;
          user.threeDishVoucher += order.voucherCost.threeDish || 0;
          await user.save();
        }
      }
    }

    const updatedOrder = await DailyDeliveryOrder.findOneAndUpdate(
      { orderId: id },
      { $set: updateData },
      { new: true }
    );

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
            order.createdAt
          );
        }
      } catch (notificationError) {
        console.error("Failed to send status update notification:", notificationError);
      }
    }

    return successJson(updatedOrder);
  } catch (error: unknown) {
    return handleRouteError(error, `PATCH /api/admin/daily-delivery/orders/${id || "[id]"}/status`);
  }
}
