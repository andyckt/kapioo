import { formatRouteOptimizerCustomerName } from "@/lib/agents/delivery/customer-identity/format-route-optimizer-customer-name";
import { normalizeOrderIdForMatch } from "@/lib/agents/delivery/customer-identity/extract-order-id-candidates";
import type {
  KapiooCustomerIdentityInput,
  RouteOptimizerStopIdentityInput,
} from "@/lib/agents/delivery/customer-identity/types";
import type { DeliveryAgentLearningOrderSnapshot } from "@/lib/contracts/delivery-agent-learning";

import type { FlattenedRouteOptimizerCustomerStop } from "@/lib/agents/delivery/learning/matching/types";

export function buildRoStopRef(roRunId: string, roStopSequence: number): string {
  return `ro-stop:${roRunId}:${roStopSequence}`;
}

export function toKapiooIdentityInput(
  order: DeliveryAgentLearningOrderSnapshot
): KapiooCustomerIdentityInput {
  return {
    orderId: order.orderId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: order.formattedAddress,
  };
}

export function toRoStopIdentityInput(
  stop: FlattenedRouteOptimizerCustomerStop
): RouteOptimizerStopIdentityInput {
  return {
    orderIds: stop.orderIds,
    customerName: stop.customerName,
    phone: stop.customerPhone,
    address: stop.customerAddress,
  };
}

export function orderHasMissingCustomerIdentity(order: DeliveryAgentLearningOrderSnapshot): boolean {
  const orderId = normalizeOrderIdForMatch(order.orderId);
  if (orderId) {
    return false;
  }

  const formatted = formatRouteOptimizerCustomerName(toKapiooIdentityInput(order));
  return !formatted.formattedName || !formatted.hasUsablePhoneLast4;
}

export function stopHasMissingRouteOptimizerIdentity(
  stop: FlattenedRouteOptimizerCustomerStop
): boolean {
  if (stop.orderIds.length > 0) {
    return false;
  }

  const customerName = stop.customerName?.trim();
  return !customerName;
}

export function getStopKey(stop: FlattenedRouteOptimizerCustomerStop): string {
  return `${stop.roRunId}:${stop.roStopSequence}`;
}
