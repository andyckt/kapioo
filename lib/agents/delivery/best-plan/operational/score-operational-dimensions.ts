import type { CandidateAssignedRun, CandidateScoringInput } from "@/lib/agents/delivery/best-plan/types";
import type { DeliveryAgentCandidateScoreBreakdownItem } from "@/lib/contracts/delivery-agent";
import type {
  DeliveryPlanningMeetupSelectionPreferences,
  DeliveryPlanningSelfFallbackPolicy,
} from "@/lib/agents/delivery/planning-profile/types";
import type { ScoringWeightKey } from "@/lib/agents/delivery/best-plan/types";

import { assignedRunsHaveUptownReceiverBurden } from "@/lib/agents/delivery/best-plan/operational/detect-uptown-receiver-burden";
import {
  clamp,
  distanceToPoints,
  hasLatLng,
  manhattanDistance,
  readCoordinate,
} from "@/lib/agents/delivery/best-plan/operational/geo-helpers";

function buildBreakdownItem(
  key: ScoringWeightKey,
  weight: number,
  points: number,
  reason: string
): DeliveryAgentCandidateScoreBreakdownItem {
  return {
    key,
    label: key,
    weight,
    points: Math.round(points),
    reason,
  };
}

function readDriverBalanceRatio(input: CandidateScoringInput): number | undefined {
  const runA = input.candidate.runs.find((run) => run.runSlot === "A");
  const runB = input.candidate.runs.find((run) => run.runSlot === "B");
  const durationA = runA?.totalDurationMinutes;
  const durationB = runB?.totalDurationMinutes;

  if (durationA === undefined || durationB === undefined || durationA <= 0 || durationB <= 0) {
    return undefined;
  }

  return Math.min(durationA, durationB) / Math.max(durationA, durationB);
}

export function scorePreferTwoDriverPlans(
  input: CandidateScoringInput,
  policy: DeliveryPlanningSelfFallbackPolicy
): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.preferTwoDriverPlans;
  const { summary } = input.candidate;

  if (summary.selfUsed || summary.runCount !== 2) {
    const points = summary.selfUsed ? 45 : summary.runCount === 2 ? 100 : 55;
    return {
      key: "preferTwoDriverPlans",
      label: "Prefer 2-driver plans",
      weight,
      points,
      reason: summary.selfUsed
        ? "Uses Self — 2-driver preference not applicable."
        : summary.runCount === 2
          ? "Two-driver split without Self."
          : `${summary.runCount} runs — not a standard 2-driver plan.`,
    };
  }

  const buffer = summary.minutesBeforeOrAfterDeadline ?? 0;
  const balanceRatio = readDriverBalanceRatio(input) ?? 0.7;
  const onTime = summary.allRunsFinishBeforeDeadline;
  const bufferOk = buffer >= policy.minTwoDriverBufferMinutes;
  const balanceOk = balanceRatio >= policy.minTwoDriverBalanceRatio;

  let points = 70;
  if (onTime && bufferOk && balanceOk) {
    points = 100;
  } else if (onTime && bufferOk) {
    points = 85;
  } else if (onTime) {
    points = 65;
  } else {
    points = 30;
  }

  return {
    key: "preferTwoDriverPlans",
    label: "Prefer 2-driver plans",
    weight,
    points,
    reason: onTime && bufferOk && balanceOk
      ? `2-driver plan finishes before 1 PM with ${buffer} min buffer and balanced drivers.`
      : onTime
        ? `2-driver plan on time but buffer (${buffer} min) or balance may be tight.`
        : "2-driver plan does not finish before deadline.",
  };
}

function resolveMeetupCoords(input: CandidateScoringInput): { lat?: number; lng?: number } {
  const meetup = input.candidate.handoffPlan?.selectedMeetup;
  if (meetup && typeof meetup.lat === "number" && typeof meetup.lng === "number") {
    return { lat: meetup.lat, lng: meetup.lng };
  }

  const meetupOrderId = meetup?.sourceOrderId;
  if (meetupOrderId && input.assignedRuns) {
    for (const run of input.assignedRuns) {
      const stop = run.stops.find((s) => s.orderId === meetupOrderId);
      if (stop && hasLatLng(stop)) {
        return { lat: stop.lat, lng: stop.lng };
      }
    }
  }

  return {};
}

export function scoreMeetupOperationalBalance(
  input: CandidateScoringInput,
  prefs: DeliveryPlanningMeetupSelectionPreferences
): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.meetupOperationalBalance;
  const meetup = input.candidate.handoffPlan?.selectedMeetup;

  if (!meetup || input.candidate.handoffPlan?.handoffSkipped) {
    return {
      key: "meetupOperationalBalance",
      label: "Meet-up operational balance",
      weight,
      points: 70,
      reason: "No handoff meet-up in this candidate.",
    };
  }

  const coords = resolveMeetupCoords(input);
  const uptownBurden = assignedRunsHaveUptownReceiverBurden(input.assignedRuns);
  const center = {
    lat: readCoordinate(prefs.preferredHandoffCenterLat, 43.7615),
    lng: readCoordinate(prefs.preferredHandoffCenterLng, -79.4111),
  };
  const kitchen = {
    lat: readCoordinate(prefs.kitchenReferenceLat, 43.642),
    lng: readCoordinate(prefs.kitchenReferenceLng, -79.395),
  };
  const receiverRef = {
    lat: readCoordinate(prefs.receiverReferenceLat, 43.856),
    lng: readCoordinate(prefs.receiverReferenceLng, -79.337),
  };

  let points = 70;
  const notes: string[] = [];

  if (hasLatLng(coords)) {
    const centralFit = distanceToPoints(manhattanDistance(coords as { lat: number; lng: number }, center), 0.12);
    const receiverFit = distanceToPoints(
      manhattanDistance(coords as { lat: number; lng: number }, receiverRef),
      0.18
    );
    points = centralFit * 0.55 + receiverFit * 0.45;

    if (centralFit >= 75) {
      notes.push("central North York corridor");
    }

    if (uptownBurden) {
      const kitchenDist = manhattanDistance(coords as { lat: number; lng: number }, kitchen);
      const maxKitchen = prefs.maxKitchenProximityDegrees ?? 0.06;
      if (kitchenDist <= maxKitchen) {
        points = clamp(points - 35, 0, 100);
        notes.push("meet-up too close to kitchen for Markham/Richmond Hill receiver route");
      } else if (centralFit >= 75 && kitchenDist > maxKitchen) {
        points = clamp(points + 15, 0, 100);
        notes.push("central North York balances DT and Marco for uptown receiver burden");
      } else if (receiverFit < 45) {
        points = clamp(points - 20, 0, 100);
        notes.push("meet-up may be too far south for receiver coming from uptown");
      } else {
        notes.push("balances DT and Marco for uptown receiver burden");
      }
    }
  } else {
    points = uptownBurden ? 55 : 65;
    notes.push("coordinates unavailable; area-based meet-up balance estimate");
  }

  return {
    key: "meetupOperationalBalance",
    label: "Meet-up operational balance",
    weight,
    points: Math.round(points),
    reason: notes.length > 0 ? notes.join("; ") : "Meet-up location is acceptable for provider and receiver.",
  };
}

const FLEXIBLE_NY_AREAS = new Set(["north york", "unknown", ""]);

function isOnPathBetween(
  stop: { lat: number; lng: number },
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  tolerance = 0.04
): boolean {
  const minLat = Math.min(from.lat, to.lat) - tolerance;
  const maxLat = Math.max(from.lat, to.lat) + tolerance;
  const minLng = Math.min(from.lng, to.lng) - tolerance;
  const maxLng = Math.max(from.lng, to.lng) + tolerance;

  return stop.lat >= minLat && stop.lat <= maxLat && stop.lng >= minLng && stop.lng <= maxLng;
}

export function scoreOnTheWayBeforeMeetup(
  input: CandidateScoringInput,
  prefs: DeliveryPlanningMeetupSelectionPreferences
): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.onTheWayBeforeMeetup;
  const runA = input.candidate.runs.find((run) => run.runSlot === "A");
  const meetup = input.candidate.handoffPlan?.selectedMeetup;

  if (!runA || !meetup || input.candidate.handoffPlan?.handoffSkipped) {
    return {
      key: "onTheWayBeforeMeetup",
      label: "On-the-way stops before meet-up",
      weight,
      points: 70,
      reason: "No DT run or meet-up to evaluate on-the-way sequencing.",
    };
  }

  const meetupPosition = meetup.meetupFixedStopPosition ?? 1;
  const optimized = runA.optimizedStops ?? [];
  const meetupOrderId = meetup.sourceOrderId;

  let meetupSequence = optimized.findIndex((stop) =>
    stop.orderIds.some((id) => id === meetupOrderId)
  );
  if (meetupSequence < 0 && meetupPosition > 0) {
    meetupSequence = meetupPosition - 1;
  }

  const beforeMeetup = meetupSequence > 0 ? optimized.slice(0, meetupSequence) : [];
  const assignedRunA = input.assignedRuns?.find((run) => run.runSlot === "A");

  const kitchen = {
    lat: readCoordinate(prefs.kitchenReferenceLat, 43.642),
    lng: readCoordinate(prefs.kitchenReferenceLng, -79.395),
  };
  const meetupCoords = resolveMeetupCoords(input);

  let onTheWayCount = 0;
  let downtownBeforeMeetup = false;

  for (const seqStop of beforeMeetup) {
    const orderId = seqStop.orderIds[0];
    const assigned = assignedRunA?.stops.find((s) => s.orderId === orderId);
    const area = assigned?.area?.trim().toLowerCase() ?? "";

    if (area === "downtown toronto" || area === "midtown") {
      downtownBeforeMeetup = true;
    }

    if (FLEXIBLE_NY_AREAS.has(area) || area === "north york") {
      if (hasLatLng(meetupCoords) && assigned && hasLatLng(assigned)) {
        if (
          isOnPathBetween(
            { lat: assigned.lat!, lng: assigned.lng! },
            kitchen,
            meetupCoords as { lat: number; lng: number }
          )
        ) {
          onTheWayCount += 1;
        }
      } else {
        onTheWayCount += 1;
      }
    }
  }

  let points = 65;
  if (downtownBeforeMeetup) {
    points = 35;
  } else if (onTheWayCount >= 2) {
    points = 95;
  } else if (onTheWayCount === 1) {
    points = 85;
  } else if (beforeMeetup.length === 0) {
    points = 60;
  }

  return {
    key: "onTheWayBeforeMeetup",
    label: "On-the-way stops before meet-up",
    weight,
    points,
    reason: downtownBeforeMeetup
      ? "Downtown stop appears before meet-up — reduces on-the-way score."
      : onTheWayCount > 0
        ? `DT completes ${onTheWayCount} on-the-way North York stop(s) before handoff.`
        : "No on-the-way North York stops sequenced before meet-up.",
  };
}

export function buildAssignedRunLookup(
  assignedRuns?: CandidateAssignedRun[]
): Map<string, { runSlot: string; stop: CandidateAssignedRun["stops"][number] }> {
  const map = new Map<string, { runSlot: string; stop: CandidateAssignedRun["stops"][number] }>();
  if (!assignedRuns) {
    return map;
  }

  for (const run of assignedRuns) {
    for (const stop of run.stops) {
      map.set(stop.orderId, { runSlot: run.runSlot, stop });
    }
  }

  return map;
}
