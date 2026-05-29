import { normalizeDailyOrderDateForCompare } from "@/lib/orders/admin-daily-query";
import { parseOrderItemDeliveryDate } from "@/lib/orders/upcoming-order-count";
import type { DailyOrderBaseItem, DailyOrderLeanItem } from "@/lib/order-data/types";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseIsoDateParts(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function isoToComparable(iso: string): number | null {
  const parts = parseIsoDateParts(iso);
  if (!parts) {
    return null;
  }

  return parts.year * 10000 + parts.month * 100 + parts.day;
}

function buildIsoDateRange(startIso: string, endIso: string): { start: number; end: number } | null {
  const start = isoToComparable(startIso);
  const end = isoToComparable(endIso);
  if (start === null || end === null) {
    return null;
  }

  return start <= end ? { start, end } : { start: end, end: start };
}

function getItemDateIso(
  item: DailyOrderLeanItem,
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

function normalizeItemDishes(
  dishes: DailyOrderLeanItem["dishes"]
): string[] {
  if (!Array.isArray(dishes)) {
    return [];
  }

  return dishes
    .map((dish) => {
      if (typeof dish === "string") {
        return dish.trim();
      }
      if (dish && typeof dish === "object" && typeof dish.name === "string") {
        return dish.name.trim();
      }
      return "";
    })
    .filter(Boolean);
}

function mapItemToBaseItem(
  item: DailyOrderLeanItem,
  dateIso: string | null
): DailyOrderBaseItem {
  return {
    day: typeof item.day === "string" ? item.day : "",
    date: typeof item.date === "string" ? item.date : "",
    dateIso,
    comboId: typeof item.comboId === "string" ? item.comboId : "",
    comboName: typeof item.comboName === "string" ? item.comboName : "",
    type: typeof item.type === "string" ? item.type : "",
    quantity: typeof item.quantity === "number" && Number.isFinite(item.quantity) ? item.quantity : 0,
    voucherType: typeof item.voucherType === "string" ? item.voucherType : "",
    dishes: normalizeItemDishes(item.dishes),
  };
}

export type FilterDailyOrderItemsParams = {
  items: DailyOrderLeanItem[] | undefined | null;
  deliveryDate?: string;
  deliveryDateEnd?: string;
  orderCreatedAt: unknown;
  now?: Date;
  sliceItemsToDeliveryDate: boolean;
};

export function filterDailyOrderItems(params: FilterDailyOrderItemsParams): DailyOrderBaseItem[] {
  const items = Array.isArray(params.items) ? params.items : [];
  const now = params.now ?? new Date();

  if (!params.sliceItemsToDeliveryDate || !params.deliveryDate) {
    return items.map((item) =>
      mapItemToBaseItem(item, getItemDateIso(item, params.orderCreatedAt, now))
    );
  }

  const range = buildIsoDateRange(
    params.deliveryDate,
    params.deliveryDateEnd ?? params.deliveryDate
  );

  if (!range) {
    return [];
  }

  return items
    .map((item) => {
      const dateIso = getItemDateIso(item, params.orderCreatedAt, now);
      return { item, dateIso };
    })
    .filter(({ dateIso }) => {
      if (!dateIso) {
        return false;
      }
      const comparable = isoToComparable(dateIso);
      return comparable !== null && comparable >= range.start && comparable <= range.end;
    })
    .map(({ item, dateIso }) => mapItemToBaseItem(item, dateIso));
}

export function getDayLabelFromItem(item: DailyOrderBaseItem | DailyOrderLeanItem): string | null {
  const day = typeof item.day === "string" ? item.day.trim() : "";
  if (!day) {
    return null;
  }

  const base = day.split("-")[0]?.trim();
  if (!base) {
    return null;
  }

  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
}
