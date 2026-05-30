import {
  type CustomerConstraintsMap,
  validateFixedStopPositions,
} from "@/lib/agents/delivery/candidate-plans/apply-customer-constraints";
import { toPlanningStop } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type {
  DeliveryAgentCandidateHandoffPreviewPlan,
  DeliveryAgentCandidatePlan,
  DeliveryAgentRepairActionApplied,
  DeliveryAgentRouteShapeIssuePreview,
  DeliveryAgentRouteShapeIssueType,
} from "@/lib/contracts/delivery-agent";

export type RouteShapeRepairPlan = {
  dtCustomerConstraints: CustomerConstraintsMap;
  marcoCustomerConstraints: CustomerConstraintsMap;
  syntheticMeetupFixedPosition?: 1 | 2;
  actions: DeliveryAgentRepairActionApplied[];
  warnings: string[];
  requiresDtRepreview: boolean;
  requiresMarcoRepreview: boolean;
};

function isRepairActionAllowed(
  profile: DeliveryPlanningProfile,
  action: "apply_fixed_stop_position" | "apply_end_point"
): boolean {
  return profile.allowedRepairActions.includes(action);
}

function hasIssueType(
  issues: DeliveryAgentRouteShapeIssuePreview[],
  issueType: DeliveryAgentRouteShapeIssueType
): boolean {
  return issues.some((issue) => issue.issueType === issueType);
}

function pickSouthernmostDtEndpoint(input: {
  runStops: DeliveryAgentCandidatePlan["runs"][number]["stops"];
  routingStopByOrderId: Map<string, RoutingStop>;
}): DeliveryAgentCandidatePlan["runs"][number]["stops"][number] | undefined {
  const downtownStops = input.runStops.filter((stop) => {
    const routingStop = input.routingStopByOrderId.get(stop.orderId);
    if (routingStop) {
      return toPlanningStop(routingStop).areaBucket === "core_dt";
    }

    return stop.area === "Downtown Toronto" || stop.area === "Midtown";
  });

  if (downtownStops.length === 0) {
    return undefined;
  }

  const withCoords = downtownStops.filter(
    (stop) => typeof stop.lat === "number" && typeof stop.lng === "number"
  );

  if (withCoords.length > 0) {
    return withCoords.reduce((best, current) =>
      (current.lat ?? Number.MAX_VALUE) < (best.lat ?? Number.MAX_VALUE) ? current : best
    );
  }

  return downtownStops[downtownStops.length - 1];
}

function pickMarcoEndpoint(input: {
  runStops: DeliveryAgentCandidatePlan["runs"][number]["stops"];
  routingStopByOrderId: Map<string, RoutingStop>;
}): DeliveryAgentCandidatePlan["runs"][number]["stops"][number] | undefined {
  const markhamRichmond = input.runStops.filter(
    (stop) => stop.area === "Markham" || stop.area === "Richmond Hill"
  );

  if (markhamRichmond.length > 0) {
    const withCoords = markhamRichmond.filter(
      (stop) => typeof stop.lat === "number" && typeof stop.lng === "number"
    );

    if (withCoords.length > 0) {
      return withCoords.reduce((best, current) =>
        (current.lat ?? Number.MIN_VALUE) > (best.lat ?? Number.MIN_VALUE) ? current : best
      );
    }

    return markhamRichmond[markhamRichmond.length - 1];
  }

  const uptownStops = input.runStops.filter((stop) => {
    const routingStop = input.routingStopByOrderId.get(stop.orderId);
    if (routingStop) {
      return toPlanningStop(routingStop).areaBucket === "core_uptown";
    }

    return stop.area === "Markham" || stop.area === "Richmond Hill";
  });

  if (uptownStops.length === 0) {
    return undefined;
  }

  const withCoords = uptownStops.filter(
    (stop) => typeof stop.lat === "number" && typeof stop.lng === "number"
  );

  if (withCoords.length > 0) {
    return withCoords.reduce((best, current) =>
      (current.lat ?? Number.MIN_VALUE) > (best.lat ?? Number.MIN_VALUE) ? current : best
    );
  }

  return uptownStops[uptownStops.length - 1];
}

export function planRouteShapeRepairs(input: {
  issues: DeliveryAgentRouteShapeIssuePreview[];
  candidate: DeliveryAgentCandidatePlan;
  profile: DeliveryPlanningProfile;
  handoffPlan: DeliveryAgentCandidateHandoffPreviewPlan;
  routingStopByOrderId: Map<string, RoutingStop>;
}): RouteShapeRepairPlan {
  const dtCustomerConstraints: CustomerConstraintsMap = new Map();
  const marcoCustomerConstraints: CustomerConstraintsMap = new Map();
  const actions: DeliveryAgentRepairActionApplied[] = [];
  const warnings: string[] = [];
  let syntheticMeetupFixedPosition = input.handoffPlan.selectedMeetup?.meetupFixedStopPosition;
  let requiresDtRepreview = false;
  let requiresMarcoRepreview = false;

  const runA = input.candidate.runs.find((run) => run.runSlot === "A");
  const runB = input.candidate.runs.find((run) => run.runSlot === "B");

  if (
    hasIssueType(input.issues, "meetup_too_late") ||
    hasIssueType(input.issues, "downtown_before_meetup")
  ) {
    if (
      isRepairActionAllowed(input.profile, "apply_fixed_stop_position") &&
      input.handoffPlan.selectedMeetup
    ) {
      const targetPosition = input.handoffPlan.selectedMeetup.meetupFixedStopPosition;
      syntheticMeetupFixedPosition = targetPosition;

      actions.push({
        actionType: "apply_fixed_stop_position",
        runSlot: "A",
        targetStopName: input.profile.handoffRules.syntheticMeetupStopName,
        targetStopAddress: input.handoffPlan.selectedMeetup.meetupAddress,
        fixedStopPosition: targetPosition,
        reason: hasIssueType(input.issues, "meetup_too_late")
          ? "Meet-up was too late in the optimized route; enforce early fixed position."
          : "Downtown stops appeared before meet-up; enforce meet-up as early fixed stop.",
        before: input.handoffPlan.selectedMeetup.meetupFixedStopPosition.toString(),
        after: targetPosition.toString(),
      });
      requiresDtRepreview = true;
    }
  }

  if (hasIssueType(input.issues, "north_york_after_downtown") && runA) {
    if (isRepairActionAllowed(input.profile, "apply_fixed_stop_position")) {
      const meetupPosition = syntheticMeetupFixedPosition ?? 1;
      const stopBeforeMeetupOrderId = input.handoffPlan.selectedMeetup?.stopBeforeMeetupOrderId;

      const northYorkStops = runA.stops.filter((stop) => {
        if (stop.orderId === stopBeforeMeetupOrderId) {
          return false;
        }

        const routingStop = input.routingStopByOrderId.get(stop.orderId);
        if (routingStop) {
          return toPlanningStop(routingStop).areaBucket === "flexible_north_york";
        }

        return stop.area === "North York";
      });

      let nextPosition = meetupPosition + 1;
      for (const nyStop of northYorkStops.slice(0, 2)) {
        if (nextPosition > runA.stopCount + 1) {
          warnings.push(
            `Skipped fixing North York stop ${nyStop.orderId}: fixed position ${nextPosition} exceeds stop count.`
          );
          break;
        }

        dtCustomerConstraints.set(nyStop.orderId, { fixedStopPosition: nextPosition });
        actions.push({
          actionType: "apply_fixed_stop_position",
          runSlot: "A",
          targetStopName: nyStop.customerName,
          targetStopAddress: nyStop.formattedAddress,
          targetOrderIds: [nyStop.orderId],
          fixedStopPosition: nextPosition,
          reason:
            "North York stop should follow meet-up before downtown sequence continues.",
        });
        nextPosition += 1;
        requiresDtRepreview = true;
      }
    }
  }

  if (hasIssueType(input.issues, "dt_wrong_endpoint") && runA) {
    if (isRepairActionAllowed(input.profile, "apply_end_point")) {
      const endpointStop = pickSouthernmostDtEndpoint({
        runStops: runA.stops,
        routingStopByOrderId: input.routingStopByOrderId,
      });

      if (endpointStop) {
        dtCustomerConstraints.set(endpointStop.orderId, { isEndPoint: true });
        actions.push({
          actionType: "apply_end_point",
          runSlot: "A",
          targetStopName: endpointStop.customerName,
          targetStopAddress: endpointStop.formattedAddress,
          targetOrderIds: [endpointStop.orderId],
          reason: "DT route should end at a downtown/midtown stop.",
        });
        requiresDtRepreview = true;
      } else {
        warnings.push("Could not find a downtown/midtown stop to use as DT end point.");
      }
    }
  }

  if (hasIssueType(input.issues, "marco_wrong_endpoint") && runB) {
    if (isRepairActionAllowed(input.profile, "apply_end_point")) {
      const endpointStop = pickMarcoEndpoint({
        runStops: runB.stops,
        routingStopByOrderId: input.routingStopByOrderId,
      });

      if (endpointStop) {
        marcoCustomerConstraints.set(endpointStop.orderId, { isEndPoint: true });
        actions.push({
          actionType: "apply_end_point",
          runSlot: "B",
          targetStopName: endpointStop.customerName,
          targetStopAddress: endpointStop.formattedAddress,
          targetOrderIds: [endpointStop.orderId],
          reason: "Marco route should end at an uptown / Markham / Richmond Hill stop.",
        });
        requiresMarcoRepreview = true;
      } else {
        warnings.push("Could not find an uptown stop to use as Marco end point.");
      }
    }
  }

  const fixedValidation = validateFixedStopPositions({
    syntheticFixedPosition: syntheticMeetupFixedPosition,
    customerConstraints: dtCustomerConstraints,
  });

  if (!fixedValidation.valid) {
    warnings.push(fixedValidation.warning ?? "Duplicate fixed stop positions detected.");

    for (const [orderId, constraint] of [...dtCustomerConstraints.entries()]) {
      if (
        constraint.fixedStopPosition !== undefined &&
        fixedValidation.duplicatePositions.includes(constraint.fixedStopPosition)
      ) {
        dtCustomerConstraints.delete(orderId);
      }
    }

    for (let index = actions.length - 1; index >= 0; index -= 1) {
      const action = actions[index];
      if (
        action.actionType === "apply_fixed_stop_position" &&
        action.runSlot === "A" &&
        action.targetOrderIds?.length &&
        !dtCustomerConstraints.has(action.targetOrderIds[0])
      ) {
        actions.splice(index, 1);
      }
    }
  }

  return {
    dtCustomerConstraints,
    marcoCustomerConstraints,
    syntheticMeetupFixedPosition,
    actions,
    warnings,
    requiresDtRepreview,
    requiresMarcoRepreview,
  };
}
