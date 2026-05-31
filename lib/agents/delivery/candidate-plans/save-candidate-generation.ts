import {
  attachLearningArtifacts,
  attachPlanningArtifacts,
  findDeliveryAgentRunById,
  recordDonaldReview,
  updateDeliveryAgentRunForReview,
} from "@/lib/agents/delivery/run-log";
import {
  LEARNING_ARTIFACTS_VERSION,
  PLANNING_ARTIFACTS_VERSION,
  type DeliveryAgentCandidateGenerationRecord,
  type DeliveryAgentLearningArtifacts,
  type DeliveryAgentPlanningArtifacts,
  type DeliveryAgentRegenerationHistoryEntry,
} from "@/lib/agents/delivery/run-log-types";
import type { DeliveryAgentPreviewCandidatePlansResponse } from "@/lib/contracts/delivery-agent";

export class DeliveryAgentRunNotFoundForRegenerationError extends Error {
  constructor(runId: string) {
    super(`Delivery agent run ${runId} was not found.`);
    this.name = "DeliveryAgentRunNotFoundForRegenerationError";
  }
}

function backfillGenerationOne(input: {
  planningArtifacts: DeliveryAgentPlanningArtifacts | undefined;
  previousRecommendedCandidateId?: string;
  nowIso: string;
}): DeliveryAgentCandidateGenerationRecord[] {
  const snapshot = input.planningArtifacts?.candidatePreviewSnapshot;
  if (!snapshot) {
    return [];
  }

  return [
    {
      generationNumber: 1,
      generatedAt: input.nowIso,
      generatedBy: "system-backfill",
      applicationStatus: "applied",
      applicationNotes: ["Backfilled from the original candidate preview snapshot."],
      candidatePreviewSnapshot: snapshot,
      recommendedCandidateId:
        input.previousRecommendedCandidateId ??
        input.planningArtifacts?.systemRecommendedCandidateId ??
        "",
      recommendedPlanSummary: input.planningArtifacts?.systemRecommendation,
      supersededAt: input.nowIso,
    },
  ];
}

export async function saveCandidateGeneration(input: {
  deliveryAgentRunId: string;
  generatedBy: string;
  record: DeliveryAgentCandidateGenerationRecord;
  preview: DeliveryAgentPreviewCandidatePlansResponse;
}): Promise<void> {
  const run = await findDeliveryAgentRunById(input.deliveryAgentRunId);
  if (!run) {
    throw new DeliveryAgentRunNotFoundForRegenerationError(input.deliveryAgentRunId);
  }

  const nowIso = new Date().toISOString();
  const existingPlanning = run.planningArtifacts;
  const existingLearning = run.learningArtifacts;
  const existingGenerations = existingPlanning?.candidateGenerations ?? [];

  const generations =
    existingGenerations.length > 0
      ? [...existingGenerations]
      : backfillGenerationOne({
          planningArtifacts: existingPlanning,
          previousRecommendedCandidateId:
            existingPlanning?.systemRecommendedCandidateId ??
            existingLearning?.systemRecommendedCandidateId,
          nowIso,
        });

  for (const generation of generations) {
    if (generation.generationNumber === input.record.generationNumber - 1 && !generation.supersededAt) {
      generation.supersededAt = nowIso;
    }
  }

  generations.push(input.record);

  const planningArtifacts: DeliveryAgentPlanningArtifacts = {
    artifactVersion: PLANNING_ARTIFACTS_VERSION,
    ...existingPlanning,
    candidateGenerations: generations,
    activeCandidateGenerationNumber: input.record.generationNumber,
    candidatePreviewSnapshot: input.preview as unknown as Record<string, unknown>,
    systemRecommendedCandidateId: input.preview.recommendedCandidateId ?? undefined,
    systemRecommendation: input.preview.recommendedPlanSummary,
    selectedPlanSummary: input.preview.recommendedPlanSummary,
  };

  const regenerationEntry: DeliveryAgentRegenerationHistoryEntry = {
    regeneratedAt: nowIso,
    regeneratedBy: input.generatedBy,
    sourceFeedbackReviewedAt: input.record.sourceFeedbackReviewedAt ?? nowIso,
    generationNumber: input.record.generationNumber,
    applicationStatus: input.record.applicationStatus,
    applicationNotes: input.record.applicationNotes,
  };

  const learningArtifacts: DeliveryAgentLearningArtifacts = {
    artifactVersion: LEARNING_ARTIFACTS_VERSION,
    ...existingLearning,
    donaldFeedbackText: undefined,
    donaldFeedbackTags: undefined,
    systemRecommendedCandidateId: input.preview.recommendedCandidateId ?? undefined,
    regenerationHistory: [...(existingLearning?.regenerationHistory ?? []), regenerationEntry],
    improvementRequestHistory: existingLearning?.improvementRequestHistory ?? [],
    approvalHistory: existingLearning?.approvalHistory ?? [],
    reopenReviewHistory: existingLearning?.reopenReviewHistory ?? [],
    finalRouteCreationHistory: existingLearning?.finalRouteCreationHistory ?? [],
    finalRouteResetHistory: existingLearning?.finalRouteResetHistory ?? [],
  };

  await attachPlanningArtifacts(run.id, planningArtifacts);
  await attachLearningArtifacts(run.id, learningArtifacts);
  await recordDonaldReview(run.id, {
    reviewStatus: "pending",
    reviewedBy: input.generatedBy,
    donaldFeedbackText: "",
    donaldFeedbackTags: [],
  });
  await updateDeliveryAgentRunForReview(run.id, {
    previewCount: input.preview.candidates.length,
    candidateCount: input.preview.candidates.length,
  });
}
