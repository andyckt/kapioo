import { errorJson, handleRouteError, parseSearchParams, successJson } from "@/lib/api";
import { requireAdminMfa, requireUser } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { buildWeeklyEntitlementSummary } from "@/lib/orders/weekly-entitlement-display";
import { weeklySubscriptionUserHistoryQuerySchema } from "@/lib/contracts/weekly-subscription";
import WeeklyOrder from "@/models/WeeklyOrder";
import WeeklyEntitlementGroup from "@/models/WeeklyEntitlementGroup";
import User from "@/models/User";
import { resolveEffectiveOrderCustomerInfo } from "@/lib/orders/effective-customer-info";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const { data: query, error: queryError } = parseSearchParams(
      request,
      weeklySubscriptionUserHistoryQuerySchema
    );
    if (queryError || !query) {
      return queryError;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { userId: userIdParam } = query;
    const skip = (page - 1) * limit;

    if (
      actor.role !== "admin" &&
      String(userIdParam) !== String(actor.user._id) &&
      String(userIdParam) !== String(actor.user.userID)
    ) {
      return errorJson("You do not have access to this subscription history", 403);
    }

    if (
      actor.role === "admin" &&
      String(userIdParam) !== String(actor.user._id) &&
      String(userIdParam) !== String(actor.user.userID)
    ) {
      const { response: adminMfaResponse } = await requireAdminMfa(request);
      if (adminMfaResponse) {
        return adminMfaResponse;
      }
    }

    await connectToDatabase();

    const user = await User.findById(userIdParam);

    if (!user) {
      return errorJson("User not found", 404);
    }

    const orders = await WeeklyOrder.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const groupIds = Array.from(
      new Set(
        orders
          .map((order) => order.weeklyEntitlementGroupId)
          .filter((groupId): groupId is string => typeof groupId === "string" && groupId.length > 0)
      )
    );

    const entitlementGroups =
      groupIds.length > 0
        ? await WeeklyEntitlementGroup.find({ groupId: { $in: groupIds } }).lean()
        : [];
    const entitlementGroupMap = new Map(
      entitlementGroups.map((group) => [String(group.groupId), group])
    );

    const normalizedOrders = orders.map((order) => {
      const plain = typeof order.toObject === "function" ? order.toObject() : order;
      const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(plain, user);
      const weeklyEntitlementSummary = buildWeeklyEntitlementSummary(
        plain,
        entitlementGroupMap.get(String(plain.weeklyEntitlementGroupId || ""))
      );
      return {
        ...plain,
        effectiveCustomerInfo,
        weeklyEntitlementSummary,
        phoneNumber: effectiveCustomerInfo.phoneNumber,
        area: effectiveCustomerInfo.area,
        deliveryAddress: effectiveCustomerInfo.deliveryAddress,
        specialInstructions: effectiveCustomerInfo.specialInstructions,
      };
    });

    const totalOrders = await WeeklyOrder.countDocuments({ userId: user._id });

    return successJson({
      orders: normalizedOrders,
      page,
      limit,
      total: totalOrders,
      pages: Math.ceil(totalOrders / limit),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/weekly-subscription/user/history");
  }
}
