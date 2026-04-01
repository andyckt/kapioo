import { NextResponse } from "next/server";
import { errorJson, handleRouteError, successJson, type RouteContext } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import mongoose from "mongoose";
import { buildWeeklyEntitlementSummary } from "@/lib/orders/weekly-entitlement-display";
import {
  describeWeeklyRefundTarget,
  resolveWeeklyRefundTarget,
  restoreWeeklyOrderEntitlement,
} from "@/lib/orders/weekly-refund";
import User from "@/models/User";
import WeeklyEntitlementGroup from "@/models/WeeklyEntitlementGroup";
import WeeklyOrder from "@/models/WeeklyOrder";
import {
  getOrderOnlyOverrideMeta,
  hasOrderCustomerOverride,
  resolveEffectiveOrderCustomerInfo,
} from "@/lib/orders/effective-customer-info";

function toAllocatedMealCount(order: {
  allocatedMealCount?: unknown;
  items?: unknown;
  creditCost?: unknown;
}) {
  const explicitAllocated = Number(order?.allocatedMealCount);
  if (Number.isFinite(explicitAllocated) && explicitAllocated >= 0) {
    return explicitAllocated;
  }

  if (Array.isArray(order?.items)) {
    return order.items.reduce(
      (sum: number, item: { quantity?: unknown }) => sum + (Number(item?.quantity) || 0),
      0
    );
  }

  return Number(order?.creditCost) || 0;
}

function toDeliveryDateSummary(order: { items?: unknown }) {
  if (!Array.isArray(order?.items) || order.items.length === 0) {
    return "";
  }

  const uniqueDates = Array.from(
    new Set(
      order.items
        .map((item: { date?: unknown }) => String(item?.date || "").trim())
        .filter((date: string) => date.length > 0)
    )
  );

  return uniqueDates.join(", ");
}

export async function GET(_request: Request, ctx: RouteContext<{ id: string }>) {
  try {
    const { id } = await ctx.params;
    const { actor, response } = await requireAdminMfa(_request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const order = await WeeklyOrder.findOne({ orderId: id }).lean();

    if (!order) {
      return errorJson("Order not found", 404);
    }

    const user = await User.findById(order.userId).select("name email").lean();
    const entitlementGroup =
      typeof order.weeklyEntitlementGroupId === "string" && order.weeklyEntitlementGroupId
        ? await WeeklyEntitlementGroup.findOne({ groupId: order.weeklyEntitlementGroupId }).lean()
        : null;
    const linkedChildOrders =
      typeof order.weeklyEntitlementGroupId === "string" && order.weeklyEntitlementGroupId
        ? await WeeklyOrder.find({ weeklyEntitlementGroupId: order.weeklyEntitlementGroupId })
            .select("orderId status items allocatedMealCount creditCost createdAt")
            .sort({ createdAt: 1, orderId: 1 })
            .lean()
        : [];
    const otherLinkedChildOrders = linkedChildOrders
      .filter((linkedOrder) => linkedOrder.orderId !== order.orderId)
      .map((linkedOrder) => ({
        orderId: linkedOrder.orderId,
        status: linkedOrder.status,
        allocatedMealCount: toAllocatedMealCount(linkedOrder),
        deliveryDateSummary: toDeliveryDateSummary(linkedOrder),
      }));

    const orderWithUserInfo = {
      ...order,
      user,
      weeklyEntitlementSummary: buildWeeklyEntitlementSummary(order, entitlementGroup as never),
      linkedWeeklyGroup: order.weeklyEntitlementGroupId
        ? {
            groupId: order.weeklyEntitlementGroupId,
            parentRecordExists: Boolean(entitlementGroup),
            linkedChildOrderCount: linkedChildOrders.length,
            otherLinkedChildOrders,
          }
        : null,
      effectiveCustomerInfo: resolveEffectiveOrderCustomerInfo(order, user as never),
      hasOrderOnlyOverride: hasOrderCustomerOverride(order),
      orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order),
    };

    return successJson(orderWithUserInfo);
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/weekly-subscription/orders/[id]");
  }
}

export async function DELETE(request: Request, ctx: RouteContext<{ id: string }>) {
  try {
    const { id } = await ctx.params;
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const url = new URL(request.url);
    const returnCredits = url.searchParams.get("returnCredits") === "true";

    const order = await WeeklyOrder.findOne({ orderId: id });

    if (!order) {
      return errorJson("Order not found", 404);
    }

    const shouldRestoreEntitlement = returnCredits && order.status !== "refunded";
    const refundTarget = shouldRestoreEntitlement
      ? resolveWeeklyRefundTarget(order)
      : ({ kind: "none", amount: 0 } as const);

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (shouldRestoreEntitlement && refundTarget.kind !== "none") {
          const user = await User.findById(order.userId).session(session);
          if (!user) {
            throw new Error("User not found for entitlement restoration");
          }
          restoreWeeklyOrderEntitlement(user, order);
          await user.save({ session });
        }

        const deleteResult = await WeeklyOrder.deleteOne({ orderId: id }, { session });
        if (deleteResult.deletedCount !== 1) {
          throw new Error("Order could not be deleted");
        }
      });
    } finally {
      await session.endSession();
    }

    console.log(
      `Weekly order ${id} deleted without notification (${describeWeeklyRefundTarget(refundTarget)}) by admin`
    );

    return NextResponse.json({
      success: true,
      message: `Order deleted successfully without notification${shouldRestoreEntitlement ? ` (${describeWeeklyRefundTarget(refundTarget)})` : ""}`,
      meta: {
        refundTarget,
        refundSummary: shouldRestoreEntitlement ? describeWeeklyRefundTarget(refundTarget) : null,
      },
    });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/admin/weekly-subscription/orders/[id]");
  }
}
