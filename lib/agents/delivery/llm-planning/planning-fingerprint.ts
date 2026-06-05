import { createHash } from "crypto";

import { getDeliveryAgentLlmCallPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import {
  DELIVERY_AGENT_LLM_CACHE_KEY_VERSION,
  DELIVERY_AGENT_LLM_PLANNING_FINGERPRINT_VERSION,
  type DeliveryAgentLlmCacheDecision,
  type DeliveryAgentLlmCacheKey,
  type DeliveryAgentLlmCacheKeyInput,
  type DeliveryAgentPlanningFingerprint,
  type DeliveryAgentPlanningFingerprintFeedback,
  type DeliveryAgentPlanningFingerprintHistoricalPackage,
  type DeliveryAgentPlanningFingerprintInput,
  type DeliveryAgentPlanningFingerprintOrderFact,
  type DeliveryAgentPlanningFingerprintProfileRef,
  deliveryAgentPlanningFingerprintInputSchema,
} from "@/lib/contracts/delivery-agent-llm-planning";
import type {
  DeliveryAgentCostPolicy,
  DeliveryAgentLlmCallType,
} from "@/lib/contracts/delivery-agent-cost-policy";

type StableValue =
  | null
  | string
  | number
  | boolean
  | StableValue[]
  | { [key: string]: StableValue };

export class DeliveryAgentPlanningFingerprintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryAgentPlanningFingerprintError";
  }
}

function hashValue(value: unknown, length = 32): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, length);
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized || undefined;
}

function normalizeTextList(values: string[] | undefined): string[] | undefined {
  const normalized = [...new Set((values ?? []).map(normalizeText).filter(Boolean) as string[])];
  normalized.sort((left, right) => left.localeCompare(right));
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCoordinate(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Number(value.toFixed(6));
}

function normalizeNumber(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stableValue(value: unknown): StableValue {
  if (value === undefined) {
    return null;
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Map) {
    return [...value.entries()]
      .sort(([left], [right]) => String(left).localeCompare(String(right)))
      .map(([key, entryValue]) => [stableValue(key), stableValue(entryValue)]);
  }

  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, stableValue(entryValue)])
    );
  }

  return String(value);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function normalizeProfile(
  profile: DeliveryAgentPlanningFingerprintProfileRef
): Record<string, unknown> {
  return {
    profileId: normalizeText(profile.profileId),
    profileVersion: normalizeText(profile.profileVersion),
    resourceProfileVersion: normalizeText(profile.resourceProfileVersion),
    planningRulesVersion: normalizeText(profile.planningRulesVersion),
  };
}

function normalizeOrderFact(
  order: DeliveryAgentPlanningFingerprintOrderFact
): Record<string, unknown> {
  return {
    orderId: normalizeText(order.orderId),
    status: normalizeText(order.status),
    area: normalizeText(order.area),
    formattedAddress: normalizeText(order.formattedAddress),
    normalizedAddress: normalizeText(order.normalizedAddress),
    deliveryWindow: normalizeText(order.deliveryWindow),
    totalMealQuantity: normalizeNumber(order.totalMealQuantity),
    lat: normalizeCoordinate(order.lat),
    lng: normalizeCoordinate(order.lng),
    coordinateStatus: normalizeText(order.coordinateStatus),
    coordinateSource: normalizeText(order.coordinateSource),
    coordinateConfidence: normalizeText(order.coordinateConfidence),
    planningTags: normalizeTextList(order.planningTags),
  };
}

function normalizeOrders(
  orders: DeliveryAgentPlanningFingerprintOrderFact[]
): Record<string, unknown>[] {
  return orders
    .map(normalizeOrderFact)
    .sort((left, right) =>
      String(left.orderId ?? "").localeCompare(String(right.orderId ?? ""))
    );
}

function assertUniqueOrderIds(orders: Record<string, unknown>[]): void {
  const seen = new Set<string>();

  for (const order of orders) {
    const orderId = String(order.orderId ?? "");
    if (seen.has(orderId)) {
      throw new DeliveryAgentPlanningFingerprintError(
        `Duplicate orderId ${orderId} cannot be used in an LLM planning fingerprint.`
      );
    }
    seen.add(orderId);
  }
}

function normalizeHistoricalPackage(
  historicalPackage: DeliveryAgentPlanningFingerprintHistoricalPackage | undefined
): Record<string, unknown> | undefined {
  if (!historicalPackage) {
    return undefined;
  }

  return {
    packageVersion: normalizeText(historicalPackage.packageVersion),
    retrievalHash: normalizeText(historicalPackage.retrievalHash),
    selectedCaseIds: normalizeTextList(historicalPackage.selectedCaseIds),
    compactLessonHash: normalizeText(historicalPackage.compactLessonHash),
  };
}

function normalizeFeedback(
  feedback: DeliveryAgentPlanningFingerprintFeedback | undefined
): Record<string, unknown> | undefined {
  if (!feedback) {
    return undefined;
  }

  return {
    rejectionAttemptNumber: normalizeNumber(feedback.rejectionAttemptNumber),
    rejectedCandidateId: normalizeText(feedback.rejectedCandidateId),
    rejectedPlanHash: normalizeText(feedback.rejectedPlanHash),
    feedbackText: normalizeText(feedback.feedbackText),
    feedbackTags: normalizeTextList(feedback.feedbackTags),
    interpretedFeedbackHash: normalizeText(feedback.interpretedFeedbackHash),
    sourceFeedbackReviewedAt: normalizeText(feedback.sourceFeedbackReviewedAt),
  };
}

export function buildDeliveryAgentPlanningFingerprint(
  rawInput: DeliveryAgentPlanningFingerprintInput
): DeliveryAgentPlanningFingerprint {
  const input = deliveryAgentPlanningFingerprintInputSchema.parse(rawInput);
  const normalizedOrders = normalizeOrders(input.orders);
  assertUniqueOrderIds(normalizedOrders);
  const orderSetHash = hashValue({
    deliveryDate: normalizeText(input.deliveryDate),
    orders: normalizedOrders,
  });

  const promptInput = {
    fingerprintVersion: DELIVERY_AGENT_LLM_PLANNING_FINGERPRINT_VERSION,
    scope: input.scope,
    deliveryDate: normalizeText(input.deliveryDate),
    promptVersion: normalizeText(input.promptVersion),
    hardRulesVersion: normalizeText(input.hardRulesVersion),
    costPolicyVersion: normalizeText(input.costPolicyVersion),
    modelRoutingPolicyVersion: normalizeText(input.modelRoutingPolicyVersion),
    profile: normalizeProfile(input.profile),
    orderSetHash,
    historicalPackage: normalizeHistoricalPackage(input.historicalPackage),
    localCandidateSeedHash: normalizeText(input.localCandidateSeedHash),
    previousFailureHash: normalizeText(input.previousFailureHash),
    feedback: normalizeFeedback(input.feedback),
  };

  const promptInputHash = hashValue(promptInput);
  const planningFingerprint = hashValue({
    fingerprintVersion: DELIVERY_AGENT_LLM_PLANNING_FINGERPRINT_VERSION,
    promptInputHash,
  });

  return {
    fingerprintVersion: DELIVERY_AGENT_LLM_PLANNING_FINGERPRINT_VERSION,
    scope: input.scope,
    deliveryDate: input.deliveryDate,
    promptVersion: input.promptVersion,
    profileId: input.profile.profileId,
    profileVersion: input.profile.profileVersion,
    orderCount: input.orders.length,
    orderSetHash,
    promptInputHash,
    planningFingerprint,
    cacheKeyBase: `delivery-agent:llm-plan:${input.scope}:${planningFingerprint}`,
  };
}

export function buildDeliveryAgentLlmCacheKey(
  input: DeliveryAgentLlmCacheKeyInput
): DeliveryAgentLlmCacheKey {
  const signature = {
    cacheKeyVersion: DELIVERY_AGENT_LLM_CACHE_KEY_VERSION,
    planningFingerprint: input.fingerprint.planningFingerprint,
    callType: input.callType,
    modelProvider: normalizeText(input.modelProvider),
    modelId: normalizeText(input.modelId),
    outputSchemaVersion: normalizeText(input.outputSchemaVersion),
  };
  const cacheHash = hashValue(signature);

  return {
    cacheKeyVersion: DELIVERY_AGENT_LLM_CACHE_KEY_VERSION,
    cacheKey: `${input.fingerprint.cacheKeyBase}:${input.callType}:${cacheHash}`,
    planningFingerprint: input.fingerprint.planningFingerprint,
    callType: input.callType,
    modelProvider: input.modelProvider,
    modelId: input.modelId,
    outputSchemaVersion: input.outputSchemaVersion,
  };
}

export function resolveDeliveryAgentLlmCacheDecision(input: {
  policy: DeliveryAgentCostPolicy;
  callType: DeliveryAgentLlmCallType;
  forceRefresh?: boolean;
}): DeliveryAgentLlmCacheDecision {
  const reasons: string[] = [];
  const callPolicy = getDeliveryAgentLlmCallPolicy(input.policy, input.callType);

  if (input.forceRefresh) {
    reasons.push("force_refresh_requested");
  }

  if (input.policy.mode === "llm_disabled") {
    reasons.push("llm_disabled");
  }

  if (input.policy.mode === "dry_run") {
    reasons.push("dry_run");
  }

  if (!callPolicy.defaultEnabled) {
    reasons.push("call_disabled_by_policy");
  }

  if (!callPolicy.cacheable) {
    reasons.push("call_not_cacheable");
  }

  if (input.policy.cacheTtlHours <= 0) {
    reasons.push("cache_ttl_disabled");
  }

  return {
    status: reasons.length === 0 ? "enabled" : "disabled",
    ttlHours: Math.max(input.policy.cacheTtlHours, 0),
    reasons,
  };
}
