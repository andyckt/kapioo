import type {
  DeliveryAgentLearningMatchedStop,
  DeliveryAgentLearningMatchCoverage,
  DeliveryAgentLearningUnmatchedOrder,
  DeliveryAgentLearningUnmatchedRoStop,
} from "@/lib/contracts/delivery-agent-learning";

export type FlattenedRouteOptimizerCustomerStop = {
  roRunId: string;
  roRunDate: string;
  roDriverName: string;
  roStopSequence: number;
  roCustomerIndex?: number | null;
  roStopType?: string | null;
  isSynthetic: boolean;
  orderIds: string[];
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  fixedStopPosition?: number | null;
  isFirstStop?: boolean;
  isEndPoint?: boolean;
};

export type DeliveryAgentHistoricalOrderStopMatchingResult = {
  matchedStops: DeliveryAgentLearningMatchedStop[];
  unmatchedOrders: DeliveryAgentLearningUnmatchedOrder[];
  unmatchedRoStops: DeliveryAgentLearningUnmatchedRoStop[];
  matchCoverage: DeliveryAgentLearningMatchCoverage;
  warnings: string[];
};
