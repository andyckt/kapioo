import type { CustomerConstraintsMap } from "@/lib/agents/delivery/candidate-plans/apply-customer-constraints";
import type { HandoffRunChainOverrides } from "@/lib/agents/delivery/candidate-plans/preview-candidate-handoff";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { PlanningHints } from "@/lib/agents/delivery/feedback/planning-hints";
import type { DeliveryAgentFeedbackInterpretation } from "@/lib/agents/delivery/run-log-types";
import type {
  DeliveryAgentCandidatePlan,
  DeliveryAgentPreviewCandidatePlansResponse,
} from "@/lib/contracts/delivery-agent";

const PINNED_MEETUP_SCORE_BOOST = 10_000;

function rebuildRunStats(
  run: DeliveryAgentCandidatePlan["runs"][number]
): DeliveryAgentCandidatePlan["runs"][number] {
  const areaBreakdown: Record<string, number> = {};
  for (const stop of run.stops) {
    const area = stop.area.trim() || "Unknown";
    areaBreakdown[area] = (areaBreakdown[area] ?? 0) + 1;
  }

  return {
    ...run,
    stopCount: run.stops.length,
    areaBreakdown,
    totalMealQuantity: run.stops.reduce((sum, stop) => sum + stop.totalMealQuantity, 0),
  };
}

export function applyOrderRunOverridesToPlan(
  plan: DeliveryAgentCandidatePlan,
  hints: PlanningHints,
  profile: DeliveryPlanningProfile
): { plan: DeliveryAgentCandidatePlan; appliedOrderIds: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const appliedOrderIds: string[] = [];

  if (hints.orderRunOverrides.size === 0) {
    return { plan, appliedOrderIds, warnings };
  }

  const runs = plan.runs.map((run) => ({ ...run, stops: [...run.stops] }));
  const runBySlot = new Map(runs.map((run) => [run.runSlot, run]));

  for (const [orderId, preferredRunSlot] of hints.orderRunOverrides.entries()) {
    const targetRun = runBySlot.get(preferredRunSlot);
    if (!targetRun) {
      warnings.push(`Preferred run slot ${preferredRunSlot} is not available in ${plan.candidateId}.`);
      continue;
    }

    let sourceRun: (typeof runs)[number] | undefined;
    let stopToMove: (typeof runs)[number]["stops"][number] | undefined;

    for (const run of runs) {
      const stop = run.stops.find((entry) => entry.orderId === orderId);
      if (stop) {
        sourceRun = run;
        stopToMove = stop;
        break;
      }
    }

    if (!sourceRun || !stopToMove) {
      warnings.push(`Order ${orderId} was not found in candidate ${plan.candidateId}.`);
      continue;
    }

    if (sourceRun.runSlot === preferredRunSlot) {
      appliedOrderIds.push(orderId);
      continue;
    }

    sourceRun.stops = sourceRun.stops.filter((stop) => stop.orderId !== orderId);
    targetRun.stops.push(stopToMove);
    appliedOrderIds.push(orderId);
  }

  const rebuiltRuns = runs.map(rebuildRunStats);
  const overrideWarnings = [...warnings];
  if (appliedOrderIds.length > 0) {
    overrideWarnings.push(
      `Moved ${appliedOrderIds.length} stop(s) per feedback in ${plan.name}.`
    );
  }

  return {
    plan: {
      ...plan,
      runs: rebuiltRuns,
      warnings: [...plan.warnings, ...overrideWarnings],
      summary: {
        ...plan.summary,
        totalStops: rebuiltRuns.reduce((sum, run) => sum + run.stopCount, 0),
        totalMeals: rebuiltRuns.reduce((sum, run) => sum + run.totalMealQuantity, 0),
        byRun: Object.fromEntries(rebuiltRuns.map((run) => [run.runSlot, run.stopCount])),
        selfStopCount: rebuiltRuns.find((run) => run.runSlot === "C")?.stopCount ?? 0,
        selfUsed: (rebuiltRuns.find((run) => run.runSlot === "C")?.stopCount ?? 0) > 0,
      },
    },
    appliedOrderIds,
    warnings: overrideWarnings,
  };
}

export function applyOrderRunOverridesToPlans(
  plans: DeliveryAgentCandidatePlan[],
  hints: PlanningHints,
  profile: DeliveryPlanningProfile
): {
  plans: DeliveryAgentCandidatePlan[];
  appliedOrderIds: string[];
  warnings: string[];
} {
  const appliedOrderIds = new Set<string>();
  const warnings: string[] = [];
  const updatedPlans = plans.map((plan) => {
    const result = applyOrderRunOverridesToPlan(plan, hints, profile);
    for (const orderId of result.appliedOrderIds) {
      appliedOrderIds.add(orderId);
    }
    warnings.push(...result.warnings);
    return result.plan;
  });

  return {
    plans: updatedPlans,
    appliedOrderIds: [...appliedOrderIds],
    warnings,
  };
}

export function buildBeforeMeetupConstraints(hints: PlanningHints): CustomerConstraintsMap {
  const constraints: CustomerConstraintsMap = new Map();
  let position = 1;

  for (const orderId of hints.beforeMeetupOrderIds) {
    constraints.set(orderId, { fixedStopPosition: position });
    position += 1;
  }

  return constraints;
}

export function buildHandoffOverridesFromHints(hints: PlanningHints): HandoffRunChainOverrides {
  const dtCustomerConstraints = buildBeforeMeetupConstraints(hints);
  const overrides: HandoffRunChainOverrides = {};

  if (dtCustomerConstraints.size > 0) {
    overrides.dtCustomerConstraints = dtCustomerConstraints;
    if (hints.beforeMeetupOrderIds.length > 0) {
      overrides.syntheticMeetupFixedPosition = 2;
    }
  }

  return overrides;
}

export function resolvePinnedMeetupScoreBoost(
  meetupOrderId: string,
  hints?: PlanningHints
): number {
  if (!hints?.pinnedMeetupOrderId) {
    return 0;
  }

  return meetupOrderId === hints.pinnedMeetupOrderId ? PINNED_MEETUP_SCORE_BOOST : 0;
}

export function computeApplicationStatus(input: {
  interpretation: DeliveryAgentFeedbackInterpretation;
  preview: DeliveryAgentPreviewCandidatePlansResponse;
  appliedOrderIds: string[];
  meetupPinned: boolean;
}): {
  applicationStatus: "applied" | "partial" | "not_applied";
  applicationNotes: string[];
} {
  const applicationNotes: string[] = [];
  let appliedSignals = 0;
  let requestedSignals = 0;

  if (input.interpretation.preferredMeetupOrderId) {
    requestedSignals += 1;
    if (input.meetupPinned) {
      appliedSignals += 1;
      applicationNotes.push("Preferred meet-up location was prioritized in candidate expansion.");
    } else {
      applicationNotes.push("Preferred meet-up location could not be pinned to a routing stop.");
    }
  }

  if (input.interpretation.preferredDriverAssignments.length > 0) {
    requestedSignals += 1;
    if (input.appliedOrderIds.length > 0) {
      appliedSignals += 1;
      applicationNotes.push(
        `Reassigned ${input.appliedOrderIds.length} order(s) per feedback before preview.`
      );
    } else {
      applicationNotes.push("No driver run overrides could be applied from feedback.");
    }
  }

  if (input.interpretation.penalties.length > 0) {
    requestedSignals += 1;
    appliedSignals += 1;
    applicationNotes.push(
      `Recorded ${input.interpretation.penalties.length} planning penalty signal(s) from feedback tags.`
    );
  }

  if (input.interpretation.warnings.length > 0) {
    applicationNotes.push(...input.interpretation.warnings);
  }

  if (requestedSignals === 0) {
    return {
      applicationStatus: "not_applied",
      applicationNotes: [
        "Feedback did not produce actionable planning hints; regenerated candidates without overrides.",
        ...applicationNotes,
      ],
    };
  }

  if (appliedSignals === 0) {
    return { applicationStatus: "not_applied", applicationNotes };
  }

  if (appliedSignals < requestedSignals) {
    return { applicationStatus: "partial", applicationNotes };
  }

  return { applicationStatus: "applied", applicationNotes };
}

export function detectMeetupPinnedInPreview(
  preview: DeliveryAgentPreviewCandidatePlansResponse,
  pinnedMeetupOrderId?: string
): boolean {
  if (!pinnedMeetupOrderId || !preview.recommendedCandidateId) {
    return false;
  }

  const recommended = preview.candidates.find(
    (candidate) => candidate.candidateId === preview.recommendedCandidateId
  );

  const sourceOrderId = recommended?.handoffPlan?.selectedMeetup?.sourceOrderId;
  return sourceOrderId === pinnedMeetupOrderId;
}
