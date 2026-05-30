import { inferNorthYorkLean } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import { DOWNTOWN_REFERENCE } from "@/lib/agents/delivery/candidate-plans/types";
import type { DeliveryAgentCandidatePlanStop } from "@/lib/contracts/delivery-agent";
import type { DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";

export type MeetupVariant = "meetup_stop_1" | "meetup_stop_2_with_one_before";

export type MeetupStopCandidate = {
  orderId: string;
  area: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  runSlot: string;
};

export type MeetupSelectionResult =
  | {
      handoffSkipped: false;
      meetupAddress: string;
      meetupFixedStopPosition: 1 | 2;
      variant: MeetupVariant;
      sourceOrderId: string;
      sourceArea: string;
      stopBeforeMeetupOrderId?: string;
      syntheticHandoffStopUsed: true;
    }
  | {
      handoffSkipped: true;
      skipReason: string;
    };

const NORTH_YORK_AREA = "North York";

function isNorthYorkStop(stop: Pick<DeliveryAgentCandidatePlanStop, "area" | "planningTags">): boolean {
  const area = stop.area.trim();
  if (area.toLowerCase() === NORTH_YORK_AREA.toLowerCase()) {
    return true;
  }

  return stop.planningTags.includes("flexible_north_york");
}

function toMeetupCandidate(
  stop: DeliveryAgentCandidatePlanStop,
  runSlot: string
): MeetupStopCandidate {
  return {
    orderId: stop.orderId,
    area: stop.area,
    formattedAddress: stop.formattedAddress,
    lat: stop.lat,
    lng: stop.lng,
    runSlot,
  };
}

function collectAllCandidateStops(runs: DeliveryAgentCandidateRun[]): MeetupStopCandidate[] {
  const collected: MeetupStopCandidate[] = [];

  for (const run of runs) {
    for (const stop of run.stops) {
      collected.push(toMeetupCandidate(stop, run.runSlot));
    }
  }

  return collected;
}

function meetupBoundaryScore(stop: MeetupStopCandidate): number {
  if (typeof stop.lat === "number" && typeof stop.lng === "number") {
    const latDelta = stop.lat - DOWNTOWN_REFERENCE.lat;
    const lngDelta = stop.lng - DOWNTOWN_REFERENCE.lng;
    return Math.abs(latDelta) + Math.abs(lngDelta) * 0.5;
  }

  const lean = inferNorthYorkLean({
    orderId: stop.orderId,
    formattedAddress: stop.formattedAddress,
    lat: stop.lat,
    lng: stop.lng,
  });

  return lean === "dt" ? 0.5 : 1.5;
}

function pickBestMeetupFromPool(pool: MeetupStopCandidate[]): MeetupStopCandidate {
  return [...pool].sort((a, b) => {
    const scoreDelta = meetupBoundaryScore(a) - meetupBoundaryScore(b);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return a.orderId.localeCompare(b.orderId);
  })[0];
}

function buildMeetupPool(
  runs: DeliveryAgentCandidateRun[]
): MeetupStopCandidate[] {
  const runA = runs.find((run) => run.runSlot === "A");
  const allStops = collectAllCandidateStops(runs);

  const runANorthYork =
    runA?.stops.filter(isNorthYorkStop).map((stop) => toMeetupCandidate(stop, "A")) ?? [];

  if (runANorthYork.length > 0) {
    return runANorthYork;
  }

  const flexibleNorthYork = allStops.filter(
    (stop) => stop.area.trim().toLowerCase() === NORTH_YORK_AREA.toLowerCase()
  );

  if (flexibleNorthYork.length > 0) {
    return flexibleNorthYork;
  }

  return allStops.filter((stop) =>
    stop.area.trim().toLowerCase().includes(NORTH_YORK_AREA.toLowerCase())
  );
}

function findStopBeforeMeetup(
  runAStops: DeliveryAgentCandidatePlanStop[],
  meetup: MeetupStopCandidate,
  profile: DeliveryPlanningProfile
): string | undefined {
  if (!profile.handoffRules.allowStopsBeforeMeetup || profile.handoffRules.maxStopsBeforeMeetup < 1) {
    return undefined;
  }

  const candidates = runAStops
    .filter((stop) => stop.orderId !== meetup.orderId && isNorthYorkStop(stop))
    .map((stop) => toMeetupCandidate(stop, "A"))
    .filter((stop) => {
      if (
        typeof stop.lat === "number" &&
        typeof stop.lng === "number" &&
        typeof meetup.lat === "number" &&
        typeof meetup.lng === "number"
      ) {
        const stopScore = stop.lat + stop.lng;
        const meetupScore = meetup.lat + meetup.lng;
        return stopScore <= meetupScore;
      }

      return inferNorthYorkLean(stop) === "dt";
    });

  if (candidates.length === 0) {
    return undefined;
  }

  return pickBestMeetupFromPool(candidates).orderId;
}

export function selectMeetupPoint(input: {
  runs: DeliveryAgentCandidateRun[];
  profile: DeliveryPlanningProfile;
}): MeetupSelectionResult {
  const runA = input.runs.find((run) => run.runSlot === "A");
  const runB = input.runs.find((run) => run.runSlot === "B");

  if (!runA || !runB || runA.stopCount === 0 || runB.stopCount === 0) {
    return {
      handoffSkipped: true,
      skipReason: "Handoff preview requires both DT and Marco runs with stops.",
    };
  }

  if (!input.profile.handoffRules.enabled) {
    return {
      handoffSkipped: true,
      skipReason: "Planning profile handoff rules are disabled.",
    };
  }

  const pool = buildMeetupPool(input.runs);

  if (pool.length === 0) {
    return {
      handoffSkipped: true,
      skipReason:
        "No North York stop available for meet-up selection; using temporary Marco start preview.",
    };
  }

  const selected = pickBestMeetupFromPool(pool);
  const stopBeforeMeetupOrderId = findStopBeforeMeetup(runA.stops, selected, input.profile);

  if (stopBeforeMeetupOrderId) {
    return {
      handoffSkipped: false,
      meetupAddress: selected.formattedAddress,
      meetupFixedStopPosition: 2,
      variant: "meetup_stop_2_with_one_before",
      sourceOrderId: selected.orderId,
      sourceArea: selected.area,
      stopBeforeMeetupOrderId,
      syntheticHandoffStopUsed: true,
    };
  }

  return {
    handoffSkipped: false,
    meetupAddress: selected.formattedAddress,
    meetupFixedStopPosition: 1,
    variant: "meetup_stop_1",
    sourceOrderId: selected.orderId,
    sourceArea: selected.area,
    syntheticHandoffStopUsed: true,
  };
}
