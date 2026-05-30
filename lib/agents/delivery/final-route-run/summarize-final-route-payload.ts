import {
  isSyntheticMeetupOrderId,
  SYNTHETIC_MEETUP_STOP_NAME,
} from "@/lib/agents/delivery/candidate-plans/synthetic-meetup-stop";
import type { RouteOptimizerIntegrationRequest } from "@/lib/integrations/route-optimizer/types";

export type FinalRouteSyntheticMeetupStopSummary = {
  name: string;
  address: string;
  phone: string;
  orderId: string;
  stopType?: string;
  isSyntheticOrderId: boolean;
  fixedStopPosition?: number;
  notes?: string;
};

export type FinalRouteRunPayloadSummary = {
  externalId?: string;
  idempotencyKey?: string;
  driverName: string;
  customerCount: number;
  realCustomerStopCount: number;
  startLocation: string;
  startTime: string;
  endLocation?: string;
  realCustomerOrderIds: string[];
  customersMissingAddress: string[];
  customersMissingCoordinates: string[];
  endPointCustomerOrderIds: string[];
  syntheticMeetupCustomers: number;
  syntheticMeetupStops: FinalRouteSyntheticMeetupStopSummary[];
  fixedStopCustomers: number;
};

function readLocationString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "address" in value) {
    const address = (value as { address?: unknown }).address;
    return typeof address === "string" ? address : "";
  }
  return "";
}

export function summarizeFinalRouteRunPayload(
  request: RouteOptimizerIntegrationRequest
): FinalRouteRunPayloadSummary {
  const customersMissingAddress: string[] = [];
  const customersMissingCoordinates: string[] = [];
  const endPointCustomerOrderIds: string[] = [];
  const realCustomerOrderIds: string[] = [];
  const syntheticMeetupStops: FinalRouteSyntheticMeetupStopSummary[] = [];
  let syntheticMeetupCustomers = 0;
  let fixedStopCustomers = 0;

  for (const customer of request.customers) {
    const orderId = customer.order_ids?.[0]?.trim() ?? "";
    const isSynthetic = Boolean(customer.is_synthetic);

    if (isSynthetic) {
      syntheticMeetupCustomers += 1;
      syntheticMeetupStops.push({
        name: customer.name,
        address: customer.address?.trim() ?? "",
        phone: customer.phone?.trim() ?? "",
        orderId: orderId || SYNTHETIC_MEETUP_STOP_NAME,
        stopType: customer.stop_type,
        isSyntheticOrderId: isSyntheticMeetupOrderId(orderId),
        fixedStopPosition: customer.fixed_stop_position,
        notes: customer.notes,
      });
    } else {
      realCustomerOrderIds.push(orderId || customer.name);
    }

    if (!customer.address?.trim()) {
      customersMissingAddress.push(orderId || customer.name);
    }

    if (typeof customer.lat !== "number" || typeof customer.lng !== "number") {
      customersMissingCoordinates.push(orderId || customer.name);
    }

    if (customer.is_end_point && orderId) {
      endPointCustomerOrderIds.push(orderId);
    }

    if (customer.fixed_stop_position !== undefined) {
      fixedStopCustomers += 1;
    }
  }

  return {
    externalId: request.external_id,
    idempotencyKey: request.idempotency_key,
    driverName: request.run.driver_name,
    customerCount: request.customers.length,
    realCustomerStopCount: realCustomerOrderIds.length,
    startLocation: readLocationString(request.run.start_location),
    startTime: request.run.start_time,
    endLocation: readLocationString(request.run.end_location),
    realCustomerOrderIds,
    customersMissingAddress,
    customersMissingCoordinates,
    endPointCustomerOrderIds,
    syntheticMeetupCustomers,
    syntheticMeetupStops,
    fixedStopCustomers,
  };
}
