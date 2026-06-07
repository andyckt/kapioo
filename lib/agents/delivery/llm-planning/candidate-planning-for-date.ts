import { getEnrichedDeliveryOrdersForRouting } from "@/lib/agents/delivery/geocode";
import {
  buildSimilarCompactHistoricalPackageForDeliveryAgent,
  loadHistoricalLearningCasesForRetrieval,
} from "@/lib/agents/delivery/llm-planning/similar-historical-package";
import {
  runDeliveryAgentLlmCandidateProviderAdapter,
  type DeliveryAgentLlmCandidateProviderAdapterResult,
  type DeliveryAgentLlmCandidateProviderExecutor,
} from "@/lib/agents/delivery/llm-planning/candidate-provider-adapter";
import {
  createDeliveryAgentCostPolicyWithProviderRuntime,
  resolveDeliveryAgentLlmLiveCallGate,
  resolveDeliveryAgentLlmProviderRuntimeConfig,
  type DeliveryAgentLlmProviderRuntimeConfig,
} from "@/lib/agents/delivery/llm-planning/provider-readiness";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import { toPlanningStops } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { previewDeliveryOrdersForAgent } from "@/lib/agents/delivery/preview-delivery-orders";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type { DeliveryAgentCostPolicy } from "@/lib/contracts/delivery-agent-cost-policy";
import type {
  DeliveryAgentLlmCandidatePlanningResponse,
  DeliveryAgentLlmCandidatePlanningHistoryStatus,
  DeliveryAgentLlmCandidatePlanningFinalistSummary,
} from "@/lib/contracts/delivery-agent";
import type { CandidatePlan } from "@/lib/agents/delivery/candidate-plans/types";
import type {
  DeliveryAgentCompactHistoricalPackage,
  DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";

export const DELIVERY_AGENT_LLM_CANDIDATE_PLANNING_FOR_DATE_VERSION =
  "delivery-agent-llm-candidate-planning-for-date-v1" as const;

export type RunDeliveryAgentLlmCandidatePlanningForDateInput = {
  deliveryDate: string;
  profileId?: string;
  includeHistoricalPackage?: boolean;
  forceRefresh?: boolean;
  allowProviderCall?: boolean;
  provider?: DeliveryAgentLlmCandidateProviderExecutor;
  providerRuntimeConfig?: DeliveryAgentLlmProviderRuntimeConfig;
  policy?: DeliveryAgentCostPolicy;
  nowMs?: number;
};

type HistoricalPackageResolution = {
  status: DeliveryAgentLlmCandidatePlanningHistoryStatus;
  historicalPackage?: DeliveryAgentCompactHistoricalPackage;
  selectedCaseIds: string[];
  warningCount: number;
  warnings: string[];
};

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function uniqueInOriginalOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    output.push(value);
  }

  return output;
}

function messageFromUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildOrderFactsFromRoutingStops(
  stops: RoutingStop[]
): DeliveryAgentPlanningFingerprintOrderFact[] {
  const planningStops = toPlanningStops(stops);
  const planningByOrderId = new Map(
    planningStops.map((stop) => [stop.orderId, stop])
  );

  return stops
    .map((stop) => {
      const planningStop = planningByOrderId.get(stop.orderId);

      return {
        orderId: stop.orderId,
        status: stop.status,
        area: stop.area,
        formattedAddress: stop.formattedAddress,
        deliveryWindow: stop.deliveryWindow,
        totalMealQuantity: stop.totalMealQuantity,
        lat: stop.lat,
        lng: stop.lng,
        coordinateStatus: stop.coordinateStatus,
        coordinateSource: stop.coordinateSource,
        coordinateConfidence: stop.coordinateConfidence,
        planningTags: planningStop?.planningTags ?? [],
      };
    })
    .sort((left, right) => left.orderId.localeCompare(right.orderId));
}

function buildProfileResourceHints(profile: DeliveryPlanningProfile) {
  const hiredDriverRunCount = profile.drivers.filter((driver) => !driver.isBackupOnly).length;

  return {
    plannedRunCount: hiredDriverRunCount,
    hiredDriverRunCount,
    availableRunCount: profile.drivers.length,
    supportAvailable: profile.selfFallbackRules.enabled,
    needsHandoff: profile.handoffRules.enabled,
    needsSelfOrSupport: false,
    fixedStopsExpected: false,
    endStopsExpected: false,
  };
}

async function resolveHistoricalPackage(input: {
  includeHistoricalPackage: boolean;
  deliveryDate: string;
  profile: DeliveryPlanningProfile;
  orderFacts: DeliveryAgentPlanningFingerprintOrderFact[];
  policy: DeliveryAgentCostPolicy;
}): Promise<HistoricalPackageResolution> {
  if (!input.includeHistoricalPackage) {
    return {
      status: "skipped",
      selectedCaseIds: [],
      warningCount: 0,
      warnings: ["Similar historical package was skipped for this planning request."],
    };
  }

  try {
    const learningCases = await loadHistoricalLearningCasesForRetrieval({
      deliveryDate: input.deliveryDate,
      includeTargetDeliveryDate: false,
    });
    const similar = buildSimilarCompactHistoricalPackageForDeliveryAgent({
      deliveryDate: input.deliveryDate,
      profileId: input.profile.profileId,
      orders: input.orderFacts,
      learningCases,
      policy: input.policy,
      ...buildProfileResourceHints(input.profile),
    });
    const selectedCaseIds = similar.historicalPackage.selectedCaseIds;

    if (selectedCaseIds.length === 0 && similar.historicalPackage.compactLessons.length === 0) {
      return {
        status: "empty",
        selectedCaseIds: [],
        warningCount: similar.warnings.length,
        warnings: uniqueInOriginalOrder([
          "No similar historical cases were selected for this planning request.",
          ...similar.warnings,
        ]),
      };
    }

    return {
      status: "included",
      historicalPackage: similar.historicalPackage,
      selectedCaseIds,
      warningCount: similar.warnings.length,
      warnings: similar.warnings,
    };
  } catch (error) {
    return {
      status: "unavailable",
      selectedCaseIds: [],
      warningCount: 1,
      warnings: [
        `Similar historical package could not be loaded; continuing without history. ${messageFromUnknownError(error)}`,
      ],
    };
  }
}

function buildOrderSummary(input: {
  stops: RoutingStop[];
  orderFacts: DeliveryAgentPlanningFingerprintOrderFact[];
  invalidStops: number;
  pendingOrders: number;
}): DeliveryAgentLlmCandidatePlanningResponse["orderSummary"] {
  const ordersWithCoordinates = input.orderFacts.filter(
    (order) => isFiniteCoordinate(order.lat) && isFiniteCoordinate(order.lng)
  ).length;
  const ordersMissingCoordinates = input.orderFacts
    .filter((order) => !isFiniteCoordinate(order.lat) || !isFiniteCoordinate(order.lng))
    .map((order) => order.orderId);
  const byArea: Record<string, number> = {};

  for (const stop of input.stops) {
    const area = stop.area?.trim() || "Unknown";
    byArea[area] = (byArea[area] ?? 0) + 1;
  }

  return {
    totalOrders: input.orderFacts.length + input.invalidStops + input.pendingOrders,
    validStops: input.orderFacts.length,
    invalidStops: input.invalidStops,
    pendingOrders: input.pendingOrders,
    ordersWithCoordinates,
    ordersMissingCoordinates,
    coordinateCoveragePercent:
      input.orderFacts.length === 0
        ? 0
        : roundPercent((ordersWithCoordinates / input.orderFacts.length) * 100),
    byArea,
  };
}

function buildFinalistSummaries(
  finalistCandidates: CandidatePlan[],
  localRankingResult?: { rankedCandidates: Array<{ candidateId: string; score: number; rank: number; blockingIssues: string[]; warnings: string[] }> }
): DeliveryAgentLlmCandidatePlanningFinalistSummary[] {
  if (finalistCandidates.length === 0) {
    return [];
  }

  const rankingByCandidate = new Map(
    (localRankingResult?.rankedCandidates ?? []).map((r) => [r.candidateId, r])
  );

  return finalistCandidates.map((plan, index) => {
    const ranking = rankingByCandidate.get(plan.candidateId);

    return {
      candidateId: plan.candidateId,
      name: plan.name,
      strategyType: plan.strategyType,
      localScore: ranking?.score ?? 0,
      rank: ranking?.rank ?? index + 1,
      runs: plan.runs.map((run) => ({
        runSlot: run.runSlot,
        driverName: run.driverName,
        orderIds: run.stops.map((stop) => stop.orderId),
        stopCount: run.stopCount,
        areaBreakdown: run.areaBreakdown,
      })),
      usesHandoff: Boolean(plan.handoffPlan),
      usesSelfRun: plan.summary.selfUsed,
      totalStops: plan.summary.totalStops,
      totalMeals: plan.summary.totalMeals,
      blockingIssues: ranking?.blockingIssues ?? [],
      warnings: ranking?.warnings ?? plan.warnings,
    };
  });
}

function mapAdapterToResponse(input: {
  deliveryDate: string;
  profile: DeliveryPlanningProfile;
  adapterResult: DeliveryAgentLlmCandidateProviderAdapterResult;
  orderSummary: DeliveryAgentLlmCandidatePlanningResponse["orderSummary"];
  historical: HistoricalPackageResolution;
  allowProviderCall: boolean;
  policy: DeliveryAgentCostPolicy;
  providerRuntimeConfig: DeliveryAgentLlmProviderRuntimeConfig;
}): DeliveryAgentLlmCandidatePlanningResponse {
  const promptPackage = input.adapterResult.promptPackage;
  const model = input.adapterResult.providerCall.modelResolution.model;
  const cacheContext = input.adapterResult.cacheContext;
  const dryRunResult = input.adapterResult.dryRunResult;
  const liveCallGate =
    input.adapterResult.liveCallGate ??
    resolveDeliveryAgentLlmLiveCallGate({
      promptPackage,
      policy: input.policy,
      modelResolution: input.adapterResult.providerCall.modelResolution,
      runtimeConfig: input.providerRuntimeConfig,
      allowProviderCall: input.allowProviderCall,
    });

  return {
    pipelineVersion: DELIVERY_AGENT_LLM_CANDIDATE_PLANNING_FOR_DATE_VERSION,
    status: input.adapterResult.status,
    deliveryDate: input.deliveryDate,
    profileId: input.profile.profileId,
    profileVersion: input.profile.profileVersion,
    planningFingerprint: input.adapterResult.planningFingerprint,
    orderSummary: input.orderSummary,
    historicalPackage: {
      status: input.historical.status,
      selectedCaseIds: input.historical.selectedCaseIds,
      selectedCaseCount: input.historical.selectedCaseIds.length,
      warningCount: input.historical.warningCount,
    },
    prompt: promptPackage
      ? {
          promptPackageVersion: promptPackage.promptPackageVersion,
          promptVersion: promptPackage.promptVersion,
          outputSchemaVersion: promptPackage.outputSchemaVersion,
          scope: promptPackage.scope,
          callType: promptPackage.callType,
          estimatedInputTokens: promptPackage.tokenEstimate.estimatedInputTokens,
          maxInputTokens: promptPackage.tokenEstimate.maxInputTokens,
          estimatedOutputTokens: promptPackage.tokenEstimate.estimatedOutputTokens,
          maxOutputTokens: promptPackage.tokenEstimate.maxOutputTokens,
          tokenStatus: promptPackage.tokenEstimate.status,
          messageCount: promptPackage.messages.length,
          promptOrderCount: promptPackage.promptInput.orders.length,
          hasHistoricalPackage: Boolean(promptPackage.promptInput.historicalPackage),
        }
      : undefined,
    cache: {
      readStatus: input.adapterResult.cacheRead?.status ?? "not_started",
      writeStatus: input.adapterResult.cacheWrite?.status ?? "not_started",
      decisionStatus: cacheContext?.cacheDecision.status ?? "disabled",
      decisionReasons: cacheContext?.cacheDecision.reasons ?? [],
      ttlHours: cacheContext?.cacheDecision.ttlHours ?? 0,
      cacheKey: cacheContext?.cacheKey.cacheKey,
    },
    provider: {
      allowProviderCall: input.allowProviderCall,
      apiCallMade: input.adapterResult.providerCall.status === "called",
      status: input.adapterResult.providerCall.status,
      reason: input.adapterResult.providerCall.reason,
      modelTier: input.adapterResult.providerCall.modelResolution.modelTier,
      modelProvider: model?.provider ?? cacheContext?.modelProvider,
      modelId: model?.modelId ?? cacheContext?.modelId,
      modelConfigured: Boolean(model?.configured),
    },
    liveCallGate,
    localCandidates: {
      dryRunStatus: dryRunResult?.status ?? "not_started",
      candidatePlanCount: dryRunResult?.candidatePlans.length ?? 0,
      finalistCandidateCount: dryRunResult?.finalistCandidates.length ?? 0,
      parsedAcceptedCandidateIds:
        dryRunResult?.candidateIds.parsedAcceptedCandidateIds ?? [],
      parsedRejectedCandidateIds:
        dryRunResult?.candidateIds.parsedRejectedCandidateIds ?? [],
      finalistCandidateIds: dryRunResult?.candidateIds.finalistCandidateIds ?? [],
      finalists:
        dryRunResult && dryRunResult.finalistCandidates.length > 0
          ? buildFinalistSummaries(
              dryRunResult.finalistCandidates,
              dryRunResult.localRankingResult
            )
          : undefined,
    },
    warnings: uniqueInOriginalOrder([
      ...input.historical.warnings,
      ...input.adapterResult.warnings,
    ]),
    errors: input.adapterResult.errors,
  };
}

export async function runDeliveryAgentLlmCandidatePlanningForDate(
  input: RunDeliveryAgentLlmCandidatePlanningForDateInput
): Promise<DeliveryAgentLlmCandidatePlanningResponse> {
  const deliveryDate = input.deliveryDate.trim();
  const profile = getDeliveryPlanningProfile(input.profileId);
  const providerRuntimeConfig =
    input.providerRuntimeConfig ?? resolveDeliveryAgentLlmProviderRuntimeConfig();
  const policy =
    input.policy ??
    createDeliveryAgentCostPolicyWithProviderRuntime({
      runtimeConfig: providerRuntimeConfig,
    });
  const orderPreview = await previewDeliveryOrdersForAgent(deliveryDate);

  if (!orderPreview.canContinueToPlanning) {
    throw new DeliveryAgentPlanningBlockedError(orderPreview.blockingReasons);
  }

  const { routing, coordinateCoverage } = await getEnrichedDeliveryOrdersForRouting({
    deliveryDate,
    profileId: profile.profileId,
    statuses: ["confirmed"],
  });

  if (routing.summary.invalidStops > 0) {
    throw new DeliveryAgentPlanningBlockedError([
      `${routing.summary.invalidStops} confirmed order(s) have blocking validation errors.`,
    ]);
  }

  if (routing.stops.length === 0) {
    throw new DeliveryAgentPlanningBlockedError([
      "No confirmed valid stops for this delivery date.",
    ]);
  }

  const coveragePercent = coordinateCoverage.coveragePercent ?? 0;
  const missingCount = coordinateCoverage.missingCount ?? (routing.stops.length - Math.round((coveragePercent / 100) * routing.stops.length));

  if (missingCount > 0) {
    throw new DeliveryAgentPlanningBlockedError([
      `${missingCount} stop(s) are missing coordinates after geocode enrichment (${Math.round(coveragePercent)}% coverage). ` +
        `Every stop must have coordinates — a single missing outlier stop significantly affects LLM planning quality. ` +
        `Resolve the missing address(es) before calling the LLM.`,
    ]);
  }

  const planningStops = toPlanningStops(routing.stops);
  const orderFacts = buildOrderFactsFromRoutingStops(routing.stops);
  const historical = await resolveHistoricalPackage({
    includeHistoricalPackage: input.includeHistoricalPackage !== false,
    deliveryDate,
    profile,
    orderFacts,
    policy,
  });
  const allowProviderCall = input.allowProviderCall === true;
  const adapterResult = await runDeliveryAgentLlmCandidateProviderAdapter({
    deliveryDate,
    profile,
    orders: orderFacts,
    planningStops,
    historicalPackage: historical.historicalPackage,
    policy,
    forceRefresh: input.forceRefresh,
    allowProviderCall,
    provider: input.provider,
    providerRuntimeConfig,
    enforceProviderRuntimeGate: true,
    nowMs: input.nowMs,
  });

  return mapAdapterToResponse({
    deliveryDate,
    profile,
    adapterResult,
    orderSummary: buildOrderSummary({
      stops: routing.stops,
      orderFacts,
      invalidStops: routing.summary.invalidStops,
      pendingOrders: orderPreview.pending.count,
    }),
    historical,
    allowProviderCall,
    policy,
    providerRuntimeConfig,
  });
}
