import {
  DELIVERY_AGENT_COST_POLICY_VERSION,
  DELIVERY_AGENT_LLM_CALL_TYPES,
  DELIVERY_AGENT_MODEL_ROUTING_POLICY_VERSION,
  DELIVERY_AGENT_PRICING_VERSION_UNCONFIGURED,
  type DeliveryAgentConfiguredModelTier,
  type DeliveryAgentCostPolicy,
  type DeliveryAgentCostPolicyValidationResult,
  type DeliveryAgentCostTargets,
  type DeliveryAgentHistoricalPromptPolicy,
  type DeliveryAgentLlmEvaluationGatePolicy,
  type DeliveryAgentLlmBudgetPolicy,
  type DeliveryAgentLlmCallPolicy,
  type DeliveryAgentLlmCallType,
  type DeliveryAgentLlmModelResolution,
  type DeliveryAgentModelRef,
  type DeliveryAgentRejectionLoopPolicy,
} from "@/lib/contracts/delivery-agent-cost-policy";

export type DeliveryAgentCostPolicyOverrides = {
  mode?: DeliveryAgentCostPolicy["mode"];
  pricingVersion?: string;
  modelRoutingPolicyVersion?: string;
  costTargets?: Partial<DeliveryAgentCostTargets>;
  models?: Partial<Record<DeliveryAgentConfiguredModelTier, DeliveryAgentModelRef>>;
  llmBudgets?: Partial<DeliveryAgentLlmBudgetPolicy>;
  historicalPrompt?: Partial<DeliveryAgentHistoricalPromptPolicy>;
  rejectionLoop?: Partial<DeliveryAgentRejectionLoopPolicy>;
  evaluationGate?: Partial<DeliveryAgentLlmEvaluationGatePolicy>;
  callPolicies?: Partial<Record<DeliveryAgentLlmCallType, Partial<DeliveryAgentLlmCallPolicy>>>;
  allowNoLlmEasyDay?: boolean;
  evaluationRequiredBeforeCheapCandidateGeneration?: boolean;
  cacheTtlHours?: number;
};

function buildUnconfiguredModel(tier: DeliveryAgentConfiguredModelTier): DeliveryAgentModelRef {
  return {
    tier,
    provider: "unconfigured",
    modelId: `unconfigured-${tier}-model`,
    displayName: `${tier} model not configured`,
    pricingKey: `unconfigured:${tier}`,
    configured: false,
  };
}

export const DEFAULT_DELIVERY_AGENT_COST_TARGETS: DeliveryAgentCostTargets = {
  normalDailyTargetCents: 50,
  rescueDailyTargetCents: 100,
  monthlyWarningCents: 2000,
};

export const DEFAULT_DELIVERY_AGENT_LLM_BUDGETS: DeliveryAgentLlmBudgetPolicy = {
  maxTotalLlmCallsPerGeneration: 4,
  maxHighValuePlanningCallsPerGeneration: 3,
  maxCheapModelCallsPerGeneration: 2,
  maxStrongModelCallsPerGeneration: 1,
  maxRescueModelCallsPerGeneration: 1,
  maxSchemaRepairModelCalls: 1,
};

export const DEFAULT_DELIVERY_AGENT_HISTORICAL_PROMPT_POLICY: DeliveryAgentHistoricalPromptPolicy = {
  maxDetailedHistoricalCases: 3,
  maxCompactHistoricalLessons: 12,
  maxRawHistoricalCasesInPrompt: 0,
};

export const DEFAULT_DELIVERY_AGENT_REJECTION_LOOP_POLICY: DeliveryAgentRejectionLoopPolicy = {
  rejectReasonMinLength: 8,
  maxRejectionAttemptsPerPlanningSession: 4,
  maxLlmCallsPerRejectionAttempt: 2,
  preferLocalRepairBeforeFullRegeneration: true,
  requireRejectReason: true,
};

export const DEFAULT_DELIVERY_AGENT_LLM_EVALUATION_GATE_POLICY: DeliveryAgentLlmEvaluationGatePolicy = {
  minHistoricalScenarioCount: 10,
  minHardRulePassRatePercent: 98,
  minQualifiedRecommendationRatePercent: 90,
  maxCriticalFailureCount: 0,
  maxAverageScoreGapToStrong: 5,
  maxP95ScoreGapToStrong: 10,
  maxAverageOptimizePreviewCalls: 3,
  requireStrongBaselineForCheapCandidateGeneration: true,
};

export const DEFAULT_DELIVERY_AGENT_MODELS: Record<
  DeliveryAgentConfiguredModelTier,
  DeliveryAgentModelRef
> = {
  cheap: buildUnconfiguredModel("cheap"),
  strong: buildUnconfiguredModel("strong"),
  rescue: buildUnconfiguredModel("rescue"),
  embedding: buildUnconfiguredModel("embedding"),
};

export const DEFAULT_DELIVERY_AGENT_LLM_CALL_POLICIES: Record<
  DeliveryAgentLlmCallType,
  DeliveryAgentLlmCallPolicy
> = {
  daily_candidate_generation: {
    callType: "daily_candidate_generation",
    modelTier: "strong",
    defaultEnabled: true,
    required: false,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: true,
    maxAttemptsPerPlanningSession: 1,
    maxInputTokens: 35000,
    maxOutputTokens: 10000,
  },
  rejection_feedback_interpretation: {
    callType: "rejection_feedback_interpretation",
    modelTier: "strong",
    defaultEnabled: true,
    required: true,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: true,
    maxAttemptsPerPlanningSession: 4,
    maxInputTokens: 12000,
    maxOutputTokens: 2000,
  },
  rejection_candidate_regeneration: {
    callType: "rejection_candidate_regeneration",
    modelTier: "strong",
    defaultEnabled: true,
    required: false,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: true,
    maxAttemptsPerPlanningSession: 4,
    maxInputTokens: 30000,
    maxOutputTokens: 5000,
  },
  candidate_critique_improvement: {
    callType: "candidate_critique_improvement",
    modelTier: "strong",
    defaultEnabled: true,
    required: false,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: true,
    maxAttemptsPerPlanningSession: 1,
    maxInputTokens: 12000,
    maxOutputTokens: 2500,
  },
  rescue_support_planner: {
    callType: "rescue_support_planner",
    modelTier: "rescue",
    defaultEnabled: true,
    required: false,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: true,
    maxAttemptsPerPlanningSession: 1,
    maxInputTokens: 20000,
    maxOutputTokens: 4000,
  },
  donald_feedback_interpretation: {
    callType: "donald_feedback_interpretation",
    modelTier: "cheap",
    defaultEnabled: true,
    required: false,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: false,
    maxAttemptsPerPlanningSession: 1,
    maxInputTokens: 3000,
    maxOutputTokens: 800,
  },
  historical_case_summarization: {
    callType: "historical_case_summarization",
    modelTier: "cheap",
    defaultEnabled: true,
    required: false,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: false,
    maxAttemptsPerPlanningSession: 1,
    maxInputTokens: 20000,
    maxOutputTokens: 1500,
  },
  learned_rule_extraction: {
    callType: "learned_rule_extraction",
    modelTier: "strong",
    defaultEnabled: true,
    required: false,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: false,
    maxAttemptsPerPlanningSession: 1,
    maxInputTokens: 40000,
    maxOutputTokens: 3000,
  },
  uncertain_historical_match_assistance: {
    callType: "uncertain_historical_match_assistance",
    modelTier: "cheap",
    defaultEnabled: true,
    required: false,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: false,
    maxAttemptsPerPlanningSession: 1,
    maxInputTokens: 6000,
    maxOutputTokens: 800,
  },
  recommendation_explanation: {
    callType: "recommendation_explanation",
    modelTier: "cheap",
    defaultEnabled: true,
    required: false,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: false,
    maxAttemptsPerPlanningSession: 1,
    maxInputTokens: 8000,
    maxOutputTokens: 1000,
  },
  embedding: {
    callType: "embedding",
    modelTier: "embedding",
    defaultEnabled: false,
    required: false,
    cacheable: true,
    persistResult: true,
    countsTowardHighValuePlanningCalls: false,
    maxAttemptsPerPlanningSession: 1,
    maxInputTokens: 1200,
    maxOutputTokens: 0,
  },
  schema_repair: {
    callType: "schema_repair",
    modelTier: "cheap",
    defaultEnabled: true,
    required: false,
    cacheable: false,
    persistResult: false,
    countsTowardHighValuePlanningCalls: false,
    maxAttemptsPerPlanningSession: 1,
    maxInputTokens: 5000,
    maxOutputTokens: 5000,
  },
};

function mergeCallPolicies(
  overrides?: DeliveryAgentCostPolicyOverrides["callPolicies"]
): Record<DeliveryAgentLlmCallType, DeliveryAgentLlmCallPolicy> {
  const callPolicies = { ...DEFAULT_DELIVERY_AGENT_LLM_CALL_POLICIES };

  if (!overrides) {
    return callPolicies;
  }

  for (const callType of DELIVERY_AGENT_LLM_CALL_TYPES) {
    const override = overrides[callType];
    if (override) {
      callPolicies[callType] = {
        ...callPolicies[callType],
        ...override,
        callType,
      };
    }
  }

  return callPolicies;
}

export function createDefaultDeliveryAgentCostPolicy(
  overrides: DeliveryAgentCostPolicyOverrides = {}
): DeliveryAgentCostPolicy {
  return {
    policyVersion: DELIVERY_AGENT_COST_POLICY_VERSION,
    modelRoutingPolicyVersion:
      overrides.modelRoutingPolicyVersion ?? DELIVERY_AGENT_MODEL_ROUTING_POLICY_VERSION,
    pricingVersion: overrides.pricingVersion ?? DELIVERY_AGENT_PRICING_VERSION_UNCONFIGURED,
    mode: overrides.mode ?? "normal",
    costTargets: {
      ...DEFAULT_DELIVERY_AGENT_COST_TARGETS,
      ...overrides.costTargets,
    },
    models: {
      ...DEFAULT_DELIVERY_AGENT_MODELS,
      ...overrides.models,
    },
    llmBudgets: {
      ...DEFAULT_DELIVERY_AGENT_LLM_BUDGETS,
      ...overrides.llmBudgets,
    },
    historicalPrompt: {
      ...DEFAULT_DELIVERY_AGENT_HISTORICAL_PROMPT_POLICY,
      ...overrides.historicalPrompt,
    },
    rejectionLoop: {
      ...DEFAULT_DELIVERY_AGENT_REJECTION_LOOP_POLICY,
      ...overrides.rejectionLoop,
    },
    evaluationGate: {
      ...DEFAULT_DELIVERY_AGENT_LLM_EVALUATION_GATE_POLICY,
      ...overrides.evaluationGate,
    },
    callPolicies: mergeCallPolicies(overrides.callPolicies),
    allowNoLlmEasyDay: overrides.allowNoLlmEasyDay ?? true,
    evaluationRequiredBeforeCheapCandidateGeneration:
      overrides.evaluationRequiredBeforeCheapCandidateGeneration ?? true,
    cacheTtlHours: overrides.cacheTtlHours ?? 24,
  };
}

export function getDeliveryAgentLlmCallPolicy(
  policy: DeliveryAgentCostPolicy,
  callType: DeliveryAgentLlmCallType
): DeliveryAgentLlmCallPolicy {
  return policy.callPolicies[callType];
}

export function resolveDeliveryAgentModelForCall(
  policy: DeliveryAgentCostPolicy,
  callType: DeliveryAgentLlmCallType
): DeliveryAgentLlmModelResolution {
  const callPolicy = getDeliveryAgentLlmCallPolicy(policy, callType);

  if (policy.mode === "llm_disabled") {
    return {
      callType,
      modelTier: callPolicy.modelTier,
      model: null,
      disabledReason: "llm_disabled",
    };
  }

  if (policy.mode === "dry_run") {
    return {
      callType,
      modelTier: callPolicy.modelTier,
      model: null,
      disabledReason: "dry_run",
    };
  }

  if (!callPolicy.defaultEnabled) {
    return {
      callType,
      modelTier: callPolicy.modelTier,
      model: null,
      disabledReason: "call_disabled_by_policy",
    };
  }

  if (callPolicy.modelTier === "none") {
    return {
      callType,
      modelTier: "none",
      model: null,
      disabledReason: "no_model_required",
    };
  }

  return {
    callType,
    modelTier: callPolicy.modelTier,
    model: policy.models[callPolicy.modelTier],
  };
}

function addIf(condition: boolean, target: string[], message: string): void {
  if (condition) {
    target.push(message);
  }
}

export function validateDeliveryAgentCostPolicy(
  policy: DeliveryAgentCostPolicy
): DeliveryAgentCostPolicyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const callType of DELIVERY_AGENT_LLM_CALL_TYPES) {
    const callPolicy = policy.callPolicies[callType];
    addIf(!callPolicy, errors, `Missing LLM call policy for ${callType}.`);
    if (!callPolicy) {
      continue;
    }
    addIf(
      callPolicy.callType !== callType,
      errors,
      `LLM call policy key ${callType} has mismatched callType ${callPolicy.callType}.`
    );
    addIf(
      callPolicy.maxAttemptsPerPlanningSession < 0,
      errors,
      `LLM call policy ${callType} has negative maxAttemptsPerPlanningSession.`
    );
    addIf(
      callPolicy.maxInputTokens < 0 || callPolicy.maxOutputTokens < 0,
      errors,
      `LLM call policy ${callType} has negative token limits.`
    );
  }

  addIf(
    policy.costTargets.normalDailyTargetCents >
      DEFAULT_DELIVERY_AGENT_COST_TARGETS.normalDailyTargetCents,
    warnings,
    "Normal daily cost target is above Donald's $0.50/day preference."
  );
  addIf(
    policy.costTargets.rescueDailyTargetCents >
      DEFAULT_DELIVERY_AGENT_COST_TARGETS.rescueDailyTargetCents,
    warnings,
    "Rescue daily cost target is above Donald's $1.00/day preference."
  );
  addIf(
    policy.costTargets.monthlyWarningCents >
      DEFAULT_DELIVERY_AGENT_COST_TARGETS.monthlyWarningCents,
    warnings,
    "Monthly warning threshold is above Donald's $20/month preference."
  );
  addIf(
    policy.historicalPrompt.maxDetailedHistoricalCases > 3,
    warnings,
    "Prompt policy allows more than 3 detailed historical cases."
  );
  addIf(
    policy.historicalPrompt.maxRawHistoricalCasesInPrompt > 0,
    warnings,
    "Prompt policy allows raw historical cases in prompts."
  );
  addIf(
    policy.rejectionLoop.requireRejectReason === false,
    errors,
    "Reject reason must be required for the approve/reject loop."
  );
  addIf(
    policy.rejectionLoop.rejectReasonMinLength < 3,
    errors,
    "Reject reason minimum length is too short to guide replanning."
  );
  addIf(
    policy.rejectionLoop.maxLlmCallsPerRejectionAttempt > 2,
    warnings,
    "Rejection loop allows more than 2 LLM calls per rejected recommendation."
  );
  addIf(
    policy.evaluationGate.minHistoricalScenarioCount < 5,
    warnings,
    "LLM evaluation gate uses fewer than 5 historical scenarios."
  );
  addIf(
    policy.evaluationGate.maxCriticalFailureCount > 0,
    warnings,
    "LLM evaluation gate allows critical failures before approving a model."
  );
  addIf(
    policy.evaluationGate.minHardRulePassRatePercent < 95,
    errors,
    "LLM evaluation hard-rule pass threshold is too low for delivery planning."
  );
  addIf(
    policy.evaluationGate.minQualifiedRecommendationRatePercent < 80,
    errors,
    "LLM evaluation qualified-recommendation threshold is too low for delivery planning."
  );
  addIf(
    policy.evaluationGate.maxAverageOptimizePreviewCalls >
      policy.llmBudgets.maxHighValuePlanningCallsPerGeneration,
    warnings,
    "LLM evaluation allows more average preview calls than high-value planning call budget."
  );
  addIf(
    policy.llmBudgets.maxHighValuePlanningCallsPerGeneration >
      policy.llmBudgets.maxTotalLlmCallsPerGeneration,
    errors,
    "High-value planning call budget cannot exceed total LLM call budget."
  );
  addIf(
    policy.callPolicies.daily_candidate_generation.modelTier === "cheap" &&
      policy.evaluationRequiredBeforeCheapCandidateGeneration,
    warnings,
    "Cheap daily candidate generation is enabled before evaluation has proven it safe."
  );
  addIf(
    policy.callPolicies.rejection_feedback_interpretation.modelTier === "none",
    errors,
    "Rejection feedback interpretation needs an LLM model tier."
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
