import { inferNorthYorkLean } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import { findProviderRun, findPrimaryReceiverRun } from "@/lib/agents/delivery/candidate-plans/find-run-by-slot";
import {
  scoreMeetupCandidate,
  type MeetupCandidateScoringResult,
  type MeetupSourceTier,
  type MeetupStopCandidateWithTier,
} from "@/lib/agents/delivery/candidate-plans/score-meetup-candidate";
import type { DeliveryAgentCandidatePlanStop } from "@/lib/contracts/delivery-agent";
import type { DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";
import type { DeliveryAgentMeetupScoreBreakdownItem, DeliveryAgentSelectedMeetup } from "@/lib/contracts/delivery-agent";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";

export type MeetupVariant = "meetup_stop_1" | "meetup_stop_2_with_one_before";

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
      sourceTier: import("@/lib/agents/delivery/candidate-plans/score-meetup-candidate").MeetupSourceTier;
    }
  | {
      handoffSkipped: true;
      skipReason: string;
    };

export type ActiveMeetupSelection = Extract<MeetupSelectionResult, { handoffSkipped: false }>;

export type ScoredMeetupCandidate = MeetupStopCandidateWithTier & MeetupCandidateScoringResult;

export function meetupOptionDedupeKey(candidate: Pick<MeetupStopCandidateWithTier, "orderId" | "formattedAddress" | "lat" | "lng">): string {
  const address = candidate.formattedAddress.trim().toLowerCase();
  const lat = typeof candidate.lat === "number" ? candidate.lat.toFixed(5) : "na";
  const lng = typeof candidate.lng === "number" ? candidate.lng.toFixed(5) : "na";
  return `${candidate.orderId}|${address}|${lat}|${lng}`;
}

export function meetupVariantDedupeKey(input: {
  baseSplitCandidateId: string;
  meetupDedupeKey: string;
  fixedPosition: 1 | 2;
}): string {
  return `${input.baseSplitCandidateId}|${input.meetupDedupeKey}|pos${input.fixedPosition}`;
}

export function compareScoredMeetupCandidates(
  left: ScoredMeetupCandidate,
  right: ScoredMeetupCandidate
): number {
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

export function rankMeetupOptions(input: {
  runs: DeliveryAgentCandidateRun[];
  profile: DeliveryPlanningProfile;
  limit: number;
}): ScoredMeetupCandidate[] {
  const pool = buildMeetupCandidatePool(input.runs, input.profile);
  const scored = pool.map((candidate) => ({
    ...candidate,
    ...scoreMeetupCandidate({
      candidate,
      profile: input.profile,
      runs: input.runs,
    }),
  }));

  const sorted = [...scored].sort(compareScoredMeetupCandidates);
  const seen = new Set<string>();
  const unique: ScoredMeetupCandidate[] = [];

  for (const candidate of sorted) {
    const key = meetupOptionDedupeKey(candidate);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(candidate);
    if (unique.length >= input.limit) {
      break;
    }
  }

  return unique;
}

export function rebuildMeetupSelectionFromSelectedMeetup(
  selectedMeetup: DeliveryAgentSelectedMeetup
): ActiveMeetupSelection {
  return {
    handoffSkipped: false,
    meetupAddress: selectedMeetup.meetupAddress,
    meetupFixedStopPosition: selectedMeetup.meetupFixedStopPosition,
    variant: selectedMeetup.variant,
    sourceOrderId: selectedMeetup.sourceOrderId ?? "",
    sourceArea: selectedMeetup.sourceArea ?? "",
    stopBeforeMeetupOrderId: selectedMeetup.stopBeforeMeetupOrderId,
    syntheticHandoffStopUsed: true,
    score: selectedMeetup.score ?? 0,
    scoreBreakdown: selectedMeetup.scoreBreakdown ?? [],
    reasoning: selectedMeetup.reasoning ?? "",
    warnings: selectedMeetup.warnings ?? [],
    selectionConfidence: selectedMeetup.selectionConfidence ?? "medium",
    sourceTier: "flexible_north_york",
  };
}

export function buildMeetupSelectionForPosition(input: {
  scoredMeetup: ScoredMeetupCandidate;
  profile: DeliveryPlanningProfile;
  runs: DeliveryAgentCandidateRun[];
  fixedPosition: 1 | 2;
}): Extract<MeetupSelectionResult, { handoffSkipped: false }> | null {
  if (input.fixedPosition === 1) {
    return buildSuccessfulMeetupSelection({
      selected: input.scoredMeetup,
      profile: input.profile,
    });
  }

  const providerRun = findProviderRun(input.runs, input.profile);
  if (!providerRun) {
    return null;
  }

  const stopBeforeMeetupOrderId = findStopBeforeMeetup(
    providerRun.stops,
    input.scoredMeetup,
    input.profile,
    input.runs
  );

  if (!stopBeforeMeetupOrderId) {
    return null;
  }

  return buildSuccessfulMeetupSelection({
    selected: input.scoredMeetup,
    profile: input.profile,
    stopBeforeMeetupOrderId,
  });
}

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

export function buildMeetupCandidatePool(
  runs: DeliveryAgentCandidateRun[],
  profile: DeliveryPlanningProfile
): MeetupStopCandidateWithTier[] {
  const providerRun = findProviderRun(runs, profile);
  const allStops = collectAllCandidateStops(runs);
  const seen = new Set<string>();
  const pool: MeetupStopCandidateWithTier[] = [];
  const providerSlot = profile.handoffRules.providerRunSlot;

  const providerNorthYork =
    providerRun?.stops
      .filter(isNorthYorkStop)
      .map((stop) => toMeetupCandidate(stop, providerSlot, "run_a_north_york")) ?? [];

  for (const stop of providerNorthYork) {
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
    topDimensions.length > 0 ? ` Strongest factors: ${topDimensions.join(", ")}.` : "";

  if (input.candidate.sourceTier === "fallback") {
    return `Chosen as the best available ${zoneLabel.toLowerCase()} handoff point from fallback options.${balancePhrase}`;
  }

  return `Chosen as the best available ${zoneLabel.toLowerCase()} handoff point; balances provider and receiver routes better than farther west/north alternatives.${balancePhrase}`;
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

export function findStopBeforeMeetup(
  providerStops: DeliveryAgentCandidatePlanStop[],
  meetup: MeetupStopCandidateWithTier,
  profile: DeliveryPlanningProfile,
  runs: DeliveryAgentCandidateRun[]
): string | undefined {
  if (!profile.handoffRules.allowStopsBeforeMeetup || profile.handoffRules.maxStopsBeforeMeetup < 1) {
    return undefined;
  }

  const providerSlot = profile.handoffRules.providerRunSlot;
  const candidates = providerStops
    .filter((stop) => stop.orderId !== meetup.orderId && isNorthYorkStop(stop))
    .map((stop) => toMeetupCandidate(stop, providerSlot, "run_a_north_york"))
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

  const scored = candidates.map((candidate) => ({
    ...candidate,
    ...scoreMeetupCandidate({ candidate, profile, runs }),
  }));

  return [...scored].sort(compareScoredMeetupCandidates)[0].orderId;
}

export function buildSuccessfulMeetupSelection(input: {
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
    scoreBreakdown: input.selected.scoreBreakdown as DeliveryAgentMeetupScoreBreakdownItem[],
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
      variant: "meetup_stop_2_with_one_before" as MeetupVariant,
      stopBeforeMeetupOrderId: input.stopBeforeMeetupOrderId,
    };
  }

  return {
    handoffSkipped: false,
    ...base,
    meetupFixedStopPosition: 1,
    variant: "meetup_stop_1" as MeetupVariant,
  };
}

export function pickBestScoredMeetup(input: {
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

  return [...scored].sort(compareScoredMeetupCandidates)[0];
}
