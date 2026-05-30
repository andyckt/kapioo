import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type { RouteOptimizerCustomerInput, RouteOptimizerPreviewRequest } from "@/lib/integrations/route-optimizer/types";
import {
  applyCustomerConstraints,
  type CustomerConstraintsMap,
} from "@/lib/agents/delivery/candidate-plans/apply-customer-constraints";

export type { CustomerConstraintsMap };

export type CandidateRunPreviewInput = {
  runSlot: string;
  driverName: string;
  stops: Array<{ orderId: string }>;
};

export const M9_RECEIVER_START_TIME_ASSUMPTION =
  "Receiver start time is temporary in M9; handoff ETA-derived start time will be added later.";

export const M9_MARCO_START_LOCATION_ASSUMPTION =
  "Marco start location is temporary; real start will be derived from meet-up ETA in a later milestone.";

export const M10_HANDOFF_SKIPPED_ASSUMPTION_PREFIX =
  "Handoff preview skipped:";

export class CandidateRunPreviewPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidateRunPreviewPayloadError";
  }
}

export function resolveCandidateRunStartTime(
  run: CandidateRunPreviewInput,
  profile: DeliveryPlanningProfile,
  handoffStartTime?: string
): string {
  if (run.runSlot === "B" && handoffStartTime) {
    return handoffStartTime;
  }

  return profile.timeRules.normalKitchenStartTime;
}

export function getCandidateRunPreviewAssumptions(
  run: CandidateRunPreviewInput,
  options: { handoffApplied?: boolean; handoffSkippedReason?: string } = {}
): string[] {
  if (options.handoffSkippedReason) {
    return [`${M10_HANDOFF_SKIPPED_ASSUMPTION_PREFIX} ${options.handoffSkippedReason}`];
  }

  if (run.runSlot === "B" && !options.handoffApplied) {
    return [M9_RECEIVER_START_TIME_ASSUMPTION, M9_MARCO_START_LOCATION_ASSUMPTION];
  }

  return [];
}

function mapRunCustomers(
  run: CandidateRunPreviewInput,
  routingStopByOrderId: Map<string, RoutingStop>,
  orderIds?: string[]
): RouteOptimizerCustomerInput[] {
  const stops = orderIds
    ? orderIds.map((orderId) => ({ orderId }))
    : run.stops;

  return stops.map((stop) => {
    const routingStop = routingStopByOrderId.get(stop.orderId);

    if (!routingStop) {
      throw new CandidateRunPreviewPayloadError(
        `Missing routing stop for order ${stop.orderId} in run ${run.runSlot}`
      );
    }

    return routingStop.routeOptimizer;
  });
}

export function buildCandidateRunPreviewPayload(input: {
  deliveryDate: string;
  candidateId: string;
  run: CandidateRunPreviewInput;
  kitchenAddress: string;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
  handoffStartTime?: string;
  handoffStartLocation?: string;
  syntheticMeetupStop?: RouteOptimizerCustomerInput;
  dtCustomerOrderIds?: string[];
  customerConstraints?: CustomerConstraintsMap;
}): RouteOptimizerPreviewRequest {
  const startTime = resolveCandidateRunStartTime(input.run, input.profile, input.handoffStartTime);
  const startLocation =
    input.run.runSlot === "B" && input.handoffStartLocation
      ? input.handoffStartLocation
      : input.kitchenAddress;

  let customers = mapRunCustomers(
    input.run,
    input.routingStopByOrderId,
    input.dtCustomerOrderIds
  );

  customers = applyCustomerConstraints(customers, input.customerConstraints);

  if (input.syntheticMeetupStop) {
    customers.push(input.syntheticMeetupStop);
  }

  return {
    created_by_integration: "kapioo-admin",
    external_id: `kapioo-candidate-preview:${input.deliveryDate}:${input.candidateId}:${input.run.runSlot}`,
    run: {
      run_date: input.deliveryDate,
      driver_name: input.run.driverName,
      start_location: startLocation,
      start_time: startTime,
      travel_mode: "driving",
    },
    customers,
  };
}

export function buildDtHandoffPreviewPayload(input: {
  deliveryDate: string;
  candidateId: string;
  run: CandidateRunPreviewInput;
  kitchenAddress: string;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
  syntheticMeetupStop: RouteOptimizerCustomerInput;
  stopBeforeMeetupOrderId?: string;
  customerConstraints?: CustomerConstraintsMap;
}): RouteOptimizerPreviewRequest {
  const dtOrderIds = input.stopBeforeMeetupOrderId
    ? [
        input.stopBeforeMeetupOrderId,
        ...input.run.stops
          .map((stop) => stop.orderId)
          .filter((orderId) => orderId !== input.stopBeforeMeetupOrderId),
      ]
    : input.run.stops.map((stop) => stop.orderId);

  return buildCandidateRunPreviewPayload({
    deliveryDate: input.deliveryDate,
    candidateId: input.candidateId,
    run: input.run,
    kitchenAddress: input.kitchenAddress,
    profile: input.profile,
    routingStopByOrderId: input.routingStopByOrderId,
    syntheticMeetupStop: input.syntheticMeetupStop,
    dtCustomerOrderIds: dtOrderIds,
    customerConstraints: input.customerConstraints,
  });
}

export function buildMarcoHandoffPreviewPayload(input: {
  deliveryDate: string;
  candidateId: string;
  run: CandidateRunPreviewInput;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
  meetupAddress: string;
  meetupStartTime: string;
  customerConstraints?: CustomerConstraintsMap;
}): RouteOptimizerPreviewRequest {
  return buildCandidateRunPreviewPayload({
    deliveryDate: input.deliveryDate,
    candidateId: input.candidateId,
    run: input.run,
    kitchenAddress: input.meetupAddress,
    profile: input.profile,
    routingStopByOrderId: input.routingStopByOrderId,
    handoffStartLocation: input.meetupAddress,
    handoffStartTime: input.meetupStartTime,
    customerConstraints: input.customerConstraints,
  });
}
