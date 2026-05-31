import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import connectToDatabase from "@/lib/db";
import { getDailyOrdersBase } from "@/lib/order-data/get-daily-orders-base";
import { buildSingleDateFormats } from "@/lib/orders/admin-daily-query";

import { aggregateDailyCombos } from "./aggregate-daily-combos";
import { aggregateWeeklyCombos } from "./aggregate-weekly-combos";
import { getWeeklyOrdersForDate } from "./get-weekly-orders-for-date";
import {
  KITCHEN_INCLUDE_STATUSES,
  type KitchenExcludedOrderSummary,
  type KitchenOrdersResponse,
  type KitchenSourceFilter,
} from "./types";

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

async function countDailyExcludedByStatus(deliveryDateIso: string): Promise<{
  cancelled: number;
  refunded: number;
}> {
  await connectToDatabase();
  const dateMatch = buildDateMatchQuery(deliveryDateIso);

  const [cancelled, refunded] = await Promise.all([
    DailyDeliveryOrder.countDocuments({
      ...dateMatch,
      status: "cancelled",
    }),
    DailyDeliveryOrder.countDocuments({
      ...dateMatch,
      status: "refunded",
    }),
  ]);

  return { cancelled, refunded };
}

function emptyDailySection(): KitchenOrdersResponse["daily"] {
  return {
    source_type: "daily",
    orders_count: 0,
    combos: [],
  };
}

function emptyWeeklySection(): KitchenOrdersResponse["weekly"] {
  return {
    source_type: "weekly",
    orders_count: 0,
    combos: [],
  };
}

export type GetOrdersForKitchenPrepInput = {
  deliveryDateIso: string;
  source?: KitchenSourceFilter;
  now?: Date;
};

export async function getOrdersForKitchenPrep(
  input: GetOrdersForKitchenPrepInput
): Promise<KitchenOrdersResponse> {
  const source = input.source ?? "all";
  const now = input.now ?? new Date();
  const deliveryDateIso = input.deliveryDateIso.trim();

  const warnings: string[] = [];
  const includedOrderIds: string[] = [];

  let dailySection = emptyDailySection();
  let weeklySection = emptyWeeklySection();
  const excludedSummary: KitchenExcludedOrderSummary = {
    cancelled: 0,
    refunded: 0,
    unpaid: 0,
    wrong_date: 0,
  };

  if (source === "daily" || source === "all") {
    const [dailyResult, dailyExcluded] = await Promise.all([
      getDailyOrdersBase({
        deliveryDate: deliveryDateIso,
        statuses: KITCHEN_INCLUDE_STATUSES,
        sliceItemsToDeliveryDate: true,
        includeValidation: false,
        now,
      }),
      countDailyExcludedByStatus(deliveryDateIso),
    ]);

    const includedDailyOrders = dailyResult.orders.filter((order) => {
      if (order.items.length === 0) {
        excludedSummary.wrong_date += 1;
        return false;
      }
      return true;
    });

    const { combos, warnings: dailyWarnings } = aggregateDailyCombos(includedDailyOrders);
    warnings.push(...dailyWarnings);

    for (const order of includedDailyOrders) {
      includedOrderIds.push(order.orderId);
    }

    dailySection = {
      source_type: "daily",
      orders_count: includedDailyOrders.length,
      combos,
    };

    excludedSummary.cancelled += dailyExcluded.cancelled;
    excludedSummary.refunded += dailyExcluded.refunded;
  }

  if (source === "weekly" || source === "all") {
    const weeklyResult = await getWeeklyOrdersForDate(deliveryDateIso, now);
    const weeklyItems = weeklyResult.orders.flatMap((order) => order.items);

    for (const order of weeklyResult.orders) {
      includedOrderIds.push(order.orderId);
    }

    weeklySection = {
      source_type: "weekly",
      orders_count: weeklyResult.orders.length,
      combos: aggregateWeeklyCombos(weeklyItems),
    };

    excludedSummary.cancelled += weeklyResult.excludedByStatus.cancelled;
    excludedSummary.refunded += weeklyResult.excludedByStatus.refunded;
    excludedSummary.wrong_date += weeklyResult.excludedByStatus.wrongDate;
  }

  return {
    target_delivery_date: deliveryDateIso,
    daily: dailySection,
    weekly: weeklySection,
    warnings,
    debug: {
      included_order_ids: includedOrderIds,
      excluded_order_summary: excludedSummary,
    },
  };
}
