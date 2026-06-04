import { scoreCandidatePlan } from "@/lib/agents/delivery/best-plan/score-candidate-plan";
import {
  assignFeasibilityTier,
  anyOnTimeCandidateExists,
  buildOperationalExplanation,
  compareFeasibilityThenScore,
  evaluateComparativeSelfPolicy,
  findBestSafeTwoDriverCandidate,
  isSafeTwoDriverCandidate,
} from "@/lib/agents/delivery/best-plan/operational";
import type { FeasibilityTierResult } from "@/lib/agents/delivery/best-plan/operational/resolve-feasibility-tier";
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

function resolveRecommendationStatus(input: {
  candidate: RankedCandidatePlanPreview;
  isTopRanked: boolean;
  anyOnTimeExists: boolean;
  eligibleForRecommended: boolean;
  feasibilityTier: 1 | 2 | 3 | 4;
}): DeliveryAgentCandidateRecommendationStatus {
  if (input.candidate.status === "failed" || !input.candidate.summary.latestEstimatedFinishTime) {
    return "not_recommended";
  }

  if (
    input.eligibleForRecommended &&
    input.isTopRanked &&
    input.anyOnTimeExists &&
    input.feasibilityTier <= 2
  ) {
    return "recommended";
  }

  if (input.isTopRanked && !input.anyOnTimeExists && input.candidate.status === "previewed") {
    if (input.feasibilityTier === 4) {
      return "infeasible";
    }

    return "risky";
  }

  if (input.candidate.status === "previewed" && input.candidate.score >= 70 && input.feasibilityTier <= 2) {
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
    feasibilityTier: candidate.feasibilityTier,
    feasibilityLabel: candidate.feasibilityLabel,
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
  feasibility: FeasibilityTierResult;
};

function applySelfPolicyToScoring(
  entry: ScoredEntry,
  policyResult: ReturnType<typeof evaluateComparativeSelfPolicy>,
  baseScoring: CandidateScoringResult,
  context: {
    anyOnTimeExists: boolean;
    isSafeTwoDriver: boolean;
  }
): ScoredEntry {
  let score = Math.max(0, Math.round((baseScoring.score + policyResult.scoreDelta) * 10) / 10);
  let eligibleForRecommended = baseScoring.eligibleForRecommended;

  if (policyResult.eligibleForRecommendedOverride === false) {
    eligibleForRecommended = false;
  }

  if (context.anyOnTimeExists && entry.feasibility.feasibilityTier >= 3) {
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
    anyOnTimeExists: context.anyOnTimeExists,
    feasibilityLabel: entry.feasibility.feasibilityLabel,
    isSafeTwoDriver: context.isSafeTwoDriver,
  });

  return {
    candidate: entry.candidate,
    selfRecommendationReason: policyResult.selfRecommendationReason,
    feasibility: entry.feasibility,
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

function toRankedPreview(entry: ScoredEntry, rank: number): RankedCandidatePlanPreview {
  return {
    ...entry.candidate,
    score: entry.scoring.score,
    rank,
    recommendationStatus: "acceptable",
    feasibilityTier: entry.feasibility.feasibilityTier,
    feasibilityLabel: entry.feasibility.feasibilityLabel,
    scoreBreakdown: entry.scoring.scoreBreakdown,
    pros: entry.scoring.pros,
    cons: entry.scoring.cons,
    blockingIssues: entry.scoring.blockingIssues,
    decisionSummary: entry.scoring.decisionSummary,
    operationalNotes: entry.scoring.operationalNotes,
    selfRecommendationReason: entry.selfRecommendationReason,
    meetupBalanceNote: entry.scoring.meetupBalanceNote,
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
  const feasibilityRules = input.profile.operationalScoringRules.deadlineFeasibilityRules;
  const bestSafeTwoDriver = findBestSafeTwoDriverCandidate({
    candidates: input.candidates,
    policy,
  });
  const safeTwoDriverExistsInPool = bestSafeTwoDriver !== null;

  const feasibilityByCandidate = input.candidates.map((candidate) =>
    assignFeasibilityTier({ candidate, rules: feasibilityRules, policy })
  );
  const anyOnTimeExists = anyOnTimeCandidateExists(feasibilityByCandidate);

  const scored: ScoredEntry[] = input.candidates.map((candidate, index) => {
    const assignedRuns = input.assignmentByCandidateId?.get(candidate.candidateId);
    const feasibility = feasibilityByCandidate[index];
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
      bestSafeTwoDriverExists: safeTwoDriverExistsInPool,
      poolContext: { anyOnTimeExists },
    });

    const policyResult = evaluateComparativeSelfPolicy({
      candidate,
      bestSafeTwoDriver,
      policy,
    });

    return applySelfPolicyToScoring(
      { candidate, scoring, selfRecommendationReason: policyResult.selfRecommendationReason, feasibility },
      policyResult,
      scoring,
      {
        anyOnTimeExists,
        isSafeTwoDriver: isSafeTwoDriverCandidate(candidate, policy),
      }
    );
  });

  const rankedCandidates: RankedCandidatePlanPreview[] = [...scored]
    .sort((left, right) =>
      compareFeasibilityThenScore(
        {
          score: left.scoring.score,
          feasibilityTier: left.feasibility.feasibilityTier,
          summary: left.candidate.summary,
          warnings: left.candidate.warnings,
          blockingIssues: left.scoring.blockingIssues,
          runs: left.candidate.runs,
          strategyType: left.candidate.strategyType,
        },
        {
          score: right.scoring.score,
          feasibilityTier: right.feasibility.feasibilityTier,
          summary: right.candidate.summary,
          warnings: right.candidate.warnings,
          blockingIssues: right.scoring.blockingIssues,
          runs: right.candidate.runs,
          strategyType: right.candidate.strategyType,
        },
        { safeTwoDriverExistsInPool }
      )
    )
    .map((entry, index) => toRankedPreview(entry, index + 1));

  const withStatus = rankedCandidates.map((candidate, index) => {
    const scoring = scored.find((entry) => entry.candidate.candidateId === candidate.candidateId)?.scoring;

    return {
      ...candidate,
      recommendationStatus: resolveRecommendationStatus({
        candidate,
        isTopRanked: index === 0,
        anyOnTimeExists,
        eligibleForRecommended: scoring?.eligibleForRecommended ?? false,
        feasibilityTier: candidate.feasibilityTier ?? 4,
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

  if (!anyOnTimeExists && top) {
    const minutesLate = Math.abs(top.summary.minutesBeforeOrAfterDeadline ?? 0);
    selectionWarnings.push(
      `No candidate finishes before 1 PM. Best available option is ${top.name}, but it is late by ${minutesLate} minute(s).`
    );

    if (top.feasibilityTier === 4) {
      selectionWarnings.push(
        "Best available plan is far past the 1 PM deadline — extra driver or manual help is required."
      );
    }
  }

  if (
    top.status !== "previewed" ||
    top.recommendationStatus === "not_recommended" ||
    top.recommendationStatus === "infeasible"
  ) {
    recommendedCandidateId = null;
    recommendedPlanSummary = null;
    selectionWarnings.push(
      top.status !== "previewed"
        ? "Top-ranked candidate was not fully previewed, so it is shown for review only and not recommended."
        : "Top-ranked candidate is not operationally recommendable."
    );
  }

  const selectionNotes =
    top.recommendationStatus === "recommended"
      ? `${top.name} is the recommended plan (score ${top.score}).`
      : top.recommendationStatus === "risky"
        ? `${top.name} is the best available plan but marked risky (score ${top.score}).`
        : top.recommendationStatus === "infeasible"
          ? `${top.name} is the least-bad option but infeasible before 1 PM (score ${top.score}).`
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
