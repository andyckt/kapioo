import type { CustomerConstraintsMap } from "@/lib/agents/delivery/candidate-plans/build-candidate-run-preview-payload";
import type { DeliveryAgentRepairActionApplied } from "@/lib/contracts/delivery-agent";

export function buildConstraintsFromRepairActions(
  actions: DeliveryAgentRepairActionApplied[] | undefined
): CustomerConstraintsMap {
  const constraints: CustomerConstraintsMap = new Map();

  for (const action of actions ?? []) {
    for (const orderId of action.targetOrderIds ?? []) {
      const existing = constraints.get(orderId) ?? {};
      constraints.set(orderId, {
        ...existing,
        ...(action.fixedStopPosition !== undefined
          ? { fixedStopPosition: action.fixedStopPosition }
          : {}),
        ...(action.actionType === "apply_end_point" ? { isEndPoint: true } : {}),
      });
    }
  }

  return constraints;
}
