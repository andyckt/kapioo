import type { DailyOrderBase } from "@/lib/order-data/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";

function readFiniteCoordinate(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function buildRoutingStopNotes(order: DailyOrderBase): string {
  const parts: string[] = [];
  const instructions = order.customer.specialInstructions.trim();

  if (instructions) {
    parts.push(instructions);
  }

  const buzzCode = order.deliveryAddress.buzzCode.trim();
  if (buzzCode) {
    parts.push(`Buzz: ${buzzCode}`);
  }

  return parts.join("\n");
}

export function mapOrderToRoutingStop(
  order: DailyOrderBase,
  fallbackDeliveryDate: string
): RoutingStop {
  const notes = buildRoutingStopNotes(order);
  const deliveryDate = order.delivery.dateIso ?? fallbackDeliveryDate;
  const orderLat = readFiniteCoordinate(order.deliveryAddress.lat);
  const orderLng = readFiniteCoordinate(order.deliveryAddress.lng);
  const hasOrderCoordinates = orderLat !== undefined && orderLng !== undefined;

  return {
    orderId: order.orderId,
    mongoId: order.mongoId,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    customerEmail: order.customer.email,
    area: order.customer.area,
    formattedAddress: order.deliveryAddress.formatted,
    deliveryAddress: {
      unitNumber: order.deliveryAddress.unitNumber,
      streetAddress: order.deliveryAddress.streetAddress,
      city: order.deliveryAddress.city,
      province: order.deliveryAddress.province,
      postalCode: order.deliveryAddress.postalCode,
      country: order.deliveryAddress.country,
      buzzCode: order.deliveryAddress.buzzCode,
    },
    notes,
    specialInstructions: order.customer.specialInstructions,
    deliveryDate,
    deliveryWindow: order.delivery.windowLabel,
    mealSummary: order.mealSummary.summaryText,
    totalMealQuantity: order.mealSummary.totalQuantity,
    items: order.items,
    status: order.status,
    hasAdminOverride: order.customer.hasAdminOverride,
    ...(hasOrderCoordinates
      ? {
          lat: orderLat,
          lng: orderLng,
          coordinateSource: "order_data" as const,
          coordinateStatus: "ok" as const,
          coordinateConfidence: "high" as const,
        }
      : {}),
    routeOptimizer: {
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.deliveryAddress.formatted,
      notes,
      order_ids: [order.orderId],
      ...(hasOrderCoordinates ? { lat: orderLat, lng: orderLng, geocode_status: "OK" } : {}),
    },
  };
}
