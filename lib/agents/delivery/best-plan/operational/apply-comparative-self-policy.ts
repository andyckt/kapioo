import type { DeliveryAgentCandidatePlanPreviewCore } from "@/lib/contracts/delivery-agent";
import type { DeliveryPlanningSelfFallbackPolicy } from "@/lib/agents/delivery/planning-profile/types";

export type SelfRecommendationReason =
  | "not_applicable"
  | "not_necessary"
  | "required_for_deadline"
  | "meaningful_deadline_improvement";

export type SafeTwoDriverCandidate = {
  candidateId: string;
  minutesBeforeOrAfterDeadline: number;
  latestEstimatedFinishTime?: string;
};

function readDriverBalanceRatio(candidate: DeliveryAgentCandidatePlanPreviewCore): number | undefined {
  const runA = candidate.runs.find((run) => run.runSlot === "A");
  const runB = candidate.runs.find((run) => run.runSlot === "B");
  const durationA = runA?.totalDurationMinutes;
  const durationB = runB?.totalDurationMinutes;

  if (durationA === undefined || durationB === undefined || durationA <= 0 || durationB <= 0) {
    return undefined;
  }

  return Math.min(durationA, durationB) / Math.max(durationA, durationB);
}

function hasBlockingIssues(candidate: DeliveryAgentCandidatePlanPreviewCore): boolean {
  if (candidate.status !== "previewed") {
    return true;
  }

  const hasRunValidationIssues = candidate.runs.some(
    (run) => run.routeOptimizerValidationErrors.length > 0 || run.geocodeFailures.length > 0
  );
  const hasBlockingRouteShape = candidate.candidateRepairSummary.issuesDetected.some(
    (issue) => issue.severity === "blocking"
  );

  return hasRunValidationIssues || hasBlockingRouteShape;
}

export function isSafeTwoDriverCandidate(
  candidate: DeliveryAgentCandidatePlanPreviewCore,
  policy: DeliveryPlanningSelfFallbackPolicy
): boolean {
  if (
    candidate.summary.selfUsed ||
    candidate.summary.runCount !== 2 ||
    !candidate.summary.allRunsFinishBeforeDeadline ||
    !candidate.summary.latestEstimatedFinishTime
  ) {
    return false;
  }

  if (hasBlockingIssues(candidate)) {
    return false;
  }

  const buffer = candidate.summary.minutesBeforeOrAfterDeadline ?? 0;
  if (buffer < policy.minTwoDriverBufferMinutes) {
    return false;
  }

  const balanceRatio = readDriverBalanceRatio(candidate);
  if (balanceRatio !== undefined && balanceRatio < policy.minTwoDriverBalanceRatio) {
    return false;
  }

  return true;
}

export function findBestSafeTwoDriverCandidate(input: {
  candidates: DeliveryAgentCandidatePlanPreviewCore[];
  policy: DeliveryPlanningSelfFallbackPolicy;
}): SafeTwoDriverCandidate | null {
  let best: SafeTwoDriverCandidate | null = null;

  for (const candidate of input.candidates) {
    if (!isSafeTwoDriverCandidate(candidate, input.policy)) {
      continue;
    }

    const buffer = candidate.summary.minutesBeforeOrAfterDeadline ?? 0;
    if (!best || buffer > best.minutesBeforeOrAfterDeadline) {
      best = {
        candidateId: candidate.candidateId,
        minutesBeforeOrAfterDeadline: buffer,
        latestEstimatedFinishTime: candidate.summary.latestEstimatedFinishTime,
      };
    }
  }

  return best;
}

function readFinishTimeMs(value?: string): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function computeMinutesSavedBySelf(input: {
  selfCandidate: DeliveryAgentCandidatePlanPreviewCore;
  bestSafeTwoDriver: SafeTwoDriverCandidate;
}): number {
  const selfFinish = readFinishTimeMs(input.selfCandidate.summary.latestEstimatedFinishTime);
  const twoDriverFinish = readFinishTimeMs(input.bestSafeTwoDriver.latestEstimatedFinishTime);

  if (selfFinish === null || twoDriverFinish === null) {
    const selfBuffer = input.selfCandidate.summary.minutesBeforeOrAfterDeadline ?? 0;
    return selfBuffer - input.bestSafeTwoDriver.minutesBeforeOrAfterDeadline;
  }

  return Math.round((twoDriverFinish - selfFinish) / 60_000);
}

export type ComparativeSelfPolicyResult = {
  scoreDelta: number;
  eligibleForRecommendedOverride?: boolean;
  selfRecommendationReason: SelfRecommendationReason;
  operationalNote?: string;
};

export function evaluateComparativeSelfPolicy(input: {
  candidate: DeliveryAgentCandidatePlanPreviewCore;
  bestSafeTwoDriver: SafeTwoDriverCandidate | null;
  policy: DeliveryPlanningSelfFallbackPolicy;
}): ComparativeSelfPolicyResult {
  if (!input.candidate.summary.selfUsed) {
    return { scoreDelta: 0, selfRecommendationReason: "not_applicable" };
  }

  if (!input.candidate.summary.allRunsFinishBeforeDeadline) {
    return {
      scoreDelta: 0,
      selfRecommendationReason: "required_for_deadline",
      operationalNote: "Self recommended because 2-driver plans do not finish before 1 PM.",
    };
  }

  if (!input.bestSafeTwoDriver) {
    return {
      scoreDelta: 0,
      selfRecommendationReason: "meaningful_deadline_improvement",
      operationalNote: "Self recommended because no safe 2-driver plan meets operational criteria.",
    };
  }

  const minutesSaved = computeMinutesSavedBySelf({
    selfCandidate: input.candidate,
    bestSafeTwoDriver: input.bestSafeTwoDriver,
  });

  if (minutesSaved >= input.policy.minMinutesSavedToJustifySelf) {
    return {
      scoreDelta: 0,
      selfRecommendationReason: "meaningful_deadline_improvement",
      operationalNote: `Self saves ${minutesSaved} min vs best safe 2-driver plan — meaningful improvement.`,
    };
  }

  return {
    scoreDelta: -input.policy.selfScorePenaltyWhenTwoDriverSafe,
    eligibleForRecommendedOverride: false,
    selfRecommendationReason: "not_necessary",
    operationalNote:
      "2-driver plan preferred because it finishes before 1 PM and Self is not necessary.",
  };
}

export function capSelfDeadlineBufferPoints(input: {
  selfUsed: boolean;
  minutesBefore: number;
  bufferTarget: number;
  capAtPreferred: boolean;
  bestSafeTwoDriverExists: boolean;
}): number {
  if (!input.selfUsed || !input.capAtPreferred || !input.bestSafeTwoDriverExists) {
    return clampBufferPoints(input.minutesBefore, input.bufferTarget);
  }

  const cappedMinutes = Math.min(input.minutesBefore, input.bufferTarget);
  return clampBufferPoints(cappedMinutes, input.bufferTarget);
}

function clampBufferPoints(minutesBefore: number, bufferTarget: number): number {
  if (bufferTarget <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (minutesBefore / bufferTarget) * 100));
}
