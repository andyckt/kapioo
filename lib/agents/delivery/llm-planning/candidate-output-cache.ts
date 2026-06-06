import { createHash } from "crypto";

import { resolveDeliveryAgentModelForCall } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import {
  buildDeliveryAgentLlmCacheKey,
  resolveDeliveryAgentLlmCacheDecision,
  stableStringify,
} from "@/lib/agents/delivery/llm-planning/planning-fingerprint";
import type {
  DeliveryAgentCostPolicy,
  DeliveryAgentLlmCallType,
  DeliveryAgentLlmModelResolution,
} from "@/lib/contracts/delivery-agent-cost-policy";
import type {
  DeliveryAgentLlmCacheDecision,
  DeliveryAgentLlmCacheKey,
  DeliveryAgentLlmCandidateOutputParseResult,
  DeliveryAgentLlmCandidateParseStatus,
  DeliveryAgentLlmPromptPackage,
} from "@/lib/contracts/delivery-agent-llm-planning";

export const DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_CACHE_RECORD_VERSION =
  "delivery-agent-llm-candidate-output-cache-record-v1" as const;

const CANDIDATE_OUTPUT_CACHE_MAX_ENTRIES = 50;

export type DeliveryAgentLlmCandidateOutputCacheContext = {
  cacheKey: DeliveryAgentLlmCacheKey;
  cacheDecision: DeliveryAgentLlmCacheDecision;
  modelResolution: DeliveryAgentLlmModelResolution;
  modelProvider: string;
  modelId: string;
};

export type DeliveryAgentLlmCandidateOutputCacheSource =
  | "provider_response"
  | "manual_seed"
  | "test_seed";

export type DeliveryAgentLlmCandidateOutputCacheRecord = {
  recordVersion: typeof DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_CACHE_RECORD_VERSION;
  cacheKey: DeliveryAgentLlmCacheKey;
  planningFingerprint: string;
  promptInputHash: string;
  orderSetHash: string;
  deliveryDate: string;
  profileId: string;
  profileVersion: string;
  modelProvider: string;
  modelId: string;
  parseStatus: DeliveryAgentLlmCandidateParseStatus;
  acceptedCandidateIds: string[];
  rejectedCandidateIds: string[];
  omittedCandidateIds: string[];
  rawCandidateOutput: unknown;
  outputHash: string;
  cachedAt: string;
  expiresAt: string;
  ttlHours: number;
  source: DeliveryAgentLlmCandidateOutputCacheSource;
};

export type DeliveryAgentLlmCandidateOutputCacheRecordSummary = Pick<
  DeliveryAgentLlmCandidateOutputCacheRecord,
  | "cacheKey"
  | "planningFingerprint"
  | "outputHash"
  | "cachedAt"
  | "expiresAt"
  | "ttlHours"
  | "source"
  | "parseStatus"
  | "acceptedCandidateIds"
>;

export type DeliveryAgentLlmCandidateOutputCacheReadStatus =
  | "disabled"
  | "miss"
  | "hit"
  | "stale";

export type DeliveryAgentLlmCandidateOutputCacheWriteStatus =
  | "written"
  | "disabled"
  | "skipped_invalid_output"
  | "skipped_fingerprint_mismatch";

export type DeliveryAgentLlmCandidateOutputCacheReadResult = {
  status: DeliveryAgentLlmCandidateOutputCacheReadStatus;
  context: DeliveryAgentLlmCandidateOutputCacheContext;
  record: DeliveryAgentLlmCandidateOutputCacheRecord | null;
  staleRecord?: DeliveryAgentLlmCandidateOutputCacheRecordSummary;
  warnings: string[];
};

export type DeliveryAgentLlmCandidateOutputCacheWriteResult = {
  status: DeliveryAgentLlmCandidateOutputCacheWriteStatus;
  context: DeliveryAgentLlmCandidateOutputCacheContext;
  record: DeliveryAgentLlmCandidateOutputCacheRecord | null;
  warnings: string[];
};

type CacheEntry = {
  record: DeliveryAgentLlmCandidateOutputCacheRecord;
  cachedAtMs: number;
  expiresAtMs: number;
};

const globalCandidateOutputCache = globalThis as typeof globalThis & {
  __kapiooDeliveryAgentLlmCandidateOutputCache?: Map<string, CacheEntry>;
};

const cache =
  globalCandidateOutputCache.__kapiooDeliveryAgentLlmCandidateOutputCache ??
  new Map<string, CacheEntry>();

globalCandidateOutputCache.__kapiooDeliveryAgentLlmCandidateOutputCache = cache;

function cloneRecord(
  record: DeliveryAgentLlmCandidateOutputCacheRecord
): DeliveryAgentLlmCandidateOutputCacheRecord {
  return JSON.parse(JSON.stringify(record)) as DeliveryAgentLlmCandidateOutputCacheRecord;
}

function hashValue(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 32);
}

function summarizeRecord(
  record: DeliveryAgentLlmCandidateOutputCacheRecord
): DeliveryAgentLlmCandidateOutputCacheRecordSummary {
  return {
    cacheKey: record.cacheKey,
    planningFingerprint: record.planningFingerprint,
    outputHash: record.outputHash,
    cachedAt: record.cachedAt,
    expiresAt: record.expiresAt,
    ttlHours: record.ttlHours,
    source: record.source,
    parseStatus: record.parseStatus,
    acceptedCandidateIds: [...record.acceptedCandidateIds],
  };
}

function resolveModelKeyParts(input: {
  policy: DeliveryAgentCostPolicy;
  callType: DeliveryAgentLlmCallType;
  modelProvider?: string;
  modelId?: string;
}): {
  modelResolution: DeliveryAgentLlmModelResolution;
  modelProvider: string;
  modelId: string;
} {
  const modelResolution = resolveDeliveryAgentModelForCall(input.policy, input.callType);

  if (input.modelProvider || input.modelId) {
    return {
      modelResolution,
      modelProvider: input.modelProvider ?? modelResolution.model?.provider ?? "manual",
      modelId: input.modelId ?? modelResolution.model?.modelId ?? "manual-model",
    };
  }

  return {
    modelResolution,
    modelProvider:
      modelResolution.model?.provider ??
      `disabled:${modelResolution.disabledReason ?? "unknown"}`,
    modelId:
      modelResolution.model?.modelId ??
      `disabled:${modelResolution.modelTier}:${modelResolution.disabledReason ?? "unknown"}`,
  };
}

function recordMatchesContext(input: {
  record: DeliveryAgentLlmCandidateOutputCacheRecord;
  context: DeliveryAgentLlmCandidateOutputCacheContext;
}): boolean {
  return (
    input.record.recordVersion ===
      DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_CACHE_RECORD_VERSION &&
    input.record.cacheKey.cacheKey === input.context.cacheKey.cacheKey &&
    input.record.planningFingerprint === input.context.cacheKey.planningFingerprint &&
    input.record.cacheKey.callType === input.context.cacheKey.callType &&
    input.record.cacheKey.modelProvider === input.context.cacheKey.modelProvider &&
    input.record.cacheKey.modelId === input.context.cacheKey.modelId &&
    input.record.cacheKey.outputSchemaVersion === input.context.cacheKey.outputSchemaVersion
  );
}

function pruneOldestEntries(): void {
  while (cache.size > CANDIDATE_OUTPUT_CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    cache.delete(oldestKey);
  }
}

function buildRecord(input: {
  context: DeliveryAgentLlmCandidateOutputCacheContext;
  promptPackage: DeliveryAgentLlmPromptPackage;
  parseResult: DeliveryAgentLlmCandidateOutputParseResult;
  rawCandidateOutput: unknown;
  nowMs: number;
  source: DeliveryAgentLlmCandidateOutputCacheSource;
}): DeliveryAgentLlmCandidateOutputCacheRecord {
  const expiresAtMs = input.nowMs + input.context.cacheDecision.ttlHours * 60 * 60 * 1000;

  return {
    recordVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_CACHE_RECORD_VERSION,
    cacheKey: input.context.cacheKey,
    planningFingerprint: input.promptPackage.planningFingerprint.planningFingerprint,
    promptInputHash: input.promptPackage.planningFingerprint.promptInputHash,
    orderSetHash: input.promptPackage.planningFingerprint.orderSetHash,
    deliveryDate: input.promptPackage.deliveryDate,
    profileId: input.promptPackage.profileId,
    profileVersion: input.promptPackage.profileVersion,
    modelProvider: input.context.modelProvider,
    modelId: input.context.modelId,
    parseStatus: input.parseResult.status,
    acceptedCandidateIds: input.parseResult.acceptedCandidates.map(
      (candidate) => candidate.candidateId
    ),
    rejectedCandidateIds: input.parseResult.rejectedCandidates.map(
      (candidate) => candidate.candidateId
    ),
    omittedCandidateIds: input.parseResult.omittedCandidates.map(
      (candidate) => candidate.candidateId
    ),
    rawCandidateOutput: input.rawCandidateOutput,
    outputHash: hashValue(input.rawCandidateOutput),
    cachedAt: new Date(input.nowMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    ttlHours: input.context.cacheDecision.ttlHours,
    source: input.source,
  };
}

export function resolveDeliveryAgentLlmCandidateOutputCacheContext(input: {
  promptPackage: DeliveryAgentLlmPromptPackage;
  policy: DeliveryAgentCostPolicy;
  callType?: DeliveryAgentLlmCallType;
  forceRefresh?: boolean;
  modelProvider?: string;
  modelId?: string;
}): DeliveryAgentLlmCandidateOutputCacheContext {
  const callType = input.callType ?? input.promptPackage.callType;
  const model = resolveModelKeyParts({
    policy: input.policy,
    callType,
    modelProvider: input.modelProvider,
    modelId: input.modelId,
  });
  const cacheKey = buildDeliveryAgentLlmCacheKey({
    fingerprint: input.promptPackage.planningFingerprint,
    callType,
    modelProvider: model.modelProvider,
    modelId: model.modelId,
    outputSchemaVersion: input.promptPackage.outputSchemaVersion,
  });

  return {
    cacheKey,
    cacheDecision: resolveDeliveryAgentLlmCacheDecision({
      policy: input.policy,
      callType,
      forceRefresh: input.forceRefresh,
    }),
    modelResolution: model.modelResolution,
    modelProvider: model.modelProvider,
    modelId: model.modelId,
  };
}

export function readDeliveryAgentLlmCandidateOutputCache(input: {
  context: DeliveryAgentLlmCandidateOutputCacheContext;
  nowMs?: number;
}): DeliveryAgentLlmCandidateOutputCacheReadResult {
  if (input.context.cacheDecision.status === "disabled") {
    return {
      status: "disabled",
      context: input.context,
      record: null,
      warnings: input.context.cacheDecision.reasons.map(
        (reason) => `LLM candidate output cache disabled: ${reason}.`
      ),
    };
  }

  const entry = cache.get(input.context.cacheKey.cacheKey);
  if (!entry) {
    return {
      status: "miss",
      context: input.context,
      record: null,
      warnings: [],
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  if (entry.expiresAtMs <= nowMs) {
    cache.delete(input.context.cacheKey.cacheKey);
    return {
      status: "stale",
      context: input.context,
      record: null,
      staleRecord: summarizeRecord(entry.record),
      warnings: ["Cached LLM candidate output expired and was removed."],
    };
  }

  if (!recordMatchesContext({ record: entry.record, context: input.context })) {
    cache.delete(input.context.cacheKey.cacheKey);
    return {
      status: "miss",
      context: input.context,
      record: null,
      warnings: ["Cached LLM candidate output did not match the current context and was removed."],
    };
  }

  return {
    status: "hit",
    context: input.context,
    record: cloneRecord(entry.record),
    warnings: [],
  };
}

export function writeDeliveryAgentLlmCandidateOutputCache(input: {
  context: DeliveryAgentLlmCandidateOutputCacheContext;
  promptPackage: DeliveryAgentLlmPromptPackage;
  parseResult: DeliveryAgentLlmCandidateOutputParseResult;
  rawCandidateOutput: unknown;
  nowMs?: number;
  source?: DeliveryAgentLlmCandidateOutputCacheSource;
}): DeliveryAgentLlmCandidateOutputCacheWriteResult {
  if (input.context.cacheDecision.status === "disabled") {
    return {
      status: "disabled",
      context: input.context,
      record: null,
      warnings: input.context.cacheDecision.reasons.map(
        (reason) => `LLM candidate output cache write disabled: ${reason}.`
      ),
    };
  }

  if (input.parseResult.status === "invalid") {
    return {
      status: "skipped_invalid_output",
      context: input.context,
      record: null,
      warnings: ["Invalid LLM candidate output was not cached."],
    };
  }

  if (
    input.parseResult.planningFingerprint !==
    input.promptPackage.planningFingerprint.planningFingerprint
  ) {
    return {
      status: "skipped_fingerprint_mismatch",
      context: input.context,
      record: null,
      warnings: ["LLM candidate output parse result did not match the prompt fingerprint."],
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  const record = buildRecord({
    context: input.context,
    promptPackage: input.promptPackage,
    parseResult: input.parseResult,
    rawCandidateOutput: input.rawCandidateOutput,
    nowMs,
    source: input.source ?? "provider_response",
  });
  const expiresAtMs = nowMs + input.context.cacheDecision.ttlHours * 60 * 60 * 1000;

  cache.set(input.context.cacheKey.cacheKey, {
    record: cloneRecord(record),
    cachedAtMs: nowMs,
    expiresAtMs,
  });
  pruneOldestEntries();

  return {
    status: "written",
    context: input.context,
    record: cloneRecord(record),
    warnings: [],
  };
}

export function clearDeliveryAgentLlmCandidateOutputCacheForTests(): void {
  if (process.env.NODE_ENV === "test") {
    cache.clear();
  }
}
