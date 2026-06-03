import type { DeliveryAgentLearningMatchedStop } from "@/lib/contracts/delivery-agent-learning";

import { matchOrdersToRouteOptimizerRunsForDate } from "@/lib/agents/delivery/learning/matching/match-orders-to-ro-runs-for-date";

import {
  makeCustomerStop,
  makeLearningOrder,
  makeRoResponse,
  makeRunWithStops,
  makeSyntheticHandoffStop,
  parsedOneRunOneStopResponse,
} from "@/__tests__/unit/agents/delivery/learning/matching/matching-fixtures";

export function makeMatchedStop(
  overrides: Partial<DeliveryAgentLearningMatchedStop> = {}
): DeliveryAgentLearningMatchedStop {
  return {
    kapiooOrderId: "DD-90000001",
    roRunId: "run-abc123",
    roStopSequence: 0,
    roCustomerIndex: 0,
    roStopType: "customer",
    roCustomerName: "Donald-1111",
    roCustomerPhone: "4379891111",
    roCustomerAddress: "123 Main St, Toronto",
    matchMethod: "order_id",
    matchConfidence: "exact",
    matchReason: "Matched by exact order ID.",
    coordinateRef: "ro-stop:run-abc123:0",
    ...overrides,
  };
}

export function buildOneOrderOneHandoffMatchingResult() {
  const orders = [makeLearningOrder()];
  const routeOptimizerResponse = makeRoResponse({
    runs: [
      makeRunWithStops("run-abc123", [
        makeCustomerStop(0),
        makeSyntheticHandoffStop(1, {
          lat: 43.7,
          lng: -79.4,
        }),
      ]),
    ],
  });

  return {
    orders,
    routeOptimizerResponse,
    matchingResult: matchOrdersToRouteOptimizerRunsForDate({
      orders,
      routeOptimizerResponse,
    }),
  };
}

export { makeLearningOrder, parsedOneRunOneStopResponse };
