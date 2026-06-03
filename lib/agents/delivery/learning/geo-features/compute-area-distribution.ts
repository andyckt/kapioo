import type {
  DeliveryAgentLearningCoordinateSnapshot,
  DeliveryAgentLearningOrderSnapshot,
} from "@/lib/contracts/delivery-agent-learning";

function normalizeAreaLabel(area: string | null | undefined): string {
  const trimmed = area?.trim();
  return trimmed ? trimmed : "unknown";
}

export function computeAreaDistribution(args: {
  orders: DeliveryAgentLearningOrderSnapshot[];
  snapshots: DeliveryAgentLearningCoordinateSnapshot[];
}): Record<string, number> {
  const orderIndex = new Map(args.orders.map((order) => [order.orderId, order]));
  const distribution: Record<string, number> = {};
  const countedOrderIds = new Set<string>();

  for (const snapshot of args.snapshots) {
    if (snapshot.refType !== "order" || !snapshot.orderId) {
      continue;
    }

    if (countedOrderIds.has(snapshot.orderId)) {
      continue;
    }

    countedOrderIds.add(snapshot.orderId);
    const order = orderIndex.get(snapshot.orderId);
    const areaLabel = normalizeAreaLabel(order?.area);
    distribution[areaLabel] = (distribution[areaLabel] ?? 0) + 1;
  }

  return distribution;
}
