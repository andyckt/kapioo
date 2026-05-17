import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from "@/lib/api";
import { requireAdminMfa, requireUser } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { buildWeeklyEntitlementSummary } from "@/lib/orders/weekly-entitlement-display";
import {
  weeklyOrderUserPatchBodySchema,
} from "@/lib/contracts/weekly-order";
import WeeklyOrder from "@/models/WeeklyOrder";
import WeeklyEntitlementGroup from "@/models/WeeklyEntitlementGroup";
import User from "@/models/User";
import mongoose from "mongoose";
import { resolveEffectiveOrderCustomerInfo } from "@/lib/orders/effective-customer-info";
import { withRewrittenProofOfDeliveryUrl } from "@/lib/orders/proof-of-delivery-response";

export async function GET(_request: Request, ctx: RouteContext<{ id: string }>) {
  try {
    const { id } = await ctx.params;
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const order = await WeeklyOrder.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null },
        { orderId: id },
      ],
    });

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
    const groupId = plainOrder.weeklyEntitlementGroupId;
    const entitlementGroup =
      typeof groupId === "string" && groupId
        ? await WeeklyEntitlementGroup.findOne({ groupId }).lean()
        : null;
    const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(plainOrder as never, user as never);
    const weeklyEntitlementSummary = buildWeeklyEntitlementSummary(plainOrder as never, entitlementGroup as never);

    return successJson({
      ...withRewrittenProofOfDeliveryUrl(plainOrder),
      effectiveCustomerInfo,
      weeklyEntitlementSummary,
      phoneNumber: effectiveCustomerInfo.phoneNumber,
      area: effectiveCustomerInfo.area,
      deliveryAddress: effectiveCustomerInfo.deliveryAddress,
      specialInstructions: effectiveCustomerInfo.specialInstructions,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/weekly-orders/[id]");
  }
}

export async function PATCH(request: Request, ctx: RouteContext<{ id: string }>) {
  try {
    const { id } = await ctx.params;
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error: bodyError } = await parseJsonBody(request, weeklyOrderUserPatchBodySchema);
    if (bodyError || !data) {
      return bodyError;
    }

    if (Object.prototype.hasOwnProperty.call(data, "status")) {
      return errorJson("Use /api/admin/weekly-subscription/orders/[id]/status for weekly status updates.", 410);
    }

    await connectToDatabase();

    const order = await WeeklyOrder.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null },
        { orderId: id },
      ],
    });

    if (!order) {
      return errorJson("Order not found", 404);
    }

    const allowedUpdates = ["specialInstructions"];
    const updates: Record<string, unknown> = {};
    const raw = data as Record<string, unknown>;

    Object.keys(data).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = raw[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return errorJson("No editable fields provided", 400);
    }

    const updatedOrder = await WeeklyOrder.findByIdAndUpdate(order._id, { $set: updates }, { new: true });

    return successJson(updatedOrder);
  } catch (error) {
    return handleRouteError(error, "PATCH /api/weekly-orders/[id]");
  }
}
