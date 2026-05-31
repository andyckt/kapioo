import { toPlanningStop } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import type { PlanningRunLean } from "@/lib/agents/delivery/candidate-plans/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import {
  applyFeedbackPenalties,
  buildOperationalExplanation,
  capSelfDeadlineBufferPoints,
  extractMeetupBalanceNote,
  scoreMeetupOperationalBalance,
  scoreOnTheWayBeforeMeetup,
  scorePreferTwoDriverPlans,
} from "@/lib/agents/delivery/best-plan/operational";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import type {
  DeliveryAgentCandidatePlanPreviewCore,
  DeliveryAgentCandidateScoreBreakdownItem,
} from "@/lib/contracts/delivery-agent";
import {
  SCORING_DIMENSION_LABELS,
  type CandidateAssignedRun,
  type CandidateScoringInput,
  type CandidateScoringResult,
  type ScoringWeightKey,
} from "@/lib/agents/delivery/best-plan/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildBreakdownItem(
  key: ScoringWeightKey,
  weight: number,
  points: number,
  reason: string
): DeliveryAgentCandidateScoreBreakdownItem {
  return {
    key,
    label: SCORING_DIMENSION_LABELS[key],
    weight,
    points: Math.round(points),
    reason,
  };
}

function scoreFinishBeforeDeadline(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.finishBeforeDeadline;
  const { summary } = input.candidate;

  if (!summary.latestEstimatedFinishTime) {
    return buildBreakdownItem(
      "finishBeforeDeadline",
      weight,
      0,
      "Missing latest estimated finish time."
    );
  }

  if (summary.allRunsFinishBeforeDeadline) {
    return buildBreakdownItem(
      "finishBeforeDeadline",
      weight,
      100,
      "All runs finish before the hard delivery deadline."
    );
  }

  const minutesLate = Math.abs(summary.minutesBeforeOrAfterDeadline ?? 0);
  const points = clamp(100 - minutesLate * 5, 0, 100);

  return buildBreakdownItem(
    "finishBeforeDeadline",
    weight,
    points,
    `Latest finish is ${minutesLate} minute(s) after the deadline.`
  );
}

function scoreDeadlineBuffer(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.deadlineBuffer;
  const { summary } = input.candidate;
  const bufferTarget = input.preferredDeadlineBufferMinutes;
  const policy =
    input.operationalScoringRules?.selfFallbackPolicy ??
    DEFAULT_DELIVERY_PLANNING_PROFILE.operationalScoringRules.selfFallbackPolicy;

  if (!summary.latestEstimatedFinishTime || !summary.allRunsFinishBeforeDeadline) {
    return buildBreakdownItem("deadlineBuffer", weight, 0, "No usable deadline buffer — finish is late or unknown.");
  }

  const minutesBefore = summary.minutesBeforeOrAfterDeadline ?? 0;
  const points = capSelfDeadlineBufferPoints({
    selfUsed: summary.selfUsed,
    minutesBefore,
    bufferTarget,
    capAtPreferred: policy.capSelfDeadlineBufferAtPreferred,
    bestSafeTwoDriverExists: input.bestSafeTwoDriverExists ?? false,
  });

  const cappedNote =
    summary.selfUsed && policy.capSelfDeadlineBufferAtPreferred && input.bestSafeTwoDriverExists
      ? " (Self buffer capped — safe 2-driver plan exists.)"
      : "";

  return buildBreakdownItem(
    "deadlineBuffer",
    weight,
    points,
    `${minutesBefore} minute(s) before deadline (target buffer: ${bufferTarget} min).${cappedNote}`
  );
}

function scoreRouteShapeCorrectness(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.routeShapeCorrectness;
  const issues = input.candidate.candidateRepairSummary.issuesDetected;
  let points = 100;
  let warningCount = 0;

  for (const issue of issues) {
    if (issue.severity === "blocking") {
      points -= 40;
    } else if (issue.severity === "warning") {
      const isPingPong =
        issue.issueType === "north_york_after_downtown" ||
        issue.issueType === "downtown_before_meetup";
      points -= isPingPong ? 30 : 20;
      if (isPingPong) {
        warningCount += 1;
      }
    } else {
      points -= 5;
    }
  }

  if (warningCount >= 2) {
    points -= 10;
  }

  const hasReceiverEndpointIssue = issues.some((issue) => issue.issueType === "marco_wrong_endpoint");
  const hasProviderPingPong = issues.some(
    (issue) =>
      issue.issueType === "north_york_after_downtown" || issue.issueType === "downtown_before_meetup"
  );
  if (hasReceiverEndpointIssue && hasProviderPingPong) {
    points -= 10;
  }

  const repairFailed = input.candidate.runs.some((run) => run.repairStatus === "repair_failed");
  if (repairFailed) {
    points -= 30;
  }

  points = clamp(points, 0, 100);

  return buildBreakdownItem(
    "routeShapeCorrectness",
    weight,
    points,
    issues.length === 0
      ? "No unresolved route shape issues detected."
      : `${issues.length} route shape issue(s) remain after repair preview.`
  );
}

function scoreCorrectDriverEndpoint(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.correctDriverEndpoint;
  const endpointIssues = input.candidate.candidateRepairSummary.issuesDetected.filter(
    (issue) => issue.issueType === "dt_wrong_endpoint" || issue.issueType === "marco_wrong_endpoint"
  );

  const points = endpointIssues.length === 0 ? 100 : 0;

  return buildBreakdownItem(
    "correctDriverEndpoint",
    weight,
    points,
    endpointIssues.length === 0
      ? "DT and Marco endpoints look correct for their roles."
      : `${endpointIssues.length} unresolved wrong-endpoint issue(s).`
  );
}

function expectedLeanForRun(role: string): PlanningRunLean | null {
  if (role === "downtown" || role === "dt") {
    return "dt";
  }

  if (role === "uptown" || role === "marco" || role === "self") {
    return role === "self" ? null : "marco";
  }

  return null;
}

function stopMatchesRunLean(
  stop: { area: string; lat?: number; lng?: number; orderId: string; formattedAddress?: string },
  lean: PlanningRunLean
): boolean {
  const planning = toPlanningStop({
    orderId: stop.orderId,
    customerName: "",
    area: stop.area,
    formattedAddress: stop.formattedAddress ?? stop.area,
    totalMealQuantity: 0,
    routeOptimizer: { name: "", address: stop.formattedAddress ?? stop.area, order_ids: [stop.orderId] },
    ...(typeof stop.lat === "number" ? { lat: stop.lat } : {}),
    ...(typeof stop.lng === "number" ? { lng: stop.lng } : {}),
  } as RoutingStop);

  if (planning.areaBucket === "core_dt" && lean === "dt") {
    return true;
  }

  if (planning.areaBucket === "core_uptown" && lean === "marco") {
    return true;
  }

  if (planning.areaBucket === "flexible_north_york" || planning.areaBucket === "unknown") {
    return planning.defaultRunLean === lean;
  }

  return false;
}

function scoreLatLngClusterFit(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.latLngClusterFit;
  const assignedRuns = input.assignedRuns ?? [];

  if (assignedRuns.length === 0) {
    return buildBreakdownItem(
      "latLngClusterFit",
      weight,
      70,
      "Assigned stop metadata unavailable; neutral cluster score applied."
    );
  }

  let total = 0;
  let matched = 0;
  let hasCoords = false;

  for (const run of assignedRuns) {
    const lean = expectedLeanForRun(run.role);
    if (!lean || run.runSlot === "C") {
      continue;
    }

    for (const stop of run.stops) {
      total += 1;
      if (typeof stop.lat === "number" && typeof stop.lng === "number") {
        hasCoords = true;
      }

      if (stopMatchesRunLean(stop, lean)) {
        matched += 1;
      }
    }
  }

  if (total === 0) {
    return buildBreakdownItem("latLngClusterFit", weight, 70, "No DT/Marco assigned stops to evaluate.");
  }

  const points = hasCoords ? (matched / total) * 100 : 70;

  return buildBreakdownItem(
    "latLngClusterFit",
    weight,
    points,
    hasCoords
      ? `${matched}/${total} assigned stops match the expected run lean by location.`
      : "Coordinates missing; neutral cluster score applied."
  );
}

function scoreHistoricalPatternSimilarity(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.historicalPatternSimilarity;

  return buildBreakdownItem(
    "historicalPatternSimilarity",
    weight,
    50,
    "Historical comparison not enabled in M12."
  );
}

function scoreAvoidSelfUsage(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.avoidSelfUsage;
  const points = input.candidate.summary.selfUsed ? 45 : 100;

  return buildBreakdownItem(
    "avoidSelfUsage",
    weight,
    points,
    input.candidate.summary.selfUsed
      ? "Self run is used in this candidate."
      : "No Self run required."
  );
}

function scoreMinimizeSelfStops(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.minimizeSelfStops;

  if (!input.candidate.summary.selfUsed) {
    return buildBreakdownItem("minimizeSelfStops", weight, 100, "No Self stops in this plan.");
  }

  const points = clamp(100 - input.candidate.summary.selfStopCount * 25, 20, 100);

  return buildBreakdownItem(
    "minimizeSelfStops",
    weight,
    points,
    `${input.candidate.summary.selfStopCount} Self stop(s) assigned.`
  );
}

function scoreBalanceDriverDuration(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.balanceDriverDuration;
  const runA = input.candidate.runs.find((run) => run.runSlot === "A");
  const runB = input.candidate.runs.find((run) => run.runSlot === "B");

  const durationA = runA?.totalDurationMinutes;
  const durationB = runB?.totalDurationMinutes;

  if (durationA === undefined || durationB === undefined || durationA <= 0 || durationB <= 0) {
    return buildBreakdownItem(
      "balanceDriverDuration",
      weight,
      70,
      "Driver durations unavailable; neutral balance score applied."
    );
  }

  const ratio = Math.min(durationA, durationB) / Math.max(durationA, durationB);
  const points = ratio * 100;

  return buildBreakdownItem(
    "balanceDriverDuration",
    weight,
    points,
    `DT ${durationA} min vs Marco ${durationB} min (balance ratio ${ratio.toFixed(2)}).`
  );
}

function scoreAreaLabelMatch(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.areaLabelMatch;
  const assignedRuns = input.assignedRuns ?? [];

  if (assignedRuns.length === 0) {
    return buildBreakdownItem("areaLabelMatch", weight, 70, "Assigned stop metadata unavailable.");
  }

  let total = 0;
  let matched = 0;

  for (const run of assignedRuns) {
    const lean = expectedLeanForRun(run.role);
    if (!lean || run.runSlot === "C") {
      continue;
    }

    for (const stop of run.stops) {
      total += 1;
      if (stopMatchesRunLean(stop, lean)) {
        matched += 1;
      }
    }
  }

  const points = total > 0 ? (matched / total) * 100 : 70;

  return buildBreakdownItem(
    "areaLabelMatch",
    weight,
    points,
    total > 0
      ? `${matched}/${total} stops sit on the semantically correct driver run.`
      : "No stops to evaluate for area label match."
  );
}

function scoreMealQuantityBalance(input: CandidateScoringInput): DeliveryAgentCandidateScoreBreakdownItem {
  const weight = input.scoringWeights.mealQuantityBalance;
  const assignedRuns = input.assignedRuns ?? [];
  const totals = assignedRuns
    .filter((run) => run.runSlot !== "C" || input.candidate.summary.selfUsed)
    .map((run) => run.stops.reduce((sum, stop) => sum + stop.totalMealQuantity, 0));

  if (totals.length <= 1) {
    return buildBreakdownItem("mealQuantityBalance", weight, 100, "Single-run meal load; balance not applicable.");
  }

  const max = Math.max(...totals);
  const min = Math.min(...totals);
  const spread = max - min;
  const points = clamp(100 - spread * 5, 30, 100);

  return buildBreakdownItem(
    "mealQuantityBalance",
    weight,
    points,
    `Meal spread across runs: ${min}–${max} (low-weight factor).`
  );
}

const SCORERS: Record<
  ScoringWeightKey,
  (input: CandidateScoringInput) => DeliveryAgentCandidateScoreBreakdownItem
> = {
  finishBeforeDeadline: scoreFinishBeforeDeadline,
  deadlineBuffer: scoreDeadlineBuffer,
  routeShapeCorrectness: scoreRouteShapeCorrectness,
  correctDriverEndpoint: scoreCorrectDriverEndpoint,
  latLngClusterFit: scoreLatLngClusterFit,
  historicalPatternSimilarity: scoreHistoricalPatternSimilarity,
  avoidSelfUsage: scoreAvoidSelfUsage,
  minimizeSelfStops: scoreMinimizeSelfStops,
  balanceDriverDuration: scoreBalanceDriverDuration,
  areaLabelMatch: scoreAreaLabelMatch,
  mealQuantityBalance: scoreMealQuantityBalance,
  preferTwoDriverPlans: (input) =>
    scorePreferTwoDriverPlans(
      input,
      input.operationalScoringRules?.selfFallbackPolicy ??
        DEFAULT_DELIVERY_PLANNING_PROFILE.operationalScoringRules.selfFallbackPolicy
    ),
  meetupOperationalBalance: (input) =>
    scoreMeetupOperationalBalance(
      input,
      input.meetupSelectionPreferences ??
        DEFAULT_DELIVERY_PLANNING_PROFILE.handoffRules.meetupSelectionPreferences
    ),
  onTheWayBeforeMeetup: (input) =>
    scoreOnTheWayBeforeMeetup(
      input,
      input.meetupSelectionPreferences ??
        DEFAULT_DELIVERY_PLANNING_PROFILE.handoffRules.meetupSelectionPreferences
    ),
};

function computeWeightedScore(breakdown: DeliveryAgentCandidateScoreBreakdownItem[]): number {
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

function buildProsCons(input: {
  candidate: DeliveryAgentCandidatePlanPreviewCore;
  breakdown: DeliveryAgentCandidateScoreBreakdownItem[];
  eligibleForRecommended: boolean;
}): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];

  if (input.candidate.summary.allRunsFinishBeforeDeadline) {
    pros.push("All runs finish before the 1 PM deadline.");
  } else if (input.candidate.summary.latestEstimatedFinishTime) {
    cons.push("Latest team finish is after the hard deadline.");
  }

  if ((input.candidate.summary.minutesBeforeOrAfterDeadline ?? 0) >= 10) {
    pros.push("Healthy buffer before the deadline.");
  }

  if (!input.candidate.summary.selfUsed) {
    pros.push("No Self run required.");
  } else {
    cons.push("Uses a Self fallback run.");
  }

  const topDimensions = [...input.breakdown]
    .filter((item) => item.weight >= 50)
    .sort((a, b) => b.points - a.points);

  for (const item of topDimensions.slice(0, 2)) {
    if (item.points >= 85) {
      pros.push(`${item.label}: ${item.reason}`);
    }
  }

  for (const item of topDimensions) {
    if (item.points < 60) {
      cons.push(`${item.label}: ${item.reason}`);
    }
  }

  if (input.candidate.candidateRepairSummary.repairSucceeded) {
    pros.push("Route shape repair re-preview succeeded.");
  }

  if (input.candidate.runs.some((run) => run.repairStatus === "repair_failed")) {
    cons.push("Route shape repair re-preview failed.");
  }

  if (input.candidate.status !== "previewed") {
    cons.push(`Preview status: ${input.candidate.status}.`);
  }

  if (!input.eligibleForRecommended && input.candidate.summary.allRunsFinishBeforeDeadline) {
    cons.push("Blocked from recommendation by unresolved preview or shape issues.");
  }

  return {
    pros: [...new Set(pros)].slice(0, 5),
    cons: [...new Set(cons)].slice(0, 5),
  };
}

export function scoreCandidatePlan(input: CandidateScoringInput): CandidateScoringResult {
  const policy =
    input.operationalScoringRules?.selfFallbackPolicy ??
    DEFAULT_DELIVERY_PLANNING_PROFILE.operationalScoringRules.selfFallbackPolicy;
  const meetupPrefs =
    input.meetupSelectionPreferences ??
    DEFAULT_DELIVERY_PLANNING_PROFILE.handoffRules.meetupSelectionPreferences;

  const breakdown: DeliveryAgentCandidateScoreBreakdownItem[] = [];

  for (const key of Object.keys(input.scoringWeights) as ScoringWeightKey[]) {
    const weight = input.scoringWeights[key];
    if (weight <= 0) {
      continue;
    }

    if (key === "preferTwoDriverPlans") {
      breakdown.push(scorePreferTwoDriverPlans(input, policy));
      continue;
    }

    if (key === "meetupOperationalBalance") {
      breakdown.push(scoreMeetupOperationalBalance(input, meetupPrefs));
      continue;
    }

    if (key === "onTheWayBeforeMeetup") {
      breakdown.push(scoreOnTheWayBeforeMeetup(input, meetupPrefs));
      continue;
    }

    if (SCORERS[key]) {
      breakdown.push(SCORERS[key](input));
    }
  }

  let score = computeWeightedScore(breakdown);

  const missingFinishTime = !input.candidate.summary.latestEstimatedFinishTime;
  const hasPreviewFailures = input.candidate.status === "failed" || input.candidate.errors.length > 0;
  const hasRepairFailure = input.candidate.runs.some((run) => run.repairStatus === "repair_failed");
  const hasBlockingRouteShapeIssues = input.candidate.candidateRepairSummary.issuesDetected.some(
    (issue) => issue.severity === "blocking"
  );

  const hasRunValidationIssues = input.candidate.runs.some(
    (run) => run.routeOptimizerValidationErrors.length > 0 || run.geocodeFailures.length > 0
  );

  if (input.candidate.status === "failed") {
    score = Math.min(score, 10);
  } else if (input.candidate.status === "partial_failed") {
    score = Math.min(score, input.candidate.summary.allRunsFinishBeforeDeadline ? 75 : 60);
  }

  if (missingFinishTime) {
    score = Math.min(score, 15);
  }

  const feedbackAdjustment = applyFeedbackPenalties({
    scoringInput: input,
    penalties: input.feedbackPenalties ?? [],
    preferredOrderRunOverrides: input.preferredOrderRunOverrides,
    meetupPrefs,
  });
  score = Math.max(0, Math.round((score + feedbackAdjustment.scoreDelta) * 10) / 10);

  const operationalNotesFromFeedback = feedbackAdjustment.notes;
  const meetupBalanceNote = extractMeetupBalanceNote(breakdown);
  const onTheWayItem = breakdown.find((item) => item.key === "onTheWayBeforeMeetup");
  if (onTheWayItem && onTheWayItem.points >= 85 && onTheWayItem.reason.includes("on-the-way")) {
    operationalNotesFromFeedback.push(onTheWayItem.reason);
  }

  const blockingIssues = [
    ...input.candidate.summary.blockingIssues,
    ...input.candidate.errors,
    ...input.candidate.candidateRepairSummary.issuesDetected
      .filter((issue) => issue.severity === "blocking")
      .map((issue) => issue.message),
  ];

  if (input.coordinateCoverage?.recommendationConfidence === "low") {
    blockingIssues.push(
      `Coordinate coverage is low (${input.coordinateCoverage.stopsWithCoordinates}/${input.coordinateCoverage.totalValidStops} stops geocoded).`
    );
  }

  const eligibleForRecommended =
    input.candidate.status === "previewed" &&
    !missingFinishTime &&
    !hasRunValidationIssues &&
    !hasBlockingRouteShapeIssues &&
    input.candidate.summary.allRunsFinishBeforeDeadline &&
    input.coordinateCoverage?.recommendationConfidence !== "low";

  const { pros, cons } = buildProsCons({
    candidate: input.candidate,
    breakdown,
    eligibleForRecommended,
  });

  const selfRecommendationReason = input.candidate.summary.selfUsed
    ? ("not_applicable" as const)
    : ("not_applicable" as const);

  const explanation = buildOperationalExplanation({
    candidate: input.candidate,
    score,
    eligibleForRecommended,
    selfRecommendationReason,
    operationalNotes: operationalNotesFromFeedback,
    meetupBalanceNote,
  });

  return {
    score,
    scoreBreakdown: breakdown,
    pros,
    cons,
    blockingIssues: [...new Set(blockingIssues)],
    decisionSummary: explanation.decisionSummary,
    operationalNotes: explanation.operationalNotes,
    selfRecommendationReason,
    meetupBalanceNote,
    eligibleForRecommended,
    hasBlockingRouteShapeIssues,
    hasRepairFailure,
    hasPreviewFailures,
    missingFinishTime,
  };
}
