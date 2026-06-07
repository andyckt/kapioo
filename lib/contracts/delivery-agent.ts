import { z } from "zod";
import type {
  DeliveryAgentCoordinateCoverageSummary,
  DeliveryAgentGeocodeEnrichment,
  GeocodeEnrichmentAlert,
  GeocodeEnrichmentRunStats,
  RecommendationConfidence,
} from "@/lib/agents/delivery/geocode/types";
import type { DeliveryAgentPreviewBudgetSummary } from "@/lib/agents/delivery/candidate-plans/preview-budget";
import type { RouteOptimizerGoogleCostEstimate } from "@/lib/integrations/route-optimizer/types";

export type {
  DeliveryAgentCoordinateCoverageSummary,
  DeliveryAgentGeocodeEnrichment,
  GeocodeEnrichmentAlert,
  GeocodeEnrichmentRunStats,
  RecommendationConfidence,
};

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export const deliveryAgentPreviewQuerySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
});

export const deliveryAgentSimpleRoutePreviewBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
});

export const deliveryAgentGenerateCandidatePlansBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
});

export const deliveryAgentLlmCandidatePlanningBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
  profileId: z.string().trim().min(1).optional(),
  includeHistoricalPackage: z.boolean().optional(),
  forceRefresh: z.boolean().optional(),
  allowProviderCall: z.boolean().optional(),
  liveDryRunConfirmation: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.allowProviderCall === true && data.liveDryRunConfirmation !== "LIVE_LLM_DRY_RUN") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["liveDryRunConfirmation"],
      message:
        "liveDryRunConfirmation must be LIVE_LLM_DRY_RUN when allowProviderCall is true",
    });
  }
});

export const deliveryAgentPreviewCandidatePlansBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
});

export const deliveryAgentPlanningProfileQuerySchema = z.object({
  profileId: z.string().trim().min(1).optional(),
});

export type DeliveryAgentPreviewQuery = z.infer<typeof deliveryAgentPreviewQuerySchema>;

export type DeliveryAgentSimpleRoutePreviewBody = z.infer<
  typeof deliveryAgentSimpleRoutePreviewBodySchema
>;

export type DeliveryAgentGenerateCandidatePlansBody = z.infer<
  typeof deliveryAgentGenerateCandidatePlansBodySchema
>;

export type DeliveryAgentLlmCandidatePlanningBody = z.infer<
  typeof deliveryAgentLlmCandidatePlanningBodySchema
>;

export type DeliveryAgentPreviewCandidatePlansBody = z.infer<
  typeof deliveryAgentPreviewCandidatePlansBodySchema
>;

export type DeliveryAgentPreviewStop = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  area: string;
  formattedAddress: string;
  totalMealQuantity: number;
  warningsCount: number;
};

export type DeliveryAgentPreviewInvalidOrder = {
  orderId: string;
  customerName?: string;
  area?: string;
  errors: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
};

export type DeliveryAgentPreviewWarning = {
  orderId: string;
  warnings: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
};

export type DeliveryAgentPreviewPendingOrder = {
  orderId: string;
  customerName: string;
  area: string;
  formattedAddress: string;
  totalMealQuantity: number;
  status: "pending";
};

export type DeliveryAgentPreviewResponse = {
  deliveryDate: string;
  queriedAt: string;
  confirmed: {
    totalStops: number;
    validStops: number;
    invalidStops: number;
    warningStops: number;
    totalMealQuantity: number;
    byArea: Record<string, number>;
    byStatus: Record<string, number>;
    stops: DeliveryAgentPreviewStop[];
    invalid: DeliveryAgentPreviewInvalidOrder[];
    warnings: DeliveryAgentPreviewWarning[];
  };
  pending: {
    count: number;
    orders: DeliveryAgentPreviewPendingOrder[];
  };
  canContinueToPlanning: boolean;
  blockingReasons: string[];
  notes: string;
};

export type DeliveryAgentSimpleRoutePreviewStop = {
  sequence: number;
  name?: string;
  address?: string;
  eta?: string;
  orderIds: string[];
};

export type DeliveryAgentSimpleRoutePreviewResult = {
  status?: string;
  totalDurationMinutes?: number;
  totalDistanceKm?: number;
  estimatedFinishTime?: string;
  stopCount: number;
  optimizedStops: DeliveryAgentSimpleRoutePreviewStop[];
  warnings: unknown[];
  validationErrors: unknown[];
  geocodeFailures: unknown[];
  googleCostEstimate?: RouteOptimizerGoogleCostEstimate;
};

export type DeliveryAgentSimpleRoutePreviewSourceSummary = {
  validStops: number;
  invalidStops: number;
  pendingOrders: number;
  totalMealQuantity: number;
  byArea: Record<string, number>;
};

export type DeliveryAgentSimpleRoutePreviewResponse = {
  deliveryDate: string;
  routePreview: DeliveryAgentSimpleRoutePreviewResult;
  sourceSummary: DeliveryAgentSimpleRoutePreviewSourceSummary;
  notes: string;
  coordinateCoverage?: DeliveryAgentCoordinateCoverageSummary;
  costGuardrail?: DeliveryAgentPreviewBudgetSummary;
};

export type DeliveryAgentPlanningProfileDriverSummary = {
  runSlot: string;
  defaultDriverName: string;
  role: string;
  startsFrom: string;
  preferredEndRole: string;
  isBackupOnly: boolean;
};

export type DeliveryAgentPlanningProfileSummary = {
  profileId: string;
  profileVersion: string;
  name: string;
  description: string;
  enabled: boolean;
  timezone: string;
  normalStartTime: string;
  earliestStartTime: string;
  hardDeliveryDeadline: string;
  preferredDeadlineBufferMinutes: number;
  drivers: DeliveryAgentPlanningProfileDriverSummary[];
};

export type DeliveryAgentCandidatePlanStop = {
  orderId: string;
  customerName: string;
  area: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  totalMealQuantity: number;
  planningTags: string[];
};

export type DeliveryAgentCandidateRunConstraintPlan = {
  fixedStops: unknown[];
  endPoint: null;
  repairActionsPlanned: string[];
};

export type DeliveryAgentCandidateRun = {
  runSlot: string;
  driverName: string;
  role: string;
  startType: string;
  startLocationLabel: string;
  stops: DeliveryAgentCandidatePlanStop[];
  stopCount: number;
  areaBreakdown: Record<string, number>;
  totalMealQuantity: number;
  plannedStartTimeSource: string;
  constraintPlan: DeliveryAgentCandidateRunConstraintPlan;
};

export type DeliveryAgentCandidateHandoffPlan = {
  providerRunSlot: string;
  receiverRunSlot: string;
  mode: "synthetic_handoff_stop_later";
  note: string;
};

export type DeliveryAgentCandidatePlanSummary = {
  totalStops: number;
  totalMeals: number;
  runCount: number;
  selfUsed: boolean;
  selfStopCount: number;
  byRun: Record<string, number>;
  byArea: Record<string, number>;
  northYorkSplit: {
    dt: number;
    marco: number;
  };
  warnings: string[];
};

export type DeliveryAgentCandidatePlan = {
  candidateId: string;
  name: string;
  description: string;
  strategyType: string;
  profileId: string;
  profileVersion: string;
  deliveryDate: string;
  runs: DeliveryAgentCandidateRun[];
  summary: DeliveryAgentCandidatePlanSummary;
  warnings: string[];
  assumptions: string[];
  handoffPlan: DeliveryAgentCandidateHandoffPlan;
  constraintPlan: DeliveryAgentCandidateRunConstraintPlan;
};

export type DeliveryAgentGenerateCandidatePlansResponse = {
  deliveryDate: string;
  profileId: string;
  profileVersion: string;
  candidates: DeliveryAgentCandidatePlan[];
  notes: string;
  coordinateCoverage: DeliveryAgentCoordinateCoverageSummary;
  geocodeEnrichment?: DeliveryAgentGeocodeEnrichment;
};

export type DeliveryAgentLlmCandidatePlanningHistoryStatus =
  | "included"
  | "empty"
  | "skipped"
  | "unavailable";

export type DeliveryAgentLlmCandidatePlanningLiveCallGateStatus =
  | "not_requested"
  | "allowed"
  | "blocked";

export type DeliveryAgentLlmCandidatePlanningLiveCallReadinessStatus =
  | "ready"
  | "blocked";

export type DeliveryAgentLlmCandidatePlanningLiveCallGate = {
  gateVersion: string;
  status: DeliveryAgentLlmCandidatePlanningLiveCallGateStatus;
  readinessStatus: DeliveryAgentLlmCandidatePlanningLiveCallReadinessStatus;
  liveCallRequested: boolean;
  liveCallAllowed: boolean;
  callType: string;
  modelTier: string;
  provider?: string;
  modelId?: string;
  modelConfigured: boolean;
  apiKeyConfigured: boolean;
  apiKeyEnvVar?: string;
  pricingConfigured: boolean;
  pricingVersion: string;
  inputCentsPerMillion?: number;
  outputCentsPerMillion?: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  estimatedCostCents?: number;
  targetCents: number;
  withinTarget?: boolean;
  blockingReasons: string[];
  warnings: string[];
};

export type DeliveryAgentLlmCandidatePlanningFinalistRun = {
  runSlot: string;
  driverName: string;
  orderIds: string[];
  stopCount: number;
  areaBreakdown: Record<string, number>;
};

export type DeliveryAgentLlmCandidatePlanningFinalistSummary = {
  candidateId: string;
  name: string;
  strategyType: string;
  localScore: number;
  rank: number;
  runs: DeliveryAgentLlmCandidatePlanningFinalistRun[];
  usesHandoff: boolean;
  usesSelfRun: boolean;
  totalStops: number;
  totalMeals: number;
  blockingIssues: string[];
  warnings: string[];
};

export type DeliveryAgentLlmCandidatePlanningResponse = {
  pipelineVersion: string;
  status:
    | "cache_hit"
    | "ready_for_provider"
    | "provider_completed"
    | "provider_completed_not_cached"
    | "blocked";
  deliveryDate: string;
  profileId: string;
  profileVersion: string;
  planningFingerprint?: string;
  orderSummary: {
    totalOrders: number;
    validStops: number;
    invalidStops: number;
    pendingOrders: number;
    ordersWithCoordinates: number;
    ordersMissingCoordinates: string[];
    coordinateCoveragePercent: number;
    byArea: Record<string, number>;
  };
  historicalPackage: {
    status: DeliveryAgentLlmCandidatePlanningHistoryStatus;
    selectedCaseIds: string[];
    selectedCaseCount: number;
    warningCount: number;
  };
  prompt?: {
    promptPackageVersion: string;
    promptVersion: string;
    outputSchemaVersion: string;
    scope: string;
    callType: string;
    estimatedInputTokens: number;
    maxInputTokens: number;
    estimatedOutputTokens: number;
    maxOutputTokens: number;
    tokenStatus: "within_limit" | "over_limit";
    messageCount: number;
    promptOrderCount: number;
    hasHistoricalPackage: boolean;
  };
  cache: {
    readStatus: "not_started" | "disabled" | "miss" | "hit" | "stale";
    writeStatus:
      | "not_started"
      | "written"
      | "disabled"
      | "skipped_invalid_output"
      | "skipped_fingerprint_mismatch";
    decisionStatus: "enabled" | "disabled";
    decisionReasons: string[];
    ttlHours: number;
    cacheKey?: string;
  };
  provider: {
    allowProviderCall: boolean;
    apiCallMade: boolean;
    status:
      | "not_allowed"
      | "not_configured"
      | "not_needed_cache_hit"
      | "blocked_by_policy"
      | "blocked_by_token_limit"
      | "called"
      | "failed";
    reason: string;
    modelTier: string;
    modelProvider?: string;
    modelId?: string;
    modelConfigured: boolean;
  };
  liveCallGate: DeliveryAgentLlmCandidatePlanningLiveCallGate;
  localCandidates: {
    dryRunStatus: "not_started" | "prompt_ready" | "ranked" | "partial" | "fallback_selected" | "blocked";
    candidatePlanCount: number;
    finalistCandidateCount: number;
    parsedAcceptedCandidateIds: string[];
    parsedRejectedCandidateIds: string[];
    finalistCandidateIds: string[];
    finalists?: DeliveryAgentLlmCandidatePlanningFinalistSummary[];
  };
  warnings: string[];
  errors: string[];
};

export type DeliveryAgentRouteShapeIssueType =
  | "meetup_too_late"
  | "downtown_before_meetup"
  | "north_york_after_downtown"
  | "dt_wrong_endpoint"
  | "marco_wrong_endpoint";

export type DeliveryAgentRouteShapeIssuePreview = {
  issueType: DeliveryAgentRouteShapeIssueType;
  runSlot: string;
  driverName: string;
  severity: "info" | "warning" | "blocking";
  message: string;
  evidence: Record<string, unknown>;
};

export type DeliveryAgentRepairActionType =
  | "apply_fixed_stop_position"
  | "apply_end_point";

export type DeliveryAgentRepairActionApplied = {
  actionType: DeliveryAgentRepairActionType;
  runSlot: string;
  targetStopName?: string;
  targetStopAddress?: string;
  targetOrderIds?: string[];
  fixedStopPosition?: number;
  reason: string;
  before?: string;
  after?: string;
};

export type DeliveryAgentCandidateRunRepairStatus =
  | "not_needed"
  | "repaired"
  | "repair_failed";

export type DeliveryAgentCandidateRepairSummary = {
  repairAttempted: boolean;
  repairSucceeded: boolean;
  issuesDetected: DeliveryAgentRouteShapeIssuePreview[];
  repairActionsApplied: DeliveryAgentRepairActionApplied[];
  beforeSummary?: DeliveryAgentCandidatePreviewSummary;
  afterSummary?: DeliveryAgentCandidatePreviewSummary;
  warnings: string[];
};

export type DeliveryAgentCandidateRunPreviewStatus =
  | "previewed"
  | "failed"
  | "skipped_no_stops";

export type DeliveryAgentCandidateRunPreview = {
  runSlot: string;
  driverName: string;
  role: string;
  stopCount: number;
  totalDurationMinutes?: number;
  totalDistanceKm?: number;
  estimatedFinishTime?: string;
  formattedEstimatedFinishTime?: string;
  optimizedStopCount: number;
  optimizedStops: DeliveryAgentSimpleRoutePreviewStop[];
  routeOptimizerWarnings: unknown[];
  routeOptimizerValidationErrors: unknown[];
  geocodeFailures: unknown[];
  routeOptimizerGoogleCostEstimate?: RouteOptimizerGoogleCostEstimate;
  previewStatus: DeliveryAgentCandidateRunPreviewStatus;
  previewError?: string;
  syntheticMeetupIncluded?: boolean;
  meetupSequence?: number;
  meetupEta?: string;
  formattedMeetupEta?: string;
  routeShapeIssues?: DeliveryAgentRouteShapeIssuePreview[];
  repairActionsApplied?: DeliveryAgentRepairActionApplied[];
  wasRepreviewedAfterRepair?: boolean;
  repairStatus?: DeliveryAgentCandidateRunRepairStatus;
};

export type DeliveryAgentMeetupScoreBreakdownItem = {
  key: string;
  label: string;
  weight: number;
  points: number;
  reason: string;
};

export type DeliveryAgentMeetupSelectionConfidence = "high" | "medium" | "low";

export type DeliveryAgentSelectedMeetup = {
  meetupAddress: string;
  meetupFixedStopPosition: 1 | 2;
  variant: "meetup_stop_1" | "meetup_stop_2_with_one_before";
  sourceOrderId?: string;
  sourceArea?: string;
  stopBeforeMeetupOrderId?: string;
  syntheticHandoffStopUsed: boolean;
  score?: number;
  scoreBreakdown?: DeliveryAgentMeetupScoreBreakdownItem[];
  reasoning?: string;
  warnings?: string[];
  selectionConfidence?: DeliveryAgentMeetupSelectionConfidence;
};

export type DeliveryAgentCandidateHandoffPreviewPlan = {
  providerRunSlot: string;
  receiverRunSlot: string;
  selectedMeetup: DeliveryAgentSelectedMeetup | null;
  meetupEta?: string;
  formattedMeetupEta?: string;
  receiverStartLocation?: string;
  receiverStartTime?: string;
  handoffSkipped?: boolean;
  skipReason?: string;
};

export type DeliveryAgentCandidatePreviewStatus =
  | "previewed"
  | "partial_failed"
  | "failed";

export type DeliveryAgentCandidatePreviewSummary = {
  runCount: number;
  totalStops: number;
  selfUsed: boolean;
  selfStopCount: number;
  latestEstimatedFinishTime?: string;
  formattedLatestEstimatedFinishTime?: string;
  allRunsFinishBeforeDeadline: boolean;
  minutesBeforeOrAfterDeadline?: number;
  totalDistanceKm?: number;
  totalDurationMinutes?: number;
  runFinishTimes: Record<string, string>;
  blockingIssues: string[];
  comparisonNotes: string;
};

export type DeliveryAgentCandidateScoreBreakdownItem = {
  key: string;
  label: string;
  weight: number;
  points: number;
  reason: string;
};

export type DeliveryAgentCandidateRecommendationStatus =
  | "recommended"
  | "acceptable"
  | "risky"
  | "infeasible"
  | "not_recommended";

export type DeliveryAgentRecommendedPlanSummary = {
  candidateId: string;
  candidateName: string;
  score: number;
  recommendationStatus: DeliveryAgentCandidateRecommendationStatus;
  feasibilityTier?: 1 | 2 | 3 | 4;
  feasibilityLabel?: string;
  formattedLatestFinishTime?: string;
  allRunsFinishBeforeDeadline: boolean;
  minutesBeforeOrAfterDeadline?: number;
  selfUsed: boolean;
  runFinishTimes: Record<string, string>;
  routeRepairStatus: string;
  decisionSummary: string;
  operationalNotes?: string[];
  selfRecommendationReason?: string;
  meetupBalanceNote?: string;
};

export type DeliveryAgentPreviewCacheSummary = {
  status: "hit" | "miss";
  cacheKey: string;
  cachedAt?: string;
  expiresAt?: string;
  ttlSeconds: number;
  note: string;
};

export type DeliveryAgentCandidateCombinationMeta = {
  baseSplitCandidateId: string;
  fullCandidateId: string;
  combinationLabel: string;
  splitStrategyType: string;
  meetupVariantId: string;
  meetupFixedStopPosition: 1 | 2;
  plannedStartStrategy: string;
  selfUsageStrategy: "none" | "self_fallback";
  constraintStrategy: string;
  variantAssumptions: string[];
  variantWarnings: string[];
};

export type DeliveryAgentCandidatePlanPreviewCore = {
  candidateId: string;
  name: string;
  strategyType: string;
  status: DeliveryAgentCandidatePreviewStatus;
  runs: DeliveryAgentCandidateRunPreview[];
  summary: DeliveryAgentCandidatePreviewSummary;
  handoffPlan: DeliveryAgentCandidateHandoffPreviewPlan;
  candidateRepairSummary: DeliveryAgentCandidateRepairSummary;
  warnings: string[];
  errors: string[];
  assumptions: string[];
  combination?: DeliveryAgentCandidateCombinationMeta;
};

export type DeliveryAgentCandidatePlanPreview = DeliveryAgentCandidatePlanPreviewCore & {
  score: number;
  rank: number;
  recommendationStatus: DeliveryAgentCandidateRecommendationStatus;
  feasibilityTier?: 1 | 2 | 3 | 4;
  feasibilityLabel?: string;
  scoreBreakdown: DeliveryAgentCandidateScoreBreakdownItem[];
  pros: string[];
  cons: string[];
  blockingIssues: string[];
  decisionSummary: string;
  operationalNotes?: string[];
  selfRecommendationReason?: string;
  meetupBalanceNote?: string;
};

export type DeliveryAgentPreviewCandidatePlansResponse = {
  deliveryDate: string;
  profileId: string;
  profileVersion: string;
  candidates: DeliveryAgentCandidatePlanPreview[];
  recommendedCandidateId: string | null;
  recommendedPlanSummary: DeliveryAgentRecommendedPlanSummary | null;
  selectionNotes: string;
  selectionWarnings: string[];
  expansionWarnings?: string[];
  notes: string;
  coordinateCoverage: DeliveryAgentCoordinateCoverageSummary;
  geocodeEnrichment?: DeliveryAgentGeocodeEnrichment;
  costGuardrail?: DeliveryAgentPreviewBudgetSummary;
  previewCache?: DeliveryAgentPreviewCacheSummary;
};

const deliveryAgentReviewFeedbackTagSchema = z.enum([
  "meetup_too_far_for_receiver",
  "meetup_too_far_for_provider",
  "meetup_too_late",
  "wrong_order_split",
  "provider_route_shape_wrong",
  "receiver_route_shape_wrong",
  "wrong_endpoint",
  "not_enough_deadline_buffer",
  "self_used_too_much",
  "self_should_be_used",
  "too_many_stops_for_receiver",
  "too_many_stops_for_provider",
  "route_too_risky",
  "preferred_another_candidate",
  "other",
]);

export const deliveryAgentOrderSnapshotSchema = z.object({
  orderCount: z.number().int().min(0),
  validStopCount: z.number().int().min(0),
  invalidStopCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  orderIds: z.array(z.string()),
  invalidOrders: z
    .array(
      z.object({
        orderId: z.string(),
        mongoId: z.string().optional(),
        area: z.string().optional(),
        errors: z.array(
          z.object({
            code: z.string(),
            message: z.string(),
            field: z.string().optional(),
          })
        ),
      })
    )
    .optional(),
  warnings: z
    .array(
      z.object({
        orderId: z.string(),
        warnings: z.array(
          z.object({
            code: z.string(),
            message: z.string(),
            field: z.string().optional(),
          })
        ),
      })
    )
    .optional(),
});

export const deliveryAgentReviewPlanBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
  profileId: z.string().trim().min(1),
  profileVersion: z.string().trim().min(1),
  planningSessionId: z.string().trim().min(1).optional(),
  reviewStatus: z.enum(["approved", "improvement_requested", "edited", "rejected"]),
  feedbackText: z.string().max(4000).optional(),
  feedbackTags: z.array(deliveryAgentReviewFeedbackTagSchema).optional(),
  recommendedCandidateId: z.string().trim().min(1),
  selectedCandidateId: z.string().trim().min(1),
  didDonaldOverrideRecommendation: z.boolean().optional(),
  recommendedPlanSummary: z.record(z.string(), z.unknown()).optional(),
  selectedPlanSummary: z.record(z.string(), z.unknown()).optional(),
  candidatePreviewSnapshot: z.record(z.string(), z.unknown()).optional(),
  orderSnapshot: deliveryAgentOrderSnapshotSchema.optional(),
});

export const deliveryAgentReviewPlanQuerySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
  profileId: z.string().trim().min(1),
});

export type DeliveryAgentReviewPlanBody = z.infer<typeof deliveryAgentReviewPlanBodySchema>;
export type DeliveryAgentReviewPlanQuery = z.infer<typeof deliveryAgentReviewPlanQuerySchema>;

export type DeliveryAgentReviewPlanResponse = {
  deliveryAgentRunId: string;
  reviewStatus: "approved" | "improvement_requested" | "edited" | "rejected";
  reviewedAt: string;
  recommendedCandidateId: string;
  selectedCandidateId: string;
  didDonaldOverrideRecommendation: boolean;
  message: string;
  operationalState?: DeliveryAgentOperationalReviewState;
};

export type DeliveryAgentOperationalReviewState =
  | "pending_review"
  | "improvement_requested"
  | "approved"
  | "final_route_created"
  | "final_route_partial_created"
  | "final_route_missing_or_deleted";

export type DeliveryAgentGetReviewPlanResponse = {
  review: {
    deliveryAgentRunId: string;
    deliveryDate: string;
    profileId: string;
    profileVersion?: string;
    planningSessionId?: string;
    reviewStatus?:
      | "pending"
      | "approved"
      | "improvement_requested"
      | "edited"
      | "rejected";
    operationalState?: DeliveryAgentOperationalReviewState;
    reviewedAt?: string;
    reviewedBy?: string;
    donaldFeedbackText?: string;
    donaldFeedbackTags?: string[];
    recommendedCandidateId?: string;
    selectedCandidateId?: string;
    didDonaldOverrideRecommendation?: boolean;
    selectedPlanSummary?: Record<string, unknown>;
    finalRouteOptimizerMetadata?: DeliveryAgentFinalRouteOptimizerMetadata;
    finalRouteGeneration?: number;
    finalRouteRunsMarkedMissingAt?: string;
    reviewReopenedAt?: string;
    activeCandidateGenerationNumber?: number;
    submittedFeedbackSummary?: {
      feedbackText?: string;
      feedbackTags?: string[];
      reviewedAt: string;
    };
  } | null;
};

export const deliveryAgentGenerateImprovedCandidatePlansBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
  profileId: z.string().trim().min(1),
  deliveryAgentRunId: z.string().trim().min(1).optional(),
});

export type DeliveryAgentGenerateImprovedCandidatePlansBody = z.infer<
  typeof deliveryAgentGenerateImprovedCandidatePlansBodySchema
>;

export type DeliveryAgentGenerateImprovedCandidatePlansResponse = {
  preview: DeliveryAgentPreviewCandidatePlansResponse;
  generationNumber: number;
  applicationStatus: "applied" | "partial" | "not_applied";
  applicationNotes: string[];
  feedbackInterpretation: {
    preferredMeetupAddress?: string;
    preferredMeetupOrderId?: string;
    preferredDriverAssignments: Array<{
      orderId?: string;
      customerName?: string;
      preferredRunSlot: string;
      timing?: "before_meetup" | "any";
    }>;
    penalties: string[];
    unmatchedCustomerNames: string[];
    warnings: string[];
    sourceFeedbackReviewedAt: string;
  };
  warnings: string[];
};

export const deliveryAgentReopenReviewBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
  profileId: z.string().trim().min(1),
  deliveryAgentRunId: z.string().trim().min(1).optional(),
  confirmed: z.literal(true),
});

export const deliveryAgentResetFinalRouteRunsBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
  profileId: z.string().trim().min(1),
  deliveryAgentRunId: z.string().trim().min(1).optional(),
  confirmed: z.literal(true),
  reason: z.string().max(1000).optional(),
  markMissing: z.boolean().optional(),
});

export type DeliveryAgentReopenReviewBody = z.infer<typeof deliveryAgentReopenReviewBodySchema>;
export type DeliveryAgentResetFinalRouteRunsBody = z.infer<
  typeof deliveryAgentResetFinalRouteRunsBodySchema
>;

export const deliveryAgentCreateFinalRouteRunBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
  profileId: z.string().trim().min(1),
  deliveryAgentRunId: z.string().trim().min(1).optional(),
});

export type DeliveryAgentCreateFinalRouteRunBody = z.infer<
  typeof deliveryAgentCreateFinalRouteRunBodySchema
>;

export type DeliveryAgentFinalRouteSummary = {
  runSlot: string;
  driverName: string;
  routeName?: string;
  stopCount: number;
  estimatedFinishTime?: string;
  totalDurationMinutes?: number;
  totalDistanceKm?: number;
  detailsLink?: string;
  driverLink?: string;
};

export type DeliveryAgentFinalRouteRunFailure = {
  runSlot: string;
  driverName: string;
  stopCount: number;
  externalId?: string;
  idempotencyKey?: string;
  orderId?: string;
  customerName?: string;
  address?: string;
  customerIndex?: number;
  field?: string;
  errorMessage?: string;
  errorCode?: string;
};

export type DeliveryAgentFinalRouteOptimizerMetadata = {
  finalRouteOptimizerStatus: "pending" | "created" | "partial_created" | "failed";
  finalRouteOptimizerCreatedAt?: string;
  finalRouteOptimizerCreatedBy?: string;
  systemRecommendedCandidateId: string;
  selectedCandidateId: string;
  didDonaldOverrideRecommendation: boolean;
  planningSessionId?: string;
  planningSessionSource?: string;
  requestedRunCount?: number;
  succeededRunCount?: number;
  failedRunCount?: number;
  finalRouteOptimizerRunIds?: string[];
  routeSummaries?: DeliveryAgentFinalRouteSummary[];
  failedRouteSummaries?: DeliveryAgentFinalRouteRunFailure[];
  creationError?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type DeliveryAgentCreateFinalRouteRunResponse = {
  deliveryAgentRunId: string;
  idempotentReplay: boolean;
  finalRouteOptimizerMetadata: DeliveryAgentFinalRouteOptimizerMetadata;
  routeSummaries: DeliveryAgentFinalRouteSummary[];
  message: string;
};
