import type { DailyOrderStatus } from "@/lib/contracts/daily-order";
import { OrderDataError } from "@/lib/order-data/errors";
import { getDailyOrdersBase } from "@/lib/order-data/get-daily-orders-base";
import type { DailyOrderBaseExclusion } from "@/lib/order-data/types";
import { mapOrderToRoutingStop } from "@/lib/agents/delivery/map-order-to-routing-stop";
import {
  DEFAULT_ROUTING_PROFILE_ID,
  DEFAULT_ROUTING_STATUSES,
  type GetDeliveryOrdersForRoutingInput,
  type GetDeliveryOrdersForRoutingResult,
  type RoutingInvalidOrder,
  type RoutingIssue,
  type RoutingOrderWarning,
  type RoutingOrdersSummary,
  type RoutingStop,
} from "@/lib/agents/delivery/types";
import { validateRoutingOrder } from "@/lib/agents/delivery/validate-routing-order";

function assertDeliveryDate(deliveryDate?: string): string {
  const trimmed = deliveryDate?.trim();
  if (!trimmed) {
    throw new OrderDataError("deliveryDate is required for routing order queries", {
      code: "ORDER_DATA_UNSAFE_QUERY",
    });
  }
  return trimmed;
}

function mapExcludedToInvalid(excluded: DailyOrderBaseExclusion): RoutingInvalidOrder {
  const error: RoutingIssue = {
    code: "ROUTING_NON_DAILY_DELIVERY_AREA",
    field: "area",
    message: "Order area is outside daily delivery service areas",
  };

  return {
    orderId: excluded.orderId,
    mongoId: excluded.mongoId,
    errors: [error],
    warnings: [],
  };
}

function incrementCount<T extends string>(
  record: Partial<Record<T, number>>,
  key: T | undefined,
  fallback: T
) {
  const resolved = key ?? fallback;
  record[resolved] = (record[resolved] ?? 0) + 1;
}

function buildRoutingSummary(params: {
  stops: RoutingStop[];
  invalid: RoutingInvalidOrder[];
  warnings: RoutingOrderWarning[];
}): RoutingOrdersSummary {
  const { stops, invalid, warnings } = params;
  const byArea: Record<string, number> = {};
  const byStatus: Partial<Record<DailyOrderStatus, number>> = {};

  for (const stop of stops) {
    incrementCount(byArea, stop.area || undefined, "Unknown");
    incrementCount(byStatus, stop.status, "pending");
  }

  for (const entry of invalid) {
    incrementCount(byArea, entry.area || undefined, "Unknown");
  }

  return {
    totalOrders: stops.length + invalid.length,
    validStops: stops.length,
    invalidStops: invalid.length,
    warningStops: warnings.length,
    byArea,
    byStatus,
    totalMealQuantity: stops.reduce((sum, stop) => sum + stop.totalMealQuantity, 0),
  };
}

export async function getDeliveryOrdersForRouting(
  input: GetDeliveryOrdersForRoutingInput
): Promise<GetDeliveryOrdersForRoutingResult> {
  const deliveryDate = assertDeliveryDate(input.deliveryDate);
  const profileId = input.profileId?.trim() || DEFAULT_ROUTING_PROFILE_ID;
  const statuses = input.statuses?.length ? input.statuses : DEFAULT_ROUTING_STATUSES;

  const baseResult = await getDailyOrdersBase({
    deliveryDate,
    statuses,
    areas: input.areas,
    dailyDeliveryAreasOnly: true,
    sliceItemsToDeliveryDate: true,
    now: input.now,
    includeValidation: true,
  });

  const invalid: RoutingInvalidOrder[] = (baseResult.excluded ?? []).map(mapExcludedToInvalid);
  const stops: RoutingStop[] = [];
  const warnings: RoutingOrderWarning[] = [];

  for (const order of baseResult.orders) {
    const validation = validateRoutingOrder(order);

    if (!validation.valid) {
      invalid.push({
        orderId: order.orderId,
        mongoId: order.mongoId,
        customerName: order.customer.name || undefined,
        area: order.customer.area || undefined,
        errors: validation.errors,
        warnings: validation.warnings,
      });
      continue;
    }

    stops.push(mapOrderToRoutingStop(order, deliveryDate));

    if (validation.warnings.length > 0) {
      warnings.push({
        orderId: order.orderId,
        warnings: validation.warnings,
      });
    }
  }

  return {
    deliveryDate,
    profileId,
    queriedAt: baseResult.queriedAt,
    timezone: baseResult.timezone,
    summary: buildRoutingSummary({ stops, invalid, warnings }),
    stops,
    invalid,
    warnings,
    sourceOrderResultSummary: {
      orderCount: baseResult.summary.orderCount,
      excludedCount: baseResult.excluded?.length ?? 0,
      itemCount: baseResult.summary.itemCount,
      totalMealQuantity: baseResult.summary.totalMealQuantity,
      byStatus: baseResult.summary.byStatus,
      byArea: baseResult.summary.byArea,
    },
  };
}
