import mongoose from "mongoose";

import connectToDatabase from "@/lib/db";
import { normalizeDailyOrderDateForCompare } from "@/lib/orders/admin-daily-query";
import { parseOrderItemDeliveryDate } from "@/lib/orders/upcoming-order-count";
import Day from "@/models/Day";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import WeeklyDeliveryDay from "@/models/WeeklyDeliveryDay";
import WeeklyOrder from "@/models/WeeklyOrder";

const NEXT_WEEK_PLACED_ORDER_STATUSES = new Set(["pending", "confirmed"]);

type OrderItemLike = {
  date?: unknown;
  deliveryDate?: unknown;
};

type OrderLike = {
  userId?: unknown;
  status?: unknown;
  items?: unknown;
  createdAt?: unknown;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function menuDateStringToIso(rawDate: unknown, now: Date = new Date()): string | null {
  if (typeof rawDate !== "string") {
    return null;
  }

  const trimmed = rawDate.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeDailyOrderDateForCompare(trimmed);
  if (normalized) {
    return normalized;
  }

  const parsed = parseOrderItemDeliveryDate(trimmed, now, now);
  return parsed ? toIsoDateString(parsed) : null;
}

function getOrderItemDateIso(
  item: OrderItemLike,
  orderCreatedAt: unknown,
  now: Date
): string | null {
  const rawDate =
    typeof item.date === "string"
      ? item.date
      : typeof item.deliveryDate === "string"
        ? item.deliveryDate
        : "";

  if (!rawDate.trim()) {
    return null;
  }

  const normalized = normalizeDailyOrderDateForCompare(rawDate.trim());
  if (normalized) {
    return normalized;
  }

  const parsed = parseOrderItemDeliveryDate(rawDate, orderCreatedAt, now);
  return parsed ? toIsoDateString(parsed) : null;
}

export async function getNextWeekMenuDateIsos(now: Date = new Date()): Promise<string[]> {
  await connectToDatabase();

  const [dailyDays, weeklyDays] = await Promise.all([
    Day.find({ week: 2, isActive: true }).select("date").lean(),
    WeeklyDeliveryDay.find({ weekOffset: 1, active: true }).select("date").lean(),
  ]);

  const isos = new Set<string>();

  for (const day of dailyDays) {
    const iso = menuDateStringToIso(day.date, now);
    if (iso) {
      isos.add(iso);
    }
  }

  for (const day of weeklyDays) {
    const iso = menuDateStringToIso(day.date, now);
    if (iso) {
      isos.add(iso);
    }
  }

  return [...isos].sort();
}

export function orderHasNextWeekMenuPlacement(
  order: OrderLike,
  nextWeekDateIsos: Set<string>,
  now: Date = new Date()
): boolean {
  if (typeof order.status !== "string" || !NEXT_WEEK_PLACED_ORDER_STATUSES.has(order.status)) {
    return false;
  }

  if (!Array.isArray(order.items)) {
    return false;
  }

  return order.items.some((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const iso = getOrderItemDateIso(item as OrderItemLike, order.createdAt, now);
    return iso ? nextWeekDateIsos.has(iso) : false;
  });
}

export type GetUserIdsWithNextWeekMenuOrdersResult = {
  userIds: string[];
  nextWeekMenuDates: string[];
  ordersChecked: number;
};

export async function getUserIdsWithNextWeekMenuOrders(input?: {
  userIds?: string[];
  now?: Date;
}): Promise<GetUserIdsWithNextWeekMenuOrdersResult> {
  const now = input?.now ?? new Date();
  const nextWeekMenuDates = await getNextWeekMenuDateIsos(now);
  const nextWeekDateIsos = new Set(nextWeekMenuDates);

  if (nextWeekDateIsos.size === 0) {
    return { userIds: [], nextWeekMenuDates, ordersChecked: 0 };
  }

  const orderQuery: Record<string, unknown> = {
    status: { $in: ["pending", "confirmed"] },
  };

  const candidateUserIds = (input?.userIds ?? []).filter(Boolean);
  if (candidateUserIds.length > 0) {
    orderQuery.userId = {
      $in: candidateUserIds.map((id) =>
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
      ),
    };
  }

  const [dailyOrders, weeklyOrders] = await Promise.all([
    DailyDeliveryOrder.find(orderQuery).select("userId status items createdAt").lean(),
    WeeklyOrder.find(orderQuery).select("userId status items createdAt").lean(),
  ]);

  const allOrders = [...dailyOrders, ...weeklyOrders];
  const matchedUserIds = new Set<string>();

  for (const order of allOrders) {
    if (!orderHasNextWeekMenuPlacement(order, nextWeekDateIsos, now)) {
      continue;
    }

    if (order.userId) {
      matchedUserIds.add(String(order.userId));
    }
  }

  return {
    userIds: [...matchedUserIds],
    nextWeekMenuDates,
    ordersChecked: allOrders.length,
  };
}
