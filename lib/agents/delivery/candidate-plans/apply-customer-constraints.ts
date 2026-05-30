import type { RouteOptimizerCustomerInput } from "@/lib/integrations/route-optimizer/types";

export type CustomerConstraint = {
  fixedStopPosition?: number;
  isEndPoint?: boolean;
};

export type CustomerConstraintsMap = Map<string, CustomerConstraint>;

export function applyCustomerConstraints(
  customers: RouteOptimizerCustomerInput[],
  constraints: CustomerConstraintsMap | undefined
): RouteOptimizerCustomerInput[] {
  if (!constraints || constraints.size === 0) {
    return customers;
  }

  return customers.map((customer) => {
    const orderId = customer.order_ids?.[0];
    if (!orderId) {
      return customer;
    }

    const constraint = constraints.get(orderId);
    if (!constraint) {
      return customer;
    }

    return {
      ...customer,
      ...(constraint.fixedStopPosition !== undefined
        ? { fixed_stop_position: constraint.fixedStopPosition }
        : {}),
      ...(constraint.isEndPoint ? { is_end_point: true } : {}),
    };
  });
}

export function validateFixedStopPositions(input: {
  syntheticFixedPosition?: number;
  customerConstraints: CustomerConstraintsMap;
}): { valid: boolean; duplicatePositions: number[]; warning?: string } {
  const positions = new Map<number, string>();

  if (input.syntheticFixedPosition !== undefined) {
    positions.set(input.syntheticFixedPosition, "synthetic_meetup");
  }

  for (const [orderId, constraint] of input.customerConstraints.entries()) {
    if (constraint.fixedStopPosition === undefined) {
      continue;
    }

    const existing = positions.get(constraint.fixedStopPosition);
    if (existing) {
      return {
        valid: false,
        duplicatePositions: [constraint.fixedStopPosition],
        warning: `Duplicate fixed_stop_position ${constraint.fixedStopPosition} for ${existing} and order ${orderId}.`,
      };
    }

    positions.set(constraint.fixedStopPosition, orderId);
  }

  return { valid: true, duplicatePositions: [] };
}
