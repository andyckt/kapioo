import type { DailyOrderStatus } from "@/lib/contracts/daily-order";
import connectToDatabase from "@/lib/db";
import { buildSingleDateFormats, normalizeDailyOrderDateForCompare } from "@/lib/orders/admin-daily-query";
import { parseOrderItemDeliveryDate } from "@/lib/orders/upcoming-order-count";
import WeeklyOrder from "@/models/WeeklyOrder";

import { KITCHEN_INCLUDE_STATUSES, type WeeklyOrderForKitchen, type WeeklyOrderItemForKitchen } from "./types";

type WeeklyOrderLeanItem = {
  dayId?: string;
  optionId?: string;
  optionName?: string;
  quantity?: number;
  date?: string;
};

type WeeklyOrderLeanDocument = {
  orderId?: string;
  status?: string;
  items?: WeeklyOrderLeanItem[];
  createdAt?: Date | string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getWeeklyItemDateIso(
  item: WeeklyOrderLeanItem,
  orderCreatedAt: unknown,
  now: Date
): string | null {
  const rawDate = typeof item.date === "string" ? item.date.trim() : "";
  if (!rawDate) {
    return null;
  }

  const normalized = normalizeDailyOrderDateForCompare(rawDate);
  if (normalized) {
    return normalized;
  }

  const parsed = parseOrderItemDeliveryDate(rawDate, orderCreatedAt, now);
  return parsed ? toIsoDateString(parsed) : null;
}

function mapWeeklyItem(item: WeeklyOrderLeanItem): WeeklyOrderItemForKitchen {
  return {
    dayId: typeof item.dayId === "string" ? item.dayId : "",
    optionId: typeof item.optionId === "string" ? item.optionId : "",
    optionName: typeof item.optionName === "string" ? item.optionName : "",
    quantity:
      typeof item.quantity === "number" && Number.isFinite(item.quantity) ? item.quantity : 0,
    date: typeof item.date === "string" ? item.date : "",
  };
}

export function filterWeeklyOrderItems(params: {
  items: WeeklyOrderLeanItem[] | undefined | null;
  deliveryDateIso: string;
  orderCreatedAt: unknown;
  now?: Date;
}): WeeklyOrderItemForKitchen[] {
  const items = Array.isArray(params.items) ? params.items : [];
  const now = params.now ?? new Date();
  const targetIso = params.deliveryDateIso.trim();

  return items
    .map((item) => ({
      item,
      dateIso: getWeeklyItemDateIso(item, params.orderCreatedAt, now),
    }))
    .filter(({ dateIso }) => dateIso === targetIso)
    .map(({ item }) => mapWeeklyItem(item));
}

export type WeeklyOrdersForDateResult = {
  orders: WeeklyOrderForKitchen[];
  excludedByStatus: {
    cancelled: number;
    refunded: number;
    wrongDate: number;
  };
};

function buildDateMatchQuery(deliveryDateIso: string) {
  const dateFormats = buildSingleDateFormats(deliveryDateIso);
  return {
    items: {
      $elemMatch: {
        date: { $in: dateFormats },
      },
    },
  };
}

export async function getWeeklyOrdersForDate(
  deliveryDateIso: string,
  now: Date = new Date()
): Promise<WeeklyOrdersForDateResult> {
  await connectToDatabase();

  const dateMatch = buildDateMatchQuery(deliveryDateIso);

  const [includedOrders, cancelledOrders, refundedOrders] = await Promise.all([
    WeeklyOrder.find({
      ...dateMatch,
      status: { $in: KITCHEN_INCLUDE_STATUSES },
    }).lean(),
    WeeklyOrder.find({
      ...dateMatch,
      status: "cancelled",
    }).lean(),
    WeeklyOrder.find({
      ...dateMatch,
      status: "refunded",
    }).lean(),
  ]);

  const orders: WeeklyOrderForKitchen[] = [];
  let wrongDate = 0;

  for (const rawOrder of includedOrders as WeeklyOrderLeanDocument[]) {
    const slicedItems = filterWeeklyOrderItems({
      items: rawOrder.items,
      deliveryDateIso,
      orderCreatedAt: rawOrder.createdAt,
      now,
    });

    if (slicedItems.length === 0) {
      wrongDate += 1;
      continue;
    }

    orders.push({
      orderId: String(rawOrder.orderId ?? ""),
      status: String(rawOrder.status ?? "pending") as DailyOrderStatus,
      items: slicedItems,
    });
  }

  return {
    orders,
    excludedByStatus: {
      cancelled: cancelledOrders.length,
      refunded: refundedOrders.length,
      wrongDate,
    },
  };
}
