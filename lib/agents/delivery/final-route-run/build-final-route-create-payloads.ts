import { applyCustomerConstraints } from "@/lib/agents/delivery/candidate-plans/apply-customer-constraints";
import type { CustomerConstraintsMap } from "@/lib/agents/delivery/candidate-plans/apply-customer-constraints";
import { buildSyntheticMeetupStop } from "@/lib/agents/delivery/candidate-plans/build-synthetic-meetup-stop";
import { isSyntheticMeetupOrderId } from "@/lib/agents/delivery/candidate-plans/synthetic-meetup-stop";
import { rebuildMeetupSelectionFromSelectedMeetup } from "@/lib/agents/delivery/candidate-plans/rank-meetup-options";
import { buildConstraintsFromRepairActions } from "@/lib/agents/delivery/final-route-run/build-constraints-from-repair-actions";
import { buildFinalRouteEndpointConstraints } from "@/lib/agents/delivery/final-route-run/apply-final-route-endpoint-constraints";
import { FinalRouteCreatePayloadError } from "@/lib/agents/delivery/final-route-run/errors";
import { resolveOperationalMeetupContactPhone } from "@/lib/agents/delivery/final-route-run/resolve-meetup-contact-phone";
import { validateFinalRouteRunPayload } from "@/lib/agents/delivery/final-route-run/validate-final-route-run-payload";
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

export { FinalRouteCreatePayloadError } from "@/lib/agents/delivery/final-route-run/errors";

function collectRunOrderIds(run: DeliveryAgentCandidateRunPreview): string[] {
  const seen = new Set<string>();
  for (const stop of run.optimizedStops) {
    for (const orderId of stop.orderIds ?? []) {
      const trimmed = orderId.trim();
      if (trimmed && !isSyntheticMeetupOrderId(trimmed)) {
        seen.add(trimmed);
      }
    }
  }
  return [...seen];
}

function mergeConstraintMaps(...maps: CustomerConstraintsMap[]): CustomerConstraintsMap {
  const merged: CustomerConstraintsMap = new Map();
  for (const map of maps) {
    for (const [orderId, constraint] of map.entries()) {
      merged.set(orderId, { ...merged.get(orderId), ...constraint });
    }
  }
  return merged;
}

function buildCustomers(input: {
  candidate: DeliveryAgentCandidatePlanPreview;
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
    if (!routingStop.routeOptimizer.address?.trim()) {
      throw new FinalRouteCreatePayloadError(
        `Missing customer address for order ${orderId} in run ${input.run.driverName}.`
      );
    }
    return {
      ...routingStop.routeOptimizer,
      phone: routingStop.routeOptimizer.phone?.trim() || routingStop.customerPhone.trim(),
      name: routingStop.routeOptimizer.name?.trim() || routingStop.customerName.trim(),
      address: routingStop.routeOptimizer.address?.trim() || routingStop.formattedAddress.trim(),
    };
  });

  const constrained = applyCustomerConstraints(
    customers,
    mergeConstraintMaps(
      buildConstraintsFromRepairActions(input.run.repairActionsApplied),
      buildFinalRouteEndpointConstraints({
        candidate: input.candidate,
        run: input.run,
        orderIds: input.orderIds,
        routingStopByOrderId: input.routingStopByOrderId,
      })
    )
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

  const stopBeforeMeetupOrderId =
    handoffPlan.selectedMeetup?.stopBeforeMeetupOrderId &&
    orderIds.includes(handoffPlan.selectedMeetup.stopBeforeMeetupOrderId)
      ? handoffPlan.selectedMeetup.stopBeforeMeetupOrderId
      : undefined;

  const syntheticMeetupStop =
    handoffActive && isProviderRun && handoffPlan.selectedMeetup
      ? buildSyntheticMeetupStop({
          profile: input.context.profile,
          selection: rebuildMeetupSelectionFromSelectedMeetup(handoffPlan.selectedMeetup),
          deliveryDate: input.context.deliveryDate,
          runSlot: input.run.runSlot,
          contactPhone: resolveOperationalMeetupContactPhone({
            profile: input.context.profile,
          }),
        })
      : undefined;

  const orderedOrderIds =
    syntheticMeetupStop && stopBeforeMeetupOrderId
      ? [
          stopBeforeMeetupOrderId,
          ...orderIds.filter((orderId) => orderId !== stopBeforeMeetupOrderId),
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

  const request = {
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
      candidate: input.candidate,
      run: input.run,
      orderIds: orderedOrderIds,
      routingStopByOrderId: input.context.routingStopByOrderId,
      syntheticMeetupStop,
    }),
  };

  validateFinalRouteRunPayload({
    request,
    runSlot: input.run.runSlot,
  });

  return request;
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

  const planningSessionId = input.context.planningSessionId.trim();
  if (!planningSessionId) {
    throw new FinalRouteCreatePayloadError(
      "Cannot create final Route Optimizer run because planning_session_id is missing."
    );
  }

  return {
    planning_session_id: planningSessionId,
    runs: runs.map((run) => ({
      ...run,
      planning_session_id: planningSessionId,
    })),
  };
}
