import type { DeliveryAgentLearningOrderSnapshot } from "@/lib/contracts/delivery-agent-learning";
import type { DailyOrderBase } from "@/lib/order-data/types";

function readFiniteCoordinate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNullableTrimmedString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function mapOrderToLearningOrderSnapshot(
  order: DailyOrderBase,
  fallbackDeliveryDate?: string
): DeliveryAgentLearningOrderSnapshot {
  const lat = readFiniteCoordinate(order.deliveryAddress.lat);
  const lng = readFiniteCoordinate(order.deliveryAddress.lng);
  const totalMealQuantity =
    typeof order.mealSummary.totalQuantity === "number" &&
    Number.isFinite(order.mealSummary.totalQuantity)
      ? order.mealSummary.totalQuantity
      : null;

  return {
    orderId: order.orderId,
    customerName: toNullableTrimmedString(order.customer.name),
    customerPhone: toNullableTrimmedString(order.customer.phone),
    formattedAddress: toNullableTrimmedString(order.deliveryAddress.formatted),
    area: toNullableTrimmedString(order.customer.area),
    status: order.status,
    deliveryDate: order.delivery.dateIso ?? fallbackDeliveryDate ?? null,
    totalMealQuantity,
    unitNumber: toNullableTrimmedString(order.deliveryAddress.unitNumber),
    buzzCode: toNullableTrimmedString(order.deliveryAddress.buzzCode),
    notes: toNullableTrimmedString(order.customer.specialInstructions),
    lat,
    lng,
  };
}
