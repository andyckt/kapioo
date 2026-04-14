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

function buildSingleDateFormats(dateStr: string) {
  const parsed = parseFlexibleDailyOrderDate(dateStr);
  if (!parsed) {
    return [dateStr];
  }

  const { withZero, withoutZero } = formatStoredDailyOrderDate(parsed);
  return [...new Set([withZero, withoutZero])];
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
