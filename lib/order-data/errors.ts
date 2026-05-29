export type OrderDataErrorCode = "ORDER_DATA_UNSAFE_QUERY";

export class OrderDataError extends Error {
  code: OrderDataErrorCode;

  constructor(message: string, options: { code: OrderDataErrorCode }) {
    super(message);
    this.name = "OrderDataError";
    this.code = options.code;
  }
}

export function assertNarrowOrderDataFilter(input: {
  deliveryDate?: string;
  orderIds?: string[];
  userId?: string;
}) {
  const hasDeliveryDate = Boolean(input.deliveryDate?.trim());
  const hasOrderIds = Boolean(input.orderIds?.length);
  const hasUserId = Boolean(input.userId?.trim());

  if (!hasDeliveryDate && !hasOrderIds && !hasUserId) {
    throw new OrderDataError(
      "At least one of deliveryDate, orderIds, or userId is required to query daily orders",
      { code: "ORDER_DATA_UNSAFE_QUERY" }
    );
  }
}
