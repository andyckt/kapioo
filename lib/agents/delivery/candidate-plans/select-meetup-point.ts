import { inferNorthYorkLean } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import {
  scoreMeetupCandidate,
  type MeetupCandidateScoringResult,
  type MeetupSourceTier,
  type MeetupStopCandidateWithTier,
} from "@/lib/agents/delivery/candidate-plans/score-meetup-candidate";
import type { DeliveryAgentCandidatePlanStop } from "@/lib/contracts/delivery-agent";
import type { DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";
import type { DeliveryAgentMeetupScoreBreakdownItem } from "@/lib/contracts/delivery-agent";
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

export type MeetupSelectionConfidence = "high" | "medium" | "low";

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
      score: number;
      scoreBreakdown: DeliveryAgentMeetupScoreBreakdownItem[];
      reasoning: string;
      warnings: string[];
      selectionConfidence: MeetupSelectionConfidence;
      sourceTier: MeetupSourceTier;
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
  runSlot: string,
  sourceTier: MeetupSourceTier
): MeetupStopCandidateWithTier {
  return {
    orderId: stop.orderId,
    area: stop.area,
    formattedAddress: stop.formattedAddress,
    lat: stop.lat,
    lng: stop.lng,
    runSlot,
    sourceTier,
  };
}

function collectAllCandidateStops(runs: DeliveryAgentCandidateRun[]): MeetupStopCandidateWithTier[] {
  const collected: MeetupStopCandidateWithTier[] = [];

  for (const run of runs) {
    for (const stop of run.stops) {
      collected.push(toMeetupCandidate(stop, run.runSlot, "flexible_north_york"));
    }
  }

  return collected;
}

function buildMeetupCandidatePool(runs: DeliveryAgentCandidateRun[]): MeetupStopCandidateWithTier[] {
  const runA = runs.find((run) => run.runSlot === "A");
  const allStops = collectAllCandidateStops(runs);
  const seen = new Set<string>();
  const pool: MeetupStopCandidateWithTier[] = [];

  const runANorthYork =
    runA?.stops.filter(isNorthYorkStop).map((stop) => toMeetupCandidate(stop, "A", "run_a_north_york")) ?? [];

  for (const stop of runANorthYork) {
    pool.push(stop);
    seen.add(stop.orderId);
  }

  for (const stop of allStops) {
    if (seen.has(stop.orderId)) {
      continue;
    }

    if (stop.area.trim().toLowerCase() === NORTH_YORK_AREA.toLowerCase()) {
      pool.push({ ...stop, sourceTier: "flexible_north_york" });
      seen.add(stop.orderId);
    }
  }

  if (pool.length === 0) {
    for (const stop of allStops) {
      if (stop.area.trim().toLowerCase().includes(NORTH_YORK_AREA.toLowerCase())) {
        pool.push({ ...stop, sourceTier: "fallback" });
      }
    }
  }

  return pool;
}

type ScoredMeetupCandidate = MeetupStopCandidateWithTier & MeetupCandidateScoringResult;

function compareScoredCandidates(left: ScoredMeetupCandidate, right: ScoredMeetupCandidate): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  const tierRank: Record<MeetupSourceTier, number> = {
    run_a_north_york: 0,
    flexible_north_york: 1,
    fallback: 2,
  };

  const tierDelta = tierRank[left.sourceTier] - tierRank[right.sourceTier];
  if (tierDelta !== 0) {
    return tierDelta;
  }

  const leftDtDetour = left.scoreBreakdown.find((item) => item.key === "dtDetourPenalty")?.points ?? 0;
  const rightDtDetour = right.scoreBreakdown.find((item) => item.key === "dtDetourPenalty")?.points ?? 0;
  if (leftDtDetour !== rightDtDetour) {
    return rightDtDetour - leftDtDetour;
  }

  return left.orderId.localeCompare(right.orderId);
}

function pickBestScoredMeetup(input: {
  pool: MeetupStopCandidateWithTier[];
  profile: DeliveryPlanningProfile;
  runs: DeliveryAgentCandidateRun[];
}): ScoredMeetupCandidate {
  const scored = input.pool.map((candidate) => ({
    ...candidate,
    ...scoreMeetupCandidate({
      candidate,
      profile: input.profile,
      runs: input.runs,
    }),
  }));

  return [...scored].sort(compareScoredCandidates)[0];
}

function resolveSelectionConfidence(input: {
  scoring: MeetupCandidateScoringResult;
  sourceTier: MeetupSourceTier;
}): MeetupSelectionConfidence {
  if (
    input.sourceTier === "fallback" ||
    input.scoring.score < 45 ||
    input.scoring.hasAvoidAreaPenalty
  ) {
    return "low";
  }

  if (input.scoring.usedLatLngFallback || input.scoring.score < 70) {
    return "medium";
  }

  return "high";
}

function buildMeetupReasoning(input: {
  candidate: MeetupStopCandidateWithTier;
  scoring: MeetupCandidateScoringResult;
  profile: DeliveryPlanningProfile;
}): string {
  const zoneLabel = input.profile.handoffRules.meetupSelectionPreferences.preferredHandoffZoneLabel;
  const topDimensions = [...input.scoring.scoreBreakdown]
    .filter((item) => item.points >= 70)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((item) => item.label.toLowerCase());

  const balancePhrase =
    topDimensions.length > 0
      ? ` Strongest factors: ${topDimensions.join(", ")}.`
      : "";

  if (input.candidate.sourceTier === "fallback") {
    return `Chosen as the best available ${zoneLabel.toLowerCase()} handoff point from fallback options.${balancePhrase}`;
  }

  return `Chosen as the best available ${zoneLabel.toLowerCase()} handoff point; balances DT and Marco better than farther west/north alternatives.${balancePhrase}`;
}

function buildSelectionWarnings(input: {
  scoring: MeetupCandidateScoringResult;
  sourceTier: MeetupSourceTier;
  confidence: MeetupSelectionConfidence;
}): string[] {
  const warnings = [...input.scoring.warnings];

  if (input.confidence === "low" && !warnings.some((warning) => warning.includes("fallback choice"))) {
    warnings.push("Meet-up is a fallback choice and should be reviewed.");
  }

  return [...new Set(warnings)];
}

function findStopBeforeMeetup(
  runAStops: DeliveryAgentCandidatePlanStop[],
  meetup: MeetupStopCandidateWithTier,
  profile: DeliveryPlanningProfile,
  runs: DeliveryAgentCandidateRun[]
): string | undefined {
  if (!profile.handoffRules.allowStopsBeforeMeetup || profile.handoffRules.maxStopsBeforeMeetup < 1) {
    return undefined;
  }

  const candidates = runAStops
    .filter((stop) => stop.orderId !== meetup.orderId && isNorthYorkStop(stop))
    .map((stop) => toMeetupCandidate(stop, "A", "run_a_north_york"))
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

  return pickBestScoredMeetup({ pool: candidates, profile, runs }).orderId;
}

function buildSuccessfulSelection(input: {
  selected: ScoredMeetupCandidate;
  profile: DeliveryPlanningProfile;
  stopBeforeMeetupOrderId?: string;
}): Extract<MeetupSelectionResult, { handoffSkipped: false }> {
  const confidence = resolveSelectionConfidence({
    scoring: input.selected,
    sourceTier: input.selected.sourceTier,
  });
  const warnings = buildSelectionWarnings({
    scoring: input.selected,
    sourceTier: input.selected.sourceTier,
    confidence,
  });
  const reasoning = buildMeetupReasoning({
    candidate: input.selected,
    scoring: input.selected,
    profile: input.profile,
  });

  const base = {
    meetupAddress: input.selected.formattedAddress,
    sourceOrderId: input.selected.orderId,
    sourceArea: input.selected.area,
    syntheticHandoffStopUsed: true as const,
    score: input.selected.score,
    scoreBreakdown: input.selected.scoreBreakdown,
    reasoning,
    warnings,
    selectionConfidence: confidence,
    sourceTier: input.selected.sourceTier,
  };

  if (input.stopBeforeMeetupOrderId) {
    return {
      handoffSkipped: false,
      ...base,
      meetupFixedStopPosition: 2,
      variant: "meetup_stop_2_with_one_before",
      stopBeforeMeetupOrderId: input.stopBeforeMeetupOrderId,
    };
  }

  return {
    handoffSkipped: false,
    ...base,
    meetupFixedStopPosition: 1,
    variant: "meetup_stop_1",
  };
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

  const pool = buildMeetupCandidatePool(input.runs);

  if (pool.length === 0) {
    return {
      handoffSkipped: true,
      skipReason:
        "No North York stop available for meet-up selection; using temporary Marco start preview.",
    };
  }

  const selected = pickBestScoredMeetup({
    pool,
    profile: input.profile,
    runs: input.runs,
  });

  const stopBeforeMeetupOrderId = findStopBeforeMeetup(runA.stops, selected, input.profile, input.runs);

  return buildSuccessfulSelection({
    selected,
    profile: input.profile,
    stopBeforeMeetupOrderId,
  });
}

export { buildMeetupCandidatePool };
