import mongoose from 'mongoose';

import type { AdminDailyOrdersQuery } from '@/lib/contracts/daily-order';
import User from '@/models/User';

export type AdminDailyOrdersMongoQuery = Record<string, unknown>;

function formatStoredDailyOrderDate(date: Date) {
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = date.getDate();
  return {
    withZero: `${monthName} ${dayNum < 10 ? `0${dayNum}` : `${dayNum}`}`,
    withoutZero: `${monthName} ${dayNum}`,
  };
}

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Normalizes menu / order date strings for equality checks (e.g. Day.date edited in admin
 * as "4/5/2026" vs order item.date "Apr 5"). Returns YYYY-MM-DD in local calendar components
 * or null if unparseable.
 */
export function normalizeDailyOrderDateForCompare(dateStr: string): string | null {
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) {
      year += 2000;
    }
    const parsed = new Date(year, month - 1, day);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return `${parsed.getFullYear()}-${pad2(month)}-${pad2(day)}`;
  }

  const monDayYearMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{2,4}))?\s*$/);
  if (monDayYearMatch) {
    const monthKey = monDayYearMatch[1].toLowerCase();
    const dayNum = Number(monDayYearMatch[2]);
    let year = monDayYearMatch[3] ? Number(monDayYearMatch[3]) : new Date().getFullYear();
    if (monDayYearMatch[3] && monDayYearMatch[3].length === 2) {
      year += 2000;
    }
    const monthIndex = MONTH_NAME_TO_INDEX[monthKey];
    if (monthIndex === undefined || Number.isNaN(dayNum)) {
      return null;
    }
    const parsed = new Date(year, monthIndex, dayNum);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getMonth() !== monthIndex ||
      parsed.getDate() !== dayNum
    ) {
      return null;
    }
    return `${parsed.getFullYear()}-${pad2(monthIndex + 1)}-${pad2(dayNum)}`;
  }

  const flex = parseFlexibleDailyOrderDate(trimmed);
  if (flex) {
    return `${flex.getFullYear()}-${pad2(flex.getMonth() + 1)}-${pad2(flex.getDate())}`;
  }

  return null;
}

function parseFlexibleDailyOrderDate(dateStr: string): Date | null {
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const mmDdMatch = trimmed.match(/^(\d{1,2})\s+(\d{1,2})$/);
  if (mmDdMatch) {
    const year = new Date().getFullYear();
    const month = Number(mmDdMatch[1]);
    const day = Number(mmDdMatch[2]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildSingleDateFormats(dateStr: string): string[] {
  const parsed = parseFlexibleDailyOrderDate(dateStr);
  if (!parsed) {
    return [dateStr];
  }

  const { withZero, withoutZero } = formatStoredDailyOrderDate(parsed);
  return [...new Set([withZero, withoutZero])];
}

/**
 * When multiple Day rows share the same calendar `date` string, prefer the one
 * referenced by exported order rows; otherwise prefer an active row.
 */
export function pickDayCandidateForExport<
  T extends { dayId: string; isActive?: boolean },
>(candidates: T[], dayIdsFromItems: Set<string>): T | null {
  if (candidates.length === 0) {
    return null;
  }

  const fromItems = candidates.filter((d) => dayIdsFromItems.has(d.dayId));
  if (fromItems.length >= 1) {
    const active = fromItems.find((d) => d.isActive !== false);
    return active ?? fromItems[0];
  }

  const active = candidates.find((d) => d.isActive !== false);
  return active ?? candidates[0];
}

function buildDateRangeFormats(startDateStr: string, endDateStr: string) {
  const startDate = parseFlexibleDailyOrderDate(startDateStr);
  const endDate = parseFlexibleDailyOrderDate(endDateStr);
  if (!startDate || !endDate || startDate > endDate) {
    return null;
  }

  const dateFormats: string[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const { withZero, withoutZero } = formatStoredDailyOrderDate(currentDate);
    dateFormats.push(withZero, withoutZero);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return [...new Set(dateFormats)];
}

export async function buildAdminDailyOrdersMongoQuery(
  filters: AdminDailyOrdersQuery
): Promise<AdminDailyOrdersMongoQuery> {
  const query: AdminDailyOrdersMongoQuery = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.area) {
    query.area = filters.area;
  }

  if (filters.deliveryDate) {
    const dateFormats = filters.deliveryDateEnd
      ? buildDateRangeFormats(filters.deliveryDate, filters.deliveryDateEnd)
      : buildSingleDateFormats(filters.deliveryDate);

    if (dateFormats && dateFormats.length > 0) {
      query.items = {
        $elemMatch: {
          date: { $in: dateFormats },
        },
      };
    }
  }

  if (filters.comboName && filters.comboName !== 'all') {
    query['items.comboName'] = filters.comboName;
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    const matchingUsers = await User.find({
      $or: [{ name: searchRegex }, { email: searchRegex }, { phoneNumber: searchRegex }],
    })
      .select('_id')
      .lean();

    const orClauses: Array<Record<string, unknown>> = [
      { orderId: searchRegex },
      { 'items.comboName': searchRegex },
      { 'items.dishes.name': searchRegex },
      { 'items.type': searchRegex },
      { 'items.day': searchRegex },
      { 'items.date': searchRegex },
      { 'deliveryAddress.streetAddress': searchRegex },
      { 'deliveryAddress.postalCode': searchRegex },
      { phoneNumber: searchRegex },
      { area: searchRegex },
    ];

    const matchingUserIds = matchingUsers.map((user) => user._id);
    if (matchingUserIds.length > 0) {
      orClauses.push({ userId: { $in: matchingUserIds } });
    }

    if (mongoose.Types.ObjectId.isValid(filters.search)) {
      orClauses.push({ userId: filters.search });
    }

    query.$or = orClauses;
  }

  return query;
}
