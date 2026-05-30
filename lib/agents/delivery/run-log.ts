import { randomUUID } from "crypto";

import mongoose from "mongoose";

import connectToDatabase from "@/lib/db";
import DeliveryAgentRun, { type IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

import {
  DEFAULT_DELIVERY_AGENT_RUN_VERSION,
  type AttachRouteOptimizerRunsOptions,
  type CreateDeliveryAgentRunLogInput,
  type DeliveryAgentRouteOptimizerRun,
  type DeliveryAgentRunFailureInput,
  type DeliveryAgentRunReadyForReviewSummary,
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
  });
}

export async function findDeliveryAgentRunByDuplicateKey(
  key: string
): Promise<IDeliveryAgentRun | null> {
  await connectToDatabase();
  return DeliveryAgentRun.findOne({ duplicatePreventionKey: key.trim() });
}

function resolveRunId(id: string | mongoose.Types.ObjectId): string {
  return typeof id === "string" ? id : id.toString();
}

export async function markDeliveryAgentRunFailed(
  id: string | mongoose.Types.ObjectId,
  error: DeliveryAgentRunFailureInput
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();

  const now = new Date();
  const updated = await DeliveryAgentRun.findByIdAndUpdate(
    id,
    {
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
    },
    { new: true }
  );

  if (!updated) {
    throw new DeliveryAgentRunNotFoundError(resolveRunId(id));
  }

  return updated;
}

export async function markDeliveryAgentRunReadyForReview(
  id: string | mongoose.Types.ObjectId,
  summary: DeliveryAgentRunReadyForReviewSummary
): Promise<IDeliveryAgentRun> {
  await connectToDatabase();

  const updated = await DeliveryAgentRun.findByIdAndUpdate(
    id,
    {
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
    },
    { new: true }
  );

  if (!updated) {
    throw new DeliveryAgentRunNotFoundError(resolveRunId(id));
  }

  return updated;
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

  const updated = await DeliveryAgentRun.findByIdAndUpdate(id, update, { new: true });

  if (!updated) {
    throw new DeliveryAgentRunNotFoundError(resolveRunId(id));
  }

  return updated;
}
