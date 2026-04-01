import { NextResponse } from "next/server";

import { errorJson, parseJsonBody } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { orderNotificationTriggerBodySchema } from "@/lib/contracts/admin";
import {
  handleOrderNotification,
  NotificationType,
} from "@/lib/services/notifications";
import Order from "@/models/Order";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const parsed = await parseJsonBody(request, orderNotificationTriggerBodySchema);
    if (parsed.error) {
      return parsed.error;
    }
    const {
      notificationType,
      orderId,
      userId,
      previousStatus,
      transactionId,
      amount,
    } = parsed.data;

    await connectToDatabase();

    let order = null;
    let user = null;

    if (orderId) {
      order = await Order.findOne({ orderId });
      if (!order) {
        return errorJson("Order not found", 404);
      }
    }

    if (userId) {
      user = await User.findById(userId);
      if (!user) {
        return errorJson("User not found", 404);
      }
    }

    await handleOrderNotification(
      notificationType as NotificationType,
      order,
      user,
      previousStatus,
      transactionId,
      amount
    );

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
    });
  } catch (error: unknown) {
    console.error("Error sending notification:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send notification";
    return errorJson("Failed to send notification", 500, { details: message });
  }
}
