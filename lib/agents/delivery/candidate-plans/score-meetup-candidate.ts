import { inferNorthYorkLean } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import { DOWNTOWN_REFERENCE } from "@/lib/agents/delivery/candidate-plans/types";
import type { DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";
import type {
  DeliveryPlanningMeetupSelectionPreferences,
  DeliveryPlanningProfile,
} from "@/lib/agents/delivery/planning-profile/types";
import type { DeliveryAgentMeetupScoreBreakdownItem } from "@/lib/contracts/delivery-agent";

export type MeetupSourceTier = "run_a_north_york" | "flexible_north_york" | "fallback";

export type MeetupStopCandidateWithTier = {
  orderId: string;
  area: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  runSlot: string;
  sourceTier: MeetupSourceTier;
};

export type MeetupCandidateScoringResult = {
  score: number;
  scoreBreakdown: DeliveryAgentMeetupScoreBreakdownItem[];
  warnings: string[];
  usedLatLngFallback: boolean;
  hasAvoidAreaPenalty: boolean;
};

const PREFERRED_AREA_FIT_WEIGHT = 80;
const RUN_A_SOURCE_WEIGHT = 25;
const MAX_LAT_LNG_DISTANCE = 0.12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeArea(area: string): string {
  return area.trim().toLowerCase();
}

function areaInList(area: string, labels: string[]): boolean {
  const normalized = normalizeArea(area);
  return labels.some((label) => normalizeArea(label) === normalized);
}

function readCoordinate(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function manhattanDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  return Math.abs(a.lat - b.lat) + Math.abs(a.lng - b.lng) * 0.5;
}

function distanceToPoints(distance: number, maxDistance = MAX_LAT_LNG_DISTANCE): number {
  return clamp(100 - (distance / maxDistance) * 100, 0, 100);
}

function buildBreakdownItem(
  key: string,
  label: string,
  weight: number,
  points: number,
  reason: string
): DeliveryAgentMeetupScoreBreakdownItem {
  return {
    key,
    label,
    weight,
    points: Math.round(points),
    reason,
  };
}

function hasLatLng(candidate: MeetupStopCandidateWithTier): boolean {
  return typeof candidate.lat === "number" && typeof candidate.lng === "number";
}

function scoreCentralNorthYorkFit(
  candidate: MeetupStopCandidateWithTier,
  prefs: DeliveryPlanningMeetupSelectionPreferences
): DeliveryAgentMeetupScoreBreakdownItem {
  const weight = prefs.centralNorthYorkFitWeight;
  const center = {
    lat: readCoordinate(prefs.preferredHandoffCenterLat, 43.7615),
    lng: readCoordinate(prefs.preferredHandoffCenterLng, -79.4111),
  };

  if (hasLatLng(candidate)) {
    const distance = manhattanDistance(
      { lat: candidate.lat!, lng: candidate.lng! },
      center
    );
    const points = distanceToPoints(distance);

    return buildBreakdownItem(
      "centralNorthYorkFit",
      "Central North York fit",
      weight,
      points,
      `${Math.round(distance * 1000) / 1000} deg from ${prefs.preferredHandoffZoneLabel}.`
    );
  }

  const upper = candidate.formattedAddress.toUpperCase();
  let points = 55;
  let reason = "Area/address fallback for central North York fit.";

  if (/\bM2N\b|\bM3H\b|\bM2M\b/.test(upper)) {
    points = 85;
    reason = "Address FSA suggests central North York (M2N/M3H/M2M).";
  } else if (/\bM3K\b|\bM3A\b/.test(upper)) {
    points = 65;
    reason = "Address FSA suggests acceptable North York corridor.";
  } else if (/\bM2J\b|\bM2H\b/.test(upper)) {
    points = 40;
    reason = "Address FSA leans east/north — less central for handoff.";
  }

  return buildBreakdownItem("centralNorthYorkFit", "Central North York fit", weight, points, reason);
}

function scoreReceiverConvenience(
  candidate: MeetupStopCandidateWithTier,
  prefs: DeliveryPlanningMeetupSelectionPreferences
): DeliveryAgentMeetupScoreBreakdownItem {
  const weight = prefs.receiverDriverConvenienceWeight;
  const receiverRef = {
    lat: readCoordinate(prefs.receiverReferenceLat, 43.856),
    lng: readCoordinate(prefs.receiverReferenceLng, -79.337),
  };

  if (hasLatLng(candidate)) {
    const distance = manhattanDistance(
      { lat: candidate.lat!, lng: candidate.lng! },
      receiverRef
    );
    const points = distanceToPoints(distance, 0.18);

    return buildBreakdownItem(
      "receiverConvenience",
      "Receiver driver convenience",
      weight,
      points,
      `Meet-up is ${Math.round(distance * 1000) / 1000} deg from ${prefs.receiverDriverReferenceArea}.`
    );
  }

  const lean = inferNorthYorkLean({
    orderId: candidate.orderId,
    formattedAddress: candidate.formattedAddress,
    lat: candidate.lat,
    lng: candidate.lng,
  });
  const points = lean === "marco" ? 70 : 55;

  return buildBreakdownItem(
    "receiverConvenience",
    "Receiver driver convenience",
    weight,
    points,
    `Lat/lng unavailable; ${lean === "marco" ? "east-leaning" : "west-leaning"} address heuristic applied.`
  );
}

function scoreDtDetourPenalty(
  candidate: MeetupStopCandidateWithTier,
  prefs: DeliveryPlanningMeetupSelectionPreferences
): DeliveryAgentMeetupScoreBreakdownItem {
  const weight = prefs.dtDetourPenaltyWeight;
  const dtRef = {
    lat: readCoordinate(prefs.dtReferenceLat, DOWNTOWN_REFERENCE.lat),
    lng: readCoordinate(prefs.dtReferenceLng, DOWNTOWN_REFERENCE.lng),
  };

  if (hasLatLng(candidate)) {
    const latDelta = candidate.lat! - dtRef.lat;
    const lngDelta = candidate.lng! - dtRef.lng;
    const northWestPenalty = Math.max(0, latDelta) * 2 + Math.max(0, -lngDelta) * 1.5;
    const points = clamp(100 - northWestPenalty * 400, 0, 100);

    return buildBreakdownItem(
      "dtDetourPenalty",
      "DT detour penalty",
      weight,
      points,
      northWestPenalty > 0.02
        ? "Meet-up pulls DT noticeably north/west before downtown work."
        : "Meet-up keeps DT detour modest relative to downtown."
    );
  }

  const upper = candidate.formattedAddress.toUpperCase();
  const westLean = /\bM3H\b|\bM3K\b/.test(upper);
  const points = westLean ? 45 : 65;

  return buildBreakdownItem(
    "dtDetourPenalty",
    "DT detour penalty",
    weight,
    points,
    westLean
      ? "Address FSA suggests a west-leaning detour for DT."
      : "Address fallback suggests acceptable DT detour."
  );
}

function scorePreferredAreaFit(
  candidate: MeetupStopCandidateWithTier,
  prefs: DeliveryPlanningMeetupSelectionPreferences
): DeliveryAgentMeetupScoreBreakdownItem {
  if (areaInList(candidate.area, prefs.preferredHandoffAreaLabels)) {
    return buildBreakdownItem(
      "preferredAreaFit",
      "Preferred handoff area",
      PREFERRED_AREA_FIT_WEIGHT,
      100,
      `${candidate.area} is in the preferred handoff area list.`
    );
  }

  if (areaInList(candidate.area, prefs.avoidHandoffAreaLabels)) {
    return buildBreakdownItem(
      "preferredAreaFit",
      "Preferred handoff area",
      PREFERRED_AREA_FIT_WEIGHT,
      15,
      `${candidate.area} is in the avoid list for meet-up selection.`
    );
  }

  return buildBreakdownItem(
    "preferredAreaFit",
    "Preferred handoff area",
    PREFERRED_AREA_FIT_WEIGHT,
    50,
    `${candidate.area} is neutral for preferred handoff area scoring.`
  );
}

function scoreRunASourceBonus(candidate: MeetupStopCandidateWithTier): DeliveryAgentMeetupScoreBreakdownItem {
  const points = candidate.sourceTier === "run_a_north_york" ? 100 : candidate.sourceTier === "flexible_north_york" ? 75 : 40;

  return buildBreakdownItem(
    "runASourceBonus",
    "Run A source bonus",
    RUN_A_SOURCE_WEIGHT,
    points,
    candidate.sourceTier === "run_a_north_york"
      ? "Meet-up stop is already on DT Run A."
      : candidate.sourceTier === "flexible_north_york"
        ? "Meet-up stop is flexible North York outside Run A."
        : "Meet-up stop came from fallback North York matching."
  );
}

function scoreMeetupEta(
  prefs: DeliveryPlanningMeetupSelectionPreferences
): DeliveryAgentMeetupScoreBreakdownItem {
  return buildBreakdownItem(
    "meetupEta",
    "Meet-up timing (ETA)",
    prefs.meetupEtaWeight,
    50,
    "Meet-up ETA scoring deferred until Route Optimizer preview."
  );
}

function runAHasDowntownStops(runs: DeliveryAgentCandidateRun[]): boolean {
  const runA = runs.find((run) => run.runSlot === "A");
  if (!runA) {
    return false;
  }

  return runA.stops.some((stop) => {
    const area = normalizeArea(stop.area);
    return area === "downtown toronto" || area === "midtown";
  });
}

function scoreRouteFinishImpact(
  candidate: MeetupStopCandidateWithTier,
  prefs: DeliveryPlanningMeetupSelectionPreferences,
  runs: DeliveryAgentCandidateRun[]
): DeliveryAgentMeetupScoreBreakdownItem {
  const weight = prefs.routeFinishImpactWeight;

  if (!runAHasDowntownStops(runs)) {
    return buildBreakdownItem(
      "routeFinishImpact",
      "Route finish impact",
      weight,
      80,
      "Run A has no downtown stops; finish impact is neutral."
    );
  }

  const dtRef = {
    lat: readCoordinate(prefs.dtReferenceLat, DOWNTOWN_REFERENCE.lat),
    lng: readCoordinate(prefs.dtReferenceLng, DOWNTOWN_REFERENCE.lng),
  };

  if (hasLatLng(candidate)) {
    const northDelta = Math.max(0, candidate.lat! - dtRef.lat - 0.04);
    const points = clamp(100 - northDelta * 500, 0, 100);

    return buildBreakdownItem(
      "routeFinishImpact",
      "Route finish impact",
      weight,
      points,
      northDelta > 0.02
        ? "Far-north meet-up may delay DT finishing downtown orders."
        : "Meet-up location should not heavily delay downtown completion."
    );
  }

  return buildBreakdownItem(
    "routeFinishImpact",
    "Route finish impact",
    weight,
    55,
    "Lat/lng unavailable; route finish impact uses area fallback."
  );
}

function computeWeightedScore(breakdown: DeliveryAgentMeetupScoreBreakdownItem[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const item of breakdown) {
    if (item.weight <= 0) {
      continue;
    }

    weightedSum += item.weight * item.points;
    totalWeight += item.weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

export function scoreMeetupCandidate(input: {
  candidate: MeetupStopCandidateWithTier;
  profile: DeliveryPlanningProfile;
  runs: DeliveryAgentCandidateRun[];
}): MeetupCandidateScoringResult {
  const prefs = input.profile.handoffRules.meetupSelectionPreferences;
  const usedLatLngFallback = !hasLatLng(input.candidate);

  const breakdown: DeliveryAgentMeetupScoreBreakdownItem[] = [
    scoreCentralNorthYorkFit(input.candidate, prefs),
    scoreReceiverConvenience(input.candidate, prefs),
    scoreDtDetourPenalty(input.candidate, prefs),
    scorePreferredAreaFit(input.candidate, prefs),
    scoreRunASourceBonus(input.candidate),
    scoreMeetupEta(prefs),
    scoreRouteFinishImpact(input.candidate, prefs, input.runs),
  ].filter((item) => item.weight > 0);

  const score = computeWeightedScore(breakdown);
  const preferredAreaItem = breakdown.find((item) => item.key === "preferredAreaFit");
  const hasAvoidAreaPenalty = (preferredAreaItem?.points ?? 100) <= 20;

  const warnings: string[] = [];

  if (usedLatLngFallback) {
    warnings.push("Lat/lng unavailable; meet-up scoring used area/address fallback.");
  }

  if (input.candidate.sourceTier === "fallback") {
    warnings.push("Meet-up is a fallback choice and should be reviewed.");
  }

  if (hasAvoidAreaPenalty) {
    warnings.push(`${input.candidate.area} is penalized as a meet-up area.`);
  }

  for (const item of breakdown) {
    if (item.weight >= 50 && item.points < 45) {
      warnings.push(`${item.label}: ${item.reason}`);
    }
  }

  return {
    score,
    scoreBreakdown: breakdown,
    warnings: [...new Set(warnings)],
    usedLatLngFallback,
    hasAvoidAreaPenalty,
  };
}
