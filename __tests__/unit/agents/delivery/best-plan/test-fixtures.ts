import type {
  DeliveryAgentCandidatePlanPreviewCore,
  DeliveryAgentCandidatePreviewSummary,
} from "@/lib/contracts/delivery-agent";

/** 12:30 PM Toronto on 2026-06-09 (on time, ~30 min buffer before 1 PM). */
export const ON_TIME_FINISH = "2026-06-09T16:30:00.000Z";

/** 1:30 PM Toronto on 2026-06-09 (30 min late). */
export const LATE_FINISH = "2026-06-09T17:30:00.000Z";

/** 12:00 PM Toronto on 2026-06-09 (60 min buffer). */
export const EARLY_FINISH = "2026-06-09T16:00:00.000Z";

export function buildEmptyRepairSummary(): DeliveryAgentCandidatePlanPreviewCore["candidateRepairSummary"] {
  return {
    repairAttempted: false,
    repairSucceeded: false,
    issuesDetected: [],
    repairActionsApplied: [],
    warnings: [],
  };
}

export function buildRunPreview(
  overrides: Partial<DeliveryAgentCandidatePlanPreviewCore["runs"][number]> = {}
): DeliveryAgentCandidatePlanPreviewCore["runs"][number] {
  return {
    runSlot: "A",
    driverName: "DT",
    role: "downtown",
    stopCount: 2,
    totalDurationMinutes: 90,
    totalDistanceKm: 12,
    estimatedFinishTime: ON_TIME_FINISH,
    formattedEstimatedFinishTime: "Jun 9, 2026, 12:30 PM",
    optimizedStopCount: 2,
    optimizedStops: [],
    routeOptimizerWarnings: [],
    routeOptimizerValidationErrors: [],
    geocodeFailures: [],
    previewStatus: "previewed",
    ...overrides,
  };
}

export function buildCandidatePreview(
  overrides: Partial<Omit<DeliveryAgentCandidatePlanPreviewCore, "summary">> & {
    summary?: Partial<DeliveryAgentCandidatePreviewSummary>;
  } = {}
): DeliveryAgentCandidatePlanPreviewCore {
  const { summary: summaryOverrides, ...rest } = overrides;

  return {
    candidateId: "baseline_two_run:2026-06-09",
    name: "Baseline two-run split",
    strategyType: "baseline_two_run",
    status: "previewed",
    runs: [
      buildRunPreview({ runSlot: "A", driverName: "DT", role: "downtown" }),
      buildRunPreview({
        runSlot: "B",
        driverName: "Marco",
        role: "uptown",
        estimatedFinishTime: ON_TIME_FINISH,
      }),
    ],
    summary: {
      runCount: 2,
      totalStops: 3,
      selfUsed: false,
      selfStopCount: 0,
      latestEstimatedFinishTime: ON_TIME_FINISH,
      formattedLatestEstimatedFinishTime: "Jun 9, 2026, 12:30 PM",
      allRunsFinishBeforeDeadline: true,
      minutesBeforeOrAfterDeadline: 30,
      runFinishTimes: { A: "Jun 9, 2026, 12:30 PM", B: "Jun 9, 2026, 12:30 PM" },
      blockingIssues: [],
      comparisonNotes: "All runs finish before deadline.",
      ...summaryOverrides,
    },
    handoffPlan: {
      providerRunSlot: "A",
      receiverRunSlot: "B",
      selectedMeetup: null,
    },
    candidateRepairSummary: buildEmptyRepairSummary(),
    warnings: [],
    errors: [],
    assumptions: [],
    ...rest,
  };
}

export function buildSelfCandidatePreview(
  overrides: Partial<Omit<DeliveryAgentCandidatePlanPreviewCore, "summary">> & {
    summary?: Partial<DeliveryAgentCandidatePreviewSummary>;
  } = {}
): DeliveryAgentCandidatePlanPreviewCore {
  const { summary: summaryOverrides, ...rest } = overrides;

  return buildCandidatePreview({
    candidateId: "self_fallback_light:2026-06-09",
    name: "Self fallback — light",
    strategyType: "self_fallback_light",
    runs: [
      buildRunPreview({ runSlot: "A" }),
      buildRunPreview({ runSlot: "B", driverName: "Marco", role: "uptown" }),
      buildRunPreview({
        runSlot: "C",
        driverName: "Self",
        role: "self",
        estimatedFinishTime: ON_TIME_FINISH,
      }),
    ],
    summary: {
      runCount: 3,
      totalStops: 3,
      selfUsed: true,
      selfStopCount: 1,
      latestEstimatedFinishTime: ON_TIME_FINISH,
      allRunsFinishBeforeDeadline: true,
      minutesBeforeOrAfterDeadline: 30,
      runFinishTimes: { A: "Jun 9, 2026, 12:30 PM", B: "Jun 9, 2026, 12:30 PM", C: "Jun 9, 2026, 12:30 PM" },
      blockingIssues: [],
      comparisonNotes: "Self fallback on time.",
      ...summaryOverrides,
    },
    ...rest,
  });
}

export function buildLateCandidatePreview(
  id = "baseline_two_run:2026-06-09",
  name = "Baseline two-run split"
): DeliveryAgentCandidatePlanPreviewCore {
  return buildCandidatePreview({
    candidateId: id,
    name,
    summary: {
      runCount: 2,
      totalStops: 3,
      selfUsed: false,
      selfStopCount: 0,
      blockingIssues: [],
      allRunsFinishBeforeDeadline: false,
      minutesBeforeOrAfterDeadline: -30,
      latestEstimatedFinishTime: LATE_FINISH,
      formattedLatestEstimatedFinishTime: "Jun 9, 2026, 1:30 PM",
      runFinishTimes: { A: "Jun 9, 2026, 1:30 PM", B: "Jun 9, 2026, 1:00 PM" },
      comparisonNotes: "Latest finish is after deadline.",
    },
    runs: [
      buildRunPreview({ estimatedFinishTime: LATE_FINISH }),
      buildRunPreview({
        runSlot: "B",
        driverName: "Marco",
        role: "uptown",
        estimatedFinishTime: "2026-06-09T17:00:00.000Z",
      }),
    ],
  });
}
