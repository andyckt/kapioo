import { z } from "zod";

export const DELIVERY_AGENT_COST_POLICY_VERSION = "delivery-agent-cost-policy-v1" as const;
export const DELIVERY_AGENT_MODEL_ROUTING_POLICY_VERSION =
  "delivery-agent-model-routing-v1" as const;
export const DELIVERY_AGENT_PRICING_VERSION_UNCONFIGURED =
  "delivery-agent-pricing-unconfigured-v1" as const;

export const DELIVERY_AGENT_COST_POLICY_MODES = [
  "normal",
  "dry_run",
  "llm_disabled",
] as const;

export type DeliveryAgentCostPolicyMode = (typeof DELIVERY_AGENT_COST_POLICY_MODES)[number];

export const deliveryAgentCostPolicyModeSchema = z.enum(DELIVERY_AGENT_COST_POLICY_MODES);

export const DELIVERY_AGENT_LLM_MODEL_TIERS = [
  "none",
  "cheap",
  "strong",
  "rescue",
  "embedding",
] as const;

export type DeliveryAgentLlmModelTier = (typeof DELIVERY_AGENT_LLM_MODEL_TIERS)[number];

export const deliveryAgentLlmModelTierSchema = z.enum(DELIVERY_AGENT_LLM_MODEL_TIERS);

export const DELIVERY_AGENT_LLM_CALL_TYPES = [
  "daily_candidate_generation",
  "rejection_feedback_interpretation",
  "rejection_candidate_regeneration",
  "candidate_critique_improvement",
  "rescue_support_planner",
  "donald_feedback_interpretation",
  "historical_case_summarization",
  "learned_rule_extraction",
  "uncertain_historical_match_assistance",
  "recommendation_explanation",
  "embedding",
  "schema_repair",
] as const;

export type DeliveryAgentLlmCallType = (typeof DELIVERY_AGENT_LLM_CALL_TYPES)[number];

export const deliveryAgentLlmCallTypeSchema = z.enum(DELIVERY_AGENT_LLM_CALL_TYPES);

export type DeliveryAgentConfiguredModelTier = Exclude<DeliveryAgentLlmModelTier, "none">;

export type DeliveryAgentModelRef = {
  tier: DeliveryAgentConfiguredModelTier;
  provider: string;
  modelId: string;
  displayName?: string;
  pricingKey?: string;
  configured: boolean;
};

export type DeliveryAgentCostTargets = {
  normalDailyTargetCents: number;
  rescueDailyTargetCents: number;
  monthlyWarningCents: number;
};

export type DeliveryAgentLlmBudgetPolicy = {
  maxTotalLlmCallsPerGeneration: number;
  maxHighValuePlanningCallsPerGeneration: number;
  maxCheapModelCallsPerGeneration: number;
  maxStrongModelCallsPerGeneration: number;
  maxRescueModelCallsPerGeneration: number;
  maxSchemaRepairModelCalls: number;
};

export type DeliveryAgentHistoricalPromptPolicy = {
  maxDetailedHistoricalCases: number;
  maxCompactHistoricalLessons: number;
  maxRawHistoricalCasesInPrompt: number;
};

export type DeliveryAgentRejectionLoopPolicy = {
  rejectReasonMinLength: number;
  maxRejectionAttemptsPerPlanningSession: number;
  maxLlmCallsPerRejectionAttempt: number;
  preferLocalRepairBeforeFullRegeneration: boolean;
  requireRejectReason: boolean;
};

export type DeliveryAgentLlmEvaluationGatePolicy = {
  minHistoricalScenarioCount: number;
  minHardRulePassRatePercent: number;
  minQualifiedRecommendationRatePercent: number;
  maxCriticalFailureCount: number;
  maxAverageScoreGapToStrong: number;
  maxP95ScoreGapToStrong: number;
  maxAverageOptimizePreviewCalls: number;
  requireStrongBaselineForCheapCandidateGeneration: boolean;
};

export type DeliveryAgentLlmCallPolicy = {
  callType: DeliveryAgentLlmCallType;
  modelTier: DeliveryAgentLlmModelTier;
  defaultEnabled: boolean;
  required: boolean;
  cacheable: boolean;
  persistResult: boolean;
  countsTowardHighValuePlanningCalls: boolean;
  maxAttemptsPerPlanningSession: number;
  maxInputTokens: number;
  maxOutputTokens: number;
};

export type DeliveryAgentCostPolicy = {
  policyVersion: typeof DELIVERY_AGENT_COST_POLICY_VERSION;
  modelRoutingPolicyVersion: string;
  pricingVersion: string;
  mode: DeliveryAgentCostPolicyMode;
  costTargets: DeliveryAgentCostTargets;
  models: Record<DeliveryAgentConfiguredModelTier, DeliveryAgentModelRef>;
  llmBudgets: DeliveryAgentLlmBudgetPolicy;
  historicalPrompt: DeliveryAgentHistoricalPromptPolicy;
  rejectionLoop: DeliveryAgentRejectionLoopPolicy;
  evaluationGate: DeliveryAgentLlmEvaluationGatePolicy;
  callPolicies: Record<DeliveryAgentLlmCallType, DeliveryAgentLlmCallPolicy>;
  allowNoLlmEasyDay: boolean;
  evaluationRequiredBeforeCheapCandidateGeneration: boolean;
  cacheTtlHours: number;
};

export type DeliveryAgentCostPolicyValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type DeliveryAgentLlmModelResolution = {
  callType: DeliveryAgentLlmCallType;
  modelTier: DeliveryAgentLlmModelTier;
  model: DeliveryAgentModelRef | null;
  disabledReason?: string;
};

export const deliveryAgentModelRefSchema = z.object({
  tier: z.enum(["cheap", "strong", "rescue", "embedding"]),
  provider: z.string().trim().min(1),
  modelId: z.string().trim().min(1),
  displayName: z.string().trim().min(1).optional(),
  pricingKey: z.string().trim().min(1).optional(),
  configured: z.boolean(),
});

export const deliveryAgentCostTargetsSchema = z.object({
  normalDailyTargetCents: z.number().int().min(0),
  rescueDailyTargetCents: z.number().int().min(0),
  monthlyWarningCents: z.number().int().min(0),
});

export const deliveryAgentLlmBudgetPolicySchema = z.object({
  maxTotalLlmCallsPerGeneration: z.number().int().min(0),
  maxHighValuePlanningCallsPerGeneration: z.number().int().min(0),
  maxCheapModelCallsPerGeneration: z.number().int().min(0),
  maxStrongModelCallsPerGeneration: z.number().int().min(0),
  maxRescueModelCallsPerGeneration: z.number().int().min(0),
  maxSchemaRepairModelCalls: z.number().int().min(0),
});

export const deliveryAgentHistoricalPromptPolicySchema = z.object({
  maxDetailedHistoricalCases: z.number().int().min(0),
  maxCompactHistoricalLessons: z.number().int().min(0),
  maxRawHistoricalCasesInPrompt: z.number().int().min(0),
});

export const deliveryAgentRejectionLoopPolicySchema = z.object({
  rejectReasonMinLength: z.number().int().min(1),
  maxRejectionAttemptsPerPlanningSession: z.number().int().min(0),
  maxLlmCallsPerRejectionAttempt: z.number().int().min(0),
  preferLocalRepairBeforeFullRegeneration: z.boolean(),
  requireRejectReason: z.boolean(),
});

export const deliveryAgentLlmEvaluationGatePolicySchema = z.object({
  minHistoricalScenarioCount: z.number().int().min(0),
  minHardRulePassRatePercent: z.number().finite().min(0).max(100),
  minQualifiedRecommendationRatePercent: z.number().finite().min(0).max(100),
  maxCriticalFailureCount: z.number().int().min(0),
  maxAverageScoreGapToStrong: z.number().finite().min(0),
  maxP95ScoreGapToStrong: z.number().finite().min(0),
  maxAverageOptimizePreviewCalls: z.number().finite().min(0),
  requireStrongBaselineForCheapCandidateGeneration: z.boolean(),
});

export const deliveryAgentLlmCallPolicySchema = z.object({
  callType: deliveryAgentLlmCallTypeSchema,
  modelTier: deliveryAgentLlmModelTierSchema,
  defaultEnabled: z.boolean(),
  required: z.boolean(),
  cacheable: z.boolean(),
  persistResult: z.boolean(),
  countsTowardHighValuePlanningCalls: z.boolean(),
  maxAttemptsPerPlanningSession: z.number().int().min(0),
  maxInputTokens: z.number().int().min(0),
  maxOutputTokens: z.number().int().min(0),
});

export const deliveryAgentCostPolicySchema = z.object({
  policyVersion: z.literal(DELIVERY_AGENT_COST_POLICY_VERSION),
  modelRoutingPolicyVersion: z.string().trim().min(1),
  pricingVersion: z.string().trim().min(1),
  mode: deliveryAgentCostPolicyModeSchema,
  costTargets: deliveryAgentCostTargetsSchema,
  models: z.object({
    cheap: deliveryAgentModelRefSchema,
    strong: deliveryAgentModelRefSchema,
    rescue: deliveryAgentModelRefSchema,
    embedding: deliveryAgentModelRefSchema,
  }),
  llmBudgets: deliveryAgentLlmBudgetPolicySchema,
  historicalPrompt: deliveryAgentHistoricalPromptPolicySchema,
  rejectionLoop: deliveryAgentRejectionLoopPolicySchema,
  evaluationGate: deliveryAgentLlmEvaluationGatePolicySchema,
  callPolicies: z.record(deliveryAgentLlmCallTypeSchema, deliveryAgentLlmCallPolicySchema),
  allowNoLlmEasyDay: z.boolean(),
  evaluationRequiredBeforeCheapCandidateGeneration: z.boolean(),
  cacheTtlHours: z.number().int().min(0),
});
