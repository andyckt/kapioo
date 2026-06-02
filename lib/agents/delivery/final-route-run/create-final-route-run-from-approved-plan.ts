import { batchCreateAndOptimizeRouteOptimizerRuns } from "@/lib/integrations/route-optimizer/client";
import {
  RouteOptimizerError,
  RouteOptimizerRateLimitError,
  RouteOptimizerValidationError,
} from "@/lib/integrations/route-optimizer/errors";
import {
  ROUTE_OPTIMIZER_PATHS,
  type RouteOptimizerBatchCreateRequest,
  type RouteOptimizerBatchResult,
  type RouteOptimizerRunResult,
} from "@/lib/integrations/route-optimizer/types";
import { buildFinalRouteCreatePayloads } from "@/lib/agents/delivery/final-route-run/build-final-route-create-payloads";
import { buildEnrichedRoutingStopLookup } from "@/lib/agents/delivery/final-route-run/build-enriched-routing-stop-lookup";
import {
  buildFinalRouteExternalId,
  buildFinalRouteIdempotencyKey,
} from "@/lib/agents/delivery/final-route-run/final-route-run-identity";
import {
  FinalRouteCreatePayloadError,
  FinalRouteOptimizerCreationError,
  FinalRouteRunStateError,
} from "@/lib/agents/delivery/final-route-run/errors";
import { resolveFinalRoutePlanningSessionId } from "@/lib/agents/delivery/final-route-run/resolve-final-route-planning-session-id";
import { getDeliveryOrdersForRouting } from "@/lib/agents/delivery/get-delivery-orders-for-routing";
import { getKapiooKitchenStartLocation } from "@/lib/agents/delivery/kitchen-start-location";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import {
  appendFinalRouteCreationHistory,
  buildDeliveryAgentDuplicateKey,
  findDeliveryAgentRunByDuplicateKey,
  findDeliveryAgentRunById,
  saveFinalRouteOptimizerFailure,
  saveFinalRouteOptimizerPartialResult,
  saveFinalRouteOptimizerResult,
} from "@/lib/agents/delivery/run-log";
import type {
  DeliveryAgentFinalRouteOptimizerMetadata,
  DeliveryAgentFinalRouteRunFailure,
  DeliveryAgentFinalRouteSummary,
  DeliveryAgentRouteOptimizerRun,
} from "@/lib/agents/delivery/run-log-types";
import type { DeliveryAgentCandidatePlanPreview } from "@/lib/contracts/delivery-agent";
import type { IDeliveryAgentRun } from "@/models/DeliveryAgentRun";
import {
  resolveFinalRouteRequestOutcomes,
  summarizeBatchCreateResponse,
  zipPayloadWithCandidateRuns,
  type FinalRouteRequestOutcome,
} from "@/lib/agents/delivery/final-route-run/parse-batch-create-response";
import { summarizeFinalRouteRunPayload } from "@/lib/agents/delivery/final-route-run/summarize-final-route-payload";
import {
  buildFailedRouteSummaryFromPayloadValidation,
  FinalRoutePayloadValidationError,
} from "@/lib/agents/delivery/final-route-run/validate-final-route-run-payload";

export { FinalRouteOptimizerCreationError, FinalRouteRunStateError } from "@/lib/agents/delivery/final-route-run/errors";

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

  if (error instanceof RouteOptimizerValidationError) {
    return "ROUTE_OPTIMIZER_VALIDATION_ERROR";
  }

  if (error instanceof RouteOptimizerError) {
    return error.code === "ROUTE_OPTIMIZER_RESPONSE_ERROR"
      ? "ROUTE_OPTIMIZER_CREATE_FAILED"
      : error.code;
  }

  return error instanceof Error ? error.name : "ROUTE_OPTIMIZER_CREATE_FAILED";
}

function readValidationErrorMessage(error: RouteOptimizerValidationError): string {
  const rawBody = error.rawBody ?? "";
  if (/planning_session_id/i.test(rawBody) || /planning_session_id/i.test(error.message)) {
    return "Final Route Optimizer run could not be created because planning_session_id is missing or invalid.";
  }

  return `Final Route Optimizer run could not be created because the Route Optimizer service rejected the request: ${error.message}`;
}

function readRouteOptimizerErrorMessage(error: unknown): string {
  if (error instanceof RouteOptimizerRateLimitError || (error instanceof RouteOptimizerError && error.status === 429)) {
    return "Final Route Optimizer run could not be created because the Route Optimizer service returned RATE_LIMITED. Please wait and try again.";
  }

  if (error instanceof RouteOptimizerValidationError) {
    return readValidationErrorMessage(error);
  }

  if (error instanceof RouteOptimizerError) {
    return `Final Route Optimizer run could not be created because the Route Optimizer service failed: ${error.message}`;
  }

  return error instanceof Error ? error.message : String(error);
}

function summarizePayload(payload: RouteOptimizerBatchCreateRequest) {
  return {
    planningSessionId: payload.planning_session_id,
    runs: payload.runs.map((run) => summarizeFinalRouteRunPayload(run)),
  };
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

function buildRouteRunFromOutcome(outcome: FinalRouteRequestOutcome): DeliveryAgentRouteOptimizerRun {
  const result = outcome.result;
  if (!result?.run_id) {
    throw new FinalRouteOptimizerCreationError("Route Optimizer did not return a run id.");
  }

  return {
    runId: result.run_id,
    driverName: outcome.driverName,
    externalId: outcome.externalId || result.external_id || "",
    idempotencyKey: outcome.idempotencyKey || result.idempotency_key || "",
    detailsLink: result.details_link,
    driverLink: result.driver_link,
    estimatedFinishTime: result.estimated_finish_time,
    totalDurationMinutes: result.total_duration_minutes,
    optimizedRoute: normalizeOptimizedRoute(result),
    repairActionCount: outcome.candidateRun.repairActionsApplied?.length ?? 0,
  };
}

function buildRouteSummaryFromOutcome(outcome: FinalRouteRequestOutcome): DeliveryAgentFinalRouteSummary {
  const result = outcome.result;
  if (!result) {
    throw new FinalRouteOptimizerCreationError("Route Optimizer returned an unexpected run.");
  }

  return buildRouteSummary({
    runSlot: outcome.runSlot,
    driverName: outcome.driverName,
    stopCount: outcome.stopCount,
    result,
  });
}

async function handlePayloadValidationError(input: {
  run: IDeliveryAgentRun;
  candidate: DeliveryAgentCandidatePlanPreview;
  selectedCandidateId: string;
  createdBy: string;
  planningSessionId: string;
  planningSessionSource: string;
  systemRecommendedCandidateId: string;
  didDonaldOverrideRecommendation: boolean;
  error: FinalRoutePayloadValidationError;
}): Promise<never> {
  const failedRun =
    input.candidate.runs.find((run) => run.runSlot === input.error.issue.runSlot) ??
    input.candidate.runs.find((run) => run.driverName === input.error.issue.driverName);
  const runSlot = failedRun?.runSlot ?? input.error.issue.runSlot ?? "unknown";
  const stopCount = failedRun?.optimizedStopCount || failedRun?.stopCount || 0;
  const failedRouteSummary = buildFailedRouteSummaryFromPayloadValidation({
    issue: input.error.issue,
    runSlot,
    stopCount,
    externalId: buildFinalRouteExternalId({
      deliveryDate: input.run.deliveryDate,
      deliveryAgentRunId: input.run.id,
      selectedCandidateId: input.selectedCandidateId,
      runSlot,
      finalRouteGeneration: input.run.finalRouteGeneration ?? 1,
    }),
    idempotencyKey: buildFinalRouteIdempotencyKey({
      deliveryDate: input.run.deliveryDate,
      profileId: input.run.profileId,
      selectedCandidateId: input.selectedCandidateId,
      runSlot,
      finalRouteGeneration: input.run.finalRouteGeneration ?? 1,
    }),
  });
  failedRouteSummary.errorMessage = input.error.message;

  const existingRuns = input.run.routeOptimizerRuns ?? [];
  const existingSummaries = input.run.finalRouteOptimizerMetadata?.routeSummaries ?? [];
  const requestedRunCount = input.candidate.runs.filter(
    (candidateRun) => candidateRun.previewStatus === "previewed" && candidateRun.stopCount > 0
  ).length;
  const hasPartialSuccess = existingRuns.length > 0;

  if (hasPartialSuccess) {
    const partialMetadata: DeliveryAgentFinalRouteOptimizerMetadata = {
      ...(input.run.finalRouteOptimizerMetadata ?? {
        systemRecommendedCandidateId: input.systemRecommendedCandidateId,
        selectedCandidateId: input.selectedCandidateId,
        didDonaldOverrideRecommendation: input.didDonaldOverrideRecommendation,
      }),
      finalRouteOptimizerStatus: "partial_created",
      finalRouteOptimizerCreatedBy: input.createdBy,
      systemRecommendedCandidateId: input.systemRecommendedCandidateId,
      selectedCandidateId: input.selectedCandidateId,
      didDonaldOverrideRecommendation: input.didDonaldOverrideRecommendation,
      planningSessionId: input.planningSessionId,
      planningSessionSource: input.planningSessionSource,
      requestedRunCount,
      succeededRunCount: existingRuns.length,
      failedRunCount: 1,
      finalRouteOptimizerRunIds: existingRuns.map((routeRun) => routeRun.runId),
      routeSummaries: existingSummaries,
      failedRouteSummaries: [failedRouteSummary],
      creationError: {
        code: "ROUTE_OPTIMIZER_PAYLOAD_VALIDATION",
        message: input.error.message,
        details: input.error.issue,
      },
    };

    await saveFinalRouteOptimizerPartialResult(input.run.id, {
      routeOptimizerPlanningSessionId: input.planningSessionId,
      routeOptimizerRuns: existingRuns,
      finalRouteOptimizerMetadata: partialMetadata,
    });

    throwPartialCreationError({
      metadata: partialMetadata,
      routeSummaries: existingSummaries,
    });
  }

  throw new FinalRouteOptimizerCreationError(input.error.message, {
    code: "ROUTE_OPTIMIZER_PAYLOAD_VALIDATION",
  });
}

function buildFailedRouteSummary(outcome: FinalRouteRequestOutcome): DeliveryAgentFinalRouteRunFailure {
  return {
    runSlot: outcome.runSlot,
    driverName: outcome.driverName,
    stopCount: outcome.stopCount,
    externalId: outcome.externalId,
    idempotencyKey: outcome.idempotencyKey,
    errorMessage: outcome.errorMessage,
    errorCode: outcome.errorCode,
  };
}

function readExistingSuccessfulExternalIds(run: IDeliveryAgentRun): Set<string> {
  const externalIds = new Set<string>();

  for (const routeRun of run.routeOptimizerRuns ?? []) {
    if (routeRun.externalId.trim()) {
      externalIds.add(routeRun.externalId.trim());
    }
  }

  for (const summary of run.finalRouteOptimizerMetadata?.routeSummaries ?? []) {
    if (summary.routeName?.trim()) {
      externalIds.add(summary.routeName.trim());
    }
  }

  return externalIds;
}

function filterPayloadForMissingRuns(
  payload: RouteOptimizerBatchCreateRequest,
  existingExternalIds: Set<string>
): RouteOptimizerBatchCreateRequest {
  const runs = payload.runs.filter((request) => {
    const externalId = request.external_id?.trim();
    return !externalId || !existingExternalIds.has(externalId);
  });

  return {
    planning_session_id: payload.planning_session_id,
    runs,
  };
}

function mergeRouteRuns(
  existingRuns: DeliveryAgentRouteOptimizerRun[],
  newRuns: DeliveryAgentRouteOptimizerRun[]
): DeliveryAgentRouteOptimizerRun[] {
  const merged = new Map<string, DeliveryAgentRouteOptimizerRun>();
  for (const routeRun of existingRuns) {
    merged.set(routeRun.externalId, routeRun);
  }
  for (const routeRun of newRuns) {
    merged.set(routeRun.externalId, routeRun);
  }
  return [...merged.values()];
}

function mergeRouteSummaries(
  existingSummaries: DeliveryAgentFinalRouteSummary[],
  newSummaries: DeliveryAgentFinalRouteSummary[]
): DeliveryAgentFinalRouteSummary[] {
  const merged = new Map<string, DeliveryAgentFinalRouteSummary>();
  for (const summary of existingSummaries) {
    merged.set(summary.runSlot, summary);
  }
  for (const summary of newSummaries) {
    merged.set(summary.runSlot, summary);
  }
  return [...merged.values()];
}

function buildCreatedMetadata(input: {
  createdAt: Date;
  createdBy: string;
  runIds: string[];
  routeSummaries: DeliveryAgentFinalRouteSummary[];
  systemRecommendedCandidateId: string;
  selectedCandidateId: string;
  didDonaldOverrideRecommendation: boolean;
  planningSessionId: string;
  planningSessionSource: string;
  requestedRunCount: number;
  succeededRunCount: number;
  failedRunCount: number;
  failedRouteSummaries?: DeliveryAgentFinalRouteRunFailure[];
  status?: DeliveryAgentFinalRouteOptimizerMetadata["finalRouteOptimizerStatus"];
  coordinateParitySummary?: DeliveryAgentFinalRouteOptimizerMetadata["coordinateParitySummary"];
}): DeliveryAgentFinalRouteOptimizerMetadata {
  return {
    finalRouteOptimizerStatus: input.status ?? "created",
    finalRouteOptimizerCreatedAt: input.createdAt.toISOString(),
    finalRouteOptimizerCreatedBy: input.createdBy,
    systemRecommendedCandidateId: input.systemRecommendedCandidateId,
    selectedCandidateId: input.selectedCandidateId,
    didDonaldOverrideRecommendation: input.didDonaldOverrideRecommendation,
    planningSessionId: input.planningSessionId,
    planningSessionSource: input.planningSessionSource,
    requestedRunCount: input.requestedRunCount,
    succeededRunCount: input.succeededRunCount,
    failedRunCount: input.failedRunCount,
    finalRouteOptimizerRunIds: input.runIds,
    routeSummaries: input.routeSummaries,
    failedRouteSummaries: input.failedRouteSummaries,
    coordinateParitySummary: input.coordinateParitySummary,
  };
}

function buildPartialCreationErrorMessage(input: {
  createdSummaries: DeliveryAgentFinalRouteSummary[];
  failedSummaries: DeliveryAgentFinalRouteRunFailure[];
}): string {
  const createdNames = input.createdSummaries.map((summary) => summary.driverName).join(", ");
  const failedNames = input.failedSummaries
    .map((summary) => `${summary.driverName}${summary.errorMessage ? ` (${summary.errorMessage})` : ""}`)
    .join("; ");

  return `Partial final Route Optimizer run creation: created ${createdNames || "none"}; missing or failed ${failedNames || "unknown runs"}. Retry missing final route runs.`;
}

function throwPartialCreationError(input: {
  metadata: DeliveryAgentFinalRouteOptimizerMetadata;
  routeSummaries: DeliveryAgentFinalRouteSummary[];
  responsePreview?: string;
}): never {
  throw new FinalRouteOptimizerCreationError(
    input.metadata.creationError?.message ??
      "Partial final Route Optimizer run creation. Retry missing final route runs.",
    {
      code: "ROUTE_OPTIMIZER_PARTIAL_CREATED",
      finalRouteOptimizerMetadata: input.metadata,
      routeSummaries: input.routeSummaries,
      downstreamBodyPreview: input.responsePreview,
    }
  );
}

function buildFailureMetadata(input: {
  run: IDeliveryAgentRun;
  candidate: DeliveryAgentCandidatePlanPreview;
  selectedCandidateId: string;
  createdBy: string;
  error: unknown;
  payload?: RouteOptimizerBatchCreateRequest;
  planningSessionId: string;
  planningSessionSource: string;
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
    planningSessionId: input.planningSessionId,
    planningSessionSource: input.planningSessionSource,
    creationError: {
      code: readRouteOptimizerErrorCode(input.error),
      message,
      details: {
        candidateId: input.candidate.candidateId,
        planningSessionId: input.planningSessionId,
        planningSessionSource: input.planningSessionSource,
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

  const resolvedPlanningSession = resolveFinalRoutePlanningSessionId(run);
  const planningSessionId = resolvedPlanningSession.planningSessionId;
  const planningSessionSource = resolvedPlanningSession.source;
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
    const { routingStopByOrderId, coordinateAudit, meetupCoordinates } =
      await buildEnrichedRoutingStopLookup({
        run,
        finalAcceptedPlan: candidate,
        baseStops: routing.stops,
      });
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
        finalRouteGeneration: run.finalRouteGeneration ?? 1,
        meetupCoordinates,
        coordinateAudit,
      },
    });

    const requestRuns = zipPayloadWithCandidateRuns({
      payload,
      candidateRuns: candidate.runs,
    });
    const requestedRunCount = requestRuns.length;
    const existingExternalIds = readExistingSuccessfulExternalIds(run);
    const payloadToSend = filterPayloadForMissingRuns(payload, existingExternalIds);

    if (payloadToSend.runs.length === 0 && existingExternalIds.size >= requestedRunCount) {
      const completedMetadata: DeliveryAgentFinalRouteOptimizerMetadata =
        existingMetadata?.finalRouteOptimizerStatus === "partial_created"
          ? {
              ...existingMetadata,
              finalRouteOptimizerStatus: "created",
              failedRouteSummaries: [],
              failedRunCount: 0,
              succeededRunCount: requestedRunCount,
              creationError: undefined,
            }
          : (existingMetadata as DeliveryAgentFinalRouteOptimizerMetadata);

      if (completedMetadata) {
        if (existingMetadata?.finalRouteOptimizerStatus === "partial_created") {
          await saveFinalRouteOptimizerResult(run.id, {
            routeOptimizerPlanningSessionId: planningSessionId,
            routeOptimizerRuns: run.routeOptimizerRuns ?? [],
            finalRouteOptimizerMetadata: completedMetadata,
          });
        }

        return {
          deliveryAgentRunId: run.id,
          idempotentReplay: true,
          finalRouteOptimizerMetadata: completedMetadata,
          routeSummaries: completedMetadata.routeSummaries ?? [],
          message: "Final Route Optimizer Run Created.",
        };
      }
    }

    const payloadSummary = summarizePayload(payloadToSend);
    console.info("[Delivery Agent] Creating final Route Optimizer runs", {
      deliveryDate: run.deliveryDate,
      profileId: run.profileId,
      selectedCandidateId,
      finalAcceptedPlanCandidateId: candidate.candidateId,
      planningSessionId,
      planningSessionSource,
      requestedRunCount,
      requestedExternalIds: requestRuns.map((requestRun) => requestRun.externalId),
      existingSuccessfulExternalIds: [...existingExternalIds],
      retryingMissingRunsOnly: payloadToSend.runs.length !== payload.runs.length,
      downstreamEndpoint: ROUTE_OPTIMIZER_PATHS.batchCreateAndOptimize,
      routeOptimizerRequests: payloadSummary,
      existingFinalRouteMetadataFound: Boolean(existingMetadata),
      coordinateParitySummary: coordinateAudit,
    });

    const response = await batchCreateFinalRoutesWithRetry({
      payload: payloadToSend,
      logContext: {
        deliveryDate: run.deliveryDate,
        profileId: run.profileId,
        selectedCandidateId,
        finalAcceptedPlanCandidateId: candidate.candidateId,
        planningSessionId,
        planningSessionSource,
        requestedRunCount,
        routeOptimizerRequests: payloadSummary,
        existingSuccessfulExternalIds: [...existingExternalIds],
        existingFinalRouteMetadataFound: Boolean(existingMetadata),
      },
    });

    const responseSummary = summarizeBatchCreateResponse(response);
    const attemptedRequestRuns = zipPayloadWithCandidateRuns({
      payload: payloadToSend,
      candidateRuns: candidate.runs,
    });
    const outcomes = resolveFinalRouteRequestOutcomes({
      requestRuns: attemptedRequestRuns,
      response,
    });

    console.info("[Delivery Agent] Final Route Optimizer batch response", {
      ...responseSummary,
      attemptedExternalIds: attemptedRequestRuns.map((requestRun) => requestRun.externalId),
      failedExternalIds: outcomes
        .filter((outcome) => outcome.status !== "created")
        .map((outcome) => ({
          externalId: outcome.externalId,
          driverName: outcome.driverName,
          status: outcome.status,
          errorCode: outcome.errorCode,
          errorMessage: outcome.errorMessage,
        })),
      downstreamErrorsPreview: truncateForLog(JSON.stringify(responseSummary.errors ?? [])),
    });

    const newSuccessfulOutcomes = outcomes.filter((outcome) => outcome.status === "created");
    const newFailedOutcomes = outcomes.filter((outcome) => outcome.status !== "created");
    const newRouteRuns = newSuccessfulOutcomes.map(buildRouteRunFromOutcome);
    const newRouteSummaries = newSuccessfulOutcomes.map(buildRouteSummaryFromOutcome);

    const mergedRouteRuns = mergeRouteRuns(run.routeOptimizerRuns ?? [], newRouteRuns);
    const mergedRouteSummaries = mergeRouteSummaries(
      run.finalRouteOptimizerMetadata?.routeSummaries ?? [],
      newRouteSummaries
    );

    const successfulExternalIds = new Set(mergedRouteRuns.map((routeRun) => routeRun.externalId));
    const failedRouteSummaries = requestRuns
      .filter((requestRun) => !successfulExternalIds.has(requestRun.externalId))
      .map((requestRun) => {
        const failedOutcome = newFailedOutcomes.find(
          (outcome) => outcome.externalId === requestRun.externalId
        );
        return (
          failedOutcome ??
          ({
            ...requestRun,
            status: "missing",
            errorMessage: "Route Optimizer did not return a result for this run.",
            errorCode: "ROUTE_OPTIMIZER_RUN_MISSING",
          } as FinalRouteRequestOutcome)
        );
      })
      .map(buildFailedRouteSummary);

    const succeededRunCount = mergedRouteRuns.length;
    const failedRunCount = failedRouteSummaries.length;
    const createdAt = new Date();
    const allRunsCreated = succeededRunCount >= requestedRunCount && failedRunCount === 0;

    const metadata = buildCreatedMetadata({
      createdAt,
      createdBy: input.createdBy,
      runIds: mergedRouteRuns.map((routeRun) => routeRun.runId),
      routeSummaries: mergedRouteSummaries,
      systemRecommendedCandidateId,
      selectedCandidateId,
      didDonaldOverrideRecommendation,
      planningSessionId,
      planningSessionSource,
      requestedRunCount,
      succeededRunCount,
      failedRunCount,
      failedRouteSummaries: allRunsCreated ? [] : failedRouteSummaries,
      status: allRunsCreated ? "created" : "partial_created",
      coordinateParitySummary: coordinateAudit,
    });

    if (allRunsCreated) {
      const updated = await saveFinalRouteOptimizerResult(run.id, {
        routeOptimizerPlanningSessionId: planningSessionId,
        routeOptimizerRuns: mergedRouteRuns,
        finalRouteOptimizerMetadata: metadata,
      });

      await appendFinalRouteCreationHistory(updated.id, {
        createdAt: createdAt.toISOString(),
        createdBy: input.createdBy,
        generation: run.finalRouteGeneration ?? 1,
        finalRouteOptimizerStatus: "created",
        finalRouteOptimizerRunIds: mergedRouteRuns.map((routeRun) => routeRun.runId),
        routeSummaries: mergedRouteSummaries,
        failedRouteSummaries: [],
      });

      return {
        deliveryAgentRunId: updated.id,
        idempotentReplay: false,
        finalRouteOptimizerMetadata: metadata,
        routeSummaries: mergedRouteSummaries,
        message: "Final Route Optimizer Run Created.",
      };
    }

    if (succeededRunCount === 0) {
      const failureMetadata: DeliveryAgentFinalRouteOptimizerMetadata = {
        ...metadata,
        finalRouteOptimizerStatus: "failed",
        creationError: {
          code: "ROUTE_OPTIMIZER_CREATE_FAILED",
          message: buildPartialCreationErrorMessage({
            createdSummaries: [],
            failedSummaries: failedRouteSummaries,
          }),
          details: {
            ...responseSummary,
            failedExternalIds: failedRouteSummaries.map((summary) => summary.externalId),
          },
        },
      };

      await saveFinalRouteOptimizerFailure(run.id, {
        routeOptimizerPlanningSessionId: planningSessionId,
        finalRouteOptimizerMetadata: failureMetadata,
      });

      throw new FinalRouteOptimizerCreationError(failureMetadata.creationError.message, {
        code: "ROUTE_OPTIMIZER_CREATE_FAILED",
        finalRouteOptimizerMetadata: failureMetadata,
      });
    }

    const partialMetadata: DeliveryAgentFinalRouteOptimizerMetadata = {
      ...metadata,
      creationError: {
        code: "ROUTE_OPTIMIZER_PARTIAL_CREATED",
        message: buildPartialCreationErrorMessage({
          createdSummaries: mergedRouteSummaries,
          failedSummaries: failedRouteSummaries,
        }),
        details: {
          ...responseSummary,
          failedExternalIds: failedRouteSummaries.map((summary) => summary.externalId),
          successfulExternalIds: mergedRouteRuns.map((routeRun) => routeRun.externalId),
        },
      },
    };

    await saveFinalRouteOptimizerPartialResult(run.id, {
      routeOptimizerPlanningSessionId: planningSessionId,
      routeOptimizerRuns: mergedRouteRuns,
      finalRouteOptimizerMetadata: partialMetadata,
    });

    throwPartialCreationError({
      metadata: partialMetadata,
      routeSummaries: mergedRouteSummaries,
      responsePreview: truncateForLog(JSON.stringify(responseSummary)),
    });
  } catch (error) {
    if (
      error instanceof FinalRouteOptimizerCreationError &&
      (error.code === "ROUTE_OPTIMIZER_PARTIAL_CREATED" ||
        error.code === "ROUTE_OPTIMIZER_CREATE_FAILED")
    ) {
      throw error;
    }

    if (error instanceof FinalRoutePayloadValidationError) {
      await handlePayloadValidationError({
        run,
        candidate,
        selectedCandidateId,
        createdBy: input.createdBy,
        planningSessionId,
        planningSessionSource,
        systemRecommendedCandidateId,
        didDonaldOverrideRecommendation,
        error,
      });
    }

    if (error instanceof FinalRouteCreatePayloadError) {
      throw new FinalRouteOptimizerCreationError(error.message, {
        code: "ROUTE_OPTIMIZER_VALIDATION_ERROR",
      });
    }

    const metadata = buildFailureMetadata({
      run,
      candidate,
      selectedCandidateId,
      createdBy: input.createdBy,
      error,
      payload,
      planningSessionId,
      planningSessionSource,
    });
    await saveFinalRouteOptimizerFailure(run.id, {
      routeOptimizerPlanningSessionId: planningSessionId,
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
