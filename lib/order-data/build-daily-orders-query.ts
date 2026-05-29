import mongoose from "mongoose";

import { buildAdminDailyOrdersMongoQuery } from "@/lib/orders/admin-daily-query";
import { assertNarrowOrderDataFilter } from "@/lib/order-data/errors";
import type {
  GetDailyOrdersBaseInput,
  NormalizedDailyOrdersFilters,
} from "@/lib/order-data/types";

export type DailyOrdersMongoQuery = Record<string, unknown>;

export function normalizeDailyOrdersFilters(
  input: GetDailyOrdersBaseInput
): NormalizedDailyOrdersFilters {
  const deliveryDate = input.deliveryDate?.trim() || undefined;
  const deliveryDateEnd = input.deliveryDateEnd?.trim() || undefined;
  const userId = input.userId?.trim() || undefined;
  const comboName =
    input.comboName && input.comboName !== "all" ? input.comboName.trim() : undefined;
  const orderIds = input.orderIds?.map((id) => id.trim()).filter(Boolean);

  return {
    deliveryDate,
    deliveryDateEnd,
    statuses: input.statuses?.length ? [...input.statuses] : undefined,
    excludeStatuses: input.excludeStatuses?.length ? [...input.excludeStatuses] : undefined,
    areas: input.areas?.length ? [...input.areas] : undefined,
    dailyDeliveryAreasOnly: input.dailyDeliveryAreasOnly === true,
    userId,
    orderIds: orderIds?.length ? orderIds : undefined,
    comboName,
    sliceItemsToDeliveryDate:
      input.sliceItemsToDeliveryDate ?? Boolean(deliveryDate),
  };
}

export async function buildDailyOrdersQuery(
  input: GetDailyOrdersBaseInput
): Promise<{ query: DailyOrdersMongoQuery; filters: NormalizedDailyOrdersFilters }> {
  assertNarrowOrderDataFilter(input);
  const filters = normalizeDailyOrdersFilters(input);

  const baseQuery = await buildAdminDailyOrdersMongoQuery({
    page: 1,
    limit: 10,
    deliveryDate: filters.deliveryDate,
    deliveryDateEnd: filters.deliveryDateEnd,
    comboName: filters.comboName,
  });

  const query: DailyOrdersMongoQuery = { ...baseQuery };

  if (filters.statuses?.length) {
    query.status = { $in: filters.statuses };
  } else if (filters.excludeStatuses?.length) {
    query.status = { $nin: filters.excludeStatuses };
  }

  if (filters.areas?.length) {
    query.area = { $in: filters.areas };
  }

  if (filters.orderIds?.length) {
    query.orderId = { $in: filters.orderIds };
  }

  if (filters.userId) {
    query.userId = mongoose.Types.ObjectId.isValid(filters.userId)
      ? new mongoose.Types.ObjectId(filters.userId)
      : filters.userId;
  }

  return { query, filters };
}
