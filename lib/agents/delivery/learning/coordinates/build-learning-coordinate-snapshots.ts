import type {
  DeliveryAgentLearningCoordinateSnapshot,
  DeliveryAgentLearningOrderSnapshot,
} from "@/lib/contracts/delivery-agent-learning";
import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

import { resolveLearningCoordinateForMatchedStop } from "@/lib/agents/delivery/learning/coordinates/resolve-learning-coordinate-for-match";
import { resolveLearningCoordinateForSyntheticStop } from "@/lib/agents/delivery/learning/coordinates/resolve-learning-coordinate-for-synthetic-stop";
import { flattenRouteOptimizerCustomerStops } from "@/lib/agents/delivery/learning/matching/flatten-route-optimizer-customer-stops";
import { getStopKey } from "@/lib/agents/delivery/learning/matching/matching-helpers";
import type { DeliveryAgentHistoricalOrderStopMatchingResult } from "@/lib/agents/delivery/learning/matching/types";
import type { FlattenedRouteOptimizerCustomerStop } from "@/lib/agents/delivery/learning/matching/types";

function buildOrderIndex(
  orders: DeliveryAgentLearningOrderSnapshot[]
): Map<string, DeliveryAgentLearningOrderSnapshot> {
  return new Map(orders.map((order) => [order.orderId, order]));
}

function buildFlattenedStopIndex(
  stops: FlattenedRouteOptimizerCustomerStop[]
): Map<string, FlattenedRouteOptimizerCustomerStop> {
  return new Map(stops.map((stop) => [getStopKey(stop), stop]));
}

function compareSyntheticStops(
  a: FlattenedRouteOptimizerCustomerStop,
  b: FlattenedRouteOptimizerCustomerStop
): number {
  const runCompare = a.roRunId.localeCompare(b.roRunId);
  if (runCompare !== 0) {
    return runCompare;
  }

  return a.roStopSequence - b.roStopSequence;
}

export function buildLearningCoordinateSnapshots(args: {
  orders: DeliveryAgentLearningOrderSnapshot[];
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse;
  matchingResult: DeliveryAgentHistoricalOrderStopMatchingResult;
}): DeliveryAgentLearningCoordinateSnapshot[] {
  const flattenedStops = flattenRouteOptimizerCustomerStops(args.routeOptimizerResponse);
  const stopIndex = buildFlattenedStopIndex(flattenedStops);
  const orderIndex = buildOrderIndex(args.orders);

  const matchedSnapshots = args.matchingResult.matchedStops.map((matchedStop) =>
    resolveLearningCoordinateForMatchedStop({
      matchedStop,
      order: orderIndex.get(matchedStop.kapiooOrderId) ?? null,
      roStop: stopIndex.get(`${matchedStop.roRunId}:${matchedStop.roStopSequence}`) ?? null,
    })
  );

  const syntheticStopKeys = args.matchingResult.unmatchedRoStops
    .filter((stop) => stop.isSynthetic === true)
    .map((stop) => `${stop.roRunId}:${stop.roStopSequence}`);

  const syntheticStops = syntheticStopKeys
    .map((key) => stopIndex.get(key))
    .filter((stop): stop is FlattenedRouteOptimizerCustomerStop => stop !== undefined)
    .sort(compareSyntheticStops);

  const syntheticSnapshots = syntheticStops.map((roStop) =>
    resolveLearningCoordinateForSyntheticStop({ roStop })
  );

  return [...matchedSnapshots, ...syntheticSnapshots];
}
