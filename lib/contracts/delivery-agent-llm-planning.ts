import { z } from "zod";

import { deliveryAgentLlmCallTypeSchema } from "@/lib/contracts/delivery-agent-cost-policy";
import type {
  DeliveryAgentConfiguredModelTier,
  DeliveryAgentLlmCallType,
} from "@/lib/contracts/delivery-agent-cost-policy";
import type { DeliveryAgentCandidateRecommendationStatus } from "@/lib/contracts/delivery-agent";
import {
  deliveryAgentLearningLabelSchema,
  deliveryAgentLearningReviewStatusSchema,
  deliveryAgentProfileCompatibilitySchema,
} from "@/lib/contracts/delivery-agent-learning";
import type {
  DeliveryAgentLearningLabel,
  DeliveryAgentLearningReviewStatus,
  DeliveryAgentProfileCompatibility,
} from "@/lib/contracts/delivery-agent-learning";

export const DELIVERY_AGENT_LLM_PLANNING_FINGERPRINT_VERSION =
  "delivery-agent-llm-planning-fingerprint-v1" as const;

export const DELIVERY_AGENT_LLM_CACHE_KEY_VERSION =
  "delivery-agent-llm-cache-key-v1" as const;

export const DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION =
  "delivery-agent-compact-historical-package-v1" as const;

export const DELIVERY_AGENT_LLM_EVALUATION_REPORT_VERSION =
  "delivery-agent-llm-evaluation-report-v1" as const;

export const DELIVERY_AGENT_LLM_PLANNING_SCOPES = [
  "daily_generation",
  "rejection_regeneration",
  "candidate_critique",
  "rescue_planning",
  "recommendation_explanation",
] as const;

export const DELIVERY_AGENT_LLM_EVALUATION_SCENARIO_COMPLEXITIES = [
  "easy",
  "normal",
  "complex",
  "rescue",
] as const;

export type DeliveryAgentLlmEvaluationScenarioComplexity =
  (typeof DELIVERY_AGENT_LLM_EVALUATION_SCENARIO_COMPLEXITIES)[number];

export const deliveryAgentLlmEvaluationScenarioComplexitySchema = z.enum(
  DELIVERY_AGENT_LLM_EVALUATION_SCENARIO_COMPLEXITIES
);

export const DELIVERY_AGENT_LLM_EVALUATION_RUN_STATUSES = [
  "completed",
  "invalid_output",
  "failed",
  "not_run",
] as const;

export type DeliveryAgentLlmEvaluationRunStatus =
  (typeof DELIVERY_AGENT_LLM_EVALUATION_RUN_STATUSES)[number];

export const deliveryAgentLlmEvaluationRunStatusSchema = z.enum(
  DELIVERY_AGENT_LLM_EVALUATION_RUN_STATUSES
);

export const DELIVERY_AGENT_LLM_MODEL_APPROVAL_DECISIONS = [
  "not_approved",
  "approved_for_easy_days",
  "approved_for_normal_days",
  "approved_for_complex_days",
  "approved_as_strong_baseline",
  "approved_for_rescue_planning",
] as const;

export type DeliveryAgentLlmModelApprovalDecision =
  (typeof DELIVERY_AGENT_LLM_MODEL_APPROVAL_DECISIONS)[number];

export const deliveryAgentLlmModelApprovalDecisionSchema = z.enum(
  DELIVERY_AGENT_LLM_MODEL_APPROVAL_DECISIONS
);

export type DeliveryAgentLlmPlanningScope =
  (typeof DELIVERY_AGENT_LLM_PLANNING_SCOPES)[number];

export const deliveryAgentLlmPlanningScopeSchema = z.enum(
  DELIVERY_AGENT_LLM_PLANNING_SCOPES
);

export type DeliveryAgentPlanningFingerprintProfileRef = {
  profileId: string;
  profileVersion: string;
  resourceProfileVersion?: string;
  planningRulesVersion?: string;
};

export type DeliveryAgentPlanningFingerprintOrderFact = {
  orderId: string;
  status: string;
  area?: string;
  formattedAddress?: string;
  normalizedAddress?: string;
  deliveryWindow?: string;
  totalMealQuantity?: number;
  lat?: number;
  lng?: number;
  coordinateStatus?: string;
  coordinateSource?: string;
  coordinateConfidence?: string;
  planningTags?: string[];
};

export type DeliveryAgentPlanningFingerprintHistoricalPackage = {
  packageVersion: string;
  retrievalHash?: string;
  selectedCaseIds?: string[];
  compactLessonHash?: string;
};

export type DeliveryAgentPlanningFingerprintFeedback = {
  rejectionAttemptNumber?: number;
  rejectedCandidateId?: string;
  rejectedPlanHash?: string;
  feedbackText?: string;
  feedbackTags?: string[];
  interpretedFeedbackHash?: string;
  sourceFeedbackReviewedAt?: string;
};

export type DeliveryAgentPlanningFingerprintInput = {
  scope: DeliveryAgentLlmPlanningScope;
  deliveryDate: string;
  promptVersion: string;
  hardRulesVersion?: string;
  costPolicyVersion: string;
  modelRoutingPolicyVersion: string;
  profile: DeliveryAgentPlanningFingerprintProfileRef;
  orders: DeliveryAgentPlanningFingerprintOrderFact[];
  historicalPackage?: DeliveryAgentPlanningFingerprintHistoricalPackage;
  localCandidateSeedHash?: string;
  previousFailureHash?: string;
  feedback?: DeliveryAgentPlanningFingerprintFeedback;
};

export type DeliveryAgentPlanningFingerprint = {
  fingerprintVersion: typeof DELIVERY_AGENT_LLM_PLANNING_FINGERPRINT_VERSION;
  scope: DeliveryAgentLlmPlanningScope;
  deliveryDate: string;
  promptVersion: string;
  profileId: string;
  profileVersion: string;
  orderCount: number;
  orderSetHash: string;
  promptInputHash: string;
  planningFingerprint: string;
  cacheKeyBase: string;
};

export type DeliveryAgentLlmCacheKeyInput = {
  fingerprint: DeliveryAgentPlanningFingerprint;
  callType: DeliveryAgentLlmCallType;
  modelProvider: string;
  modelId: string;
  outputSchemaVersion: string;
};

export type DeliveryAgentLlmCacheKey = {
  cacheKeyVersion: typeof DELIVERY_AGENT_LLM_CACHE_KEY_VERSION;
  cacheKey: string;
  planningFingerprint: string;
  callType: DeliveryAgentLlmCallType;
  modelProvider: string;
  modelId: string;
  outputSchemaVersion: string;
};

export type DeliveryAgentLlmCacheDecision = {
  status: "enabled" | "disabled";
  ttlHours: number;
  reasons: string[];
};

export type DeliveryAgentCompactHistoricalCase = {
  caseKey: string;
  deliveryDate: string;
  profileId: string;
  learningLabel: DeliveryAgentLearningLabel;
  learningWeight: number;
  dataQualityScore: number;
  reviewStatus: DeliveryAgentLearningReviewStatus;
  profileCompatibilityForFuture: DeliveryAgentProfileCompatibility;
  orderCount: number;
  matchedOrderCount: number;
  matchCoveragePercent: number;
  coordinateCoveragePercent: number;
  areaDistribution: Record<string, number>;
  majorClusterSummary?: string;
  sameBuildingClusterCount: number;
  outlierSummary: string[];
  routeShape: {
    runCount: number;
    supportRunUsed: boolean;
    selfRunUsed: boolean;
    kitchenStartRunCount: number;
    handoffStartRunCount: number;
    backtrackingRisk?: string;
    routeDirectionSmoothness?: string;
  };
  stopControls: {
    fixedStopsUsed: boolean;
    endStopsUsed: boolean;
    firstStopsUsed: boolean;
    handoffStopsUsed: boolean;
  };
  outcome: {
    runCompletedBefore1pm?: boolean | null;
    deadlineBufferMinutes?: number | null;
    lateMinutes?: number | null;
    latenessAttribution?: string | null;
    routeWouldHaveMetDeadlineIfStartedOnTime?: boolean | null;
  };
  resourceProfile: {
    runCountUsed: number;
    hiredDriverRunCount?: number | null;
    availableRunCount?: number | null;
    supportAvailable?: boolean | null;
    supportRunUsed: boolean;
    selfRunUsed: boolean;
    runRoles: string[];
  };
  promptSafeLessons: string[];
  warnings: string[];
};

export type DeliveryAgentCompactHistoricalPackage = {
  packageVersion: typeof DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION;
  deliveryDate?: string;
  profileId?: string;
  selectedCaseIds: string[];
  retrievalHash: string;
  compactLessonHash: string;
  detailedCases: DeliveryAgentCompactHistoricalCase[];
  compactLessons: string[];
  omittedCaseCount: number;
  warnings: string[];
};

export type DeliveryAgentLlmEvaluationScenario = {
  scenarioId: string;
  deliveryDate: string;
  profileId: string;
  orderCount: number;
  complexity: DeliveryAgentLlmEvaluationScenarioComplexity;
  historicalLearningLabel?: DeliveryAgentLearningLabel;
  historicalDataQualityScore?: number;
  canUseForEvaluation: boolean;
  requiredCapabilities: string[];
  exclusionReasons: string[];
};

export type DeliveryAgentLlmEvaluationHardRuleChecks = {
  validStructuredOutput: boolean;
  allOrdersAssignedExactlyOnce: boolean;
  noDuplicateOrderIds: boolean;
  noInventedOrderIds: boolean;
  deadlineSatisfied: boolean;
  routeProofQualified: boolean;
  recommendationIsProven: boolean;
};

export type DeliveryAgentLlmEvaluationRun = {
  scenarioId: string;
  modelTier: Exclude<DeliveryAgentConfiguredModelTier, "embedding">;
  modelProvider: string;
  modelId: string;
  promptVersion: string;
  outputSchemaVersion: string;
  planningFingerprint?: string;
  callType: DeliveryAgentLlmCallType;
  status: DeliveryAgentLlmEvaluationRunStatus;
  hardRuleChecks: DeliveryAgentLlmEvaluationHardRuleChecks;
  quality: {
    score?: number;
    recommendationStatus?: DeliveryAgentCandidateRecommendationStatus;
    qualifiedCandidateCount?: number;
    recommendedCandidateId?: string;
    donaldApproved?: boolean;
  };
  cost: {
    llmCallCount: number;
    optimizePreviewCallsUsed: number;
    repairPreviewCallsUsed: number;
    estimatedInputTokens?: number;
    estimatedOutputTokens?: number;
  };
  warnings: string[];
  errors: string[];
};

export type DeliveryAgentLlmModelEvaluationSummary = {
  modelTier: Exclude<DeliveryAgentConfiguredModelTier, "embedding">;
  modelProvider: string;
  modelId: string;
  scenarioCount: number;
  completedCount: number;
  coveredComplexities: DeliveryAgentLlmEvaluationScenarioComplexity[];
  criticalFailureCount: number;
  hardRulePassRatePercent: number;
  qualifiedRecommendationRatePercent: number;
  averageScore?: number;
  averageScoreGapToStrong?: number;
  p95ScoreGapToStrong?: number;
  averageOptimizePreviewCalls: number;
  approvalDecision: DeliveryAgentLlmModelApprovalDecision;
  approvalReasons: string[];
  blockingReasons: string[];
};

export type DeliveryAgentLlmEvaluationReport = {
  reportVersion: typeof DELIVERY_AGENT_LLM_EVALUATION_REPORT_VERSION;
  evaluatedAt: string;
  policyVersion: string;
  modelRoutingPolicyVersion: string;
  scenarioCount: number;
  usableScenarioCount: number;
  summaries: DeliveryAgentLlmModelEvaluationSummary[];
  warnings: string[];
};

export const deliveryAgentPlanningFingerprintProfileRefSchema = z.object({
  profileId: z.string().trim().min(1),
  profileVersion: z.string().trim().min(1),
  resourceProfileVersion: z.string().trim().min(1).optional(),
  planningRulesVersion: z.string().trim().min(1).optional(),
});

export const deliveryAgentPlanningFingerprintOrderFactSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.string().trim().min(1),
  area: z.string().trim().optional(),
  formattedAddress: z.string().trim().optional(),
  normalizedAddress: z.string().trim().optional(),
  deliveryWindow: z.string().trim().optional(),
  totalMealQuantity: z.number().finite().optional(),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
  coordinateStatus: z.string().trim().optional(),
  coordinateSource: z.string().trim().optional(),
  coordinateConfidence: z.string().trim().optional(),
  planningTags: z.array(z.string().trim().min(1)).optional(),
});

export const deliveryAgentPlanningFingerprintHistoricalPackageSchema = z.object({
  packageVersion: z.string().trim().min(1),
  retrievalHash: z.string().trim().min(1).optional(),
  selectedCaseIds: z.array(z.string().trim().min(1)).optional(),
  compactLessonHash: z.string().trim().min(1).optional(),
});

export const deliveryAgentPlanningFingerprintFeedbackSchema = z.object({
  rejectionAttemptNumber: z.number().int().min(0).optional(),
  rejectedCandidateId: z.string().trim().min(1).optional(),
  rejectedPlanHash: z.string().trim().min(1).optional(),
  feedbackText: z.string().trim().optional(),
  feedbackTags: z.array(z.string().trim().min(1)).optional(),
  interpretedFeedbackHash: z.string().trim().min(1).optional(),
  sourceFeedbackReviewedAt: z.string().trim().min(1).optional(),
});

export const deliveryAgentPlanningFingerprintInputSchema = z.object({
  scope: deliveryAgentLlmPlanningScopeSchema,
  deliveryDate: z.string().trim().min(1),
  promptVersion: z.string().trim().min(1),
  hardRulesVersion: z.string().trim().min(1).optional(),
  costPolicyVersion: z.string().trim().min(1),
  modelRoutingPolicyVersion: z.string().trim().min(1),
  profile: deliveryAgentPlanningFingerprintProfileRefSchema,
  orders: z.array(deliveryAgentPlanningFingerprintOrderFactSchema).min(1),
  historicalPackage: deliveryAgentPlanningFingerprintHistoricalPackageSchema.optional(),
  localCandidateSeedHash: z.string().trim().min(1).optional(),
  previousFailureHash: z.string().trim().min(1).optional(),
  feedback: deliveryAgentPlanningFingerprintFeedbackSchema.optional(),
});

export const deliveryAgentPlanningFingerprintSchema = z.object({
  fingerprintVersion: z.literal(DELIVERY_AGENT_LLM_PLANNING_FINGERPRINT_VERSION),
  scope: deliveryAgentLlmPlanningScopeSchema,
  deliveryDate: z.string().trim().min(1),
  promptVersion: z.string().trim().min(1),
  profileId: z.string().trim().min(1),
  profileVersion: z.string().trim().min(1),
  orderCount: z.number().int().min(1),
  orderSetHash: z.string().trim().min(1),
  promptInputHash: z.string().trim().min(1),
  planningFingerprint: z.string().trim().min(1),
  cacheKeyBase: z.string().trim().min(1),
});

export const deliveryAgentLlmCacheKeySchema = z.object({
  cacheKeyVersion: z.literal(DELIVERY_AGENT_LLM_CACHE_KEY_VERSION),
  cacheKey: z.string().trim().min(1),
  planningFingerprint: z.string().trim().min(1),
  callType: deliveryAgentLlmCallTypeSchema,
  modelProvider: z.string().trim().min(1),
  modelId: z.string().trim().min(1),
  outputSchemaVersion: z.string().trim().min(1),
});

export const deliveryAgentCompactHistoricalCaseSchema = z.object({
  caseKey: z.string().trim().min(1),
  deliveryDate: z.string().trim().min(1),
  profileId: z.string().trim().min(1),
  learningLabel: deliveryAgentLearningLabelSchema,
  learningWeight: z.number().finite().min(0),
  dataQualityScore: z.number().finite().min(0).max(100),
  reviewStatus: deliveryAgentLearningReviewStatusSchema,
  profileCompatibilityForFuture: deliveryAgentProfileCompatibilitySchema,
  orderCount: z.number().int().min(0),
  matchedOrderCount: z.number().int().min(0),
  matchCoveragePercent: z.number().finite().min(0).max(100),
  coordinateCoveragePercent: z.number().finite().min(0).max(100),
  areaDistribution: z.record(z.string(), z.number().int().min(0)),
  majorClusterSummary: z.string().trim().min(1).optional(),
  sameBuildingClusterCount: z.number().int().min(0),
  outlierSummary: z.array(z.string().trim().min(1)),
  routeShape: z.object({
    runCount: z.number().int().min(0),
    supportRunUsed: z.boolean(),
    selfRunUsed: z.boolean(),
    kitchenStartRunCount: z.number().int().min(0),
    handoffStartRunCount: z.number().int().min(0),
    backtrackingRisk: z.string().trim().optional(),
    routeDirectionSmoothness: z.string().trim().optional(),
  }),
  stopControls: z.object({
    fixedStopsUsed: z.boolean(),
    endStopsUsed: z.boolean(),
    firstStopsUsed: z.boolean(),
    handoffStopsUsed: z.boolean(),
  }),
  outcome: z.object({
    runCompletedBefore1pm: z.boolean().nullable().optional(),
    deadlineBufferMinutes: z.number().finite().nullable().optional(),
    lateMinutes: z.number().finite().nullable().optional(),
    latenessAttribution: z.string().trim().nullable().optional(),
    routeWouldHaveMetDeadlineIfStartedOnTime: z.boolean().nullable().optional(),
  }),
  resourceProfile: z.object({
    runCountUsed: z.number().int().min(0),
    hiredDriverRunCount: z.number().int().min(0).nullable().optional(),
    availableRunCount: z.number().int().min(0).nullable().optional(),
    supportAvailable: z.boolean().nullable().optional(),
    supportRunUsed: z.boolean(),
    selfRunUsed: z.boolean(),
    runRoles: z.array(z.string().trim().min(1)),
  }),
  promptSafeLessons: z.array(z.string().trim().min(1)),
  warnings: z.array(z.string().trim().min(1)),
});

export const deliveryAgentCompactHistoricalPackageSchema = z.object({
  packageVersion: z.literal(DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION),
  deliveryDate: z.string().trim().min(1).optional(),
  profileId: z.string().trim().min(1).optional(),
  selectedCaseIds: z.array(z.string().trim().min(1)),
  retrievalHash: z.string().trim().min(1),
  compactLessonHash: z.string().trim().min(1),
  detailedCases: z.array(deliveryAgentCompactHistoricalCaseSchema),
  compactLessons: z.array(z.string().trim().min(1)),
  omittedCaseCount: z.number().int().min(0),
  warnings: z.array(z.string().trim().min(1)),
});

export const deliveryAgentLlmEvaluationScenarioSchema = z.object({
  scenarioId: z.string().trim().min(1),
  deliveryDate: z.string().trim().min(1),
  profileId: z.string().trim().min(1),
  orderCount: z.number().int().min(0),
  complexity: deliveryAgentLlmEvaluationScenarioComplexitySchema,
  historicalLearningLabel: deliveryAgentLearningLabelSchema.optional(),
  historicalDataQualityScore: z.number().finite().min(0).max(100).optional(),
  canUseForEvaluation: z.boolean(),
  requiredCapabilities: z.array(z.string().trim().min(1)),
  exclusionReasons: z.array(z.string().trim().min(1)),
});

export const deliveryAgentLlmEvaluationHardRuleChecksSchema = z.object({
  validStructuredOutput: z.boolean(),
  allOrdersAssignedExactlyOnce: z.boolean(),
  noDuplicateOrderIds: z.boolean(),
  noInventedOrderIds: z.boolean(),
  deadlineSatisfied: z.boolean(),
  routeProofQualified: z.boolean(),
  recommendationIsProven: z.boolean(),
});

const deliveryAgentLlmEvaluationModelTierSchema = z.enum(["cheap", "strong", "rescue"]);

const deliveryAgentCandidateRecommendationStatusSchema = z.enum([
  "recommended",
  "acceptable",
  "risky",
  "infeasible",
  "not_recommended",
]);

export const deliveryAgentLlmEvaluationRunSchema = z.object({
  scenarioId: z.string().trim().min(1),
  modelTier: deliveryAgentLlmEvaluationModelTierSchema,
  modelProvider: z.string().trim().min(1),
  modelId: z.string().trim().min(1),
  promptVersion: z.string().trim().min(1),
  outputSchemaVersion: z.string().trim().min(1),
  planningFingerprint: z.string().trim().min(1).optional(),
  callType: deliveryAgentLlmCallTypeSchema,
  status: deliveryAgentLlmEvaluationRunStatusSchema,
  hardRuleChecks: deliveryAgentLlmEvaluationHardRuleChecksSchema,
  quality: z.object({
    score: z.number().finite().min(0).max(100).optional(),
    recommendationStatus: deliveryAgentCandidateRecommendationStatusSchema.optional(),
    qualifiedCandidateCount: z.number().int().min(0).optional(),
    recommendedCandidateId: z.string().trim().min(1).optional(),
    donaldApproved: z.boolean().optional(),
  }),
  cost: z.object({
    llmCallCount: z.number().int().min(0),
    optimizePreviewCallsUsed: z.number().int().min(0),
    repairPreviewCallsUsed: z.number().int().min(0),
    estimatedInputTokens: z.number().int().min(0).optional(),
    estimatedOutputTokens: z.number().int().min(0).optional(),
  }),
  warnings: z.array(z.string().trim().min(1)),
  errors: z.array(z.string().trim().min(1)),
});

export const deliveryAgentLlmModelEvaluationSummarySchema = z.object({
  modelTier: deliveryAgentLlmEvaluationModelTierSchema,
  modelProvider: z.string().trim().min(1),
  modelId: z.string().trim().min(1),
  scenarioCount: z.number().int().min(0),
  completedCount: z.number().int().min(0),
  coveredComplexities: z.array(deliveryAgentLlmEvaluationScenarioComplexitySchema),
  criticalFailureCount: z.number().int().min(0),
  hardRulePassRatePercent: z.number().finite().min(0).max(100),
  qualifiedRecommendationRatePercent: z.number().finite().min(0).max(100),
  averageScore: z.number().finite().min(0).max(100).optional(),
  averageScoreGapToStrong: z.number().finite().min(0).optional(),
  p95ScoreGapToStrong: z.number().finite().min(0).optional(),
  averageOptimizePreviewCalls: z.number().finite().min(0),
  approvalDecision: deliveryAgentLlmModelApprovalDecisionSchema,
  approvalReasons: z.array(z.string().trim().min(1)),
  blockingReasons: z.array(z.string().trim().min(1)),
});

export const deliveryAgentLlmEvaluationReportSchema = z.object({
  reportVersion: z.literal(DELIVERY_AGENT_LLM_EVALUATION_REPORT_VERSION),
  evaluatedAt: z.string().trim().min(1),
  policyVersion: z.string().trim().min(1),
  modelRoutingPolicyVersion: z.string().trim().min(1),
  scenarioCount: z.number().int().min(0),
  usableScenarioCount: z.number().int().min(0),
  summaries: z.array(deliveryAgentLlmModelEvaluationSummarySchema),
  warnings: z.array(z.string().trim().min(1)),
});
