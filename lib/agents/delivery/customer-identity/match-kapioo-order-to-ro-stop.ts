import {
  getRouteOptimizerOrderIdCandidates,
  normalizeOrderIdForMatch,
} from "@/lib/agents/delivery/customer-identity/extract-order-id-candidates";
import { formatRouteOptimizerCustomerName } from "@/lib/agents/delivery/customer-identity/format-route-optimizer-customer-name";
import { normalizeRouteOptimizerCustomerNameForMatch } from "@/lib/agents/delivery/customer-identity/normalize-route-optimizer-customer-name-for-match";
import type {
  HistoricalOrderStopMatchResult,
  KapiooCustomerIdentityInput,
  RouteOptimizerStopIdentityInput,
} from "@/lib/agents/delivery/customer-identity/types";

function readRouteOptimizerCustomerName(input: RouteOptimizerStopIdentityInput): string {
  const customerName = input.customerName;
  if (customerName !== null && customerName !== undefined && String(customerName).trim()) {
    return String(customerName);
  }

  if (input.name !== null && input.name !== undefined && String(input.name).trim()) {
    return String(input.name);
  }

  return "";
}

function buildBaseResult(input: {
  kapiooOrder: KapiooCustomerIdentityInput;
  roStop: RouteOptimizerStopIdentityInput;
}): Pick<
  HistoricalOrderStopMatchResult,
  | "derivedRouteOptimizerCustomerName"
  | "normalizedKapiooRouteOptimizerName"
  | "normalizedRouteOptimizerCustomerName"
  | "kapiooOrderId"
  | "routeOptimizerOrderId"
> {
  const formatted = formatRouteOptimizerCustomerName(input.kapiooOrder);
  const roCustomerName = readRouteOptimizerCustomerName(input.roStop);
  const kapiooOrderId = normalizeOrderIdForMatch(input.kapiooOrder.orderId);
  const routeOptimizerOrderIds = getRouteOptimizerOrderIdCandidates(input.roStop);

  return {
    derivedRouteOptimizerCustomerName: formatted.formattedName || undefined,
    normalizedKapiooRouteOptimizerName: formatted.normalizedFormattedName || undefined,
    normalizedRouteOptimizerCustomerName:
      normalizeRouteOptimizerCustomerNameForMatch(roCustomerName) || undefined,
    kapiooOrderId: kapiooOrderId || undefined,
    routeOptimizerOrderId: routeOptimizerOrderIds[0],
  };
}

export function matchKapiooOrderToRoStop(
  kapiooOrder: KapiooCustomerIdentityInput,
  roStop: RouteOptimizerStopIdentityInput
): HistoricalOrderStopMatchResult {
  const base = buildBaseResult({ kapiooOrder, roStop });
  const kapiooOrderId = normalizeOrderIdForMatch(kapiooOrder.orderId);
  const routeOptimizerOrderIds = getRouteOptimizerOrderIdCandidates(roStop);

  if (kapiooOrderId && routeOptimizerOrderIds.includes(kapiooOrderId)) {
    return {
      matched: true,
      method: "order_id",
      confidence: "exact",
      reason: "Matched by exact order ID.",
      ...base,
      routeOptimizerOrderId: kapiooOrderId,
    };
  }

  const formatted = formatRouteOptimizerCustomerName(kapiooOrder);
  const roCustomerName = readRouteOptimizerCustomerName(roStop);
  const normalizedRoName = normalizeRouteOptimizerCustomerNameForMatch(roCustomerName);

  if (
    formatted.normalizedFormattedName &&
    normalizedRoName &&
    formatted.normalizedFormattedName === normalizedRoName
  ) {
    if (!formatted.hasUsablePhoneLast4) {
      return {
        matched: false,
        method: "none",
        confidence: "none",
        reason: "derived name missing phone suffix",
        ...base,
      };
    }

    return {
      matched: true,
      method: "derived_route_optimizer_name",
      confidence: "high",
      reason: "Matched by derived Route Optimizer customer name.",
      ...base,
    };
  }

  if (!kapiooOrderId && routeOptimizerOrderIds.length === 0 && !formatted.formattedName && !roCustomerName) {
    return {
      matched: false,
      method: "none",
      confidence: "none",
      reason: "No order ID or customer identity available on either side.",
      ...base,
    };
  }

  if (kapiooOrderId && routeOptimizerOrderIds.length > 0) {
    return {
      matched: false,
      method: "none",
      confidence: "none",
      reason: "Order ID did not match and derived Route Optimizer customer name did not match.",
      ...base,
    };
  }

  if (formatted.formattedName || roCustomerName) {
    return {
      matched: false,
      method: "none",
      confidence: "none",
      reason: "Derived Route Optimizer customer name did not match.",
      ...base,
    };
  }

  return {
    matched: false,
    method: "none",
    confidence: "none",
    reason: "No match found.",
    ...base,
  };
}
