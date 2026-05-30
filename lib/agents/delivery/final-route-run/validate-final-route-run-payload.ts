import {
  isSyntheticMeetupOrderId,
  SYNTHETIC_MEETUP_STOP_NAME,
} from "@/lib/agents/delivery/candidate-plans/synthetic-meetup-stop";
import { FinalRouteCreatePayloadError } from "@/lib/agents/delivery/final-route-run/errors";
import type {
  RouteOptimizerCustomerInput,
  RouteOptimizerIntegrationRequest,
} from "@/lib/integrations/route-optimizer/types";

export type FinalRoutePayloadValidationIssue = {
  driverName: string;
  runSlot?: string;
  customerIndex: number;
  field: "phone" | "address" | "name" | "orderId";
  orderId?: string;
  customerName?: string;
  address?: string;
  isSynthetic?: boolean;
  stopType?: string;
};

export class FinalRoutePayloadValidationError extends FinalRouteCreatePayloadError {
  issue: FinalRoutePayloadValidationIssue;

  constructor(message: string, issue: FinalRoutePayloadValidationIssue) {
    super(message);
    this.name = "FinalRoutePayloadValidationError";
    this.issue = issue;
  }
}

function readCustomerOrderId(customer: RouteOptimizerCustomerInput): string | undefined {
  const orderId = customer.order_ids?.[0]?.trim();
  return orderId || undefined;
}

function looksLikeRealDeliveryOrderId(orderId: string): boolean {
  return /^DD-/i.test(orderId.trim());
}

export function validateFinalRouteRunPayload(input: {
  request: RouteOptimizerIntegrationRequest;
  runSlot?: string;
}): void {
  const driverName = input.request.run.driver_name;

  input.request.customers.forEach((customer, customerIndex) => {
    const orderId = readCustomerOrderId(customer);
    const customerName = customer.name?.trim() || undefined;
    const address = customer.address?.trim() || undefined;
    const isSynthetic = Boolean(customer.is_synthetic);
    const baseIssue = {
      driverName,
      runSlot: input.runSlot,
      customerIndex,
      orderId,
      customerName,
      address,
      isSynthetic,
      stopType: customer.stop_type,
    };

    if (!customerName) {
      throw new FinalRoutePayloadValidationError(
        `${driverName} route cannot be created because customer ${customerIndex + 1} is missing name.`,
        { ...baseIssue, field: "name" }
      );
    }

    if (!address) {
      const target = orderId
        ? `order ${orderId}${customerName ? ` (${customerName})` : ""}`
        : customerName ?? `customer ${customerIndex + 1}`;
      throw new FinalRoutePayloadValidationError(
        `${driverName} route cannot be created because ${target} is missing address.`,
        { ...baseIssue, field: "address" }
      );
    }

    if (isSynthetic) {
      if (!orderId || !isSyntheticMeetupOrderId(orderId)) {
        throw new FinalRoutePayloadValidationError(
          `${driverName} route cannot be created because synthetic meet-up/handoff stop "${customerName}" must use a synthetic order id, not a real customer order.`,
          { ...baseIssue, field: "orderId" }
        );
      }

      if (customerName !== SYNTHETIC_MEETUP_STOP_NAME) {
        throw new FinalRoutePayloadValidationError(
          `${driverName} route cannot be created because synthetic meet-up/handoff stop must not reuse a real customer name.`,
          { ...baseIssue, field: "name" }
        );
      }

      const realOrderIds = (customer.order_ids ?? []).filter((id) => looksLikeRealDeliveryOrderId(id));
      if (realOrderIds.length > 0) {
        throw new FinalRoutePayloadValidationError(
          `${driverName} route cannot be created because synthetic meet-up/handoff stop must not reference real delivery order ids (${realOrderIds.join(", ")}).`,
          { ...baseIssue, field: "orderId" }
        );
      }
    }

    if (!customer.phone?.trim()) {
      if (isSynthetic) {
        throw new FinalRoutePayloadValidationError(
          `${driverName} route cannot be created because synthetic meet-up/handoff stop "${customerName}" at ${address} is missing phone number. Set MEETUP_CONTACT_PHONE or KAPIOO_HANDOFF_CONTACT_PHONE.`,
          { ...baseIssue, field: "phone" }
        );
      }

      const target = orderId
        ? `order ${orderId}${customerName ? ` (${customerName})` : ""}${address ? ` at ${address}` : ""}`
        : `${customerName ?? `customer ${customerIndex + 1}`}${address ? ` at ${address}` : ""}`;
      throw new FinalRoutePayloadValidationError(
        `${driverName} route cannot be created because ${target} is missing phone number.`,
        { ...baseIssue, field: "phone" }
      );
    }
  });
}

export function buildFailedRouteSummaryFromPayloadValidation(input: {
  issue: FinalRoutePayloadValidationIssue;
  runSlot: string;
  stopCount: number;
  externalId: string;
  idempotencyKey: string;
}): import("@/lib/agents/delivery/run-log-types").DeliveryAgentFinalRouteRunFailure {
  return {
    runSlot: input.runSlot,
    driverName: input.issue.driverName,
    stopCount: input.stopCount,
    externalId: input.externalId,
    idempotencyKey: input.idempotencyKey,
    customerIndex: input.issue.customerIndex,
    customerName: input.issue.customerName,
    address: input.issue.address,
    orderId: input.issue.orderId,
    field: input.issue.field,
    errorCode: "ROUTE_OPTIMIZER_PAYLOAD_VALIDATION",
    errorMessage:
      input.issue.field === "phone"
        ? `${input.issue.driverName} route cannot be created because ${
            input.issue.isSynthetic
              ? `synthetic meet-up stop "${input.issue.customerName}"`
              : input.issue.orderId
                ? `order ${input.issue.orderId}${input.issue.customerName ? ` (${input.issue.customerName})` : ""}`
                : input.issue.customerName ?? "a customer"
          } is missing phone number.`
        : undefined,
  };
}
