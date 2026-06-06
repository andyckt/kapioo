import { resolveDeliveryAgentModelForCall } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import {
  buildDeliveryAgentCandidatePlansFromLlmOutput,
  type DeliveryAgentLlmCandidatePlanBuildResult,
} from "@/lib/agents/delivery/llm-planning/candidate-plan-adapter";
import { parseDeliveryAgentLlmCandidateOutput } from "@/lib/agents/delivery/llm-planning/candidate-output-parser";
import {
  rankDeliveryAgentLlmLocalCandidatePlans,
  type DeliveryAgentLlmLocalCandidateRankingResult,
} from "@/lib/agents/delivery/llm-planning/local-candidate-ranking";
import {
  buildDeliveryAgentLlmPromptPackage,
  type BuildDeliveryAgentLlmPromptPackageInput,
} from "@/lib/agents/delivery/llm-planning/prompt-assembly";
import { resolveDeliveryAgentLlmCacheDecision } from "@/lib/agents/delivery/llm-planning/planning-fingerprint";
import type { CandidatePlan, PlanningStop } from "@/lib/agents/delivery/candidate-plans/types";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type {
  DeliveryAgentCostPolicy,
  DeliveryAgentLlmCallType,
  DeliveryAgentLlmModelResolution,
} from "@/lib/contracts/delivery-agent-cost-policy";
import type {
  DeliveryAgentCompactHistoricalPackage,
  DeliveryAgentLlmCacheDecision,
  DeliveryAgentLlmCandidateOutputParseResult,
  DeliveryAgentLlmPlanningScope,
  DeliveryAgentLlmPromptPackage,
  DeliveryAgentPlanningFingerprintFeedback,
  DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";

export const DELIVERY_AGENT_LLM_CANDIDATE_PLANNING_DRY_RUN_VERSION =
  "delivery-agent-llm-candidate-planning-dry-run-v1" as const;

export type DeliveryAgentLlmCandidatePlanningDryRunStatus =
  | "prompt_ready"
  | "ranked"
  | "partial"
  | "fallback_selected"
  | "blocked";

export type DeliveryAgentLlmCandidatePlanningDryRunStageStatus =
  | "not_started"
  | "skipped"
  | "completed"
  | "partial"
  | "blocked";

export type DeliveryAgentLlmCandidatePlanningDryRunStageStatuses = {
  promptPackage: DeliveryAgentLlmCandidatePlanningDryRunStageStatus;
  candidateOutputParse: DeliveryAgentLlmCandidatePlanningDryRunStageStatus;
  candidatePlanBuild: DeliveryAgentLlmCandidatePlanningDryRunStageStatus;
  localCandidateRanking: DeliveryAgentLlmCandidatePlanningDryRunStageStatus;
};

export type DeliveryAgentLlmCandidatePlanningDryRunProviderCall = {
  status: "skipped";
  reason: "provider_free_dry_run";
  callType: DeliveryAgentLlmCallType;
  modelResolution: DeliveryAgentLlmModelResolution;
  cacheDecision: DeliveryAgentLlmCacheDecision;
};

export type DeliveryAgentLlmCandidatePlanningDryRunCandidateIds = {
  parsedAcceptedCandidateIds: string[];
  parsedRejectedCandidateIds: string[];
  parsedOmittedCandidateIds: string[];
  builtCandidateIds: string[];
  finalistCandidateIds: string[];
  localOmittedCandidateIds: string[];
  localBlockedCandidateIds: string[];
};

export type RunDeliveryAgentLlmCandidatePlanningDryRunInput = {
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
  rawCandidateOutput?: unknown;
  forceRefresh?: boolean;
  maxAcceptedCandidates?: number;
  maxCandidatePlans?: number;
  maxFinalists?: number;
  minPreferredScore?: number;
  includeLowScoreFallback?: boolean;
};

export type DeliveryAgentLlmCandidatePlanningDryRunResult = {
  pipelineVersion: typeof DELIVERY_AGENT_LLM_CANDIDATE_PLANNING_DRY_RUN_VERSION;
  status: DeliveryAgentLlmCandidatePlanningDryRunStatus;
  deliveryDate: string;
  profileId: string;
  profileVersion: string;
  planningFingerprint?: string;
  promptPackage?: DeliveryAgentLlmPromptPackage;
  parseResult?: DeliveryAgentLlmCandidateOutputParseResult;
  candidatePlanBuildResult?: DeliveryAgentLlmCandidatePlanBuildResult;
  localRankingResult?: DeliveryAgentLlmLocalCandidateRankingResult;
  candidatePlans: CandidatePlan[];
  finalistCandidates: CandidatePlan[];
  candidateIds: DeliveryAgentLlmCandidatePlanningDryRunCandidateIds;
  providerCall: DeliveryAgentLlmCandidatePlanningDryRunProviderCall;
  stageStatuses: DeliveryAgentLlmCandidatePlanningDryRunStageStatuses;
  warnings: string[];
  errors: string[];
};

function emptyCandidateIds(): DeliveryAgentLlmCandidatePlanningDryRunCandidateIds {
  return {
    parsedAcceptedCandidateIds: [],
    parsedRejectedCandidateIds: [],
    parsedOmittedCandidateIds: [],
    builtCandidateIds: [],
    finalistCandidateIds: [],
    localOmittedCandidateIds: [],
    localBlockedCandidateIds: [],
  };
}

function uniqueInOriginalOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
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

function buildPromptOverLimitError(promptPackage: DeliveryAgentLlmPromptPackage): string {
  return `Prompt package estimated input tokens ${promptPackage.tokenEstimate.estimatedInputTokens} exceed limit ${promptPackage.tokenEstimate.maxInputTokens}; it must not be sent to a provider.`;
}

function buildProviderCallSummary(input: {
  policy: DeliveryAgentCostPolicy;
  callType: DeliveryAgentLlmCallType;
  forceRefresh?: boolean;
}): DeliveryAgentLlmCandidatePlanningDryRunProviderCall {
  return {
    status: "skipped",
    reason: "provider_free_dry_run",
    callType: input.callType,
    modelResolution: resolveDeliveryAgentModelForCall(input.policy, input.callType),
    cacheDecision: resolveDeliveryAgentLlmCacheDecision({
      policy: input.policy,
      callType: input.callType,
      forceRefresh: input.forceRefresh,
    }),
  };
}

function collectParseErrors(
  parseResult: DeliveryAgentLlmCandidateOutputParseResult | undefined
): string[] {
  return (
    parseResult?.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) =>
        issue.candidateId ? `${issue.candidateId}: ${issue.message}` : issue.message
      ) ?? []
  );
}

function collectBuildErrors(
  buildResult: DeliveryAgentLlmCandidatePlanBuildResult | undefined
): string[] {
  return (
    buildResult?.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) =>
        issue.candidateId ? `${issue.candidateId}: ${issue.message}` : issue.message
      ) ?? []
  );
}

function collectRankingErrors(
  rankingResult: DeliveryAgentLlmLocalCandidateRankingResult | undefined
): string[] {
  return (
    rankingResult?.rankedCandidates.flatMap((candidate) =>
      candidate.blockingIssues.map((issue) => `${candidate.candidateId}: ${issue}`)
    ) ?? []
  );
}

function parseStageStatus(
  parseResult: DeliveryAgentLlmCandidateOutputParseResult
): DeliveryAgentLlmCandidatePlanningDryRunStageStatus {
  if (parseResult.status === "invalid") {
    return "blocked";
  }

  return parseResult.status === "partial_valid" ? "partial" : "completed";
}

function buildStageStatus(
  buildResult: DeliveryAgentLlmCandidatePlanBuildResult
): DeliveryAgentLlmCandidatePlanningDryRunStageStatus {
  if (buildResult.status === "blocked") {
    return "blocked";
  }

  return buildResult.status === "partial" ? "partial" : "completed";
}

function rankingStageStatus(
  rankingResult: DeliveryAgentLlmLocalCandidateRankingResult
): DeliveryAgentLlmCandidatePlanningDryRunStageStatus {
  if (rankingResult.status === "blocked") {
    return "blocked";
  }

  return rankingResult.status === "selected" ? "completed" : "partial";
}

function makePromptBlockedResult(input: {
  baseInput: RunDeliveryAgentLlmCandidatePlanningDryRunInput;
  callType: DeliveryAgentLlmCallType;
  providerCall: DeliveryAgentLlmCandidatePlanningDryRunProviderCall;
  error: unknown;
}): DeliveryAgentLlmCandidatePlanningDryRunResult {
  return {
    pipelineVersion: DELIVERY_AGENT_LLM_CANDIDATE_PLANNING_DRY_RUN_VERSION,
    status: "blocked",
    deliveryDate: input.baseInput.deliveryDate,
    profileId: input.baseInput.profile.profileId,
    profileVersion: input.baseInput.profile.profileVersion,
    candidatePlans: [],
    finalistCandidates: [],
    candidateIds: emptyCandidateIds(),
    providerCall: input.providerCall,
    stageStatuses: {
      promptPackage: "blocked",
      candidateOutputParse: "not_started",
      candidatePlanBuild: "not_started",
      localCandidateRanking: "not_started",
    },
    warnings: [],
    errors: [messageFromUnknownError(input.error)],
  };
}

function buildPromptPackageInput(
  input: RunDeliveryAgentLlmCandidatePlanningDryRunInput,
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

function buildCandidateIds(input: {
  parseResult?: DeliveryAgentLlmCandidateOutputParseResult;
  buildResult?: DeliveryAgentLlmCandidatePlanBuildResult;
  rankingResult?: DeliveryAgentLlmLocalCandidateRankingResult;
}): DeliveryAgentLlmCandidatePlanningDryRunCandidateIds {
  return {
    parsedAcceptedCandidateIds:
      input.parseResult?.acceptedCandidates.map((candidate) => candidate.candidateId) ?? [],
    parsedRejectedCandidateIds:
      input.parseResult?.rejectedCandidates.map((candidate) => candidate.candidateId) ?? [],
    parsedOmittedCandidateIds:
      input.parseResult?.omittedCandidates.map((candidate) => candidate.candidateId) ?? [],
    builtCandidateIds: input.buildResult?.candidatePlans.map((candidate) => candidate.candidateId) ?? [],
    finalistCandidateIds: input.rankingResult?.finalistCandidateIds ?? [],
    localOmittedCandidateIds: input.rankingResult?.omittedCandidateIds ?? [],
    localBlockedCandidateIds: input.rankingResult?.blockedCandidateIds ?? [],
  };
}

function collectWarnings(input: {
  promptPackage?: DeliveryAgentLlmPromptPackage;
  parseResult?: DeliveryAgentLlmCandidateOutputParseResult;
  buildResult?: DeliveryAgentLlmCandidatePlanBuildResult;
  rankingResult?: DeliveryAgentLlmLocalCandidateRankingResult;
  extra?: string[];
}): string[] {
  return uniqueInOriginalOrder([
    ...(input.promptPackage?.warnings ?? []),
    ...(input.parseResult?.warnings ?? []),
    ...(input.buildResult?.warnings ?? []),
    ...(input.rankingResult?.warnings ?? []),
    ...(input.extra ?? []),
  ]);
}

function resolveFinalStatus(input: {
  promptStageStatus: DeliveryAgentLlmCandidatePlanningDryRunStageStatus;
  parseResult: DeliveryAgentLlmCandidateOutputParseResult;
  buildResult: DeliveryAgentLlmCandidatePlanBuildResult;
  rankingResult: DeliveryAgentLlmLocalCandidateRankingResult;
}): DeliveryAgentLlmCandidatePlanningDryRunStatus {
  if (
    input.parseResult.status === "invalid" ||
    input.buildResult.status === "blocked" ||
    input.rankingResult.status === "blocked"
  ) {
    return "blocked";
  }

  if (input.rankingResult.status === "fallback_selected") {
    return "fallback_selected";
  }

  if (
    input.promptStageStatus === "partial" ||
    input.parseResult.status === "partial_valid" ||
    input.buildResult.status === "partial" ||
    input.rankingResult.status === "partial"
  ) {
    return "partial";
  }

  return "ranked";
}

export function runDeliveryAgentLlmCandidatePlanningDryRun(
  input: RunDeliveryAgentLlmCandidatePlanningDryRunInput
): DeliveryAgentLlmCandidatePlanningDryRunResult {
  const callType = input.callType ?? "daily_candidate_generation";
  const providerCall = buildProviderCallSummary({
    policy: input.policy,
    callType,
    forceRefresh: input.forceRefresh,
  });
  let promptPackage: DeliveryAgentLlmPromptPackage;

  try {
    promptPackage = buildDeliveryAgentLlmPromptPackage(
      buildPromptPackageInput(input, callType)
    );
  } catch (error) {
    return makePromptBlockedResult({
      baseInput: input,
      callType,
      providerCall,
      error,
    });
  }

  const promptStageStatus =
    promptPackage.tokenEstimate.status === "over_limit" ? "partial" : "completed";
  if (input.rawCandidateOutput === undefined) {
    return {
      pipelineVersion: DELIVERY_AGENT_LLM_CANDIDATE_PLANNING_DRY_RUN_VERSION,
      status: promptStageStatus === "partial" ? "blocked" : "prompt_ready",
      deliveryDate: input.deliveryDate,
      profileId: input.profile.profileId,
      profileVersion: input.profile.profileVersion,
      planningFingerprint: promptPackage.planningFingerprint.planningFingerprint,
      promptPackage,
      candidatePlans: [],
      finalistCandidates: [],
      candidateIds: emptyCandidateIds(),
      providerCall,
      stageStatuses: {
        promptPackage: promptStageStatus,
        candidateOutputParse: "skipped",
        candidatePlanBuild: "skipped",
        localCandidateRanking: "skipped",
      },
      warnings: collectWarnings({
        promptPackage,
        extra: [
          "No raw candidate output was supplied; dry-run stopped after prompt package assembly.",
        ],
      }),
      errors:
        promptStageStatus === "partial" ? [buildPromptOverLimitError(promptPackage)] : [],
    };
  }

  const parseResult = parseDeliveryAgentLlmCandidateOutput({
    promptPackage,
    rawOutput: input.rawCandidateOutput,
    maxAcceptedCandidates: input.maxAcceptedCandidates,
  });
  const parseStatus = parseStageStatus(parseResult);

  if (parseResult.status === "invalid") {
    return {
      pipelineVersion: DELIVERY_AGENT_LLM_CANDIDATE_PLANNING_DRY_RUN_VERSION,
      status: "blocked",
      deliveryDate: input.deliveryDate,
      profileId: input.profile.profileId,
      profileVersion: input.profile.profileVersion,
      planningFingerprint: promptPackage.planningFingerprint.planningFingerprint,
      promptPackage,
      parseResult,
      candidatePlans: [],
      finalistCandidates: [],
      candidateIds: buildCandidateIds({ parseResult }),
      providerCall,
      stageStatuses: {
        promptPackage: promptStageStatus,
        candidateOutputParse: parseStatus,
        candidatePlanBuild: "not_started",
        localCandidateRanking: "not_started",
      },
      warnings: collectWarnings({
        promptPackage,
        parseResult,
      }),
      errors: uniqueInOriginalOrder(collectParseErrors(parseResult)),
    };
  }

  const buildResult = buildDeliveryAgentCandidatePlansFromLlmOutput({
    promptPackage,
    parseResult,
    planningStops: input.planningStops,
    profile: input.profile,
    maxCandidatePlans: input.maxCandidatePlans,
  });
  const buildStatus = buildStageStatus(buildResult);

  if (buildResult.status === "blocked") {
    return {
      pipelineVersion: DELIVERY_AGENT_LLM_CANDIDATE_PLANNING_DRY_RUN_VERSION,
      status: "blocked",
      deliveryDate: input.deliveryDate,
      profileId: input.profile.profileId,
      profileVersion: input.profile.profileVersion,
      planningFingerprint: promptPackage.planningFingerprint.planningFingerprint,
      promptPackage,
      parseResult,
      candidatePlanBuildResult: buildResult,
      candidatePlans: [],
      finalistCandidates: [],
      candidateIds: buildCandidateIds({ parseResult, buildResult }),
      providerCall,
      stageStatuses: {
        promptPackage: promptStageStatus,
        candidateOutputParse: parseStatus,
        candidatePlanBuild: buildStatus,
        localCandidateRanking: "not_started",
      },
      warnings: collectWarnings({
        promptPackage,
        parseResult,
        buildResult,
      }),
      errors: uniqueInOriginalOrder([
        ...collectParseErrors(parseResult),
        ...collectBuildErrors(buildResult),
      ]),
    };
  }

  const expectedOrderIds = promptPackage.promptInput.orders.map((order) => order.orderId);
  const rankingResult = rankDeliveryAgentLlmLocalCandidatePlans({
    candidatePlans: buildResult.candidatePlans,
    profile: input.profile,
    expectedOrderIds,
    maxFinalists: input.maxFinalists,
    minPreferredScore: input.minPreferredScore,
    includeLowScoreFallback: input.includeLowScoreFallback,
  });
  const rankingStatus = rankingStageStatus(rankingResult);
  const status = resolveFinalStatus({
    promptStageStatus,
    parseResult,
    buildResult,
    rankingResult,
  });

  return {
    pipelineVersion: DELIVERY_AGENT_LLM_CANDIDATE_PLANNING_DRY_RUN_VERSION,
    status,
    deliveryDate: input.deliveryDate,
    profileId: input.profile.profileId,
    profileVersion: input.profile.profileVersion,
    planningFingerprint: promptPackage.planningFingerprint.planningFingerprint,
    promptPackage,
    parseResult,
    candidatePlanBuildResult: buildResult,
    localRankingResult: rankingResult,
    candidatePlans: buildResult.candidatePlans,
    finalistCandidates: rankingResult.finalistCandidates,
    candidateIds: buildCandidateIds({
      parseResult,
      buildResult,
      rankingResult,
    }),
    providerCall,
    stageStatuses: {
      promptPackage: promptStageStatus,
      candidateOutputParse: parseStatus,
      candidatePlanBuild: buildStatus,
      localCandidateRanking: rankingStatus,
    },
    warnings: collectWarnings({
      promptPackage,
      parseResult,
      buildResult,
      rankingResult,
    }),
    errors: uniqueInOriginalOrder([
      ...collectParseErrors(parseResult),
      ...collectBuildErrors(buildResult),
      ...collectRankingErrors(rankingResult),
    ]),
  };
}
