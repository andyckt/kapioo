/**
 * Historical learning uses confirmed + delivered orders to reconstruct real completed
 * delivery days. Live planning status defaults (pending + confirmed) are intentionally separate.
 */
export const HISTORICAL_LEARNING_ORDER_STATUSES = ["confirmed", "delivered"] as const;

export type HistoricalLearningOrderStatus =
  (typeof HISTORICAL_LEARNING_ORDER_STATUSES)[number];
