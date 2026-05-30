import {
  buildDeliveryAgentDuplicateKey,
  findDeliveryAgentRunByDuplicateKey,
} from "@/lib/agents/delivery/run-log";
import type { DeliveryAgentReviewStatus } from "@/lib/agents/delivery/run-log-types";
import type { DeliveryAgentFinalRouteOptimizerMetadata } from "@/lib/agents/delivery/run-log-types";

export type DonaldPlanReviewRecord = {
  deliveryAgentRunId: string;
  deliveryDate: string;
  profileId: string;
  profileVersion?: string;
  planningSessionId?: string;
  reviewStatus?: DeliveryAgentReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  donaldFeedbackText?: string;
  donaldFeedbackTags?: string[];
  recommendedCandidateId?: string;
  selectedCandidateId?: string;
  didDonaldOverrideRecommendation?: boolean;
  selectedPlanSummary?: Record<string, unknown>;
  finalRouteOptimizerMetadata?: DeliveryAgentFinalRouteOptimizerMetadata;
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

  return {
    review: {
      deliveryAgentRunId: run.id,
      deliveryDate: run.deliveryDate,
      profileId: run.profileId,
      profileVersion: run.profileVersion,
      planningSessionId: run.planningSessionId,
      reviewStatus: run.reviewStatus,
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
    },
  };
}
