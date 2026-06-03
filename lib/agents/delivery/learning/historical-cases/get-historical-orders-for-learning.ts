import { HISTORICAL_LEARNING_ORDER_STATUSES } from "@/lib/agents/delivery/learning/historical-cases/historical-learning-statuses";
import { mapOrderToLearningOrderSnapshot } from "@/lib/agents/delivery/learning/historical-cases/map-order-to-learning-snapshot";
import { validateLearningDeliveryDate } from "@/lib/agents/delivery/learning/historical-cases/validate-learning-delivery-date";
import type { DeliveryAgentLearningOrderSnapshot } from "@/lib/contracts/delivery-agent-learning";
import { getDailyOrdersBase } from "@/lib/order-data/get-daily-orders-base";

export async function getHistoricalOrdersForLearning(args: {
  deliveryDate: string;
}): Promise<DeliveryAgentLearningOrderSnapshot[]> {
  const deliveryDate = validateLearningDeliveryDate(args.deliveryDate);

  const baseResult = await getDailyOrdersBase({
    deliveryDate,
    statuses: [...HISTORICAL_LEARNING_ORDER_STATUSES],
    dailyDeliveryAreasOnly: true,
    sliceItemsToDeliveryDate: true,
    includeValidation: true,
    sort: { orderId: 1 },
  });

  return baseResult.orders.map((order) =>
    mapOrderToLearningOrderSnapshot(order, deliveryDate)
  );
}
