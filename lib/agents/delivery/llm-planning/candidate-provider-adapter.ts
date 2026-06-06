import {
  readDeliveryAgentLlmCandidateOutputCache,
  resolveDeliveryAgentLlmCandidateOutputCacheContext,
  writeDeliveryAgentLlmCandidateOutputCache,
  type DeliveryAgentLlmCandidateOutputCacheContext,
  type DeliveryAgentLlmCandidateOutputCacheReadResult,
  type DeliveryAgentLlmCandidateOutputCacheWriteResult,
} from "@/lib/agents/delivery/llm-planning/candidate-output-cache";
import {
  runDeliveryAgentLlmCandidatePlanningDryRun,
  type DeliveryAgentLlmCandidatePlanningDryRunCandidateIds,
  type DeliveryAgentLlmCandidatePlanningDryRunResult,
  type RunDeliveryAgentLlmCandidatePlanningDryRunInput,
} from "@/lib/agents/delivery/llm-planning/candidate-planning-dry-run";
import {
  buildDeliveryAgentLlmPromptPackage,
  type BuildDeliveryAgentLlmPromptPackageInput,
} from "@/lib/agents/delivery/llm-planning/prompt-assembly";
import {
  resolveDeliveryAgentLlmLiveCallGate,
  type DeliveryAgentLlmProviderRuntimeConfig,
} from "@/lib/agents/delivery/llm-planning/provider-readiness";
import type { CandidatePlan, PlanningStop } from "@/lib/agents/delivery/candidate-plans/types";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { DeliveryAgentLlmCandidatePlanningLiveCallGate } from "@/lib/contracts/delivery-agent";
import type {
  DeliveryAgentCostPolicy,
  DeliveryAgentLlmCallType,
  DeliveryAgentLlmModelResolution,
} from "@/lib/contracts/delivery-agent-cost-policy";
import type {
  DeliveryAgentCompactHistoricalPackage,
  DeliveryAgentLlmCacheDecision,
  DeliveryAgentLlmCacheKey,
  DeliveryAgentLlmPlanningScope,
  DeliveryAgentLlmPromptMessage,
  DeliveryAgentLlmPromptPackage,
  DeliveryAgentPlanningFingerprintFeedback,
  DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";

export const DELIVERY_AGENT_LLM_CANDIDATE_PROVIDER_ADAPTER_VERSION =
  "delivery-agent-llm-candidate-provider-adapter-v1" as const;

export type DeliveryAgentLlmCandidateProviderAdapterStatus =
  | "cache_hit"
  | "ready_for_provider"
  | "provider_completed"
  | "provider_completed_not_cached"
  | "blocked";

export type DeliveryAgentLlmCandidateProviderCallStatus =
  | "not_allowed"
  | "not_configured"
  | "not_needed_cache_hit"
  | "blocked_by_policy"
  | "blocked_by_token_limit"
  | "called"
  | "failed";

export type DeliveryAgentLlmCandidateProviderUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type DeliveryAgentLlmCandidateProviderRequest = {
  promptPackage: DeliveryAgentLlmPromptPackage;
  callType: DeliveryAgentLlmCallType;
  modelProvider: string;
  modelId: string;
  messages: DeliveryAgentLlmPromptMessage[];
  responseFormat: "json_object";
  maxInputTokens: number;
  maxOutputTokens: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  cacheKey: DeliveryAgentLlmCacheKey;
  planningFingerprint: string;
};

export type DeliveryAgentLlmCandidateProviderResponse = {
  rawCandidateOutput: unknown;
  providerRequestId?: string;
  usage?: DeliveryAgentLlmCandidateProviderUsage;
  warnings?: string[];
};

export type DeliveryAgentLlmCandidateProviderExecutor = (
  request: DeliveryAgentLlmCandidateProviderRequest
) => Promise<DeliveryAgentLlmCandidateProviderResponse> | DeliveryAgentLlmCandidateProviderResponse;

export type DeliveryAgentLlmCandidateProviderCall = {
  status: DeliveryAgentLlmCandidateProviderCallStatus;
  reason: string;
  callType: DeliveryAgentLlmCallType;
  modelResolution: DeliveryAgentLlmModelResolution;
  cacheDecision: DeliveryAgentLlmCacheDecision;
  providerRequestId?: string;
  usage?: DeliveryAgentLlmCandidateProviderUsage;
  warnings: string[];
  errors: string[];
};

export type RunDeliveryAgentLlmCandidateProviderAdapterInput = {
  scope?: DeliveryAgentLlmPlanningScope;
  callType?: DeliveryAgentLlmCallType;
  deliveryDate: string;
  promptVersion?: string;
  profile: DeliveryPlanningProfile;
  orders: DeliveryAgentPlanningFingerprintOrderFact[];
  planningStops: PlanningStop[];
  historicalPackage?: DeliveryAgentCompactHistoricalPackage;
  policy: DeliveryAgentCostPolicy;
  feedback?: DeliveryAgentPlanningFingerprintFeedback;
  localCandidateSeedHash?: string;
  previousFailureHash?: string;
  forceRefresh?: boolean;
  modelProvider?: string;
  modelId?: string;
  allowProviderCall?: boolean;
  provider?: DeliveryAgentLlmCandidateProviderExecutor;
  providerRuntimeConfig?: DeliveryAgentLlmProviderRuntimeConfig;
  enforceProviderRuntimeGate?: boolean;
  nowMs?: number;
  maxAcceptedCandidates?: number;
  maxCandidatePlans?: number;
  maxFinalists?: number;
  minPreferredScore?: number;
  includeLowScoreFallback?: boolean;
};

export type DeliveryAgentLlmCandidateProviderAdapterResult = {
  pipelineVersion: typeof DELIVERY_AGENT_LLM_CANDIDATE_PROVIDER_ADAPTER_VERSION;
  status: DeliveryAgentLlmCandidateProviderAdapterStatus;
  deliveryDate: string;
  profileId: string;
  profileVersion: string;
  planningFingerprint?: string;
  promptPackage?: DeliveryAgentLlmPromptPackage;
  cacheContext?: DeliveryAgentLlmCandidateOutputCacheContext;
  cacheRead?: DeliveryAgentLlmCandidateOutputCacheReadResult;
  cacheWrite?: DeliveryAgentLlmCandidateOutputCacheWriteResult;
  dryRunResult?: DeliveryAgentLlmCandidatePlanningDryRunResult;
  liveCallGate?: DeliveryAgentLlmCandidatePlanningLiveCallGate;
  providerCall: DeliveryAgentLlmCandidateProviderCall;
  candidatePlans: CandidatePlan[];
  finalistCandidates: CandidatePlan[];
  candidateIds?: DeliveryAgentLlmCandidatePlanningDryRunCandidateIds;
  warnings: string[];
  errors: string[];
};

function uniqueInOriginalOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    unique.push(value);
  }

  return unique;
}

function messageFromUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildPromptPackageInput(
  input: RunDeliveryAgentLlmCandidateProviderAdapterInput,
  callType: DeliveryAgentLlmCallType
): BuildDeliveryAgentLlmPromptPackageInput {
  return {
    scope: input.scope,
    callType,
    deliveryDate: input.deliveryDate,
    promptVersion: input.promptVersion,
    profile: input.profile,
    orders: input.orders,
    historicalPackage: input.historicalPackage,
    policy: input.policy,
    feedback: input.feedback,
    localCandidateSeedHash: input.localCandidateSeedHash,
    previousFailureHash: input.previousFailureHash,
  };
}

function buildDryRunInput(
  input: RunDeliveryAgentLlmCandidateProviderAdapterInput,
  callType: DeliveryAgentLlmCallType,
  rawCandidateOutput?: unknown
): RunDeliveryAgentLlmCandidatePlanningDryRunInput {
  return {
    scope: input.scope,
    callType,
    deliveryDate: input.deliveryDate,
    promptVersion: input.promptVersion,
    profile: input.profile,
    orders: input.orders,
    planningStops: input.planningStops,
    historicalPackage: input.historicalPackage,
    policy: input.policy,
    feedback: input.feedback,
    localCandidateSeedHash: input.localCandidateSeedHash,
    previousFailureHash: input.previousFailureHash,
    rawCandidateOutput,
    forceRefresh: input.forceRefresh,
    maxAcceptedCandidates: input.maxAcceptedCandidates,
    maxCandidatePlans: input.maxCandidatePlans,
    maxFinalists: input.maxFinalists,
    minPreferredScore: input.minPreferredScore,
    includeLowScoreFallback: input.includeLowScoreFallback,
  };
}

function buildProviderCall(input: {
  status: DeliveryAgentLlmCandidateProviderCallStatus;
  reason: string;
  context: DeliveryAgentLlmCandidateOutputCacheContext;
  providerRequestId?: string;
  usage?: DeliveryAgentLlmCandidateProviderUsage;
  warnings?: string[];
  errors?: string[];
}): DeliveryAgentLlmCandidateProviderCall {
  return {
    status: input.status,
    reason: input.reason,
    callType: input.context.cacheKey.callType,
    modelResolution: input.context.modelResolution,
    cacheDecision: input.context.cacheDecision,
    providerRequestId: input.providerRequestId,
    usage: input.usage,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  };
}

function buildPromptBlockedProviderCall(input: {
  callType: DeliveryAgentLlmCallType;
  dryRunResult: DeliveryAgentLlmCandidatePlanningDryRunResult;
}): DeliveryAgentLlmCandidateProviderCall {
  return {
    status: "blocked_by_policy",
    reason: "prompt_assembly_failed",
    callType: input.callType,
    modelResolution: input.dryRunResult.providerCall.modelResolution,
    cacheDecision: input.dryRunResult.providerCall.cacheDecision,
    warnings: input.dryRunResult.warnings,
    errors: input.dryRunResult.errors,
  };
}

function buildResult(input: {
  status: DeliveryAgentLlmCandidateProviderAdapterStatus;
  baseInput: RunDeliveryAgentLlmCandidateProviderAdapterInput;
  promptPackage?: DeliveryAgentLlmPromptPackage;
  cacheContext?: DeliveryAgentLlmCandidateOutputCacheContext;
  cacheRead?: DeliveryAgentLlmCandidateOutputCacheReadResult;
  cacheWrite?: DeliveryAgentLlmCandidateOutputCacheWriteResult;
  dryRunResult?: DeliveryAgentLlmCandidatePlanningDryRunResult;
  liveCallGate?: DeliveryAgentLlmCandidatePlanningLiveCallGate;
  providerCall: DeliveryAgentLlmCandidateProviderCall;
  extraWarnings?: string[];
  extraErrors?: string[];
}): DeliveryAgentLlmCandidateProviderAdapterResult {
  const promptPackage = input.promptPackage ?? input.dryRunResult?.promptPackage;
  const dryRunResult = input.dryRunResult;

  return {
    pipelineVersion: DELIVERY_AGENT_LLM_CANDIDATE_PROVIDER_ADAPTER_VERSION,
    status: input.status,
    deliveryDate: input.baseInput.deliveryDate,
    profileId: input.baseInput.profile.profileId,
    profileVersion: input.baseInput.profile.profileVersion,
    planningFingerprint: promptPackage?.planningFingerprint.planningFingerprint,
    promptPackage,
    cacheContext: input.cacheContext,
    cacheRead: input.cacheRead,
    cacheWrite: input.cacheWrite,
    dryRunResult,
    liveCallGate: input.liveCallGate,
    providerCall: input.providerCall,
    candidatePlans: dryRunResult?.candidatePlans ?? [],
    finalistCandidates: dryRunResult?.finalistCandidates ?? [],
    candidateIds: dryRunResult?.candidateIds,
    warnings: uniqueInOriginalOrder([
      ...(promptPackage?.warnings ?? []),
      ...(input.cacheRead?.warnings ?? []),
      ...(input.cacheWrite?.warnings ?? []),
      ...(dryRunResult?.warnings ?? []),
      ...input.providerCall.warnings,
      ...(input.extraWarnings ?? []),
    ]),
    errors: uniqueInOriginalOrder([
      ...(dryRunResult?.errors ?? []),
      ...input.providerCall.errors,
      ...(input.extraErrors ?? []),
    ]),
  };
}

function buildProviderRequest(input: {
  promptPackage: DeliveryAgentLlmPromptPackage;
  context: DeliveryAgentLlmCandidateOutputCacheContext;
}): DeliveryAgentLlmCandidateProviderRequest {
  return {
    promptPackage: input.promptPackage,
    callType: input.context.cacheKey.callType,
    modelProvider: input.context.modelProvider,
    modelId: input.context.modelId,
    messages: input.promptPackage.messages,
    responseFormat: input.promptPackage.promptInput.outputContract.responseFormat,
    maxInputTokens: input.promptPackage.tokenEstimate.maxInputTokens,
    maxOutputTokens: input.promptPackage.tokenEstimate.maxOutputTokens,
    estimatedInputTokens: input.promptPackage.tokenEstimate.estimatedInputTokens,
    estimatedOutputTokens: input.promptPackage.tokenEstimate.estimatedOutputTokens,
    cacheKey: input.context.cacheKey,
    planningFingerprint: input.promptPackage.planningFingerprint.planningFingerprint,
  };
}

function providerPolicyBlockReason(input: {
  promptPackage: DeliveryAgentLlmPromptPackage;
  context: DeliveryAgentLlmCandidateOutputCacheContext;
  requireConfiguredModel: boolean;
}): { status: DeliveryAgentLlmCandidateProviderCallStatus; reason: string } | null {
  const disabledReason = input.context.modelResolution.disabledReason;
  const model = input.context.modelResolution.model;

  if (input.promptPackage.tokenEstimate.status === "over_limit") {
    return {
      status: "blocked_by_token_limit",
      reason: "prompt_token_estimate_over_limit",
    };
  }

  if (disabledReason) {
    return {
      status: "blocked_by_policy",
      reason: disabledReason,
    };
  }

  if (input.requireConfiguredModel && (!model || !model.configured)) {
    return {
      status: "not_configured",
      reason: "model_not_configured",
    };
  }

  return null;
}

function providerCompletedStatus(input: {
  dryRunResult: DeliveryAgentLlmCandidatePlanningDryRunResult;
  cacheWrite?: DeliveryAgentLlmCandidateOutputCacheWriteResult;
}): DeliveryAgentLlmCandidateProviderAdapterStatus {
  if (input.dryRunResult.status === "blocked") {
    return "blocked";
  }

  return input.cacheWrite?.status === "written"
    ? "provider_completed"
    : "provider_completed_not_cached";
}

export async function runDeliveryAgentLlmCandidateProviderAdapter(
  input: RunDeliveryAgentLlmCandidateProviderAdapterInput
): Promise<DeliveryAgentLlmCandidateProviderAdapterResult> {
  const callType = input.callType ?? "daily_candidate_generation";
  const allowProviderCall = input.allowProviderCall === true;
  let promptPackage: DeliveryAgentLlmPromptPackage;

  try {
    promptPackage = buildDeliveryAgentLlmPromptPackage(
      buildPromptPackageInput(input, callType)
    );
  } catch {
    const dryRunResult = runDeliveryAgentLlmCandidatePlanningDryRun(
      buildDryRunInput(input, callType)
    );
    return buildResult({
      status: "blocked",
      baseInput: input,
      dryRunResult,
      providerCall: buildPromptBlockedProviderCall({ callType, dryRunResult }),
    });
  }

  const cacheContext = resolveDeliveryAgentLlmCandidateOutputCacheContext({
    promptPackage,
    policy: input.policy,
    callType,
    forceRefresh: input.forceRefresh,
    modelProvider: input.modelProvider,
    modelId: input.modelId,
  });
  const cacheRead = readDeliveryAgentLlmCandidateOutputCache({
    context: cacheContext,
    nowMs: input.nowMs,
  });
  const liveCallGate =
    input.providerRuntimeConfig || input.enforceProviderRuntimeGate
      ? resolveDeliveryAgentLlmLiveCallGate({
          promptPackage,
          policy: input.policy,
          modelResolution: cacheContext.modelResolution,
          runtimeConfig: input.providerRuntimeConfig,
          allowProviderCall,
        })
      : undefined;

  if (cacheRead.status === "hit" && cacheRead.record) {
    const dryRunResult = runDeliveryAgentLlmCandidatePlanningDryRun(
      buildDryRunInput(input, callType, cacheRead.record.rawCandidateOutput)
    );
    const providerCall = buildProviderCall({
      status: "not_needed_cache_hit",
      reason: "valid_cached_candidate_output_reused",
      context: cacheContext,
    });

    return buildResult({
      status: dryRunResult.status === "blocked" ? "blocked" : "cache_hit",
      baseInput: input,
      promptPackage,
      cacheContext,
      cacheRead,
      dryRunResult,
      liveCallGate,
      providerCall,
      extraWarnings:
        dryRunResult.status === "blocked"
          ? ["Cached LLM candidate output failed current local validation."]
          : [],
    });
  }

  const dryRunPromptOnly = runDeliveryAgentLlmCandidatePlanningDryRun(
    buildDryRunInput(input, callType)
  );
  const policyBlock = providerPolicyBlockReason({
    promptPackage,
    context: cacheContext,
    requireConfiguredModel: allowProviderCall,
  });

  if (policyBlock) {
    return buildResult({
      status: "blocked",
      baseInput: input,
      promptPackage,
      cacheContext,
      cacheRead,
      dryRunResult: dryRunPromptOnly,
      liveCallGate,
      providerCall: buildProviderCall({
        status: policyBlock.status,
        reason: policyBlock.reason,
        context: cacheContext,
      }),
    });
  }

  if (!allowProviderCall) {
    return buildResult({
      status: "ready_for_provider",
      baseInput: input,
      promptPackage,
      cacheContext,
      cacheRead,
      dryRunResult: dryRunPromptOnly,
      liveCallGate,
      providerCall: buildProviderCall({
        status: "not_allowed",
        reason: "allow_provider_call_false",
        context: cacheContext,
        warnings:
          cacheContext.modelResolution.model &&
          !cacheContext.modelResolution.model.configured
            ? [
                "LLM model is not configured yet; provider-free planning can continue, but a live provider call would be blocked.",
              ]
            : [],
      }),
    });
  }

  if (input.enforceProviderRuntimeGate && liveCallGate && !liveCallGate.liveCallAllowed) {
    return buildResult({
      status: "blocked",
      baseInput: input,
      promptPackage,
      cacheContext,
      cacheRead,
      dryRunResult: dryRunPromptOnly,
      liveCallGate,
      providerCall: buildProviderCall({
        status: "blocked_by_policy",
        reason: liveCallGate.blockingReasons[0] ?? "live_call_gate_blocked",
        context: cacheContext,
        warnings: liveCallGate.warnings,
        errors: liveCallGate.blockingReasons,
      }),
    });
  }

  if (!input.provider) {
    return buildResult({
      status: "ready_for_provider",
      baseInput: input,
      promptPackage,
      cacheContext,
      cacheRead,
      dryRunResult: dryRunPromptOnly,
      liveCallGate,
      providerCall: buildProviderCall({
        status: "not_configured",
        reason: "provider_executor_not_supplied",
        context: cacheContext,
      }),
    });
  }

  let providerResponse: DeliveryAgentLlmCandidateProviderResponse;
  try {
    providerResponse = await input.provider(
      buildProviderRequest({ promptPackage, context: cacheContext })
    );
  } catch (error) {
    return buildResult({
      status: "blocked",
      baseInput: input,
      promptPackage,
      cacheContext,
      cacheRead,
      dryRunResult: dryRunPromptOnly,
      liveCallGate,
      providerCall: buildProviderCall({
        status: "failed",
        reason: "provider_executor_failed",
        context: cacheContext,
        errors: [messageFromUnknownError(error)],
      }),
    });
  }

  if (providerResponse.rawCandidateOutput === undefined) {
    return buildResult({
      status: "blocked",
      baseInput: input,
      promptPackage,
      cacheContext,
      cacheRead,
      dryRunResult: dryRunPromptOnly,
      liveCallGate,
      providerCall: buildProviderCall({
        status: "called",
        reason: "provider_executor_returned_no_candidate_output",
        context: cacheContext,
        providerRequestId: providerResponse.providerRequestId,
        usage: providerResponse.usage,
        warnings: providerResponse.warnings,
        errors: ["Provider returned no raw candidate output."],
      }),
    });
  }

  const dryRunResult = runDeliveryAgentLlmCandidatePlanningDryRun(
    buildDryRunInput(input, callType, providerResponse.rawCandidateOutput)
  );
  const cacheWrite = dryRunResult.parseResult
    ? writeDeliveryAgentLlmCandidateOutputCache({
        context: cacheContext,
        promptPackage,
        parseResult: dryRunResult.parseResult,
        rawCandidateOutput: providerResponse.rawCandidateOutput,
        nowMs: input.nowMs,
        source: "provider_response",
      })
    : undefined;
  const providerCall = buildProviderCall({
    status: "called",
    reason: "provider_executor_completed",
    context: cacheContext,
    providerRequestId: providerResponse.providerRequestId,
    usage: providerResponse.usage,
    warnings: providerResponse.warnings,
  });

  return buildResult({
    status: providerCompletedStatus({ dryRunResult, cacheWrite }),
    baseInput: input,
    promptPackage,
    cacheContext,
    cacheRead,
    cacheWrite,
    dryRunResult,
    liveCallGate,
    providerCall,
  });
}
