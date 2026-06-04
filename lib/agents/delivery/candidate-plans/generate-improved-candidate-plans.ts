import { previewCandidatePlansPipeline } from "@/lib/agents/delivery/candidate-plans/preview-candidate-plans";
import { randomUUID } from "crypto";
import { generateCandidatePlansForAgent } from "@/lib/agents/delivery/candidate-plans/generate-candidate-plans";
import { saveCandidateGeneration } from "@/lib/agents/delivery/candidate-plans/save-candidate-generation";
import {
  applyOrderRunOverridesToPlans,
  computeApplicationStatus,
  detectMeetupPinnedInPreview,
} from "@/lib/agents/delivery/feedback/apply-planning-hints";
import { interpretDonaldFeedback } from "@/lib/agents/delivery/feedback/interpret-donald-feedback";
import { buildPlanningHints } from "@/lib/agents/delivery/feedback/planning-hints";
import { getDeliveryOrdersForRouting } from "@/lib/agents/delivery/get-delivery-orders-for-routing";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import {
  buildDeliveryAgentDuplicateKey,
  findDeliveryAgentRunByDuplicateKey,
  findDeliveryAgentRunById,
} from "@/lib/agents/delivery/run-log";
import type { DeliveryAgentFeedbackInterpretation } from "@/lib/agents/delivery/run-log-types";
import { DeliveryAgentReviewLockedError } from "@/lib/agents/delivery/review-plan/submit-donald-plan-review";
import { isImprovementRequestedStatus } from "@/lib/agents/delivery/review-plan/review-status-helpers";
import type { DeliveryAgentPreviewCandidatePlansResponse } from "@/lib/contracts/delivery-agent";

export class DeliveryAgentRegenerationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryAgentRegenerationValidationError";
  }
}

export class DeliveryAgentRegenerationBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryAgentRegenerationBlockedError";
  }
}

export type GenerateImprovedCandidatePlansResult = {
  preview: DeliveryAgentPreviewCandidatePlansResponse;
  generationNumber: number;
  applicationStatus: "applied" | "partial" | "not_applied";
  applicationNotes: string[];
  feedbackInterpretation: DeliveryAgentFeedbackInterpretation;
  warnings: string[];
};

function resolveLatestFeedback(input: {
  improvementRequestHistory?: Array<{
    reviewedAt: string;
    feedbackText?: string;
    feedbackTags?: string[];
  }>;
  donaldFeedbackText?: string;
  donaldFeedbackTags?: string[];
  reviewedAt?: Date;
}): {
  feedbackText?: string;
  feedbackTags?: string[];
  sourceFeedbackReviewedAt: string;
} {
  const history = input.improvementRequestHistory ?? [];
  const latestHistory = history[history.length - 1];

  if (latestHistory) {
    return {
      feedbackText: latestHistory.feedbackText ?? input.donaldFeedbackText,
      feedbackTags: latestHistory.feedbackTags ?? input.donaldFeedbackTags,
      sourceFeedbackReviewedAt: latestHistory.reviewedAt,
    };
  }

  if (input.donaldFeedbackText?.trim() || (input.donaldFeedbackTags?.length ?? 0) > 0) {
    return {
      feedbackText: input.donaldFeedbackText,
      feedbackTags: input.donaldFeedbackTags,
      sourceFeedbackReviewedAt: input.reviewedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  throw new DeliveryAgentRegenerationValidationError(
    "No improvement feedback is available for this delivery agent run."
  );
}

export async function generateImprovedCandidatePlansForAgent(input: {
  deliveryDate: string;
  profileId: string;
  deliveryAgentRunId?: string;
  generatedBy: string;
}): Promise<GenerateImprovedCandidatePlansResult> {
  const duplicatePreventionKey = buildDeliveryAgentDuplicateKey({
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
  });

  const run = input.deliveryAgentRunId
    ? await findDeliveryAgentRunById(input.deliveryAgentRunId)
    : await findDeliveryAgentRunByDuplicateKey(duplicatePreventionKey);

  if (!run) {
    throw new DeliveryAgentRegenerationValidationError(
      "Delivery agent run log was not found for this delivery date."
    );
  }

  if (run.reviewStatus === "approved") {
    throw new DeliveryAgentReviewLockedError(
      "Plan is approved. Reopen review before generating improved candidate plans."
    );
  }

  if (!isImprovementRequestedStatus(run.reviewStatus)) {
    throw new DeliveryAgentRegenerationBlockedError(
      "Generate improved candidate plans is only available after improvement feedback has been submitted."
    );
  }

  const feedback = resolveLatestFeedback({
    improvementRequestHistory: run.learningArtifacts?.improvementRequestHistory,
    donaldFeedbackText: run.donaldFeedbackText,
    donaldFeedbackTags: run.donaldFeedbackTags,
    reviewedAt: run.reviewedAt,
  });

  const profile = getDeliveryPlanningProfile(input.profileId);
  const routing = await getDeliveryOrdersForRouting({
    deliveryDate: input.deliveryDate,
    statuses: ["confirmed"],
  });

  const interpretation = interpretDonaldFeedback({
    feedbackText: feedback.feedbackText,
    feedbackTags: feedback.feedbackTags,
    routingStops: routing.stops,
    profile,
    sourceFeedbackReviewedAt: feedback.sourceFeedbackReviewedAt,
  });

  const planningHints = buildPlanningHints(interpretation);
  const generation = await generateCandidatePlansForAgent(input.deliveryDate, input.profileId);
  const overrideResult = applyOrderRunOverridesToPlans(
    generation.candidates,
    planningHints,
    profile
  );

  const preview = await previewCandidatePlansPipeline({
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
    profileVersion: generation.profileVersion,
    baseCandidates: overrideResult.plans,
    planningHints,
    deliveryAgentRunId: run.id,
    previewBudget: {
      action: "improved_candidate_preview",
      correlationId: `delivery-agent:improved_candidate_preview:${input.deliveryDate}:${randomUUID()}`,
    },
  });

  const meetupPinned = detectMeetupPinnedInPreview(
    preview,
    interpretation.preferredMeetupOrderId
  );
  const application = computeApplicationStatus({
    interpretation,
    preview,
    appliedOrderIds: overrideResult.appliedOrderIds,
    meetupPinned,
  });

  const existingGenerations = run.planningArtifacts?.candidateGenerations ?? [];
  const generationNumber =
    existingGenerations.length > 0
      ? Math.max(...existingGenerations.map((entry) => entry.generationNumber)) + 1
      : run.planningArtifacts?.candidatePreviewSnapshot
        ? 2
        : 1;

  const previousRecommendedCandidateId =
    run.planningArtifacts?.systemRecommendedCandidateId ??
    run.learningArtifacts?.systemRecommendedCandidateId;

  await saveCandidateGeneration({
    deliveryAgentRunId: run.id,
    generatedBy: input.generatedBy,
    preview,
    record: {
      generationNumber,
      generatedAt: new Date().toISOString(),
      generatedBy: input.generatedBy,
      sourceFeedbackReviewedAt: interpretation.sourceFeedbackReviewedAt,
      feedbackInterpretation: interpretation,
      applicationStatus: application.applicationStatus,
      applicationNotes: application.applicationNotes,
      candidatePreviewSnapshot: preview as unknown as Record<string, unknown>,
      recommendedCandidateId: preview.recommendedCandidateId ?? "",
      recommendedPlanSummary: preview.recommendedPlanSummary
        ? (preview.recommendedPlanSummary as unknown as Record<string, unknown>)
        : undefined,
      previousRecommendedCandidateId,
    },
  });

  const warnings = [
    ...interpretation.warnings,
    ...overrideResult.warnings,
    ...preview.selectionWarnings,
  ];

  return {
    preview,
    generationNumber,
    applicationStatus: application.applicationStatus,
    applicationNotes: application.applicationNotes,
    feedbackInterpretation: interpretation,
    warnings,
  };
}
