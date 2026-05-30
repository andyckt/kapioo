import { batchCreateAndOptimizeRouteOptimizerRuns } from "@/lib/integrations/route-optimizer/client";
import {
  RouteOptimizerError,
  RouteOptimizerRateLimitError,
} from "@/lib/integrations/route-optimizer/errors";
import {
  ROUTE_OPTIMIZER_PATHS,
  type RouteOptimizerBatchCreateRequest,
  type RouteOptimizerBatchResult,
  type RouteOptimizerRunResult,
} from "@/lib/integrations/route-optimizer/types";
import { buildFinalRouteCreatePayloads } from "@/lib/agents/delivery/final-route-run/build-final-route-create-payloads";
import { getDeliveryOrdersForRouting } from "@/lib/agents/delivery/get-delivery-orders-for-routing";
import { getKapiooKitchenStartLocation } from "@/lib/agents/delivery/kitchen-start-location";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import {
  buildDeliveryAgentDuplicateKey,
  findDeliveryAgentRunByDuplicateKey,
  findDeliveryAgentRunById,
  saveFinalRouteOptimizerFailure,
  saveFinalRouteOptimizerResult,
} from "@/lib/agents/delivery/run-log";
import type {
  DeliveryAgentFinalRouteOptimizerMetadata,
  DeliveryAgentFinalRouteSummary,
  DeliveryAgentRouteOptimizerRun,
} from "@/lib/agents/delivery/run-log-types";
import type { DeliveryAgentCandidatePlanPreview } from "@/lib/contracts/delivery-agent";
import type { IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

export class FinalRouteRunStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinalRouteRunStateError";
  }
}

export class FinalRouteOptimizerCreationError extends Error {
  code: string;
  downstreamStatus?: number;
  downstreamPath?: string;
  downstreamBodyPreview?: string;

  constructor(
    message: string,
    options: {
      code?: string;
      downstreamStatus?: number;
      downstreamPath?: string;
      downstreamBodyPreview?: string;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "FinalRouteOptimizerCreationError";
    this.code = options.code ?? "ROUTE_OPTIMIZER_CREATE_FAILED";
    this.downstreamStatus = options.downstreamStatus;
    this.downstreamPath = options.downstreamPath;
    this.downstreamBodyPreview = options.downstreamBodyPreview;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export type CreateFinalRouteRunInput = {
  deliveryDate: string;
  profileId: string;
  deliveryAgentRunId?: string;
  createdBy: string;
};

export type CreateFinalRouteRunResult = {
  deliveryAgentRunId: string;
  idempotentReplay: boolean;
  finalRouteOptimizerMetadata: DeliveryAgentFinalRouteOptimizerMetadata;
  routeSummaries: DeliveryAgentFinalRouteSummary[];
  message: string;
};

async function loadRun(input: CreateFinalRouteRunInput): Promise<IDeliveryAgentRun> {
  const run = input.deliveryAgentRunId
    ? await findDeliveryAgentRunById(input.deliveryAgentRunId)
    : await findDeliveryAgentRunByDuplicateKey(
        buildDeliveryAgentDuplicateKey({
          deliveryDate: input.deliveryDate,
          profileId: input.profileId,
        })
      );

  if (!run) {
    throw new FinalRouteRunStateError("DeliveryAgentRun not found.");
  }

  return run;
}

function getFinalAcceptedPlan(run: IDeliveryAgentRun): DeliveryAgentCandidatePlanPreview {
  if (run.reviewStatus !== "approved") {
    throw new FinalRouteRunStateError(
      "Cannot create final Route Optimizer run because this plan has not been approved."
    );
  }

  const finalAcceptedPlan = run.planningArtifacts?.finalAcceptedPlan;
  if (!finalAcceptedPlan) {
    throw new FinalRouteRunStateError(
      "Cannot create final Route Optimizer run because finalAcceptedPlan is missing."
    );
  }

  return finalAcceptedPlan as unknown as DeliveryAgentCandidatePlanPreview;
}

function readSelectedCandidateId(run: IDeliveryAgentRun, candidate: DeliveryAgentCandidatePlanPreview): string {
  return (
    run.planningArtifacts?.donaldSelectedCandidateId ??
    run.learningArtifacts?.donaldSelectedCandidateId ??
    candidate.candidateId
  );
}

function buildRouteSummary(input: {
  runSlot: string;
  driverName: string;
  stopCount: number;
  result: RouteOptimizerRunResult;
}): DeliveryAgentFinalRouteSummary {
  return {
    runSlot: input.runSlot,
    driverName: input.driverName,
    routeName: input.result.external_id,
    stopCount: input.stopCount,
    estimatedFinishTime: input.result.estimated_finish_time,
    totalDurationMinutes: input.result.total_duration_minutes,
    totalDistanceKm: input.result.total_distance_km,
    detailsLink: input.result.details_link,
    driverLink: input.result.driver_link,
  };
}

function normalizeOptimizedRoute(result: RouteOptimizerRunResult): unknown[] | undefined {
  const optimizedRoute = result.optimized_route;
  if (Array.isArray(optimizedRoute)) {
    return optimizedRoute;
  }
  if (optimizedRoute && typeof optimizedRoute === "object" && "stops" in optimizedRoute) {
    const stops = (optimizedRoute as { stops?: unknown }).stops;
    return Array.isArray(stops) ? stops : undefined;
  }
  return undefined;
}

function truncateForLog(value: string | undefined, maxLength = 500): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
}

function readRouteOptimizerErrorCode(error: unknown): string {
  if (error instanceof RouteOptimizerRateLimitError || (error instanceof RouteOptimizerError && error.status === 429)) {
    return "ROUTE_OPTIMIZER_RATE_LIMITED";
  }

  if (error instanceof RouteOptimizerError) {
    return error.code === "ROUTE_OPTIMIZER_RESPONSE_ERROR"
      ? "ROUTE_OPTIMIZER_CREATE_FAILED"
      : error.code;
  }

  return error instanceof Error ? error.name : "ROUTE_OPTIMIZER_CREATE_FAILED";
}

function readRouteOptimizerErrorMessage(error: unknown): string {
  if (error instanceof RouteOptimizerRateLimitError || (error instanceof RouteOptimizerError && error.status === 429)) {
    return "Final Route Optimizer run could not be created because the Route Optimizer service returned RATE_LIMITED. Please wait and try again.";
  }

  if (error instanceof RouteOptimizerError) {
    return `Final Route Optimizer run could not be created because the Route Optimizer service failed: ${error.message}`;
  }

  return error instanceof Error ? error.message : String(error);
}

function summarizePayload(payload: RouteOptimizerBatchCreateRequest) {
  return payload.runs.map((run) => ({
    externalId: run.external_id,
    idempotencyKey: run.idempotency_key,
    driverName: run.run.driver_name,
    customerCount: run.customers.length,
  }));
}

const FINAL_CREATE_RETRY_DELAYS_MS =
  process.env.NODE_ENV === "test" ? [0, 0] : [750, 2_000];

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function batchCreateFinalRoutesWithRetry(input: {
  payload: RouteOptimizerBatchCreateRequest;
  logContext: Record<string, unknown>;
}): Promise<RouteOptimizerBatchResult> {
  for (let attempt = 0; attempt <= FINAL_CREATE_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await batchCreateAndOptimizeRouteOptimizerRuns(input.payload);
    } catch (error) {
      const canRetry =
        error instanceof RouteOptimizerRateLimitError ||
        (error instanceof RouteOptimizerError && error.status === 429);
      const isLastAttempt = attempt >= FINAL_CREATE_RETRY_DELAYS_MS.length;

      console.error("[Delivery Agent] Final Route Optimizer create failed", {
        ...input.logContext,
        attempt: attempt + 1,
        willRetry: canRetry && !isLastAttempt,
        downstreamEndpoint:
          error instanceof RouteOptimizerError
            ? error.path ?? ROUTE_OPTIMIZER_PATHS.batchCreateAndOptimize
            : ROUTE_OPTIMIZER_PATHS.batchCreateAndOptimize,
        downstreamStatusCode: error instanceof RouteOptimizerError ? error.status : undefined,
        downstreamResponseBodyPreview:
          error instanceof RouteOptimizerError ? truncateForLog(error.rawBody) : undefined,
        errorCode: readRouteOptimizerErrorCode(error),
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      if (!canRetry || isLastAttempt) {
        throw error;
      }

      await sleep(FINAL_CREATE_RETRY_DELAYS_MS[attempt] ?? 0);
    }
  }

  throw new FinalRouteOptimizerCreationError("Route Optimizer create retry loop exited unexpectedly.");
}

function buildRouteRuns(input: {
  results: RouteOptimizerRunResult[];
  createdRuns: DeliveryAgentCandidatePlanPreview["runs"];
  idempotencyKeysByRunSlot: Map<string, string>;
  externalIdsByRunSlot: Map<string, string>;
}): DeliveryAgentRouteOptimizerRun[] {
  return input.results.map((result, index) => {
    const candidateRun = input.createdRuns[index];
    if (!candidateRun) {
      throw new FinalRouteOptimizerCreationError("Route Optimizer returned an unexpected run.");
    }
    const runId = result.run_id;
    if (!runId) {
      throw new FinalRouteOptimizerCreationError("Route Optimizer did not return a run id.");
    }

    return {
      runId,
      driverName: candidateRun.driverName,
      externalId: result.external_id ?? input.externalIdsByRunSlot.get(candidateRun.runSlot) ?? "",
      idempotencyKey:
        result.idempotency_key ?? input.idempotencyKeysByRunSlot.get(candidateRun.runSlot) ?? "",
      detailsLink: result.details_link,
      driverLink: result.driver_link,
      estimatedFinishTime: result.estimated_finish_time,
      totalDurationMinutes: result.total_duration_minutes,
      optimizedRoute: normalizeOptimizedRoute(result),
      repairActionCount: candidateRun.repairActionsApplied?.length ?? 0,
    };
  });
}

function buildCreatedMetadata(input: {
  createdAt: Date;
  createdBy: string;
  runIds: string[];
  routeSummaries: DeliveryAgentFinalRouteSummary[];
  systemRecommendedCandidateId: string;
  selectedCandidateId: string;
  didDonaldOverrideRecommendation: boolean;
}): DeliveryAgentFinalRouteOptimizerMetadata {
  return {
    finalRouteOptimizerStatus: "created",
    finalRouteOptimizerCreatedAt: input.createdAt.toISOString(),
    finalRouteOptimizerCreatedBy: input.createdBy,
    systemRecommendedCandidateId: input.systemRecommendedCandidateId,
    selectedCandidateId: input.selectedCandidateId,
    didDonaldOverrideRecommendation: input.didDonaldOverrideRecommendation,
    finalRouteOptimizerRunIds: input.runIds,
    routeSummaries: input.routeSummaries,
  };
}

function buildFailureMetadata(input: {
  run: IDeliveryAgentRun;
  candidate: DeliveryAgentCandidatePlanPreview;
  selectedCandidateId: string;
  createdBy: string;
  error: unknown;
  payload?: RouteOptimizerBatchCreateRequest;
}): DeliveryAgentFinalRouteOptimizerMetadata {
  const message = readRouteOptimizerErrorMessage(input.error);
  return {
    finalRouteOptimizerStatus: "failed",
    finalRouteOptimizerCreatedBy: input.createdBy,
    systemRecommendedCandidateId:
      input.run.planningArtifacts?.systemRecommendedCandidateId ?? input.selectedCandidateId,
    selectedCandidateId: input.selectedCandidateId,
    didDonaldOverrideRecommendation:
      input.run.planningArtifacts?.didDonaldOverrideRecommendation ??
      input.run.learningArtifacts?.didDonaldOverrideRecommendation ??
      false,
    creationError: {
      code: readRouteOptimizerErrorCode(input.error),
      message,
      details: {
        candidateId: input.candidate.candidateId,
        downstreamEndpoint:
          input.error instanceof RouteOptimizerError
            ? input.error.path ?? ROUTE_OPTIMIZER_PATHS.batchCreateAndOptimize
            : ROUTE_OPTIMIZER_PATHS.batchCreateAndOptimize,
        downstreamStatusCode: input.error instanceof RouteOptimizerError ? input.error.status : undefined,
        downstreamResponseBodyPreview:
          input.error instanceof RouteOptimizerError ? truncateForLog(input.error.rawBody) : undefined,
        routeOptimizerRequests: input.payload ? summarizePayload(input.payload) : undefined,
      },
    },
  };
}

export async function createFinalRouteRunFromApprovedPlan(
  input: CreateFinalRouteRunInput
): Promise<CreateFinalRouteRunResult> {
  const run = await loadRun(input);
  const candidate = getFinalAcceptedPlan(run);
  const selectedCandidateId = readSelectedCandidateId(run, candidate);

  if (candidate.candidateId !== selectedCandidateId) {
    throw new FinalRouteRunStateError(
      "Cannot create final Route Optimizer run because finalAcceptedPlan does not match Donald's selected candidate."
    );
  }

  const existingMetadata = run.finalRouteOptimizerMetadata;
  if (
    existingMetadata?.finalRouteOptimizerStatus === "created" &&
    (run.routeOptimizerRuns?.length ?? 0) > 0
  ) {
    console.info("[Delivery Agent] Final Route Optimizer metadata already exists", {
      deliveryDate: run.deliveryDate,
      profileId: run.profileId,
      selectedCandidateId,
      finalAcceptedPlanCandidateId: candidate.candidateId,
      existingFinalRouteMetadataFound: true,
    });
    return {
      deliveryAgentRunId: run.id,
      idempotentReplay: true,
      finalRouteOptimizerMetadata: existingMetadata,
      routeSummaries: existingMetadata.routeSummaries ?? [],
      message: "Final Route Optimizer Run Created.",
    };
  }

  const planningSessionId = run.routeOptimizerPlanningSessionId || `final:${run.id}`;
  const systemRecommendedCandidateId =
    run.planningArtifacts?.systemRecommendedCandidateId ?? selectedCandidateId;
  const didDonaldOverrideRecommendation =
    run.planningArtifacts?.didDonaldOverrideRecommendation ??
    run.learningArtifacts?.didDonaldOverrideRecommendation ??
    false;

  let payload: RouteOptimizerBatchCreateRequest | undefined;

  try {
    const routing = await getDeliveryOrdersForRouting({
      deliveryDate: run.deliveryDate,
      statuses: ["confirmed"],
    });
    const routingStopByOrderId = new Map(routing.stops.map((stop) => [stop.orderId, stop]));
    const kitchenAddress = getKapiooKitchenStartLocation();
    const profile = getDeliveryPlanningProfile(run.profileId);
    payload = buildFinalRouteCreatePayloads({
      candidate,
      context: {
        deliveryDate: run.deliveryDate,
        deliveryAgentRunId: run.id,
        profileId: run.profileId,
        selectedCandidateId,
        planningSessionId,
        kitchenAddress,
        profile,
        routingStopByOrderId,
      },
    });

    const createdRuns = candidate.runs.filter(
      (candidateRun) => candidateRun.previewStatus === "previewed" && candidateRun.stopCount > 0
    );

    const payloadSummary = summarizePayload(payload);
    console.info("[Delivery Agent] Creating final Route Optimizer runs", {
      deliveryDate: run.deliveryDate,
      profileId: run.profileId,
      selectedCandidateId,
      finalAcceptedPlanCandidateId: candidate.candidateId,
      downstreamEndpoint: ROUTE_OPTIMIZER_PATHS.batchCreateAndOptimize,
      routeOptimizerRequests: payloadSummary,
      existingFinalRouteMetadataFound: false,
    });

    const response = await batchCreateFinalRoutesWithRetry({
      payload,
      logContext: {
        deliveryDate: run.deliveryDate,
        profileId: run.profileId,
        selectedCandidateId,
        finalAcceptedPlanCandidateId: candidate.candidateId,
        routeOptimizerRequests: payloadSummary,
        existingFinalRouteMetadataFound: false,
      },
    });
    const results = response.results ?? [];
    if (results.length !== payload.runs.length) {
      throw new FinalRouteOptimizerCreationError(
        "Route Optimizer did not return one result for each final route run."
      );
    }

    const idempotencyByRunSlot = new Map(
      payload.runs.map((request, index) => [
        createdRuns[index]?.runSlot ?? request.run.driver_name,
        request.idempotency_key ?? "",
      ])
    );
    const externalIdByRunSlot = new Map(
      payload.runs.map((request, index) => [
        createdRuns[index]?.runSlot ?? request.run.driver_name,
        request.external_id ?? "",
      ])
    );

    const routeRuns = buildRouteRuns({
      results,
      createdRuns,
      idempotencyKeysByRunSlot: idempotencyByRunSlot,
      externalIdsByRunSlot: externalIdByRunSlot,
    });
    const routeSummaries = results.map((result, index) => {
      const candidateRun = createdRuns[index];
      if (!candidateRun) {
        throw new FinalRouteOptimizerCreationError("Route Optimizer returned an unexpected run.");
      }
      return buildRouteSummary({
        runSlot: candidateRun.runSlot,
        driverName: candidateRun.driverName,
        stopCount: candidateRun.optimizedStopCount || candidateRun.stopCount,
        result,
      });
    });
    const createdAt = new Date();
    const metadata = buildCreatedMetadata({
      createdAt,
      createdBy: input.createdBy,
      runIds: routeRuns.map((routeRun) => routeRun.runId),
      routeSummaries,
      systemRecommendedCandidateId,
      selectedCandidateId,
      didDonaldOverrideRecommendation,
    });

    const updated = await saveFinalRouteOptimizerResult(run.id, {
      routeOptimizerPlanningSessionId: planningSessionId,
      routeOptimizerRuns: routeRuns,
      finalRouteOptimizerMetadata: metadata,
    });

    return {
      deliveryAgentRunId: updated.id,
      idempotentReplay: false,
      finalRouteOptimizerMetadata: metadata,
      routeSummaries,
      message: "Final Route Optimizer Run Created.",
    };
  } catch (error) {
    const metadata = buildFailureMetadata({
      run,
      candidate,
      selectedCandidateId,
      createdBy: input.createdBy,
      error,
      payload,
    });
    await saveFinalRouteOptimizerFailure(run.id, {
      finalRouteOptimizerMetadata: metadata,
    });
    throw new FinalRouteOptimizerCreationError(
      metadata.creationError?.message ?? "Final route creation failed.",
      {
        code: metadata.creationError?.code,
        downstreamStatus:
          metadata.creationError?.details &&
          typeof metadata.creationError.details === "object" &&
          "downstreamStatusCode" in metadata.creationError.details
            ? (metadata.creationError.details.downstreamStatusCode as number | undefined)
            : undefined,
        downstreamPath:
          metadata.creationError?.details &&
          typeof metadata.creationError.details === "object" &&
          "downstreamEndpoint" in metadata.creationError.details
            ? (metadata.creationError.details.downstreamEndpoint as string | undefined)
            : undefined,
        downstreamBodyPreview:
          metadata.creationError?.details &&
          typeof metadata.creationError.details === "object" &&
          "downstreamResponseBodyPreview" in metadata.creationError.details
            ? (metadata.creationError.details.downstreamResponseBodyPreview as string | undefined)
            : undefined,
        cause: error,
      }
    );
  }
}
