import { OrderDataError } from "@/lib/order-data/errors";

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export function validateLearningDeliveryDate(date: string): string {
  const trimmed = date.trim();

  if (!trimmed) {
    throw new OrderDataError("deliveryDate is required for historical learning order queries", {
      code: "ORDER_DATA_UNSAFE_QUERY",
    });
  }

  if (!DATE_YYYY_MM_DD.test(trimmed)) {
    throw new OrderDataError("deliveryDate must be YYYY-MM-DD", {
      code: "ORDER_DATA_UNSAFE_QUERY",
    });
  }

  return trimmed;
}
