import { applyCustomerConstraints } from "@/lib/agents/delivery/candidate-plans/apply-customer-constraints";
import { buildSyntheticMeetupStop } from "@/lib/agents/delivery/candidate-plans/build-synthetic-meetup-stop";
import { rebuildMeetupSelectionFromSelectedMeetup } from "@/lib/agents/delivery/candidate-plans/rank-meetup-options";
import { buildConstraintsFromRepairActions } from "@/lib/agents/delivery/final-route-run/build-constraints-from-repair-actions";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type {
  DeliveryAgentCandidatePlanPreview,
  DeliveryAgentCandidateRunPreview,
} from "@/lib/contracts/delivery-agent";
import type {
  RouteOptimizerBatchCreateRequest,
  RouteOptimizerCustomerInput,
  RouteOptimizerIntegrationRequest,
} from "@/lib/integrations/route-optimizer/types";

export type FinalRouteCreatePayloadContext = {
  deliveryDate: string;
  deliveryAgentRunId: string;
  profileId: string;
  selectedCandidateId: string;
  planningSessionId: string;
  kitchenAddress: string;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
};

export class FinalRouteCreatePayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinalRouteCreatePayloadError";
  }
}

function collectRunOrderIds(run: DeliveryAgentCandidateRunPreview): string[] {
  const seen = new Set<string>();
  for (const stop of run.optimizedStops) {
    for (const orderId of stop.orderIds ?? []) {
      if (orderId.trim()) {
        seen.add(orderId);
      }
    }
  }
  return [...seen];
}

function buildCustomers(input: {
  run: DeliveryAgentCandidateRunPreview;
  orderIds: string[];
  routingStopByOrderId: Map<string, RoutingStop>;
  syntheticMeetupStop?: RouteOptimizerCustomerInput;
}): RouteOptimizerCustomerInput[] {
  const customers = input.orderIds.map((orderId) => {
    const routingStop = input.routingStopByOrderId.get(orderId);
    if (!routingStop) {
      throw new FinalRouteCreatePayloadError(
        `Missing routing stop for order ${orderId} in run ${input.run.runSlot}.`
      );
    }
    return routingStop.routeOptimizer;
  });

  const constrained = applyCustomerConstraints(
    customers,
    buildConstraintsFromRepairActions(input.run.repairActionsApplied)
  );

  if (input.syntheticMeetupStop) {
    constrained.push(input.syntheticMeetupStop);
  }

  return constrained;
}

function buildExternalId(input: FinalRouteCreatePayloadContext & { runSlot: string }): string {
  return [
    "kapioo-final-run",
    input.deliveryDate,
    input.deliveryAgentRunId,
    input.selectedCandidateId,
    input.runSlot,
  ].join(":");
}

function buildIdempotencyKey(input: FinalRouteCreatePayloadContext & { runSlot: string }): string {
  return [
    "daily-delivery-agent",
    input.deliveryDate,
    input.profileId,
    "final",
    input.selectedCandidateId,
    input.runSlot,
  ].join(":");
}

function buildRunPayload(input: {
  candidate: DeliveryAgentCandidatePlanPreview;
  run: DeliveryAgentCandidateRunPreview;
  context: FinalRouteCreatePayloadContext;
}): RouteOptimizerIntegrationRequest | null {
  if (input.run.previewStatus !== "previewed" || input.run.stopCount === 0) {
    return null;
  }

  const orderIds = collectRunOrderIds(input.run);
  if (orderIds.length === 0) {
    return null;
  }

  const handoffPlan = input.candidate.handoffPlan;
  const providerRunSlot = handoffPlan.providerRunSlot;
  const receiverRunSlot = handoffPlan.receiverRunSlot;
  const handoffActive = !handoffPlan.handoffSkipped && handoffPlan.selectedMeetup;
  const isProviderRun = input.run.runSlot === providerRunSlot;
  const isReceiverRun = input.run.runSlot === receiverRunSlot;

  const syntheticMeetupStop =
    handoffActive && isProviderRun && handoffPlan.selectedMeetup
      ? buildSyntheticMeetupStop({
          profile: input.context.profile,
          selection: rebuildMeetupSelectionFromSelectedMeetup(handoffPlan.selectedMeetup),
        })
      : undefined;

  const orderedOrderIds =
    syntheticMeetupStop && handoffPlan.selectedMeetup?.stopBeforeMeetupOrderId
      ? [
          handoffPlan.selectedMeetup.stopBeforeMeetupOrderId,
          ...orderIds.filter(
            (orderId) => orderId !== handoffPlan.selectedMeetup?.stopBeforeMeetupOrderId
          ),
        ]
      : orderIds;

  const startLocation =
    handoffActive && isReceiverRun && handoffPlan.receiverStartLocation
      ? handoffPlan.receiverStartLocation
      : input.context.kitchenAddress;
  const startTime =
    handoffActive && isReceiverRun && handoffPlan.receiverStartTime
      ? handoffPlan.receiverStartTime
      : input.context.profile.timeRules.normalKitchenStartTime;

  return {
    planning_session_id: input.context.planningSessionId,
    idempotency_key: buildIdempotencyKey({
      ...input.context,
      runSlot: input.run.runSlot,
    }),
    external_id: buildExternalId({
      ...input.context,
      runSlot: input.run.runSlot,
    }),
    created_by_integration: "kapioo-admin",
    run: {
      run_date: input.context.deliveryDate,
      driver_name: input.run.driverName,
      start_location: startLocation,
      start_time: startTime,
      travel_mode: "driving",
    },
    customers: buildCustomers({
      run: input.run,
      orderIds: orderedOrderIds,
      routingStopByOrderId: input.context.routingStopByOrderId,
      syntheticMeetupStop,
    }),
  };
}

export function buildFinalRouteCreatePayloads(input: {
  candidate: DeliveryAgentCandidatePlanPreview;
  context: FinalRouteCreatePayloadContext;
}): RouteOptimizerBatchCreateRequest {
  if (input.candidate.candidateId !== input.context.selectedCandidateId) {
    throw new FinalRouteCreatePayloadError(
      "Cannot create final Route Optimizer run because selectedCandidateId does not match finalAcceptedPlan."
    );
  }

  const runs = input.candidate.runs
    .map((run) => buildRunPayload({ candidate: input.candidate, run, context: input.context }))
    .filter((run): run is RouteOptimizerIntegrationRequest => Boolean(run));

  if (runs.length === 0) {
    throw new FinalRouteCreatePayloadError(
      "Cannot create final Route Optimizer run because the approved plan has no previewed stops."
    );
  }

  return { runs };
}
