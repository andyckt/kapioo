import {
  buildDeliveryAgentDuplicateKey,
  findDeliveryAgentRunByDuplicateKey,
} from "@/lib/agents/delivery/run-log";
import { resolveDeliveryAgentOperationalState } from "@/lib/agents/delivery/review-plan/resolve-operational-review-state";
import {
  normalizeReviewStatusForDisplay,
  isImprovementRequestedStatus,
} from "@/lib/agents/delivery/review-plan/review-status-helpers";
import type { DeliveryAgentFinalRouteOptimizerMetadata } from "@/lib/agents/delivery/run-log-types";

export type DonaldPlanReviewRecord = {
  deliveryAgentRunId: string;
  deliveryDate: string;
  profileId: string;
  profileVersion?: string;
  planningSessionId?: string;
  reviewStatus?: ReturnType<typeof normalizeReviewStatusForDisplay>;
  operationalState?: ReturnType<typeof resolveDeliveryAgentOperationalState>;
  reviewedAt?: string;
  reviewedBy?: string;
  donaldFeedbackText?: string;
  donaldFeedbackTags?: string[];
  recommendedCandidateId?: string;
  selectedCandidateId?: string;
  didDonaldOverrideRecommendation?: boolean;
  selectedPlanSummary?: Record<string, unknown>;
  finalRouteOptimizerMetadata?: DeliveryAgentFinalRouteOptimizerMetadata;
  finalRouteGeneration?: number;
  finalRouteRunsMarkedMissingAt?: string;
  reviewReopenedAt?: string;
  activeCandidateGenerationNumber?: number;
  submittedFeedbackSummary?: {
    feedbackText?: string;
    feedbackTags?: string[];
    reviewedAt: string;
  };
};

export type GetDonaldPlanReviewResult = {
  review: DonaldPlanReviewRecord | null;
};

export async function getDonaldPlanReview(input: {
  deliveryDate: string;
  profileId: string;
}): Promise<GetDonaldPlanReviewResult> {
  const duplicatePreventionKey = buildDeliveryAgentDuplicateKey({
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
  });

  const run = await findDeliveryAgentRunByDuplicateKey(duplicatePreventionKey);
  if (!run) {
    return { review: null };
  }

  const planningArtifacts = run.planningArtifacts;
  const learningArtifacts = run.learningArtifacts;
  const reviewStatus = normalizeReviewStatusForDisplay(run.reviewStatus);
  const operationalState = resolveDeliveryAgentOperationalState({
    reviewStatus: run.reviewStatus,
    reviewReopenedAt: run.reviewReopenedAt,
    finalRouteOptimizerMetadata: run.finalRouteOptimizerMetadata,
    finalRouteRunsMarkedMissingAt: run.finalRouteRunsMarkedMissingAt,
    routeOptimizerRunCount: run.routeOptimizerRuns?.length ?? 0,
  });

  const latestImprovementEntry =
    learningArtifacts?.improvementRequestHistory?.[
      (learningArtifacts.improvementRequestHistory?.length ?? 0) - 1
    ];
  const submittedFeedbackSummary =
    isImprovementRequestedStatus(run.reviewStatus) && latestImprovementEntry
      ? {
          feedbackText: latestImprovementEntry.feedbackText ?? run.donaldFeedbackText,
          feedbackTags: latestImprovementEntry.feedbackTags ?? run.donaldFeedbackTags,
          reviewedAt: latestImprovementEntry.reviewedAt,
        }
      : undefined;

  return {
    review: {
      deliveryAgentRunId: run.id,
      deliveryDate: run.deliveryDate,
      profileId: run.profileId,
      profileVersion: run.profileVersion,
      planningSessionId: run.planningSessionId,
      reviewStatus,
      operationalState,
      reviewedAt: run.reviewedAt?.toISOString(),
      reviewedBy: run.reviewedBy,
      donaldFeedbackText: run.donaldFeedbackText,
      donaldFeedbackTags: run.donaldFeedbackTags,
      recommendedCandidateId:
        planningArtifacts?.systemRecommendedCandidateId ??
        learningArtifacts?.systemRecommendedCandidateId,
      selectedCandidateId:
        planningArtifacts?.donaldSelectedCandidateId ?? learningArtifacts?.donaldSelectedCandidateId,
      didDonaldOverrideRecommendation:
        planningArtifacts?.didDonaldOverrideRecommendation ??
        learningArtifacts?.didDonaldOverrideRecommendation,
      selectedPlanSummary:
        (run.selectedPlanSummary as Record<string, unknown> | undefined) ??
        planningArtifacts?.selectedPlanSummary,
      finalRouteOptimizerMetadata: run.finalRouteOptimizerMetadata,
      finalRouteGeneration: run.finalRouteGeneration ?? 1,
      finalRouteRunsMarkedMissingAt: run.finalRouteRunsMarkedMissingAt,
      reviewReopenedAt: run.reviewReopenedAt?.toISOString(),
      activeCandidateGenerationNumber: planningArtifacts?.activeCandidateGenerationNumber,
      submittedFeedbackSummary,
    },
  };
}
