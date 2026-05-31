import type { IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

import {
  buildDeliveryAgentDuplicateKey,
  findDeliveryAgentRunByDuplicateKey,
  findDeliveryAgentRunById,
} from "@/lib/agents/delivery/run-log";
import type {
  DeliveryAgentReviewHistoryEntry,
  ReopenDonaldPlanReviewInput,
} from "@/lib/agents/delivery/run-log-types";
import { resolveDeliveryAgentOperationalState } from "@/lib/agents/delivery/review-plan/resolve-operational-review-state";

export class DeliveryAgentReopenReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryAgentReopenReviewError";
  }
}

export type ReopenDonaldPlanReviewResult = {
  deliveryAgentRunId: string;
  reviewStatus: "pending";
  reopenedAt: string;
  message: string;
};

async function loadRun(input: ReopenDonaldPlanReviewInput): Promise<IDeliveryAgentRun> {
  if (input.deliveryAgentRunId?.trim()) {
    const run = await findDeliveryAgentRunById(input.deliveryAgentRunId.trim());
    if (!run) {
      throw new DeliveryAgentReopenReviewError("Delivery agent run not found.");
    }
    return run;
  }

  const run = await findDeliveryAgentRunByDuplicateKey(
    buildDeliveryAgentDuplicateKey({
      deliveryDate: input.deliveryDate,
      profileId: input.profileId,
    })
  );

  if (!run) {
    throw new DeliveryAgentReopenReviewError("Delivery agent run not found.");
  }

  return run;
}

export async function reopenDonaldPlanReview(
  input: ReopenDonaldPlanReviewInput
): Promise<ReopenDonaldPlanReviewResult> {
  if (!input.confirmed) {
    throw new DeliveryAgentReopenReviewError("Reopen review requires confirmation.");
  }

  const run = await loadRun(input);
  if (run.reviewStatus !== "approved") {
    throw new DeliveryAgentReopenReviewError(
      "Only an approved plan can be reopened for review."
    );
  }

  const reopenedAt = new Date();
  const hadFinalRouteRuns = (run.routeOptimizerRuns?.length ?? 0) > 0;
  const learning = run.learningArtifacts ?? { artifactVersion: "learning-artifacts-v1" as const };
  const approvalHistory = [...(learning.approvalHistory ?? [])];

  if (run.planningArtifacts?.finalAcceptedPlan) {
    const supersededEntry: DeliveryAgentReviewHistoryEntry = {
      reviewedAt: run.reviewedAt?.toISOString() ?? reopenedAt.toISOString(),
      reviewedBy: run.reviewedBy ?? input.reopenedBy,
      reviewStatus: "approved",
      feedbackText: run.donaldFeedbackText,
      feedbackTags: run.donaldFeedbackTags,
      recommendedCandidateId: run.planningArtifacts.systemRecommendedCandidateId,
      selectedCandidateId: run.planningArtifacts.donaldSelectedCandidateId,
      didDonaldOverrideRecommendation: run.planningArtifacts.didDonaldOverrideRecommendation,
      planningSessionId: run.planningSessionId,
      supersededAt: reopenedAt.toISOString(),
      finalAcceptedPlanSnapshot: run.planningArtifacts.finalAcceptedPlan,
    };
    approvalHistory.push(supersededEntry);
  }

  const reopenReviewHistory = [...(learning.reopenReviewHistory ?? [])];
  reopenReviewHistory.push({
    reopenedAt: reopenedAt.toISOString(),
    reopenedBy: input.reopenedBy,
    previousReviewStatus: run.reviewStatus,
    hadFinalRouteRuns,
    finalRouteOptimizerStatus: run.finalRouteOptimizerMetadata?.finalRouteOptimizerStatus,
  });

  const planningArtifacts = {
    ...(run.planningArtifacts ?? {}),
    finalAcceptedPlan: undefined,
  };

  await run.updateOne({
    $set: {
      reviewStatus: "pending",
      reviewReopenedAt: reopenedAt,
      donaldFeedbackText: undefined,
      donaldFeedbackTags: [],
      planningArtifacts,
      learningArtifacts: {
        ...learning,
        approvalHistory,
        reopenReviewHistory,
      },
    },
  });

  const updated = await findDeliveryAgentRunById(run.id);
  if (!updated) {
    throw new DeliveryAgentReopenReviewError("Failed to reload delivery agent run after reopen.");
  }

  resolveDeliveryAgentOperationalState({
    reviewStatus: updated.reviewStatus,
    reviewReopenedAt: updated.reviewReopenedAt,
    finalRouteOptimizerMetadata: updated.finalRouteOptimizerMetadata,
    finalRouteRunsMarkedMissingAt: updated.finalRouteRunsMarkedMissingAt,
    routeOptimizerRunCount: updated.routeOptimizerRuns?.length ?? 0,
  });

  return {
    deliveryAgentRunId: updated.id,
    reviewStatus: "pending",
    reopenedAt: reopenedAt.toISOString(),
    message: hadFinalRouteRuns
      ? "Review reopened. Final Route Optimizer runs were not deleted. Approve a plan again before creating new final runs."
      : "Review reopened. Approve a plan again before creating final Route Optimizer runs.",
  };
}
