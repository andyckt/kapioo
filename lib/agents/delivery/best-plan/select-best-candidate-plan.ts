import { scoreCandidatePlan } from "@/lib/agents/delivery/best-plan/score-candidate-plan";
import {
  buildOperationalExplanation,
  evaluateComparativeSelfPolicy,
  findBestSafeTwoDriverCandidate,
} from "@/lib/agents/delivery/best-plan/operational";
import type {
  BestCandidateSelectionResult,
  CandidateAssignedRun,
  CandidateScoringResult,
  RankedCandidatePlanPreview,
} from "@/lib/agents/delivery/best-plan/types";
import type { SelfRecommendationReason } from "@/lib/agents/delivery/best-plan/operational/apply-comparative-self-policy";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type {
  DeliveryAgentCandidatePlanPreviewCore,
  DeliveryAgentCandidateRecommendationStatus,
  DeliveryAgentRecommendedPlanSummary,
} from "@/lib/contracts/delivery-agent";

const TIE_BREAK_SCORE_DELTA = 2;

function readFinishTimeMs(value?: string): number | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveRouteRepairStatus(candidate: DeliveryAgentCandidatePlanPreviewCore): string {
  if (candidate.candidateRepairSummary.repairSucceeded) {
    return "repaired";
  }

  if (candidate.runs.some((run) => run.repairStatus === "repair_failed")) {
    return "repair_failed";
  }

  if (candidate.candidateRepairSummary.repairAttempted) {
    return "attempted";
  }

  return "not_needed";
}

function compareCandidates(
  left: RankedCandidatePlanPreview,
  right: RankedCandidatePlanPreview,
  safeTwoDriverExists: boolean
): number {
  if (Math.abs(left.score - right.score) > TIE_BREAK_SCORE_DELTA) {
    return right.score - left.score;
  }

  if (safeTwoDriverExists && left.summary.selfUsed !== right.summary.selfUsed) {
    return left.summary.selfUsed ? 1 : -1;
  }

  const leftBuffer = left.summary.minutesBeforeOrAfterDeadline ?? Number.NEGATIVE_INFINITY;
  const rightBuffer = right.summary.minutesBeforeOrAfterDeadline ?? Number.NEGATIVE_INFINITY;
  if (leftBuffer !== rightBuffer) {
    return rightBuffer - leftBuffer;
  }

  if (left.summary.selfUsed !== right.summary.selfUsed) {
    return left.summary.selfUsed ? 1 : -1;
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

function resolveRecommendationStatus(input: {
  candidate: RankedCandidatePlanPreview;
  isTopRanked: boolean;
  anyCandidateMeetsDeadline: boolean;
  eligibleForRecommended: boolean;
}): DeliveryAgentCandidateRecommendationStatus {
  if (input.candidate.status === "failed" || !input.candidate.summary.latestEstimatedFinishTime) {
    return "not_recommended";
  }

  if (input.eligibleForRecommended && input.isTopRanked && input.anyCandidateMeetsDeadline) {
    return "recommended";
  }

  if (
    input.isTopRanked &&
    !input.anyCandidateMeetsDeadline &&
    input.candidate.status === "previewed"
  ) {
    return "risky";
  }

  if (input.candidate.status === "previewed" && input.candidate.score >= 70) {
    return "acceptable";
  }

  if (input.isTopRanked && input.candidate.runs.some((run) => run.repairStatus === "repair_failed")) {
    return "risky";
  }

  return "not_recommended";
}

function buildRecommendedPlanSummary(
  candidate: RankedCandidatePlanPreview
): DeliveryAgentRecommendedPlanSummary {
  return {
    candidateId: candidate.candidateId,
    candidateName: candidate.name,
    score: candidate.score,
    recommendationStatus: candidate.recommendationStatus,
    formattedLatestFinishTime: candidate.summary.formattedLatestEstimatedFinishTime,
    allRunsFinishBeforeDeadline: candidate.summary.allRunsFinishBeforeDeadline,
    minutesBeforeOrAfterDeadline: candidate.summary.minutesBeforeOrAfterDeadline,
    selfUsed: candidate.summary.selfUsed,
    runFinishTimes: candidate.summary.runFinishTimes,
    routeRepairStatus: resolveRouteRepairStatus(candidate),
    decisionSummary: candidate.decisionSummary,
    operationalNotes: candidate.operationalNotes,
    selfRecommendationReason: candidate.selfRecommendationReason,
    meetupBalanceNote: candidate.meetupBalanceNote,
  };
}

type ScoredEntry = {
  candidate: DeliveryAgentCandidatePlanPreviewCore;
  scoring: CandidateScoringResult;
  selfRecommendationReason: SelfRecommendationReason;
};

function applySelfPolicyToScoring(
  entry: ScoredEntry,
  policyResult: ReturnType<typeof evaluateComparativeSelfPolicy>,
  baseScoring: CandidateScoringResult
): ScoredEntry {
  let score = Math.max(0, Math.round((baseScoring.score + policyResult.scoreDelta) * 10) / 10);
  let eligibleForRecommended = baseScoring.eligibleForRecommended;

  if (policyResult.eligibleForRecommendedOverride === false) {
    eligibleForRecommended = false;
  }

  const operationalNotes = [...baseScoring.operationalNotes];
  if (policyResult.operationalNote) {
    operationalNotes.unshift(policyResult.operationalNote);
  }

  const explanation = buildOperationalExplanation({
    candidate: entry.candidate,
    score,
    eligibleForRecommended,
    selfRecommendationReason: policyResult.selfRecommendationReason,
    operationalNotes,
    meetupBalanceNote: baseScoring.meetupBalanceNote,
  });

  return {
    candidate: entry.candidate,
    selfRecommendationReason: policyResult.selfRecommendationReason,
    scoring: {
      ...baseScoring,
      score,
      eligibleForRecommended,
      decisionSummary: explanation.decisionSummary,
      operationalNotes: explanation.operationalNotes,
      selfRecommendationReason: policyResult.selfRecommendationReason,
    },
  };
}

export function selectBestCandidatePlan(input: {
  profile: DeliveryPlanningProfile;
  candidates: DeliveryAgentCandidatePlanPreviewCore[];
  assignmentByCandidateId?: Map<string, CandidateAssignedRun[]>;
  coordinateCoverage?: import("@/lib/agents/delivery/geocode/types").DeliveryAgentCoordinateCoverageSummary;
  feedbackPenalties?: string[];
  preferredOrderRunOverrides?: Map<string, string>;
}): BestCandidateSelectionResult {
  const selectionWarnings: string[] = [];

  if (input.candidates.length === 0) {
    return {
      rankedCandidates: [],
      recommendedCandidateId: null,
      recommendedPlanSummary: null,
      selectionNotes: "No candidate plans were available to rank.",
      selectionWarnings: ["No candidate plans were previewed."],
    };
  }

  const policy = input.profile.operationalScoringRules.selfFallbackPolicy;
  const bestSafeTwoDriver = findBestSafeTwoDriverCandidate({
    candidates: input.candidates,
    policy,
  });
  const safeTwoDriverExists = bestSafeTwoDriver !== null;

  const scored: ScoredEntry[] = input.candidates.map((candidate) => {
    const assignedRuns = input.assignmentByCandidateId?.get(candidate.candidateId);
    const scoring = scoreCandidatePlan({
      candidate,
      assignedRuns,
      preferredDeadlineBufferMinutes: input.profile.timeRules.preferredDeadlineBufferMinutes,
      scoringWeights: input.profile.scoringWeights,
      coordinateCoverage: input.coordinateCoverage,
      operationalScoringRules: input.profile.operationalScoringRules,
      meetupSelectionPreferences: input.profile.handoffRules.meetupSelectionPreferences,
      feedbackPenalties: input.feedbackPenalties,
      preferredOrderRunOverrides: input.preferredOrderRunOverrides,
      bestSafeTwoDriverExists: safeTwoDriverExists,
    });

    const policyResult = evaluateComparativeSelfPolicy({
      candidate,
      bestSafeTwoDriver,
      policy,
    });

    return applySelfPolicyToScoring(
      { candidate, scoring, selfRecommendationReason: policyResult.selfRecommendationReason },
      policyResult,
      scoring
    );
  });

  const rankedCandidates: RankedCandidatePlanPreview[] = [...scored]
    .sort((left, right) =>
      compareCandidates(
        {
          ...left.candidate,
          score: left.scoring.score,
          rank: 0,
          recommendationStatus: "acceptable",
          scoreBreakdown: left.scoring.scoreBreakdown,
          pros: left.scoring.pros,
          cons: left.scoring.cons,
          blockingIssues: left.scoring.blockingIssues,
          decisionSummary: left.scoring.decisionSummary,
          operationalNotes: left.scoring.operationalNotes,
          selfRecommendationReason: left.selfRecommendationReason,
          meetupBalanceNote: left.scoring.meetupBalanceNote,
        },
        {
          ...right.candidate,
          score: right.scoring.score,
          rank: 0,
          recommendationStatus: "acceptable",
          scoreBreakdown: right.scoring.scoreBreakdown,
          pros: right.scoring.pros,
          cons: right.scoring.cons,
          blockingIssues: right.scoring.blockingIssues,
          decisionSummary: right.scoring.decisionSummary,
          operationalNotes: right.scoring.operationalNotes,
          selfRecommendationReason: right.selfRecommendationReason,
          meetupBalanceNote: right.scoring.meetupBalanceNote,
        },
        safeTwoDriverExists
      )
    )
    .map((entry, index) => ({
      ...entry.candidate,
      score: entry.scoring.score,
      rank: index + 1,
      recommendationStatus: "acceptable" as DeliveryAgentCandidateRecommendationStatus,
      scoreBreakdown: entry.scoring.scoreBreakdown,
      pros: entry.scoring.pros,
      cons: entry.scoring.cons,
      blockingIssues: entry.scoring.blockingIssues,
      decisionSummary: entry.scoring.decisionSummary,
      operationalNotes: entry.scoring.operationalNotes,
      selfRecommendationReason: entry.selfRecommendationReason,
      meetupBalanceNote: entry.scoring.meetupBalanceNote,
    }));

  const anyCandidateMeetsDeadline = rankedCandidates.some(
    (candidate) => candidate.summary.allRunsFinishBeforeDeadline
  );

  const withStatus = rankedCandidates.map((candidate, index) => {
    const scoring = scored.find((entry) => entry.candidate.candidateId === candidate.candidateId)?.scoring;

    return {
      ...candidate,
      recommendationStatus: resolveRecommendationStatus({
        candidate,
        isTopRanked: index === 0,
        anyCandidateMeetsDeadline,
        eligibleForRecommended: scoring?.eligibleForRecommended ?? false,
      }),
    };
  });

  const top = withStatus[0];
  const allFailed = withStatus.every((candidate) => candidate.status === "failed");

  if (allFailed) {
    return {
      rankedCandidates: withStatus,
      recommendedCandidateId: null,
      recommendedPlanSummary: null,
      selectionNotes: "All candidate previews failed; no plan can be recommended.",
      selectionWarnings: ["All candidate previews failed."],
    };
  }

  let recommendedCandidateId: string | null = top.candidateId;
  let recommendedPlanSummary: DeliveryAgentRecommendedPlanSummary | null =
    buildRecommendedPlanSummary(top);

  if (!anyCandidateMeetsDeadline && top) {
    const minutesLate = Math.abs(top.summary.minutesBeforeOrAfterDeadline ?? 0);
    selectionWarnings.push(
      `No candidate finishes before 1 PM. Best available option is ${top.name}, but it is late by ${minutesLate} minute(s).`
    );
  }

  if (top.recommendationStatus === "not_recommended") {
    recommendedCandidateId = null;
    recommendedPlanSummary = null;
    selectionWarnings.push("Top-ranked candidate is not operationally recommendable.");
  }

  const selectionNotes =
    top.recommendationStatus === "recommended"
      ? `${top.name} is the recommended plan (score ${top.score}).`
      : top.recommendationStatus === "risky"
        ? `${top.name} is the best available plan but marked risky (score ${top.score}).`
        : recommendedCandidateId
          ? `${top.name} ranked first with score ${top.score}.`
          : "No candidate met recommendation criteria.";

  return {
    rankedCandidates: withStatus,
    recommendedCandidateId,
    recommendedPlanSummary,
    selectionNotes,
    selectionWarnings,
  };
}
