import { NextResponse } from "next/server";

import { handleRouteError, parseSearchParams, type RouteContext } from "@/lib/api";
import { requireSelfOrAdmin } from "@/lib/auth/guards";
import { userActivityQuerySchema } from "@/lib/contracts/support-routes";
import connectToDatabase from "@/lib/db";
import Transaction from "@/models/Transaction";
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";
import WeeklyOrder from "@/models/WeeklyOrder";
import mongoose from "mongoose";

// GET handler - get all activity for a specific user
export async function GET(request: Request, context: RouteContext<{ id: string }>) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  try {
    const { actor, response } = await requireSelfOrAdmin(id);
    if (!actor || response) {
      return response;
    }

    const { data: query, error: queryError } = parseSearchParams(request, userActivityQuerySchema);
    if (queryError) {
      return queryError;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const activityType = query.type;
    const skip = (page - 1) * limit;

    await connectToDatabase();

    let userIdQuery: Record<string, unknown>;
    if (mongoose.Types.ObjectId.isValid(id)) {
      userIdQuery = {
        $or: [{ userId: new mongoose.Types.ObjectId(id) }, { userId: id }],
      };
    } else {
      userIdQuery = { userId: id };
    }

    let activities: Array<Record<string, unknown>> = [];
    let totalCount = 0;

    if (activityType === "all" || activityType === "transaction") {
      const transactions = await Transaction.find(userIdQuery).sort({ createdAt: -1 });

      activities = activities.concat(
        transactions.map((t) => {
          const isCreditAddition = new Set(["Add", "credit", "refund"]).has(String(t.type));
          return {
            ...t.toObject(),
            activityType: "transaction",
            date: t.createdAt,
            title: `${isCreditAddition ? "Added" : "Used"} ${t.amount} credits`,
            details: t.description,
          };
        })
      );
    }

    if (activityType === "all" || activityType === "credit-request") {
      const creditRequests = await CreditPurchaseRequest.find(userIdQuery).sort({ createdAt: -1 });

      activities = activities.concat(
        creditRequests.map((cr) => ({
          ...cr.toObject(),
          activityType: "credit-request",
          date: cr.createdAt,
          title: `Weekly Meal Plan Request (${cr.status})`,
          details: `Amount: $${cr.amount}, ${cr.mealPlanType ? `Plan: ${cr.mealPlanType}` : "Credits requested"}`,
        }))
      );
    }

    if (activityType === "all" || activityType === "voucher-request") {
      const voucherRequests = await VoucherPurchaseRequest.find(userIdQuery).sort({
        createdAt: -1,
      });

      activities = activities.concat(
        voucherRequests.map((vr) => ({
          ...vr.toObject(),
          activityType: "voucher-request",
          date: vr.createdAt,
          title: `${vr.type === "twoDish" ? "2-Dish" : "3-Dish"} Voucher Request (${vr.status})`,
          details: `Quantity: ${vr.quantity}, Amount: $${vr.amount}`,
        }))
      );
    }

    if (activityType === "all" || activityType === "order") {
      const orders = await DailyDeliveryOrder.find(userIdQuery).sort({ createdAt: -1 });

      activities = activities.concat(
        orders.map((o) => ({
          ...o.toObject(),
          activityType: "order",
          date: o.createdAt,
          title: `Daily Delivery Order (${o.status})`,
          details: `Order ID: ${o.orderId}, Items: ${Array.isArray(o.items) ? o.items.length : 0}`,
        }))
      );
    }

    if (activityType === "all" || activityType === "weekly-order") {
      const weeklyOrders = await WeeklyOrder.find(userIdQuery).sort({ createdAt: -1 });

      activities = activities.concat(
        weeklyOrders.map((wo) => ({
          ...wo.toObject(),
          activityType: "weekly-order",
          date: wo.createdAt,
          title: `Weekly Subscription Order (${wo.status})`,
          details: `Order ID: ${wo.orderId}, Credits: ${wo.creditCost}`,
        }))
      );
    }

    activities.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

    totalCount = activities.length;

    const paginatedActivities = activities.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    return handleRouteError(error, `GET /api/users/${id}/activity`);
  }
}
