import type { IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

import {
  buildDeliveryAgentDuplicateKey,
  findDeliveryAgentRunByDuplicateKey,
  findDeliveryAgentRunById,
} from "@/lib/agents/delivery/run-log";
import type {
  DeliveryAgentFinalRouteOptimizerMetadata,
  ResetFinalRouteRunsInput,
} from "@/lib/agents/delivery/run-log-types";

export class FinalRouteResetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinalRouteResetError";
  }
}

export type ResetFinalRouteRunsResult = {
  deliveryAgentRunId: string;
  finalRouteGeneration: number;
  message: string;
};

export type MarkFinalRouteRunsMissingResult = {
  deliveryAgentRunId: string;
  finalRouteRunsMarkedMissingAt: string;
  message: string;
};

async function loadRun(input: {
  deliveryDate: string;
  profileId: string;
  deliveryAgentRunId?: string;
}): Promise<IDeliveryAgentRun> {
  if (input.deliveryAgentRunId?.trim()) {
    const run = await findDeliveryAgentRunById(input.deliveryAgentRunId.trim());
    if (!run) {
      throw new FinalRouteResetError("Delivery agent run not found.");
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
    throw new FinalRouteResetError("Delivery agent run not found.");
  }

  return run;
}

function buildPendingMetadata(run: IDeliveryAgentRun): DeliveryAgentFinalRouteOptimizerMetadata {
  const existing = run.finalRouteOptimizerMetadata;
  return {
    finalRouteOptimizerStatus: "pending",
    systemRecommendedCandidateId:
      existing?.systemRecommendedCandidateId ??
      run.planningArtifacts?.systemRecommendedCandidateId ??
      run.planningArtifacts?.donaldSelectedCandidateId ??
      "",
    selectedCandidateId:
      existing?.selectedCandidateId ??
      run.planningArtifacts?.donaldSelectedCandidateId ??
      "",
    didDonaldOverrideRecommendation:
      existing?.didDonaldOverrideRecommendation ??
      run.planningArtifacts?.didDonaldOverrideRecommendation ??
      false,
    planningSessionId: existing?.planningSessionId ?? run.planningSessionId,
    planningSessionSource: existing?.planningSessionSource,
  };
}

export async function markFinalRouteRunsAsMissing(input: {
  deliveryDate: string;
  profileId: string;
  deliveryAgentRunId?: string;
  confirmed: boolean;
  markedBy: string;
}): Promise<MarkFinalRouteRunsMissingResult> {
  if (!input.confirmed) {
    throw new FinalRouteResetError("Marking final runs as missing requires confirmation.");
  }

  const run = await loadRun(input);
  if (run.reviewStatus !== "approved") {
    throw new FinalRouteResetError("Only an approved plan can mark final runs as missing.");
  }

  if (run.finalRouteOptimizerMetadata?.finalRouteOptimizerStatus !== "created") {
    throw new FinalRouteResetError(
      "Final Route Optimizer runs must be marked as created before they can be marked missing."
    );
  }

  const markedAt = new Date();
  await run.updateOne({
    $set: {
      finalRouteRunsMarkedMissingAt: markedAt.toISOString(),
    },
  });

  return {
    deliveryAgentRunId: run.id,
    finalRouteRunsMarkedMissingAt: markedAt.toISOString(),
    message:
      "These final Route Optimizer runs appear to be missing or deleted. Reset metadata to regenerate.",
  };
}

export async function resetFinalRouteRuns(
  input: ResetFinalRouteRunsInput
): Promise<ResetFinalRouteRunsResult> {
  if (!input.confirmed) {
    throw new FinalRouteResetError("Reset final Route Optimizer metadata requires confirmation.");
  }

  const run = await loadRun(input);
  if (run.reviewStatus !== "approved") {
    throw new FinalRouteResetError(
      "Final Route Optimizer metadata can only be reset for an approved plan."
    );
  }

  const currentStatus = run.finalRouteOptimizerMetadata?.finalRouteOptimizerStatus;
  if (!currentStatus || currentStatus === "pending") {
    throw new FinalRouteResetError("No final Route Optimizer metadata exists to reset.");
  }

  const resetAt = new Date();
  const previousGeneration = run.finalRouteGeneration ?? 1;
  const nextGeneration = previousGeneration + 1;
  const learning = run.learningArtifacts ?? { artifactVersion: "learning-artifacts-v1" as const };
  const finalRouteResetHistory = [...(learning.finalRouteResetHistory ?? [])];

  finalRouteResetHistory.push({
    resetAt: resetAt.toISOString(),
    resetBy: input.resetBy,
    reason: input.reason?.trim() || undefined,
    markMissing: input.markMissing ?? false,
    previousGeneration,
    nextGeneration,
    previousMetadata: run.finalRouteOptimizerMetadata,
    previousRouteOptimizerRuns: run.routeOptimizerRuns ?? [],
  });

  await run.updateOne({
    $set: {
      finalRouteGeneration: nextGeneration,
      finalRouteRunsMarkedMissingAt: undefined,
      routeOptimizerRuns: [],
      finalRouteOptimizerMetadata: buildPendingMetadata(run),
      learningArtifacts: {
        ...learning,
        finalRouteResetHistory,
      },
    },
  });

  return {
    deliveryAgentRunId: run.id,
    finalRouteGeneration: nextGeneration,
    message:
      "Final Route Optimizer metadata reset. You can create final runs again with new idempotency keys.",
  };
}
