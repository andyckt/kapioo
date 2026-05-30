import {
  LEARNING_ARTIFACTS_VERSION,
  LOCATION_ARTIFACTS_VERSION,
  PLANNING_ARTIFACTS_VERSION,
  type DeliveryAgentLearningArtifacts,
  type DeliveryAgentLocationArtifacts,
  type DeliveryAgentPlanningArtifacts,
  type DeliveryAgentRouteShapeIssue,
} from "@/lib/agents/delivery/run-log-types";
import type {
  DeliveryAgentCandidatePlanPreview,
  DeliveryAgentPreviewCandidatePlansResponse,
  DeliveryAgentRecommendedPlanSummary,
} from "@/lib/contracts/delivery-agent";

export type BuildReviewArtifactsInput = {
  reviewStatus: "approved" | "edited" | "rejected";
  recommendedCandidateId: string;
  selectedCandidateId: string;
  didDonaldOverrideRecommendation: boolean;
  recommendedPlanSummary?: DeliveryAgentRecommendedPlanSummary | null;
  selectedPlanSummary?: Record<string, unknown> | null;
  candidatePreviewSnapshot?: DeliveryAgentPreviewCandidatePlansResponse | null;
  feedbackText?: string;
  feedbackTags?: string[];
  reviewedBy: string;
  reviewedAt: Date;
  planningSessionId?: string;
  existingLearningArtifacts?: DeliveryAgentLearningArtifacts | null;
};

function findCandidate(
  snapshot: DeliveryAgentPreviewCandidatePlansResponse | null | undefined,
  candidateId: string
): DeliveryAgentCandidatePlanPreview | undefined {
  return snapshot?.candidates.find((candidate) => candidate.candidateId === candidateId);
}

function buildRouteShapeIssues(
  candidate?: DeliveryAgentCandidatePlanPreview
): DeliveryAgentRouteShapeIssue[] {
  if (!candidate) {
    return [];
  }

  return candidate.candidateRepairSummary.issuesDetected.map((issue) => ({
    code: issue.issueType,
    message: issue.message,
    severity:
      issue.severity === "blocking"
        ? ("error" as const)
        : issue.severity === "warning"
          ? ("warning" as const)
          : ("info" as const),
    details: {
      runSlot: issue.runSlot,
    },
  }));
}

function buildLocationArtifacts(
  candidate?: DeliveryAgentCandidatePlanPreview
): DeliveryAgentLocationArtifacts {
  const selectedMeetup = candidate?.handoffPlan.selectedMeetup;
  const stopSnapshots = candidate?.runs.flatMap((run) =>
    run.optimizedStops.map((stop, index) => ({
      normalizedAddress: stop.address,
      orderIds: stop.orderIds,
      fixedStopPosition: run.meetupSequence === stop.sequence ? run.meetupSequence : undefined,
      isSynthetic: run.syntheticMeetupIncluded && run.meetupSequence === stop.sequence,
      stopType: run.syntheticMeetupIncluded && run.meetupSequence === stop.sequence ? "handoff" : undefined,
      sequence: stop.sequence ?? index + 1,
      runSlot: run.runSlot,
    }))
  );

  const fixedStopUsage =
    candidate?.candidateRepairSummary.repairActionsApplied
      .filter((action) => action.fixedStopPosition !== undefined)
      .map((action) => ({
        runSlot: action.runSlot,
        fixedStopPosition: action.fixedStopPosition,
        actionType: action.actionType,
        reason: action.reason,
        targetStopName: action.targetStopName,
      })) ?? [];

  const endpointUsage =
    candidate?.candidateRepairSummary.repairActionsApplied
      .filter((action) => action.actionType === "apply_end_point")
      .map((action) => ({
        runSlot: action.runSlot,
        actionType: action.actionType,
        reason: action.reason,
        targetStopName: action.targetStopName,
      })) ?? [];

  const handoffEvents = selectedMeetup
    ? [
        {
          type: "meet-up",
          normalizedAddress: selectedMeetup.meetupAddress,
          area: selectedMeetup.sourceArea,
          notes: selectedMeetup.reasoning,
          createdAt: new Date().toISOString(),
        },
      ]
    : [];

  return {
    artifactVersion: LOCATION_ARTIFACTS_VERSION,
    meetUpLocation: selectedMeetup
      ? {
          address: selectedMeetup.meetupAddress,
        }
      : undefined,
    handoffEvents,
    fixedStopUsage,
    endpointUsage,
    stopSnapshots,
  };
}

export function buildReviewArtifacts(input: BuildReviewArtifactsInput): {
  planningArtifacts: DeliveryAgentPlanningArtifacts;
  locationArtifacts: DeliveryAgentLocationArtifacts;
  learningArtifacts: DeliveryAgentLearningArtifacts;
} {
  const selectedCandidate = findCandidate(input.candidatePreviewSnapshot, input.selectedCandidateId);
  const recommendedCandidate = findCandidate(
    input.candidatePreviewSnapshot,
    input.recommendedCandidateId
  );

  const selectedSummary =
    input.selectedPlanSummary ??
    (selectedCandidate
      ? {
          candidateId: selectedCandidate.candidateId,
          candidateName: selectedCandidate.name,
          score: selectedCandidate.score,
          rank: selectedCandidate.rank,
          recommendationStatus: selectedCandidate.recommendationStatus,
          decisionSummary: selectedCandidate.decisionSummary,
        }
      : undefined);

  const planningArtifacts: DeliveryAgentPlanningArtifacts = {
    artifactVersion: PLANNING_ARTIFACTS_VERSION,
    candidatePlansTested: input.candidatePreviewSnapshot?.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      label: candidate.name,
      score: candidate.score,
      runCount: candidate.runs.length,
      estimatedFinishBefore1Pm: candidate.summary.allRunsFinishBeforeDeadline,
      details: {
        rank: candidate.rank,
        status: candidate.status,
        recommendationStatus: candidate.recommendationStatus,
      },
    })),
    selectedPlanSummary: selectedSummary ?? undefined,
    systemRecommendedCandidateId: input.recommendedCandidateId,
    donaldSelectedCandidateId: input.selectedCandidateId,
    didDonaldOverrideRecommendation: input.didDonaldOverrideRecommendation,
    systemRecommendation: input.recommendedPlanSummary
      ? {
          ...input.recommendedPlanSummary,
          candidatePreview: recommendedCandidate
            ? {
                candidateId: recommendedCandidate.candidateId,
                name: recommendedCandidate.name,
                score: recommendedCandidate.score,
                rank: recommendedCandidate.rank,
              }
            : undefined,
        }
      : undefined,
    scoreBreakdown: selectedCandidate
      ? {
          items: selectedCandidate.scoreBreakdown,
        }
      : undefined,
    agentReasoningSummary: [
      selectedCandidate?.decisionSummary,
      input.candidatePreviewSnapshot?.selectionNotes,
    ]
      .filter(Boolean)
      .join(" "),
    routeShapeIssuesDetected: buildRouteShapeIssues(selectedCandidate),
    candidatePreviewSnapshot: input.candidatePreviewSnapshot
      ? (input.candidatePreviewSnapshot as unknown as Record<string, unknown>)
      : undefined,
    ...(input.reviewStatus === "approved" && selectedCandidate
      ? { finalAcceptedPlan: selectedCandidate as unknown as Record<string, unknown> }
      : {}),
  };

  const locationArtifacts = buildLocationArtifacts(selectedCandidate);

  const historyEntry = {
    reviewedAt: input.reviewedAt.toISOString(),
    reviewedBy: input.reviewedBy,
    feedbackText: input.feedbackText?.trim() || undefined,
    feedbackTags: input.feedbackTags,
    recommendedCandidateId: input.recommendedCandidateId,
    selectedCandidateId: input.selectedCandidateId,
    didDonaldOverrideRecommendation: input.didDonaldOverrideRecommendation,
    planningSessionId: input.planningSessionId,
    reviewStatus: input.reviewStatus,
  };

  const existingLearning = input.existingLearningArtifacts;
  const learningArtifacts: DeliveryAgentLearningArtifacts = {
    artifactVersion: LEARNING_ARTIFACTS_VERSION,
    donaldFeedbackText: input.feedbackText?.trim() || undefined,
    donaldFeedbackTags: input.feedbackTags,
    systemRecommendedCandidateId: input.recommendedCandidateId,
    donaldSelectedCandidateId: input.selectedCandidateId,
    didDonaldOverrideRecommendation: input.didDonaldOverrideRecommendation,
    improvementSuggestions: existingLearning?.improvementSuggestions ?? [],
    approvedRuleChanges: existingLearning?.approvedRuleChanges ?? [],
    retryHistory: existingLearning?.retryHistory ?? [],
    rejectionHistory: [...(existingLearning?.rejectionHistory ?? [])],
    manualEdits: [...(existingLearning?.manualEdits ?? [])],
    overrideHistory: [...(existingLearning?.overrideHistory ?? [])],
  };

  if (input.reviewStatus === "rejected") {
    learningArtifacts.rejectionHistory?.push(historyEntry);
  } else if (input.reviewStatus === "edited") {
    learningArtifacts.manualEdits?.push({
      ...historyEntry,
      type: input.didDonaldOverrideRecommendation ? "override_selection" : "needs_revision",
    });
  } else if (input.reviewStatus === "approved" && input.didDonaldOverrideRecommendation) {
    learningArtifacts.overrideHistory?.push({
      ...historyEntry,
      type: "recommendation_override",
    });
  }

  return {
    planningArtifacts,
    locationArtifacts,
    learningArtifacts,
  };
}
