import { NextResponse } from "next/server";

import { errorJson, handleRouteError, parseJsonBody } from "@/lib/api";
import { sendOrderSummaryEmailBodySchema } from "@/lib/contracts/support-routes";
import { requireUser } from "@/lib/auth/guards";
import connectToDatabase from '@/lib/db';
import { resolveEffectiveOrderCustomerInfo } from '@/lib/orders/effective-customer-info';
import { sendDailyOrderSummaryEmail, sendWeeklyOrderSummaryEmail, sendAdminDailyOrderSummaryEmail, sendAdminWeeklyOrderSummaryEmail } from '@/lib/services/email';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';
import User from '@/models/User';
import WeeklyOrder from '@/models/WeeklyOrder';

export const dynamic = 'force-dynamic';

interface SummaryUser {
  name?: string;
  email?: string;
  languagePreference?: 'zh' | 'en';
}

interface DailySummaryOrderRecord {
  userId: unknown;
  orderId: string;
  items?: Array<{
    day?: string;
    date?: string;
    comboId?: string;
    comboName?: string;
    type?: string;
    quantity?: number;
    voucherType?: string;
    dishes?: Array<string | { dishId?: string; name?: string }>;
  }>;
  voucherCost?: {
    twoDish?: number;
    threeDish?: number;
  };
  phoneNumber?: string;
  area?: string;
  deliveryAddress?: Record<string, string | undefined>;
  specialInstructions?: string;
}

interface WeeklySummaryOrderRecord {
  userId: unknown;
  orderId: string;
  items?: Array<{
    optionName?: string;
    quantity?: number;
    dayId?: string;
    date?: string;
  }>;
  creditCost?: number;
  mealPlanType?: string;
  voucherDeducted?: boolean;
  phoneNumber?: string;
  area?: string;
  deliveryAddress?: Record<string, string | undefined>;
  specialInstructions?: string;
}

type SummaryWeeklyMealPlanType = '6aweek' | '8aweek' | '10aweek' | '12aweek' | '16aweek';

function normalizeOrderIds(orderIds: unknown) {
  if (!Array.isArray(orderIds)) {
    return [];
  }

  return Array.from(
    new Set(
      orderIds
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function sortOrdersByRequestOrder<T extends { orderId: string }>(orders: T[], orderIds: string[]) {
  const orderMap = new Map(orders.map((order) => [order.orderId, order]));
  return orderIds.map((orderId) => orderMap.get(orderId)).filter((order): order is T => Boolean(order));
}

function normalizeDailySummaryItems(order: DailySummaryOrderRecord) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.map((item) => ({
    day: item.day || '',
    date: item.date || '',
    comboId: item.comboId || '',
    comboName: item.comboName || '',
    type: item.type || '',
    quantity: Number(item.quantity) || 0,
    voucherType: item.voucherType || '',
    dishes: Array.isArray(item.dishes)
      ? item.dishes.map((dish) =>
          typeof dish === 'string'
            ? { dishId: '', name: dish }
            : { dishId: dish.dishId || '', name: dish.name || '' }
        )
      : undefined,
  }));
}

function normalizeWeeklySummaryItems(order: WeeklySummaryOrderRecord) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.map((item) => ({
    optionName: item.optionName || '',
    quantity: Number(item.quantity) || 0,
    dayId: item.dayId || '',
    date: item.date || '',
  }));
}

function normalizeWeeklyMealPlanType(value?: string): SummaryWeeklyMealPlanType | undefined {
  if (value === '6aweek' || value === '8aweek' || value === '10aweek' || value === '12aweek' || value === '16aweek') {
    return value;
  }

  return undefined;
}

// POST handler - send order summary email
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const { data, error: bodyError } = await parseJsonBody(request, sendOrderSummaryEmailBodySchema);
    if (bodyError) {
      return bodyError;
    }

    const { type } = data;
    const orderIds = normalizeOrderIds(data.orderIds);

    await connectToDatabase();
    
    try {
      if (type === 'daily') {
        const dailyOrders = (await DailyDeliveryOrder.find({
          orderId: { $in: orderIds }
        }).lean()) as DailySummaryOrderRecord[];

        if (dailyOrders.length !== orderIds.length) {
          return errorJson("One or more orders were not found", 404);
        }

        const orderedDailyOrders = sortOrdersByRequestOrder(dailyOrders, orderIds);
        const dailyUserIds = new Set(orderedDailyOrders.map((order) => String(order.userId)));
        if (dailyUserIds.size !== 1) {
          return errorJson("Order summary emails must target a single user", 400);
        }

        const orderUserId = String(orderedDailyOrders[0].userId);
        if (actor.role !== "admin" && String(actor.user._id) !== orderUserId) {
          return errorJson("You do not have access to these orders", 403);
        }

        const user = (await User.findById(orderUserId)
          .select("name email languagePreference")
          .lean()) as SummaryUser | null;
        if (!user?.email) {
          return errorJson("Order user not found", 404);
        }

        const summaryCustomerInfo = resolveEffectiveOrderCustomerInfo(orderedDailyOrders[0], user);
        const summaryOrders = orderedDailyOrders.map((order) => ({
          orderId: order.orderId,
          items: normalizeDailySummaryItems(order),
          voucherCost: {
            twoDish: Number(order.voucherCost?.twoDish) || 0,
            threeDish: Number(order.voucherCost?.threeDish) || 0,
          },
        }));

        await sendDailyOrderSummaryEmail(
          user.email,
          summaryCustomerInfo.name || user.name || '',
          summaryOrders,
          summaryCustomerInfo.deliveryAddress,
          summaryCustomerInfo.area,
          summaryCustomerInfo.phoneNumber,
          summaryCustomerInfo.specialInstructions,
          user.languagePreference || 'zh'
        );
        
        await sendAdminDailyOrderSummaryEmail(
          summaryCustomerInfo.name || user.name || '',
          user.email,
          orderUserId,
          summaryOrders,
          summaryCustomerInfo.deliveryAddress,
          summaryCustomerInfo.area,
          summaryCustomerInfo.phoneNumber,
          summaryCustomerInfo.specialInstructions
        );
      } else if (type === 'weekly') {
        const weeklyOrders = (await WeeklyOrder.find({
          orderId: { $in: orderIds }
        }).lean()) as WeeklySummaryOrderRecord[];

        if (weeklyOrders.length !== orderIds.length) {
          return errorJson("One or more orders were not found", 404);
        }

        const orderedWeeklyOrders = sortOrdersByRequestOrder(weeklyOrders, orderIds);
        const weeklyUserIds = new Set(orderedWeeklyOrders.map((order) => String(order.userId)));
        if (weeklyUserIds.size !== 1) {
          return errorJson("Order summary emails must target a single user", 400);
        }

        const orderUserId = String(orderedWeeklyOrders[0].userId);
        if (actor.role !== "admin" && String(actor.user._id) !== orderUserId) {
          return errorJson("You do not have access to these orders", 403);
        }

        const user = (await User.findById(orderUserId)
          .select("name email languagePreference")
          .lean()) as SummaryUser | null;
        if (!user?.email) {
          return errorJson("Order user not found", 404);
        }

        const summaryCustomerInfo = resolveEffectiveOrderCustomerInfo(orderedWeeklyOrders[0], user);
        const summaryOrders = orderedWeeklyOrders.map((order) => ({
          orderId: order.orderId,
          items: normalizeWeeklySummaryItems(order),
          totalCredits: Number(order.creditCost) || 0,
          mealPlanType: normalizeWeeklyMealPlanType(order.mealPlanType),
          voucherDeducted: Boolean(order.voucherDeducted),
        }));

        await sendWeeklyOrderSummaryEmail(
          user.email,
          summaryCustomerInfo.name || user.name || '',
          summaryOrders,
          summaryCustomerInfo.deliveryAddress,
          summaryCustomerInfo.area,
          summaryCustomerInfo.phoneNumber,
          summaryCustomerInfo.specialInstructions,
          user.languagePreference || 'zh'
        );
        
        await sendAdminWeeklyOrderSummaryEmail(
          summaryCustomerInfo.name || user.name || '',
          user.email,
          orderUserId,
          summaryOrders,
          summaryCustomerInfo.deliveryAddress,
          summaryCustomerInfo.area,
          summaryCustomerInfo.phoneNumber,
          summaryCustomerInfo.specialInstructions
        );
      } else {
        return errorJson('Invalid type. Must be "daily" or "weekly"', 400);
      }

      return NextResponse.json({
        success: true,
        message: "Order summary emails sent successfully",
      });
    } catch (emailError: unknown) {
      const message =
        emailError instanceof Error ? emailError.message : "Unknown error";
      return errorJson(`Failed to send email: ${message}`, 500);
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/send-order-summary-email");
  }
}
