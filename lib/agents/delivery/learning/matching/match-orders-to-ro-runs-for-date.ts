import { matchKapiooOrderToRoStop } from "@/lib/agents/delivery/customer-identity/match-kapioo-order-to-ro-stop";
import type { HistoricalOrderStopMatchResult } from "@/lib/agents/delivery/customer-identity/types";
import type {
  DeliveryAgentHistoricalMatchConfidence,
  DeliveryAgentHistoricalMatchMethod,
  DeliveryAgentLearningMatchedStop,
  DeliveryAgentLearningMatchCoverage,
  DeliveryAgentLearningOrderSnapshot,
  DeliveryAgentLearningUnmatchedOrder,
  DeliveryAgentLearningUnmatchedRoStop,
} from "@/lib/contracts/delivery-agent-learning";
import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

import {
  flattenRouteOptimizerCustomerStops,
  isUnsupportedStopType,
} from "@/lib/agents/delivery/learning/matching/flatten-route-optimizer-customer-stops";
import {
  buildRoStopRef,
  getStopKey,
  orderHasMissingCustomerIdentity,
  stopHasMissingRouteOptimizerIdentity,
  toKapiooIdentityInput,
  toRoStopIdentityInput,
} from "@/lib/agents/delivery/learning/matching/matching-helpers";
import type {
  DeliveryAgentHistoricalOrderStopMatchingResult,
  FlattenedRouteOptimizerCustomerStop,
} from "@/lib/agents/delivery/learning/matching/types";

const LOW_MATCH_COVERAGE_THRESHOLD_PERCENT = 50;

type CandidateMatch = {
  order: DeliveryAgentLearningOrderSnapshot;
  stop: FlattenedRouteOptimizerCustomerStop;
  matchResult: HistoricalOrderStopMatchResult;
};

type AcceptedMatch = CandidateMatch;

function toContractMatchMethod(
  method: HistoricalOrderStopMatchResult["method"]
): DeliveryAgentHistoricalMatchMethod {
  if (method === "order_id" || method === "derived_route_optimizer_name") {
    return method;
  }

  return "none";
}

function toContractMatchConfidence(
  confidence: HistoricalOrderStopMatchResult["confidence"]
): DeliveryAgentHistoricalMatchConfidence {
  if (confidence === "exact" || confidence === "high") {
    return confidence;
  }

  return "none";
}

function buildMatchedStop(match: AcceptedMatch): DeliveryAgentLearningMatchedStop {
  const { order, stop, matchResult } = match;

  return {
    kapiooOrderId: order.orderId,
    roRunId: stop.roRunId,
    roStopSequence: stop.roStopSequence,
    roCustomerIndex: stop.roCustomerIndex,
    roStopType: stop.roStopType,
    roCustomerName: stop.customerName,
    roCustomerPhone: stop.customerPhone,
    roCustomerAddress: stop.customerAddress,
    matchMethod: toContractMatchMethod(matchResult.method),
    matchConfidence: toContractMatchConfidence(matchResult.confidence),
    matchReason: matchResult.reason,
    coordinateRef: buildRoStopRef(stop.roRunId, stop.roStopSequence),
  };
}

function buildUnmatchedRoStop(
  stop: FlattenedRouteOptimizerCustomerStop,
  reason: string
): DeliveryAgentLearningUnmatchedRoStop {
  return {
    roRunId: stop.roRunId,
    roStopSequence: stop.roStopSequence,
    roCustomerName: stop.customerName,
    roCustomerPhone: stop.customerPhone,
    roCustomerAddress: stop.customerAddress,
    isSynthetic: stop.isSynthetic,
    stopType: stop.roStopType,
    reason,
  };
}

function collectCandidates(input: {
  orders: DeliveryAgentLearningOrderSnapshot[];
  stops: FlattenedRouteOptimizerCustomerStop[];
  accept: (result: HistoricalOrderStopMatchResult) => boolean;
}): CandidateMatch[] {
  const candidates: CandidateMatch[] = [];

  for (const order of input.orders) {
    const kapiooInput = toKapiooIdentityInput(order);

    for (const stop of input.stops) {
      const matchResult = matchKapiooOrderToRoStop(kapiooInput, toRoStopIdentityInput(stop));

      if (input.accept(matchResult)) {
        candidates.push({ order, stop, matchResult });
      }
    }
  }

  return candidates;
}

function resolveBijectiveMatches(input: {
  candidates: CandidateMatch[];
  conflictOrderReason: string;
  conflictStopReason: string;
  warnings: string[];
}): {
  accepted: AcceptedMatch[];
  conflictedOrderIds: Set<string>;
  conflictedStopKeys: Set<string>;
  orderCandidateRefs: Map<string, string[]>;
} {
  const ordersById = new Map<string, CandidateMatch[]>();
  const stopsByKey = new Map<string, CandidateMatch[]>();

  for (const candidate of input.candidates) {
    const orderId = candidate.order.orderId;
    const stopKey = getStopKey(candidate.stop);

    const orderCandidates = ordersById.get(orderId) ?? [];
    orderCandidates.push(candidate);
    ordersById.set(orderId, orderCandidates);

    const stopCandidates = stopsByKey.get(stopKey) ?? [];
    stopCandidates.push(candidate);
    stopsByKey.set(stopKey, stopCandidates);
  }

  const accepted: AcceptedMatch[] = [];
  const conflictedOrderIds = new Set<string>();
  const conflictedStopKeys = new Set<string>();
  const orderCandidateRefs = new Map<string, string[]>();
  const acceptedOrderIds = new Set<string>();
  const acceptedStopKeys = new Set<string>();

  for (const [orderId, orderCandidates] of ordersById) {
    const stopRefs = orderCandidates.map((candidate) =>
      buildRoStopRef(candidate.stop.roRunId, candidate.stop.roStopSequence)
    );
    orderCandidateRefs.set(orderId, stopRefs);

    if (orderCandidates.length > 1) {
      conflictedOrderIds.add(orderId);
      input.warnings.push(
        `${input.conflictOrderReason}: order ${orderId} matched ${orderCandidates.length} route optimizer stops (${stopRefs.join(", ")})`
      );
      continue;
    }

    const candidate = orderCandidates[0];
    const stopKey = getStopKey(candidate.stop);
    const stopCandidates = stopsByKey.get(stopKey) ?? [];

    if (stopCandidates.length > 1) {
      conflictedOrderIds.add(orderId);
      conflictedStopKeys.add(stopKey);
      const orderIds = stopCandidates.map((entry) => entry.order.orderId);
      input.warnings.push(
        `${input.conflictStopReason}: route optimizer stop ${buildRoStopRef(candidate.stop.roRunId, candidate.stop.roStopSequence)} matched ${orderIds.length} admin orders (${orderIds.join(", ")})`
      );
      continue;
    }

    if (conflictedOrderIds.has(orderId) || conflictedStopKeys.has(stopKey)) {
      continue;
    }

    accepted.push(candidate);
    acceptedOrderIds.add(orderId);
    acceptedStopKeys.add(stopKey);
  }

  for (const [stopKey, stopCandidates] of stopsByKey) {
    if (stopCandidates.length <= 1) {
      continue;
    }

    conflictedStopKeys.add(stopKey);
    for (const candidate of stopCandidates) {
      conflictedOrderIds.add(candidate.order.orderId);
    }
  }

  return {
    accepted: accepted.filter(
      (candidate) =>
        !conflictedOrderIds.has(candidate.order.orderId) &&
        !conflictedStopKeys.has(getStopKey(candidate.stop))
    ),
    conflictedOrderIds,
    conflictedStopKeys,
    orderCandidateRefs,
  };
}

function buildMatchCoverage(input: {
  totalOrders: number;
  matchedStops: DeliveryAgentLearningMatchedStop[];
  unmatchedOrders: DeliveryAgentLearningUnmatchedOrder[];
  realStops: FlattenedRouteOptimizerCustomerStop[];
  matchedStopKeys: Set<string>;
  syntheticUnmatchedStops: number;
}): DeliveryAgentLearningMatchCoverage {
  const matchedOrders = input.matchedStops.length;
  const totalOrders = input.totalOrders;
  const totalRoCustomerStops = input.realStops.length;
  const matchedRoCustomerStops = input.matchedStopKeys.size;
  const unmatchedRoCustomerStops = totalRoCustomerStops - matchedRoCustomerStops;

  const exactMatches = input.matchedStops.filter(
    (stop) => stop.matchMethod === "order_id" || stop.matchConfidence === "exact"
  ).length;
  const highConfidenceMatches = input.matchedStops.filter(
    (stop) => stop.matchConfidence === "high"
  ).length;
  const uncertainMatches = input.unmatchedOrders.filter(
    (order) =>
      order.reason === "multiple_order_id_matches" ||
      order.reason === "multiple_possible_matches"
  ).length;

  return {
    totalOrders,
    matchedOrders,
    unmatchedOrders: totalOrders - matchedOrders,
    totalRoCustomerStops,
    matchedRoCustomerStops,
    unmatchedRoCustomerStops,
    matchCoveragePercent:
      totalOrders === 0 ? 0 : Math.round((matchedOrders / totalOrders) * 100),
    exactMatches,
    highConfidenceMatches,
    uncertainMatches,
    syntheticUnmatchedStops: input.syntheticUnmatchedStops,
  };
}

export function matchOrdersToRouteOptimizerRunsForDate(args: {
  orders: DeliveryAgentLearningOrderSnapshot[];
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse;
}): DeliveryAgentHistoricalOrderStopMatchingResult {
  const warnings: string[] = [];
  const { orders, routeOptimizerResponse } = args;

  if (orders.length === 0) {
    warnings.push("no_orders");
  }

  if (routeOptimizerResponse.runs.length === 0) {
    warnings.push("no_route_optimizer_runs");
  }

  const flattenedStops = flattenRouteOptimizerCustomerStops(routeOptimizerResponse);
  const realStops = flattenedStops.filter((stop) => !stop.isSynthetic);
  const syntheticStops = flattenedStops.filter((stop) => stop.isSynthetic);

  if (realStops.length === 0 && routeOptimizerResponse.runs.length > 0) {
    warnings.push("no_route_optimizer_stops");
  }

  for (const stop of syntheticStops) {
    if (stop.orderIds.length > 0) {
      warnings.push(
        `synthetic_stop_has_order_ids: ${buildRoStopRef(stop.roRunId, stop.roStopSequence)} has order_ids (${stop.orderIds.join(", ")})`
      );
    }
  }

  for (const stop of flattenedStops) {
    if (isUnsupportedStopType(stop.roStopType)) {
      warnings.push(
        `unsupported_stop_type: ${buildRoStopRef(stop.roRunId, stop.roStopSequence)} has stop_type "${stop.roStopType}"`
      );
    }
  }

  const matchedStops: DeliveryAgentLearningMatchedStop[] = [];
  const matchedOrderIds = new Set<string>();
  const matchedStopKeys = new Set<string>();

  const passAOrders = [...orders];
  const passAStops = [...realStops];

  const orderIdCandidates = collectCandidates({
    orders: passAOrders,
    stops: passAStops,
    accept: (result) => result.matched && result.method === "order_id",
  });

  const passAResult = resolveBijectiveMatches({
    candidates: orderIdCandidates,
    conflictOrderReason: "duplicate_order_id_match_conflict",
    conflictStopReason: "duplicate_order_id_match_conflict",
    warnings,
  });

  for (const match of passAResult.accepted) {
    matchedStops.push(buildMatchedStop(match));
    matchedOrderIds.add(match.order.orderId);
    matchedStopKeys.add(getStopKey(match.stop));
  }

  const remainingOrdersAfterPassA = orders.filter((order) => !matchedOrderIds.has(order.orderId));
  const remainingStopsAfterPassA = realStops.filter(
    (stop) => !matchedStopKeys.has(getStopKey(stop))
  );

  const derivedNameCandidates = collectCandidates({
    orders: remainingOrdersAfterPassA,
    stops: remainingStopsAfterPassA,
    accept: (result) =>
      result.matched &&
      result.method === "derived_route_optimizer_name" &&
      result.confidence === "high",
  });

  const passBResult = resolveBijectiveMatches({
    candidates: derivedNameCandidates,
    conflictOrderReason: "duplicate_derived_name_match_conflict",
    conflictStopReason: "duplicate_derived_name_match_conflict",
    warnings,
  });

  const derivedConflictRefs = passBResult.orderCandidateRefs;

  for (const match of passBResult.accepted) {
    matchedStops.push(buildMatchedStop(match));
    matchedOrderIds.add(match.order.orderId);
    matchedStopKeys.add(getStopKey(match.stop));
  }

  const conflictedOrderIds = new Set([
    ...passAResult.conflictedOrderIds,
    ...passBResult.conflictedOrderIds,
  ]);

  const unmatchedOrders: DeliveryAgentLearningUnmatchedOrder[] = [];

  for (const order of orders) {
    if (matchedOrderIds.has(order.orderId)) {
      continue;
    }

    if (conflictedOrderIds.has(order.orderId)) {
      const passARefs = passAResult.orderCandidateRefs.get(order.orderId) ?? [];
      const passBRefs = derivedConflictRefs.get(order.orderId) ?? [];
      const possibleRoStopRefs = [...new Set([...passARefs, ...passBRefs])];
      const reason =
        passARefs.length > 0 ? "multiple_order_id_matches" : "multiple_possible_matches";

      unmatchedOrders.push({
        orderId: order.orderId,
        reason,
        possibleRoStopRefs: possibleRoStopRefs.length > 0 ? possibleRoStopRefs : undefined,
      });
      continue;
    }

    if (orderHasMissingCustomerIdentity(order)) {
      unmatchedOrders.push({
        orderId: order.orderId,
        reason: "missing_customer_identity",
      });
      continue;
    }

    unmatchedOrders.push({
      orderId: order.orderId,
      reason: "no_route_optimizer_stop_match",
    });
  }

  const unmatchedRoStops: DeliveryAgentLearningUnmatchedRoStop[] = [];

  for (const stop of realStops) {
    if (matchedStopKeys.has(getStopKey(stop))) {
      continue;
    }

    const reason = stopHasMissingRouteOptimizerIdentity(stop)
      ? "missing_route_optimizer_identity"
      : "no_admin_order_match";

    unmatchedRoStops.push(buildUnmatchedRoStop(stop, reason));
  }

  for (const stop of syntheticStops) {
    unmatchedRoStops.push(buildUnmatchedRoStop(stop, "synthetic_operational_stop"));
  }

  const matchCoverage = buildMatchCoverage({
    totalOrders: orders.length,
    matchedStops,
    unmatchedOrders,
    realStops,
    matchedStopKeys,
    syntheticUnmatchedStops: syntheticStops.length,
  });

  if (
    orders.length > 0 &&
    matchCoverage.matchCoveragePercent < LOW_MATCH_COVERAGE_THRESHOLD_PERCENT
  ) {
    warnings.push("low_match_coverage");
  }

  return {
    matchedStops,
    unmatchedOrders,
    unmatchedRoStops,
    matchCoverage,
    warnings,
  };
}
