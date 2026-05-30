import {
  classifyOptimizedStop,
  classifyOptimizedStops,
  isNorthernAreaBucket,
  isSouthernAreaBucket,
  isSyntheticMeetupStop,
} from "@/lib/agents/delivery/candidate-plans/classify-optimized-stop-area";
import { toPlanningStop } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import { DOWNTOWN_REFERENCE } from "@/lib/agents/delivery/candidate-plans/types";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type {
  DeliveryAgentCandidateHandoffPreviewPlan,
  DeliveryAgentCandidatePlan,
  DeliveryAgentCandidateRunPreview,
  DeliveryAgentRouteShapeIssuePreview,
  DeliveryAgentRouteShapeIssueType,
} from "@/lib/contracts/delivery-agent";

const ISSUE_RULE_CODES: Record<DeliveryAgentRouteShapeIssueType, string> = {
  meetup_too_late: "MEETUP_NOT_TOO_LATE",
  downtown_before_meetup: "HANDOFF_BEFORE_DOWNTOWN_WHEN_NEEDED",
  north_york_after_downtown: "NO_DOWNTOWN_NORTH_PING_PONG",
  dt_wrong_endpoint: "DT_ENDS_DOWNTOWN_MIDTOWN",
  marco_wrong_endpoint: "UPTOWN_ENDS_UPTOWN",
};

function resolveRuleSeverity(
  profile: DeliveryPlanningProfile,
  issueType: DeliveryAgentRouteShapeIssueType
): "info" | "warning" | "blocking" {
  const code = ISSUE_RULE_CODES[issueType];
  const rule = profile.routeShapeRules.rules.find((entry) => entry.code === code);

  if (rule?.severity === "error") {
    return "blocking";
  }

  if (rule?.severity === "info") {
    return "info";
  }

  return "warning";
}

function buildIssue(input: {
  issueType: DeliveryAgentRouteShapeIssueType;
  run: DeliveryAgentCandidateRunPreview;
  profile: DeliveryPlanningProfile;
  message: string;
  evidence: Record<string, unknown>;
}): DeliveryAgentRouteShapeIssuePreview {
  return {
    issueType: input.issueType,
    runSlot: input.run.runSlot,
    driverName: input.run.driverName,
    severity: resolveRuleSeverity(input.profile, input.issueType),
    message: input.message,
    evidence: input.evidence,
  };
}

function detectDtMeetupIssues(input: {
  run: DeliveryAgentCandidateRunPreview;
  candidate: DeliveryAgentCandidatePlan;
  profile: DeliveryPlanningProfile;
  handoffPlan: DeliveryAgentCandidateHandoffPreviewPlan;
  routingStopByOrderId: Map<string, RoutingStop>;
}): DeliveryAgentRouteShapeIssuePreview[] {
  if (input.handoffPlan.handoffSkipped || !input.run.syntheticMeetupIncluded) {
    return [];
  }

  const runAssignment = input.candidate.runs.find((run) => run.runSlot === input.run.runSlot);
  if (!runAssignment) {
    return [];
  }

  const issues: DeliveryAgentRouteShapeIssuePreview[] = [];
  const maxAllowedSequence = input.profile.handoffRules.maxStopsBeforeMeetup + 1;
  const meetupSequence = input.run.meetupSequence;

  if (meetupSequence !== undefined && meetupSequence > maxAllowedSequence) {
    issues.push(
      buildIssue({
        issueType: "meetup_too_late",
        run: input.run,
        profile: input.profile,
        message: `Meet-up appears at stop #${meetupSequence}, later than allowed position #${maxAllowedSequence}.`,
        evidence: {
          meetupSequence,
          maxAllowedSequence,
          maxStopsBeforeMeetup: input.profile.handoffRules.maxStopsBeforeMeetup,
        },
      })
    );
  }

  const meetupName = input.profile.handoffRules.syntheticMeetupStopName;
  const sortedStops = [...input.run.optimizedStops].sort((a, b) => a.sequence - b.sequence);
  const meetupStop = sortedStops.find((stop) => isSyntheticMeetupStop(stop, meetupName));

  if (meetupStop) {
    const downtownBeforeMeetup = sortedStops.some((stop) => {
      if (stop.sequence >= meetupStop.sequence) {
        return false;
      }

      return (
        classifyOptimizedStop({
          stop,
          candidateStops: runAssignment.stops,
          routingStopByOrderId: input.routingStopByOrderId,
          meetupName,
        }).areaBucket === "core_dt"
      );
    });

    if (downtownBeforeMeetup) {
      issues.push(
        buildIssue({
          issueType: "downtown_before_meetup",
          run: input.run,
          profile: input.profile,
          message: "DT route has downtown/midtown stops before the synthetic meet-up.",
          evidence: {
            meetupSequence: meetupStop.sequence,
            stopsBeforeMeetup: sortedStops
              .filter((stop) => stop.sequence < meetupStop.sequence)
              .map((stop) => ({ sequence: stop.sequence, name: stop.name })),
          },
        })
      );
    }
  }

  return issues;
}

function detectDtSequenceIssues(input: {
  run: DeliveryAgentCandidateRunPreview;
  candidate: DeliveryAgentCandidatePlan;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
}): DeliveryAgentRouteShapeIssuePreview[] {
  const runAssignment = input.candidate.runs.find((run) => run.runSlot === input.run.runSlot);
  if (!runAssignment) {
    return [];
  }

  const meetupName = input.profile.handoffRules.syntheticMeetupStopName;
  const classified = classifyOptimizedStops({
    optimizedStops: input.run.optimizedStops,
    candidateStops: runAssignment.stops,
    routingStopByOrderId: input.routingStopByOrderId,
    meetupName,
  }).sort((a, b) => a.sequence - b.sequence);

  const firstDowntownIndex = classified.findIndex(
    (stop) => !stop.isSyntheticMeetup && stop.areaBucket === "core_dt"
  );

  if (firstDowntownIndex === -1) {
    return [];
  }

  const pingPongStop = classified
    .slice(firstDowntownIndex + 1)
    .find((stop) => !stop.isSyntheticMeetup && stop.areaBucket === "flexible_north_york");

  if (!pingPongStop) {
    return [];
  }

  return [
    buildIssue({
      issueType: "north_york_after_downtown",
      run: input.run,
      profile: input.profile,
      message:
        "DT route goes North York after downtown/midtown stops have started (ping-pong pattern).",
      evidence: {
        firstDowntownSequence: classified[firstDowntownIndex]?.sequence,
        northYorkAfterSequence: pingPongStop.sequence,
        northYorkStopName: pingPongStop.name,
      },
    }),
  ];
}

function detectDtEndpointIssue(input: {
  run: DeliveryAgentCandidateRunPreview;
  candidate: DeliveryAgentCandidatePlan;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
}): DeliveryAgentRouteShapeIssuePreview[] {
  const runAssignment = input.candidate.runs.find((run) => run.runSlot === input.run.runSlot);
  if (!runAssignment) {
    return [];
  }

  const hasDowntownAssigned = runAssignment.stops.some((stop) => {
    const routingStop = input.routingStopByOrderId.get(stop.orderId);
    if (routingStop) {
      return toPlanningStop(routingStop).areaBucket === "core_dt";
    }

    return stop.area === "Downtown Toronto" || stop.area === "Midtown";
  });

  if (!hasDowntownAssigned || input.run.optimizedStops.length === 0) {
    return [];
  }

  const meetupName = input.profile.handoffRules.syntheticMeetupStopName;
  const classified = classifyOptimizedStops({
    optimizedStops: input.run.optimizedStops,
    candidateStops: runAssignment.stops,
    routingStopByOrderId: input.routingStopByOrderId,
    meetupName,
  }).sort((a, b) => a.sequence - b.sequence);

  const finalStop = classified[classified.length - 1];
  if (!finalStop || finalStop.isSyntheticMeetup) {
    return [];
  }

  if (!isNorthernAreaBucket(finalStop.areaBucket)) {
    return [];
  }

  return [
    buildIssue({
      issueType: "dt_wrong_endpoint",
      run: input.run,
      profile: input.profile,
      message:
        "DT route ends in a northern area but includes downtown/midtown stops — should end downtown/midtown.",
      evidence: {
        finalSequence: finalStop.sequence,
        finalArea: finalStop.area,
        finalAreaBucket: finalStop.areaBucket,
        finalStopName: finalStop.name,
      },
    }),
  ];
}

function isSouthernStop(stop: {
  areaBucket: string;
  lat?: number;
}): boolean {
  if (isSouthernAreaBucket(stop.areaBucket as "core_dt")) {
    return true;
  }

  if (typeof stop.lat === "number") {
    return stop.lat < DOWNTOWN_REFERENCE.lat - 0.01;
  }

  return false;
}

function detectMarcoEndpointIssue(input: {
  run: DeliveryAgentCandidateRunPreview;
  candidate: DeliveryAgentCandidatePlan;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
}): DeliveryAgentRouteShapeIssuePreview[] {
  const runAssignment = input.candidate.runs.find((run) => run.runSlot === input.run.runSlot);
  if (!runAssignment) {
    return [];
  }

  const hasUptownAssigned = runAssignment.stops.some((stop) => {
    const routingStop = input.routingStopByOrderId.get(stop.orderId);
    if (routingStop) {
      const bucket = toPlanningStop(routingStop).areaBucket;
      return bucket === "core_uptown";
    }

    return stop.area === "Markham" || stop.area === "Richmond Hill";
  });

  if (!hasUptownAssigned || input.run.optimizedStops.length === 0) {
    return [];
  }

  const classified = classifyOptimizedStops({
    optimizedStops: input.run.optimizedStops,
    candidateStops: runAssignment.stops,
    routingStopByOrderId: input.routingStopByOrderId,
    meetupName: input.profile.handoffRules.syntheticMeetupStopName,
  }).sort((a, b) => a.sequence - b.sequence);

  const finalStop = classified[classified.length - 1];
  if (!finalStop) {
    return [];
  }

  if (!isSouthernStop(finalStop)) {
    return [];
  }

  return [
    buildIssue({
      issueType: "marco_wrong_endpoint",
      run: input.run,
      profile: input.profile,
      message:
        "Marco route ends too far south for an uptown run with Markham/Richmond Hill stops.",
      evidence: {
        finalSequence: finalStop.sequence,
        finalArea: finalStop.area,
        finalAreaBucket: finalStop.areaBucket,
        finalStopName: finalStop.name,
      },
    }),
  ];
}

export function detectRouteShapeIssues(input: {
  candidate: DeliveryAgentCandidatePlan;
  runPreviews: DeliveryAgentCandidateRunPreview[];
  profile: DeliveryPlanningProfile;
  handoffPlan: DeliveryAgentCandidateHandoffPreviewPlan;
  routingStopByOrderId: Map<string, RoutingStop>;
}): DeliveryAgentRouteShapeIssuePreview[] {
  const issues: DeliveryAgentRouteShapeIssuePreview[] = [];

  for (const run of input.runPreviews) {
    if (run.previewStatus !== "previewed") {
      continue;
    }

    if (run.runSlot === "A") {
      issues.push(
        ...detectDtMeetupIssues({
          run,
          candidate: input.candidate,
          profile: input.profile,
          handoffPlan: input.handoffPlan,
          routingStopByOrderId: input.routingStopByOrderId,
        }),
        ...detectDtSequenceIssues({
          run,
          candidate: input.candidate,
          profile: input.profile,
          routingStopByOrderId: input.routingStopByOrderId,
        }),
        ...detectDtEndpointIssue({
          run,
          candidate: input.candidate,
          profile: input.profile,
          routingStopByOrderId: input.routingStopByOrderId,
        })
      );
    }

    if (run.runSlot === "B") {
      issues.push(
        ...detectMarcoEndpointIssue({
          run,
          candidate: input.candidate,
          profile: input.profile,
          routingStopByOrderId: input.routingStopByOrderId,
        })
      );
    }
  }

  return issues;
}
