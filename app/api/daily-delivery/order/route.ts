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
  type CreateDailyOrderItemInput,
  preprocessDailyOrderCreateBody,
  userDailyOrdersListQuerySchema,
} from "@/lib/contracts/daily-order";
import connectToDatabase from "@/lib/db";
import { resolveEffectiveOrderCustomerInfo } from "@/lib/orders/effective-customer-info";
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

    const user = await User.findById(effectiveUserId);
    if (!user) {
      return errorJson("User not found", 404);
    }

    const vouchersNeeded = data.items.reduce(
      (totals: { twoDish: number; threeDish: number }, item: CreateDailyOrderItemInput) => {
        if (item.voucherType === "twoDish") {
          totals.twoDish += item.quantity as number;
        } else if (item.voucherType === "threeDish") {
          totals.threeDish += item.quantity as number;
        }
        return totals;
      },
      { twoDish: 0, threeDish: 0 }
    );

    if (
      user.twoDishVoucher < vouchersNeeded.twoDish ||
      user.threeDishVoucher < vouchersNeeded.threeDish
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient vouchers",
          required: vouchersNeeded,
          available: {
            twoDish: user.twoDishVoucher,
            threeDish: user.threeDishVoucher,
          },
        },
        { status: 400 }
      );
    }

    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000);
    const orderId = `DD-${randomNumbers}`;

    const totalVouchers = {
      twoDish: vouchersNeeded.twoDish,
      threeDish: vouchersNeeded.threeDish,
    };

    const itemsToSave = data.items.map((item: CreateDailyOrderItemInput) => ({
      day: String(item.day ?? ""),
      date: String(item.date ?? ""),
      comboId: String(item.comboId ?? ""),
      comboName: String(item.comboName ?? ""),
      type: String(item.type ?? ""),
      quantity: Number(item.quantity ?? 0),
      voucherType: String(item.voucherType ?? ""),
      dishes: Array.isArray(item.dishes) ? item.dishes : [],
    }));

    let dailyOrder;
    try {
      dailyOrder = await DailyDeliveryOrder.create({
        userId: user._id,
        orderId,
        items: itemsToSave,
        status: "pending",
        voucherCost: totalVouchers,
        taxIncluded: data.taxIncluded ?? true,
        taxRate: data.taxRate ?? 0.13,
        specialInstructions: data.specialInstructions ?? "",
        deliveryAddress: data.deliveryAddress ?? {},
        phoneNumber: data.phoneNumber ?? "",
        area: data.area ?? "",
      });
    } catch (createErr: unknown) {
      const message =
        createErr instanceof Error ? createErr.message : "Unknown error";
      return errorJson("Failed to create order", 500, { details: message });
    }

    const updateFields: {
      $inc: { twoDishVoucher: number; threeDishVoucher: number };
      $set?: { phone: string };
    } = {
      $inc: {
        twoDishVoucher: -vouchersNeeded.twoDish,
        threeDishVoucher: -vouchersNeeded.threeDish,
      },
    };

    if (data.phoneNumber && String(data.phoneNumber).trim()) {
      updateFields.$set = { phone: String(data.phoneNumber).trim() };
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, updateFields, { new: true });

    const responseData = {
      success: true,
      data: dailyOrder,
      remainingVouchers: {
        twoDish: updatedUser!.twoDishVoucher,
        threeDish: updatedUser!.threeDishVoucher,
      },
    };

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, responseData);
      setTimeout(() => {
        idempotencyStore.delete(idempotencyKey);
      }, 3600000);
    }

    return NextResponse.json(responseData, { status: 200 });
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
