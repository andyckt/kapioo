import { getDeliveryOrdersForRouting } from "@/lib/agents/delivery/get-delivery-orders-for-routing";
import type { DeliveryAgentPreviewResponse } from "@/lib/contracts/delivery-agent";
import { getDailyOrdersBase } from "@/lib/order-data/get-daily-orders-base";

const PREVIEW_NOTES =
  "Order preview only. Route planning and Route Optimizer integration will be added in a future milestone.";

function buildByAreaFromValidStops(
  stops: Array<{ area: string }>
): Record<string, number> {
  const byArea: Record<string, number> = {};

  for (const stop of stops) {
    const area = stop.area?.trim() || "Unknown";
    byArea[area] = (byArea[area] ?? 0) + 1;
  }

  return byArea;
}

function buildBlockingReasons(params: {
  validStops: number;
  invalidStops: number;
  pendingCount: number;
}): string[] {
  const reasons: string[] = [];

  if (params.validStops === 0) {
    reasons.push("No confirmed valid stops for this delivery date.");
  }

  if (params.invalidStops > 0) {
    reasons.push(
      `${params.invalidStops} confirmed order(s) have blocking validation errors.`
    );
  }

  if (params.pendingCount > 0) {
    reasons.push(
      `${params.pendingCount} pending order(s) must be confirmed before planning.`
    );
  }

  return reasons;
}

export async function previewDeliveryOrdersForAgent(
  deliveryDate: string
): Promise<DeliveryAgentPreviewResponse> {
  const [confirmedRouting, pendingBase] = await Promise.all([
    getDeliveryOrdersForRouting({
      deliveryDate,
      statuses: ["confirmed"],
    }),
    getDailyOrdersBase({
      deliveryDate,
      statuses: ["pending"],
      sliceItemsToDeliveryDate: true,
      includeValidation: false,
    }),
  ]);

  const warningCountByOrderId = new Map(
    confirmedRouting.warnings.map((entry) => [entry.orderId, entry.warnings.length])
  );

  const stops = confirmedRouting.stops.map((stop) => ({
    orderId: stop.orderId,
    customerName: stop.customerName,
    customerPhone: stop.customerPhone,
    area: stop.area,
    formattedAddress: stop.formattedAddress,
    totalMealQuantity: stop.totalMealQuantity,
    warningsCount: warningCountByOrderId.get(stop.orderId) ?? 0,
  }));

  const validStops = confirmedRouting.summary.validStops;
  const invalidStops = confirmedRouting.summary.invalidStops;
  const pendingOrders = pendingBase.orders.map((order) => ({
    orderId: order.orderId,
    customerName: order.customer.name,
    area: order.customer.area,
    formattedAddress: order.deliveryAddress.formatted,
    totalMealQuantity: order.mealSummary.totalQuantity,
    status: "pending" as const,
  }));

  const canContinueToPlanning =
    validStops > 0 && invalidStops === 0 && pendingOrders.length === 0;

  return {
    deliveryDate: confirmedRouting.deliveryDate,
    queriedAt: confirmedRouting.queriedAt,
    confirmed: {
      totalStops: validStops + invalidStops,
      validStops,
      invalidStops,
      warningStops: confirmedRouting.summary.warningStops,
      // Meal count reflects valid routing-ready stops only (low-weight planning factor).
      totalMealQuantity: confirmedRouting.summary.totalMealQuantity,
      byArea: buildByAreaFromValidStops(stops),
      byStatus: {
        confirmed: validStops + invalidStops,
      },
      stops,
      invalid: confirmedRouting.invalid.map((entry) => ({
        orderId: entry.orderId,
        customerName: entry.customerName,
        area: entry.area,
        errors: entry.errors,
      })),
      warnings: confirmedRouting.warnings,
    },
    pending: {
      count: pendingOrders.length,
      orders: pendingOrders,
    },
    canContinueToPlanning,
    blockingReasons: buildBlockingReasons({
      validStops,
      invalidStops,
      pendingCount: pendingOrders.length,
    }),
    notes: PREVIEW_NOTES,
  };
}
