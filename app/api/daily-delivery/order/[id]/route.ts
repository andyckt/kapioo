import { errorJson, handleRouteError, successJson, type RouteContext } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { resolveEffectiveOrderCustomerInfo } from "@/lib/orders/effective-customer-info";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import User from "@/models/User";

export async function GET(_request: Request, { params }: RouteContext<{ id: string }>) {
  let orderId = "";
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    ({ id: orderId } = await params);

    await connectToDatabase();

    const order = await DailyDeliveryOrder.findOne({ orderId });

    if (!order) {
      return errorJson("Order not found", 404);
    }

    if (actor.role !== "admin" && String(order.userId) !== String(actor.user._id)) {
      return errorJson("You do not have access to this order", 403);
    }

    const user = await User.findById(order.userId).select("name email").lean();
    const plainOrder =
      typeof (order as { toObject?: () => Record<string, unknown> }).toObject === "function"
        ? (order as { toObject: () => Record<string, unknown> }).toObject()
        : (order as unknown as Record<string, unknown>);
    const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(plainOrder as never, user as never);

    return successJson({
      ...plainOrder,
      effectiveCustomerInfo,
      phoneNumber: effectiveCustomerInfo.phoneNumber,
      area: effectiveCustomerInfo.area,
      deliveryAddress: effectiveCustomerInfo.deliveryAddress,
      specialInstructions: effectiveCustomerInfo.specialInstructions,
    });
  } catch (error: unknown) {
    return handleRouteError(error, `GET /api/daily-delivery/order/${orderId || "[id]"}`);
  }
}
