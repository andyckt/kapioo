import {
  buildCandidateRunsFromAssignment,
  buildDefaultHandoffPlan,
} from "@/lib/agents/delivery/candidate-plans/build-candidate-runs";
import {
  hasLatLngFallback,
  toPlanningStops,
} from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import { attachSummaryToCandidate } from "@/lib/agents/delivery/candidate-plans/summarize-candidate-plan";
import {
  buildStopAssignment,
  splitNorthYorkStops,
} from "@/lib/agents/delivery/candidate-plans/split-north-york";
import type {
  CandidatePlan,
  CandidateStrategyType,
  PlanningStop,
  StopAssignment,
} from "@/lib/agents/delivery/candidate-plans/types";
import {
  DOWNTOWN_REFERENCE,
  MIN_STOPS_FOR_RESCUE_SPLIT,
  MIN_STOPS_FOR_SELF_FALLBACK_CANDIDATE,
} from "@/lib/agents/delivery/candidate-plans/types";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { getEnrichedDeliveryOrdersForRouting } from "@/lib/agents/delivery/geocode";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import { previewDeliveryOrdersForAgent } from "@/lib/agents/delivery/preview-delivery-orders";
import type { DeliveryAgentGenerateCandidatePlansResponse } from "@/lib/contracts/delivery-agent";

const CANDIDATE_PLAN_NOTES =
  "These are draft candidate splits only. Route Optimizer preview for each candidate will be added in the next milestone.";

const STRATEGY_DEFINITIONS: Array<{
  strategyType: CandidateStrategyType;
  name: string;
  description: string;
  mode: "balanced" | "dt_heavy" | "marco_heavy";
  includeSelf?: boolean;
}> = [
  {
    strategyType: "baseline_two_run",
    name: "Baseline two-run split",
    description: "Core areas fixed; North York split ~50/50 between DT and Marco; Self unused.",
    mode: "balanced",
  },
  {
    strategyType: "dt_heavy_north_york",
    name: "DT-heavy North York",
    description: "North York stops lean ~70% toward DT and ~30% toward Marco.",
    mode: "dt_heavy",
  },
  {
    strategyType: "marco_heavy_north_york",
    name: "Marco-heavy North York",
    description: "North York stops lean ~30% toward DT and ~70% toward Marco.",
    mode: "marco_heavy",
  },
  {
    strategyType: "balanced_north_york",
    name: "Balanced North York",
    description: "North York split 50/50; prefers lat/lng median when coordinates exist.",
    mode: "balanced",
  },
  {
    strategyType: "self_fallback_light",
    name: "Self fallback — light",
    description:
      "Baseline split first; move 1–3 outlier North York / unknown stops to Self run C.",
    mode: "balanced",
    includeSelf: true,
  },
];

function isFlexibleStop(stop: PlanningStop): boolean {
  return stop.areaBucket === "flexible_north_york" || stop.areaBucket === "unknown";
}

function distanceFromDowntown(stop: PlanningStop): number {
  if (typeof stop.lat === "number" && typeof stop.lng === "number") {
    const latDelta = stop.lat - DOWNTOWN_REFERENCE.lat;
    const lngDelta = stop.lng - DOWNTOWN_REFERENCE.lng;
    return Math.sqrt(latDelta * latDelta + lngDelta * lngDelta);
  }

  return 0;
}

function buildSelfFallbackAssignment(
  stops: PlanningStop[],
  profile: DeliveryPlanningProfile
): StopAssignment {
  const baseline = buildStopAssignment(stops, "balanced");
  const maxSelfStops = profile.selfFallbackRules.maxPreferredStops;

  const flexibleCandidates = [...baseline.dt, ...baseline.marco]
    .filter(isFlexibleStop)
    .sort((a, b) => {
      const distanceDelta = distanceFromDowntown(b) - distanceFromDowntown(a);
      if (distanceDelta !== 0) {
        return distanceDelta;
      }

      return b.orderId.localeCompare(a.orderId);
    });

  const selfStops = flexibleCandidates.slice(0, maxSelfStops);
  const selfOrderIds = new Set(selfStops.map((stop) => stop.orderId));

  return {
    dt: baseline.dt.filter((stop) => !selfOrderIds.has(stop.orderId)),
    marco: baseline.marco.filter((stop) => !selfOrderIds.has(stop.orderId)),
    self: selfStops,
  };
}

function buildRescueSplitAssignment(
  stops: PlanningStop[],
  profile: DeliveryPlanningProfile
): StopAssignment {
  // Rescue split: Self takes the farthest flexible/unknown stops; DT takes core downtown
  // stops; Marco takes core uptown stops + remaining flexible stops.
  // Target: Self covers ~30% of total stops on heavy days to bring 2-driver load back
  // within 1 PM reach.
  const maxSelfStops = Math.min(
    profile.selfFallbackRules.maxPreferredStops,
    Math.ceil(stops.length * 0.3)
  );

  const baseline = buildStopAssignment(stops, "balanced");

  const flexibleCandidates = [...baseline.dt, ...baseline.marco]
    .filter(isFlexibleStop)
    .sort((a, b) => distanceFromDowntown(b) - distanceFromDowntown(a));

  const selfStops = flexibleCandidates.slice(0, maxSelfStops);
  const selfOrderIds = new Set(selfStops.map((s) => s.orderId));

  return {
    dt: baseline.dt.filter((s) => !selfOrderIds.has(s.orderId)),
    marco: baseline.marco.filter((s) => !selfOrderIds.has(s.orderId)),
    self: selfStops,
  };
}

function buildSharedAssumptions(stops: PlanningStop[]): string[] {
  const assumptions: string[] = [];

  if (hasLatLngFallback(stops)) {
    assumptions.push(
      "Lat/lng not available; using area/address fallback for North York."
    );
  }

  return assumptions;
}

function buildCandidatePlan(
  strategyType: CandidateStrategyType,
  name: string,
  description: string,
  assignment: StopAssignment,
  profile: DeliveryPlanningProfile,
  deliveryDate: string,
  assumptions: string[],
  warnings: string[] = []
): CandidatePlan {
  const runs = buildCandidateRunsFromAssignment(profile, assignment);
  const candidateId = `${strategyType}:${deliveryDate}`;

  const baseCandidate: Omit<CandidatePlan, "summary"> = {
    candidateId,
    name,
    description,
    strategyType,
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    deliveryDate,
    runs,
    warnings,
    assumptions,
    handoffPlan: buildDefaultHandoffPlan(profile),
    constraintPlan: {
      fixedStops: [],
      endPoint: null,
      repairActionsPlanned: [],
    },
  };

  return attachSummaryToCandidate(baseCandidate, assignment);
}

function buildAllStrategies(
  stops: PlanningStop[],
  profile: DeliveryPlanningProfile,
  deliveryDate: string
): CandidatePlan[] {
  const sharedAssumptions = buildSharedAssumptions(stops);
  const candidates: CandidatePlan[] = [];

  for (const strategy of STRATEGY_DEFINITIONS) {
    if (strategy.includeSelf && stops.length < MIN_STOPS_FOR_SELF_FALLBACK_CANDIDATE) {
      continue;
    }

    const assignment = strategy.includeSelf
      ? buildSelfFallbackAssignment(stops, profile)
      : buildStopAssignment(stops, strategy.mode);

    const warnings: string[] = [];
    if (strategy.includeSelf && assignment.self.length === 0) {
      warnings.push("No flexible stops available for Self fallback in this candidate.");
    }

    candidates.push(
      buildCandidatePlan(
        strategy.strategyType,
        strategy.name,
        strategy.description,
        assignment,
        profile,
        deliveryDate,
        sharedAssumptions,
        warnings
      )
    );
  }

  // Heavy-day rescue split: when stop count meets or exceeds the threshold, add a
  // dedicated 3-driver plan where Self takes a real load (~30% of stops) — not the
  // light fallback of 1–3 stops. This ensures the expansion always has a genuine
  // 3-driver variant to prove when 2-driver plans are infeasible.
  if (profile.selfFallbackRules.enabled && stops.length >= MIN_STOPS_FOR_RESCUE_SPLIT) {
    const rescueAssignment = buildRescueSplitAssignment(stops, profile);
    const rescueWarnings: string[] = [];

    if (rescueAssignment.self.length === 0) {
      rescueWarnings.push("No flexible stops could be assigned to Self in rescue split.");
    } else {
      rescueWarnings.push(
        `Heavy day (${stops.length} stops): rescue split assigns ${rescueAssignment.self.length} stop(s) to Self to bring 2-driver load within 1 PM reach.`
      );
    }

    candidates.push(
      buildCandidatePlan(
        "rescue_split",
        "Rescue split — Self takes full load",
        `Heavy-day plan: Self run C takes the ${rescueAssignment.self.length} farthest flexible stops to reduce DT and Marco load below the 1 PM threshold.`,
        rescueAssignment,
        profile,
        deliveryDate,
        sharedAssumptions,
        rescueWarnings
      )
    );
  }

  return candidates;
}

export function generateCandidatePlans(
  stops: PlanningStop[],
  profile: DeliveryPlanningProfile,
  deliveryDate: string
): CandidatePlan[] {
  return buildAllStrategies(stops, profile, deliveryDate);
}

export async function generateCandidatePlansForAgent(
  deliveryDate: string,
  profileId?: string
): Promise<DeliveryAgentGenerateCandidatePlansResponse> {
  const profile = getDeliveryPlanningProfile(profileId);
  const orderPreview = await previewDeliveryOrdersForAgent(deliveryDate);

  if (!orderPreview.canContinueToPlanning) {
    throw new DeliveryAgentPlanningBlockedError(orderPreview.blockingReasons);
  }

  const enriched = await getEnrichedDeliveryOrdersForRouting({
    deliveryDate,
    statuses: ["confirmed"],
  });

  if (enriched.routing.stops.length === 0) {
    throw new DeliveryAgentPlanningBlockedError([
      "No confirmed valid stops for this delivery date.",
    ]);
  }

  const planningStops = toPlanningStops(enriched.routing.stops);
  const candidates = buildAllStrategies(planningStops, profile, deliveryDate);

  return {
    deliveryDate,
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    candidates,
    notes: CANDIDATE_PLAN_NOTES,
    coordinateCoverage: enriched.coordinateCoverage,
    geocodeEnrichment: enriched.geocodeEnrichment,
  };
}

export { splitNorthYorkStops, buildStopAssignment };
