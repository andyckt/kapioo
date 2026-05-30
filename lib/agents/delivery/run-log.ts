import { randomUUID } from "crypto";

import mongoose from "mongoose";

import connectToDatabase from "@/lib/db";
import DeliveryAgentRun, { type IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

import {
  DEFAULT_DELIVERY_AGENT_RUN_VERSION,
  type AttachLearningArtifactsInput,
  type AttachLocationArtifactsInput,
  type AttachPlanningArtifactsInput,
  type AttachRouteOptimizerRunsOptions,
  type CreateDeliveryAgentRunLogInput,
  type DeliveryAgentRouteOptimizerRun,
  type DeliveryAgentRunFailureInput,
  type DeliveryAgentRunReadyForReviewSummary,
  type DeliveryAgentRunReviewPatch,
  type RecordDonaldReviewInput,
  type SaveFinalRouteOptimizerFailureInput,
  type SaveFinalRouteOptimizerResultInput,
} from "@/lib/agents/delivery/run-log-types";

const DUPLICATE_KEY_PREFIX = "daily-delivery-agent";

export class DeliveryAgentRunNotFoundError extends Error {
  constructor(id: string) {
    super(`DeliveryAgentRun not found: ${id}`);
    this.name = "DeliveryAgentRunNotFoundError";
  }
}

export function buildDeliveryAgentDuplicateKey(input: {
  deliveryDate: string;
  profileId: string;
}): string {
  const deliveryDate = input.deliveryDate.trim();
  const profileId = input.profileId.trim();
  return `${DUPLICATE_KEY_PREFIX}:${deliveryDate}:${profileId}`;
}

export async function createDeliveryAgentRunLog(
  input: CreateDeliveryAgentRunLogInput
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();

  const deliveryDate = input.deliveryDate.trim();
  const profileId = input.profileId.trim();
  const duplicatePreventionKey = buildDeliveryAgentDuplicateKey({
    deliveryDate,
    profileId,
  });

  return DeliveryAgentRun.create({
    deliveryDate,
    profileId,
    planningSessionId: input.planningSessionId?.trim() || randomUUID(),
    duplicatePreventionKey,
    triggeredBy: input.triggeredBy?.trim(),
    triggerSource: input.triggerSource,
    status: input.status ?? "draft",
    startedAt: input.startedAt,
    orderCount: input.orderCount,
    validStopCount: input.validStopCount,
    invalidStopCount: input.invalidStopCount,
    warningCount: input.warningCount,
    orderIds: input.orderIds,
    invalidOrders: input.invalidOrders ?? [],
    warnings: input.warnings ?? [],
    notes: input.notes?.trim(),
    version: input.version ?? DEFAULT_DELIVERY_AGENT_RUN_VERSION,
    profileVersion: input.profileVersion?.trim(),
  });
}

export async function findDeliveryAgentRunByDuplicateKey(
  key: string
): Promise<IDeliveryAgentRun | null> {
  await connectToDatabase();
  return DeliveryAgentRun.findOne({ duplicatePreventionKey: key.trim() });
}

export async function findDeliveryAgentRunById(
  id: string | mongoose.Types.ObjectId
): Promise<IDeliveryAgentRun | null> {
  await connectToDatabase();
  return DeliveryAgentRun.findById(id);
}

function resolveRunId(id: string | mongoose.Types.ObjectId): string {
  return typeof id === "string" ? id : id.toString();
}

async function updateRunById(
  id: string | mongoose.Types.ObjectId,
  update: Record<string, unknown>
): Promise<IDeliveryAgentRun> {
  const updated = await DeliveryAgentRun.findByIdAndUpdate(id, update, { new: true });

  if (!updated) {
    throw new DeliveryAgentRunNotFoundError(resolveRunId(id));
  }

  return updated;
}

export async function markDeliveryAgentRunFailed(
  id: string | mongoose.Types.ObjectId,
  error: DeliveryAgentRunFailureInput
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();

  const now = new Date();
  return updateRunById(id, {
    $set: {
      status: "failed",
      completedAt: now,
    },
    $push: {
      errors: {
        code: error.code,
        message: error.message,
        details: error.details,
        createdAt: now,
      },
    },
  });
}

export async function markDeliveryAgentRunReadyForReview(
  id: string | mongoose.Types.ObjectId,
  summary: DeliveryAgentRunReadyForReviewSummary
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();

  return updateRunById(id, {
    $set: {
      status: "ready_for_review",
      ...(summary.selectedPlanSummary !== undefined
        ? { selectedPlanSummary: summary.selectedPlanSummary }
        : {}),
      ...(summary.profileSnapshot !== undefined
        ? { profileSnapshot: summary.profileSnapshot }
        : {}),
      ...(summary.candidateCount !== undefined ? { candidateCount: summary.candidateCount } : {}),
      ...(summary.previewCount !== undefined ? { previewCount: summary.previewCount } : {}),
    },
  });
}

export async function attachRouteOptimizerRuns(
  id: string | mongoose.Types.ObjectId,
  routeRuns: DeliveryAgentRouteOptimizerRun[],
  options?: AttachRouteOptimizerRunsOptions
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();

  const update: Record<string, unknown> = {
    $push: {
      routeOptimizerRuns: {
        $each: routeRuns,
      },
    },
  };

  if (options?.routeOptimizerPlanningSessionId) {
    update.$set = {
      routeOptimizerPlanningSessionId: options.routeOptimizerPlanningSessionId.trim(),
    };
  }

  return updateRunById(id, update);
}

export async function saveFinalRouteOptimizerResult(
  id: string | mongoose.Types.ObjectId,
  input: SaveFinalRouteOptimizerResultInput
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();

  return updateRunById(id, {
    $set: {
      status: "created",
      routeOptimizerPlanningSessionId: input.routeOptimizerPlanningSessionId.trim(),
      routeOptimizerRuns: input.routeOptimizerRuns,
      finalRouteOptimizerMetadata: input.finalRouteOptimizerMetadata,
    },
  });
}

export async function saveFinalRouteOptimizerFailure(
  id: string | mongoose.Types.ObjectId,
  input: SaveFinalRouteOptimizerFailureInput
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();

  return updateRunById(id, {
    $set: {
      finalRouteOptimizerMetadata: input.finalRouteOptimizerMetadata,
    },
  });
}

export async function recordDonaldReview(
  id: string | mongoose.Types.ObjectId,
  review: RecordDonaldReviewInput
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();

  return updateRunById(id, {
    $set: {
      reviewStatus: review.reviewStatus,
      reviewedBy: review.reviewedBy.trim(),
      reviewedAt: review.reviewedAt ?? new Date(),
      ...(review.donaldFeedbackText !== undefined
        ? { donaldFeedbackText: review.donaldFeedbackText.trim() }
        : {}),
      ...(review.donaldFeedbackTags !== undefined
        ? { donaldFeedbackTags: review.donaldFeedbackTags }
        : {}),
    },
  });
}

export async function attachPlanningArtifacts(
  id: string | mongoose.Types.ObjectId,
  artifacts: AttachPlanningArtifactsInput
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();
  return updateRunById(id, { $set: { planningArtifacts: artifacts } });
}

export async function attachLocationArtifacts(
  id: string | mongoose.Types.ObjectId,
  artifacts: AttachLocationArtifactsInput
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();
  return updateRunById(id, { $set: { locationArtifacts: artifacts } });
}

export async function attachLearningArtifacts(
  id: string | mongoose.Types.ObjectId,
  artifacts: AttachLearningArtifactsInput
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();
  return updateRunById(id, { $set: { learningArtifacts: artifacts } });
}

export async function updateDeliveryAgentRunForReview(
  id: string | mongoose.Types.ObjectId,
  patch: DeliveryAgentRunReviewPatch
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();

  const update: Record<string, unknown> = {};
  if (patch.profileVersion !== undefined) {
    update.profileVersion = patch.profileVersion.trim();
  }
  if (patch.planningSessionId !== undefined) {
    update.planningSessionId = patch.planningSessionId.trim();
  }
  if (patch.selectedPlanSummary !== undefined) {
    update.selectedPlanSummary = patch.selectedPlanSummary;
  }
  if (patch.candidateCount !== undefined) {
    update.candidateCount = patch.candidateCount;
  }
  if (patch.previewCount !== undefined) {
    update.previewCount = patch.previewCount;
  }

  if (Object.keys(update).length === 0) {
    const existing = await DeliveryAgentRun.findById(id);
    if (!existing) {
      throw new DeliveryAgentRunNotFoundError(resolveRunId(id));
    }
    return existing;
  }

  return updateRunById(id, { $set: update });
}
