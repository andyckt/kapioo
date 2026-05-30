import { randomUUID } from "crypto";

import type { IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

import { isValidReviewFeedbackTag } from "@/lib/agents/delivery/review-feedback-tags";
import { buildReviewArtifacts } from "@/lib/agents/delivery/review-plan/build-review-artifacts";
import {
  attachLearningArtifacts,
  attachLocationArtifacts,
  attachPlanningArtifacts,
  buildDeliveryAgentDuplicateKey,
  createDeliveryAgentRunLog,
  findDeliveryAgentRunByDuplicateKey,
  markDeliveryAgentRunReadyForReview,
  recordDonaldReview,
  updateDeliveryAgentRunForReview,
} from "@/lib/agents/delivery/run-log";
import type {
  CreateDeliveryAgentRunLogInput,
  DeliveryAgentReviewStatus,
} from "@/lib/agents/delivery/run-log-types";
import type {
  DeliveryAgentPreviewCandidatePlansResponse,
  DeliveryAgentRecommendedPlanSummary,
} from "@/lib/contracts/delivery-agent";

export class DeliveryAgentReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryAgentReviewValidationError";
  }
}

export type DeliveryAgentOrderSnapshotInput = {
  orderCount: number;
  validStopCount: number;
  invalidStopCount: number;
  warningCount: number;
  orderIds: string[];
  invalidOrders?: Array<{
    orderId: string;
    mongoId?: string;
    area?: string;
    errors: Array<{ code: string; message: string; field?: string }>;
  }>;
  warnings?: Array<{
    orderId: string;
    warnings: Array<{ code: string; message: string; field?: string }>;
  }>;
};

export type SubmitDonaldPlanReviewInput = {
  deliveryDate: string;
  profileId: string;
  profileVersion: string;
  planningSessionId?: string;
  reviewStatus: Exclude<DeliveryAgentReviewStatus, "pending">;
  feedbackText?: string;
  feedbackTags?: string[];
  recommendedCandidateId: string;
  selectedCandidateId: string;
  didDonaldOverrideRecommendation?: boolean;
  recommendedPlanSummary?: DeliveryAgentRecommendedPlanSummary | null;
  selectedPlanSummary?: Record<string, unknown> | null;
  candidatePreviewSnapshot?: DeliveryAgentPreviewCandidatePlansResponse | null;
  orderSnapshot?: DeliveryAgentOrderSnapshotInput;
  reviewedBy: string;
};

export type SubmitDonaldPlanReviewResult = {
  deliveryAgentRunId: string;
  reviewStatus: Exclude<DeliveryAgentReviewStatus, "pending">;
  reviewedAt: string;
  recommendedCandidateId: string;
  selectedCandidateId: string;
  didDonaldOverrideRecommendation: boolean;
  message: string;
};

function hasFeedback(input: SubmitDonaldPlanReviewInput): boolean {
  return Boolean(input.feedbackText?.trim()) || (input.feedbackTags?.length ?? 0) > 0;
}

function validateReviewInput(input: SubmitDonaldPlanReviewInput): void {
  if (!["approved", "edited", "rejected"].includes(input.reviewStatus)) {
    throw new DeliveryAgentReviewValidationError("Invalid reviewStatus.");
  }

  if ((input.reviewStatus === "rejected" || input.reviewStatus === "edited") && !hasFeedback(input)) {
    throw new DeliveryAgentReviewValidationError(
      "Feedback text or at least one feedback tag is required for reject or needs revision."
    );
  }

  for (const tag of input.feedbackTags ?? []) {
    if (!isValidReviewFeedbackTag(tag)) {
      throw new DeliveryAgentReviewValidationError(`Invalid feedback tag: ${tag}`);
    }
  }

  if (!input.recommendedCandidateId.trim()) {
    throw new DeliveryAgentReviewValidationError("recommendedCandidateId is required.");
  }

  if (!input.selectedCandidateId.trim()) {
    throw new DeliveryAgentReviewValidationError("selectedCandidateId is required.");
  }
}

function resolveReviewMessage(input: {
  reviewStatus: SubmitDonaldPlanReviewInput["reviewStatus"];
  didDonaldOverrideRecommendation: boolean;
}): string {
  if (input.reviewStatus === "approved" && input.didDonaldOverrideRecommendation) {
    return "Approved your selected candidate (overrode system recommendation). Final run creation will be added in the next milestone.";
  }

  if (input.reviewStatus === "approved") {
    return "Approved — final Route Optimizer run creation will be added in the next milestone.";
  }

  if (input.reviewStatus === "rejected") {
    return "Rejected feedback saved.";
  }

  return "Needs revision feedback saved.";
}

async function ensureRunLog(input: SubmitDonaldPlanReviewInput): Promise<IDeliveryAgentRun> {
  const duplicatePreventionKey = buildDeliveryAgentDuplicateKey({
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
  });

  const existing = await findDeliveryAgentRunByDuplicateKey(duplicatePreventionKey);
  if (existing) {
    return existing;
  }

  if (!input.orderSnapshot) {
    throw new DeliveryAgentReviewValidationError(
      "orderSnapshot is required when creating the first review log for this delivery date."
    );
  }

  return createDeliveryAgentRunLog({
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
    profileVersion: input.profileVersion,
    planningSessionId: input.planningSessionId?.trim() || randomUUID(),
    triggerSource: "manual",
    triggeredBy: input.reviewedBy,
    status: "draft",
    orderCount: input.orderSnapshot.orderCount,
    validStopCount: input.orderSnapshot.validStopCount,
    invalidStopCount: input.orderSnapshot.invalidStopCount,
    warningCount: input.orderSnapshot.warningCount,
    orderIds: input.orderSnapshot.orderIds,
    invalidOrders: input.orderSnapshot.invalidOrders as CreateDeliveryAgentRunLogInput["invalidOrders"],
    warnings: input.orderSnapshot.warnings as CreateDeliveryAgentRunLogInput["warnings"],
  });
}

export async function submitDonaldPlanReview(
  input: SubmitDonaldPlanReviewInput
): Promise<SubmitDonaldPlanReviewResult> {
  validateReviewInput(input);

  const didDonaldOverrideRecommendation =
    input.didDonaldOverrideRecommendation ??
    input.selectedCandidateId.trim() !== input.recommendedCandidateId.trim();

  const reviewedAt = new Date();
  const run = await ensureRunLog(input);

  await updateDeliveryAgentRunForReview(run.id, {
    profileVersion: input.profileVersion,
    ...(input.planningSessionId ? { planningSessionId: input.planningSessionId } : {}),
    selectedPlanSummary: input.selectedPlanSummary ?? input.recommendedPlanSummary ?? undefined,
    candidateCount: input.candidatePreviewSnapshot?.candidates.length,
    previewCount: input.candidatePreviewSnapshot?.candidates.length,
  });

  const artifacts = buildReviewArtifacts({
    reviewStatus: input.reviewStatus,
    recommendedCandidateId: input.recommendedCandidateId,
    selectedCandidateId: input.selectedCandidateId,
    didDonaldOverrideRecommendation,
    recommendedPlanSummary: input.recommendedPlanSummary,
    selectedPlanSummary: input.selectedPlanSummary,
    candidatePreviewSnapshot: input.candidatePreviewSnapshot,
    feedbackText: input.feedbackText,
    feedbackTags: input.feedbackTags,
    reviewedBy: input.reviewedBy,
    reviewedAt,
    planningSessionId: input.planningSessionId,
    existingLearningArtifacts: run.learningArtifacts ?? null,
  });

  await attachPlanningArtifacts(run.id, artifacts.planningArtifacts);
  await attachLocationArtifacts(run.id, artifacts.locationArtifacts);
  await attachLearningArtifacts(run.id, artifacts.learningArtifacts);

  const reviewed = await recordDonaldReview(run.id, {
    reviewStatus: input.reviewStatus,
    reviewedBy: input.reviewedBy,
    reviewedAt,
    donaldFeedbackText: input.feedbackText,
    donaldFeedbackTags: input.feedbackTags,
  });

  await markDeliveryAgentRunReadyForReview(run.id, {
    selectedPlanSummary: artifacts.planningArtifacts.selectedPlanSummary,
    candidateCount: input.candidatePreviewSnapshot?.candidates.length,
    previewCount: input.candidatePreviewSnapshot?.candidates.length,
  });

  return {
    deliveryAgentRunId: reviewed.id,
    reviewStatus: input.reviewStatus,
    reviewedAt: (reviewed.reviewedAt ?? reviewedAt).toISOString(),
    recommendedCandidateId: input.recommendedCandidateId,
    selectedCandidateId: input.selectedCandidateId,
    didDonaldOverrideRecommendation,
    message: resolveReviewMessage({ reviewStatus: input.reviewStatus, didDonaldOverrideRecommendation }),
  };
}
