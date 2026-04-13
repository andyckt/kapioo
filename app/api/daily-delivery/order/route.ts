import { NextResponse } from "next/server";

import {
  errorJson,
  handleRouteError,
  parseInput,
  parseSearchParams,
  successJson,
} from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import {
  createDailyOrderBodySchema,
  preprocessDailyOrderCreateBody,
  userDailyOrdersListQuerySchema,
} from "@/lib/contracts/daily-order";
import connectToDatabase from "@/lib/db";
import { resolveEffectiveOrderCustomerInfo } from "@/lib/orders/effective-customer-info";
import {
  InsufficientDailyVouchersError,
  placeDailyOrder,
} from "@/lib/orders/place-daily-order";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import User from "@/models/User";

const idempotencyStore = new Map<string, unknown>();

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return errorJson("Invalid request data", 400, {
        details: "Request body is not valid JSON",
      });
    }

    const { data, error } = parseInput(preprocessDailyOrderCreateBody(rawBody), createDailyOrderBodySchema);
    if (error) {
      return error;
    }

    const idempotencyKey = data.idempotencyKey;
    if (idempotencyKey) {
      if (idempotencyStore.has(idempotencyKey)) {
        const cachedResponse = idempotencyStore.get(idempotencyKey);
        return NextResponse.json(cachedResponse, { status: 200 });
      }
    }

    const effectiveUserId =
      actor.role === "admin" && data.userId ? data.userId : String(actor.user._id);

    if (
      actor.role !== "admin" &&
      data.userId &&
      String(data.userId) !== String(actor.user._id) &&
      String(data.userId) !== String(actor.user.userID)
    ) {
      return errorJson("You cannot create orders for another user", 403);
    }

    try {
      const { order, updatedUser } = await placeDailyOrder({
        userId: effectiveUserId,
        data,
        actor,
        request,
      });

      const responseData = {
        success: true,
        data: order,
        remainingVouchers: {
          twoDish: updatedUser.twoDishVoucher,
          threeDish: updatedUser.threeDishVoucher,
        },
      };

      if (idempotencyKey) {
        idempotencyStore.set(idempotencyKey, responseData);
        setTimeout(() => {
          idempotencyStore.delete(idempotencyKey);
        }, 3600000);
      }

      return NextResponse.json(responseData, { status: 200 });
    } catch (error) {
      if (error instanceof InsufficientDailyVouchersError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            required: error.required,
            available: error.available,
          },
          { status: error.status }
        );
      }

      throw error;
    }
  } catch (error: unknown) {
    return handleRouteError(error, "POST /api/daily-delivery/order");
  }
}

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const { data: queryData, error } = parseSearchParams(request, userDailyOrdersListQuerySchema);
    if (error) {
      return error;
    }

    const { userId, status, page: pageParam, limit: limitParam } = queryData;
    const page = pageParam ?? 1;
    const limit = limitParam ?? 10;
    const skip = (page - 1) * limit;

    if (!userId && actor.role !== "admin") {
      return errorJson("User ID is required", 400);
    }

    if (
      actor.role !== "admin" &&
      userId &&
      String(userId) !== String(actor.user._id) &&
      String(userId) !== String(actor.user.userID)
    ) {
      return errorJson("You do not have access to these orders", 403);
    }

    if (!userId && actor.role === "admin") {
      return errorJson("User ID is required", 400);
    }

    const mongoQuery: Record<string, unknown> = { userId };
    if (status) {
      mongoQuery.status = status;
    }

    const orders = await DailyDeliveryOrder.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const user = await User.findById(userId).select("name email").lean();
    const normalizedOrders = orders.map((order) => {
      const plain = typeof order.toObject === "function" ? order.toObject() : order;
      const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(plain, user as never);
      return {
        ...plain,
        effectiveCustomerInfo,
        phoneNumber: effectiveCustomerInfo.phoneNumber,
        area: effectiveCustomerInfo.area,
        deliveryAddress: effectiveCustomerInfo.deliveryAddress,
        specialInstructions: effectiveCustomerInfo.specialInstructions,
      };
    });

    const totalOrders = await DailyDeliveryOrder.countDocuments(mongoQuery);

    return successJson({
      orders: normalizedOrders,
      page,
      limit,
      total: totalOrders,
      pages: Math.ceil(totalOrders / limit),
    });
  } catch (error: unknown) {
    return handleRouteError(error, "GET /api/daily-delivery/order");
  }
}
