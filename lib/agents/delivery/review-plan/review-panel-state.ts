import type { DeliveryAgentOperationalReviewState } from "@/lib/agents/delivery/run-log-types";

export type ReviewPanelActionVisibility = {
  showApproveButton: boolean;
  showRequestImprovementButton: boolean;
  showGenerateImprovedButton: boolean;
  showFeedbackFormAllowed: boolean;
  showSubmittedFeedbackSummary: boolean;
};

export function resolveActiveRecommendationCandidateId(
  recommendedCandidateId: string | null | undefined
): string | null {
  const trimmed = recommendedCandidateId?.trim();
  return trimmed ? trimmed : null;
}

export function resolveReviewPanelActionVisibility(input: {
  operationalState: DeliveryAgentOperationalReviewState;
  feedbackFormOpen: boolean;
}): ReviewPanelActionVisibility {
  const { operationalState, feedbackFormOpen } = input;

  return {
    showApproveButton: operationalState === "pending_review",
    showRequestImprovementButton: operationalState === "pending_review",
    showGenerateImprovedButton: operationalState === "improvement_requested",
    showFeedbackFormAllowed: feedbackFormOpen && operationalState === "pending_review",
    showSubmittedFeedbackSummary: operationalState === "improvement_requested",
  };
}

export function buildApproveReviewCandidateIds(activeRecommendationCandidateId: string): {
  recommendedCandidateId: string;
  selectedCandidateId: string;
  didDonaldOverrideRecommendation: false;
} {
  return {
    recommendedCandidateId: activeRecommendationCandidateId,
    selectedCandidateId: activeRecommendationCandidateId,
    didDonaldOverrideRecommendation: false,
  };
}

export function isImprovedGeneration(generationNumber: number | undefined): boolean {
  return (generationNumber ?? 1) > 1;
}
