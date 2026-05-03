const ACTIVE_UPCOMING_ORDER_STATUSES = new Set(["pending", "confirmed", "delivery"]);

const MONTH_INDEX_BY_NAME = new Map<string, number>(
  [
    ["jan", 0],
    ["january", 0],
    ["feb", 1],
    ["february", 1],
    ["mar", 2],
    ["march", 2],
    ["apr", 3],
    ["april", 3],
    ["may", 4],
    ["jun", 5],
    ["june", 5],
    ["jul", 6],
    ["july", 6],
    ["aug", 7],
    ["august", 7],
    ["sep", 8],
    ["sept", 8],
    ["september", 8],
    ["oct", 9],
    ["october", 9],
    ["nov", 10],
    ["november", 10],
    ["dec", 11],
    ["december", 11],
  ] as const
);

const DAY_MS = 24 * 60 * 60 * 1000;

type OrderItemLike = {
  date?: unknown;
  deliveryDate?: unknown;
};

type OrderLike = {
  status?: unknown;
  items?: unknown;
  createdAt?: unknown;
};

function asDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function getTorontoDateParts(date: Date) {
  const torontoDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  return {
    year: torontoDate.getFullYear(),
    month: torontoDate.getMonth(),
    day: torontoDate.getDate(),
  };
}

function getTorontoStartOfToday(referenceDate: Date) {
  const { year, month, day } = getTorontoDateParts(referenceDate);
  return new Date(year, month, day);
}

function inferYearForMonthDay(month: number, day: number, createdAt: unknown, now: Date) {
  const reference = asDate(createdAt) ?? now;
  const { year, month: createdMonth, day: createdDay } = getTorontoDateParts(reference);
  const createdStart = new Date(year, createdMonth, createdDay);
  const candidate = new Date(year, month, day);
  const daysFromCreatedAt = (candidate.getTime() - createdStart.getTime()) / DAY_MS;

  // Stored order item dates historically omit the year. Orders are created for
  // nearby delivery dates, so only roll across the year boundary when needed.
  if (daysFromCreatedAt < -45) {
    return year + 1;
  }

  if (daysFromCreatedAt > 320) {
    return year - 1;
  }

  return year;
}

export function parseOrderItemDeliveryDate(
  rawDate: unknown,
  createdAt: unknown,
  now: Date = new Date()
) {
  if (typeof rawDate !== "string") {
    return null;
  }

  const value = rawDate.trim();
  if (!value) {
    return null;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const monthDayMatch = value.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
  if (monthDayMatch) {
    const [, monthName, dayValue, explicitYear] = monthDayMatch;
    const month = MONTH_INDEX_BY_NAME.get(monthName.toLowerCase());
    const day = Number(dayValue);

    if (month === undefined || !Number.isInteger(day) || day < 1 || day > 31) {
      return null;
    }

    const year = explicitYear ? Number(explicitYear) : inferYearForMonthDay(month, day, createdAt, now);
    const parsed = new Date(year, month, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function orderHasUpcomingDelivery(order: OrderLike, now: Date = new Date()) {
  if (typeof order.status !== "string" || !ACTIVE_UPCOMING_ORDER_STATUSES.has(order.status)) {
    return false;
  }

  if (!Array.isArray(order.items)) {
    return false;
  }

  const today = getTorontoStartOfToday(now);

  return order.items.some((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const orderItem = item as OrderItemLike;
    const rawDate = typeof orderItem.date === "string" ? orderItem.date : orderItem.deliveryDate;
    const deliveryDate = parseOrderItemDeliveryDate(rawDate, order.createdAt, now);
    return deliveryDate ? deliveryDate.getTime() >= today.getTime() : false;
  });
}

export function countUpcomingOrders(orders: OrderLike[], now: Date = new Date()) {
  return orders.reduce((count, order) => count + (orderHasUpcomingDelivery(order, now) ? 1 : 0), 0);
}
