import { createHash } from "crypto";
import type {
  DeliveryAgentCandidatePlan,
  DeliveryAgentPreviewCacheSummary,
  DeliveryAgentPreviewCandidatePlansResponse,
} from "@/lib/contracts/delivery-agent";
import type { PlanningHints } from "@/lib/agents/delivery/feedback/planning-hints";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type { DeliveryAgentPreviewBudgetAction } from "@/lib/agents/delivery/candidate-plans/preview-budget";
import type { DeliveryAgentCoordinateCoverageSummary } from "@/lib/agents/delivery/geocode/types";

const PREVIEW_CACHE_TTL_MS = 10 * 60 * 1000;
const PREVIEW_CACHE_MAX_ENTRIES = 25;

type CacheEntry = {
  response: DeliveryAgentPreviewCandidatePlansResponse;
  cachedAtMs: number;
  expiresAtMs: number;
};

const globalPreviewCache = globalThis as typeof globalThis & {
  __kapiooDeliveryAgentCandidatePreviewCache?: Map<string, CacheEntry>;
};

const cache =
  globalPreviewCache.__kapiooDeliveryAgentCandidatePreviewCache ??
  new Map<string, CacheEntry>();

globalPreviewCache.__kapiooDeliveryAgentCandidatePreviewCache = cache;

export type CandidatePreviewCacheKeyInput = {
  deliveryDate: string;
  profileId: string;
  profileVersion: string;
  deliveryAgentRunId?: string;
  action: DeliveryAgentPreviewBudgetAction;
  budgetConfig?: unknown;
  planningHints?: PlanningHints;
  candidates: DeliveryAgentCandidatePlan[];
  routingStops: RoutingStop[];
  coordinateCoverage?: DeliveryAgentCoordinateCoverageSummary;
};

function stableValue(value: unknown): unknown {
  if (value instanceof Map) {
    return [...value.entries()]
      .sort(([left], [right]) => String(left).localeCompare(String(right)))
      .map(([key, entryValue]) => [key, stableValue(entryValue)]);
  }

  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, stableValue(entryValue)])
    );
  }

  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function summarizeRoutingStop(stop: RoutingStop): Record<string, unknown> {
  return {
    orderId: stop.orderId,
    mongoId: stop.mongoId,
    status: stop.status,
    area: stop.area,
    formattedAddress: stop.formattedAddress,
    customerName: stop.customerName,
    customerPhone: stop.customerPhone,
    deliveryDate: stop.deliveryDate,
    deliveryWindow: stop.deliveryWindow,
    totalMealQuantity: stop.totalMealQuantity,
    lat: stop.lat,
    lng: stop.lng,
    coordinateStatus: stop.coordinateStatus,
    coordinateSource: stop.coordinateSource,
    coordinateConfidence: stop.coordinateConfidence,
    routeOptimizer: stop.routeOptimizer,
  };
}

function summarizeCandidatePlan(candidate: DeliveryAgentCandidatePlan): Record<string, unknown> {
  return {
    candidateId: candidate.candidateId,
    strategyType: candidate.strategyType,
    profileId: candidate.profileId,
    profileVersion: candidate.profileVersion,
    deliveryDate: candidate.deliveryDate,
    runs: candidate.runs.map((run) => ({
      runSlot: run.runSlot,
      role: run.role,
      startType: run.startType,
      stopCount: run.stopCount,
      totalMealQuantity: run.totalMealQuantity,
      areaBreakdown: run.areaBreakdown,
      stops: run.stops.map((stop) => ({
        orderId: stop.orderId,
        area: stop.area,
        formattedAddress: stop.formattedAddress,
        totalMealQuantity: stop.totalMealQuantity,
        planningTags: stop.planningTags,
        lat: stop.lat,
        lng: stop.lng,
      })),
      constraintPlan: run.constraintPlan,
    })),
    summary: {
      totalStops: candidate.summary.totalStops,
      totalMeals: candidate.summary.totalMeals,
      runCount: candidate.summary.runCount,
      selfUsed: candidate.summary.selfUsed,
      selfStopCount: candidate.summary.selfStopCount,
      byRun: candidate.summary.byRun,
      northYorkSplit: candidate.summary.northYorkSplit,
    },
    handoffPlan: candidate.handoffPlan,
    constraintPlan: candidate.constraintPlan,
    warnings: candidate.warnings,
    assumptions: candidate.assumptions,
  };
}

export function buildCandidatePreviewCacheKey(input: CandidatePreviewCacheKeyInput): string {
  const signature = {
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
    profileVersion: input.profileVersion,
    deliveryAgentRunId: input.deliveryAgentRunId,
    action: input.action,
    budgetConfig: input.budgetConfig,
    planningHints: input.planningHints,
    candidates: input.candidates.map(summarizeCandidatePlan),
    routingStops: input.routingStops.map(summarizeRoutingStop),
    coordinateCoverage: input.coordinateCoverage,
  };

  return createHash("sha256").update(stableStringify(signature)).digest("hex").slice(0, 32);
}

function cloneResponse(
  response: DeliveryAgentPreviewCandidatePlansResponse
): DeliveryAgentPreviewCandidatePlansResponse {
  return JSON.parse(JSON.stringify(response)) as DeliveryAgentPreviewCandidatePlansResponse;
}

function buildSummary(input: {
  status: DeliveryAgentPreviewCacheSummary["status"];
  cacheKey: string;
  cachedAtMs?: number;
  expiresAtMs?: number;
}): DeliveryAgentPreviewCacheSummary {
  return {
    status: input.status,
    cacheKey: input.cacheKey,
    cachedAt: input.cachedAtMs ? new Date(input.cachedAtMs).toISOString() : undefined,
    expiresAt: input.expiresAtMs ? new Date(input.expiresAtMs).toISOString() : undefined,
    ttlSeconds: Math.round(PREVIEW_CACHE_TTL_MS / 1000),
    note:
      input.status === "hit"
        ? "Reused a recent matching candidate preview; no Route Optimizer preview calls were sent for this cached result."
        : "No matching recent candidate preview cache entry was used.",
  };
}

export function readCandidatePreviewCache(
  cacheKey: string,
  options: {
    nowMs?: number;
    correlationId?: string;
  } = {}
): DeliveryAgentPreviewCandidatePlansResponse | null {
  const nowMs = options.nowMs ?? Date.now();
  const entry = cache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (entry.expiresAtMs <= nowMs) {
    cache.delete(cacheKey);
    return null;
  }

  const response = cloneResponse(entry.response);
  if (options.correlationId && response.costGuardrail) {
    response.costGuardrail.correlationId = options.correlationId;
  }
  response.previewCache = buildSummary({
    status: "hit",
    cacheKey,
    cachedAtMs: entry.cachedAtMs,
    expiresAtMs: entry.expiresAtMs,
  });
  return response;
}

export function writeCandidatePreviewCache(input: {
  cacheKey: string;
  response: DeliveryAgentPreviewCandidatePlansResponse;
  nowMs?: number;
}): DeliveryAgentPreviewCandidatePlansResponse {
  const nowMs = input.nowMs ?? Date.now();
  const expiresAtMs = nowMs + PREVIEW_CACHE_TTL_MS;
  const response = cloneResponse(input.response);

  response.previewCache = buildSummary({
    status: "miss",
    cacheKey: input.cacheKey,
    cachedAtMs: nowMs,
    expiresAtMs,
  });

  cache.set(input.cacheKey, {
    response,
    cachedAtMs: nowMs,
    expiresAtMs,
  });

  while (cache.size > PREVIEW_CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    cache.delete(oldestKey);
  }

  return cloneResponse(response);
}

export function markCandidatePreviewCacheMiss(input: {
  cacheKey: string;
  response: DeliveryAgentPreviewCandidatePlansResponse;
}): DeliveryAgentPreviewCandidatePlansResponse {
  return {
    ...input.response,
    previewCache: buildSummary({
      status: "miss",
      cacheKey: input.cacheKey,
    }),
  };
}

export function clearCandidatePreviewCacheForTests(): void {
  if (process.env.NODE_ENV === "test") {
    cache.clear();
  }
}
