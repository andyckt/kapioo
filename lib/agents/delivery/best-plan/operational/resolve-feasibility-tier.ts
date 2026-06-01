import { isSafeTwoDriverCandidate } from "@/lib/agents/delivery/best-plan/operational/apply-comparative-self-policy";
import type {
  DeliveryPlanningDeadlineFeasibilityRules,
  DeliveryPlanningSelfFallbackPolicy,
} from "@/lib/agents/delivery/planning-profile/types";
import type { DeliveryAgentCandidatePlanPreviewCore } from "@/lib/contracts/delivery-agent";

export type FeasibilityTier = 1 | 2 | 3 | 4;

export type FeasibilityLabel =
  | "on_time_safe_2driver"
  | "on_time"
  | "slightly_late"
  | "infeasible_late";

export type FeasibilityTierResult = {
  feasibilityTier: FeasibilityTier;
  feasibilityLabel: FeasibilityLabel;
};

export type FeasibilityCompareCandidate = {
  score: number;
  feasibilityTier: FeasibilityTier;
  summary: DeliveryAgentCandidatePlanPreviewCore["summary"];
  warnings: string[];
  blockingIssues: string[];
  runs: DeliveryAgentCandidatePlanPreviewCore["runs"];
  strategyType: string;
};

const TIE_BREAK_SCORE_DELTA = 2;

function readFinishTimeMs(value?: string): number | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function assignFeasibilityTier(input: {
  candidate: DeliveryAgentCandidatePlanPreviewCore;
  rules: DeliveryPlanningDeadlineFeasibilityRules;
  policy: DeliveryPlanningSelfFallbackPolicy;
}): FeasibilityTierResult {
  const { summary } = input.candidate;

  if (!summary.latestEstimatedFinishTime) {
    return { feasibilityTier: 4, feasibilityLabel: "infeasible_late" };
  }

  if (summary.allRunsFinishBeforeDeadline) {
    if (isSafeTwoDriverCandidate(input.candidate, input.policy)) {
      return { feasibilityTier: 1, feasibilityLabel: "on_time_safe_2driver" };
    }

    return { feasibilityTier: 2, feasibilityLabel: "on_time" };
  }

  const minutesLate = Math.abs(summary.minutesBeforeOrAfterDeadline ?? 0);

  if (minutesLate >= input.rules.infeasibleLateMinutes) {
    return { feasibilityTier: 4, feasibilityLabel: "infeasible_late" };
  }

  return { feasibilityTier: 3, feasibilityLabel: "slightly_late" };
}

export function anyOnTimeCandidateExists(
  tiers: FeasibilityTierResult[]
): boolean {
  return tiers.some((entry) => entry.feasibilityTier === 1 || entry.feasibilityTier === 2);
}

export function compareFeasibilityThenScore(
  left: FeasibilityCompareCandidate,
  right: FeasibilityCompareCandidate,
  context: { safeTwoDriverExistsInPool: boolean }
): number {
  if (left.feasibilityTier !== right.feasibilityTier) {
    return left.feasibilityTier - right.feasibilityTier;
  }

  if (Math.abs(left.score - right.score) > TIE_BREAK_SCORE_DELTA) {
    return right.score - left.score;
  }

  if (
    context.safeTwoDriverExistsInPool &&
    left.feasibilityTier === 1 &&
    left.summary.selfUsed !== right.summary.selfUsed
  ) {
    return left.summary.selfUsed ? 1 : -1;
  }

  const leftBuffer = left.summary.minutesBeforeOrAfterDeadline ?? Number.NEGATIVE_INFINITY;
  const rightBuffer = right.summary.minutesBeforeOrAfterDeadline ?? Number.NEGATIVE_INFINITY;
  if (leftBuffer !== rightBuffer) {
    return rightBuffer - leftBuffer;
  }

  if (
    left.feasibilityTier >= 3 &&
    left.summary.selfUsed !== right.summary.selfUsed
  ) {
    return 0;
  }

  const leftWarnings = left.warnings.length + left.blockingIssues.length;
  const rightWarnings = right.warnings.length + right.blockingIssues.length;
  if (leftWarnings !== rightWarnings) {
    return leftWarnings - rightWarnings;
  }

  const leftRepairFailures = left.runs.filter((run) => run.repairStatus === "repair_failed").length;
  const rightRepairFailures = right.runs.filter((run) => run.repairStatus === "repair_failed").length;
  if (leftRepairFailures !== rightRepairFailures) {
    return leftRepairFailures - rightRepairFailures;
  }

  const leftFinish = readFinishTimeMs(left.summary.latestEstimatedFinishTime);
  const rightFinish = readFinishTimeMs(right.summary.latestEstimatedFinishTime);
  if (leftFinish !== null && rightFinish !== null && leftFinish !== rightFinish) {
    return leftFinish - rightFinish;
  }

  if (left.summary.runCount !== right.summary.runCount) {
    return left.summary.runCount - right.summary.runCount;
  }

  return left.strategyType.localeCompare(right.strategyType);
}
