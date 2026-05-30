import type { RoutingIssue } from "@/lib/agents/delivery/types";

/** Agent/RO pipeline lifecycle — not Donald's human review. */
export type DeliveryAgentRunStatus =
  | "draft"
  | "previewing"
  | "ready_for_review"
  | "created"
  | "failed"
  | "cancelled";

/** Donald's review outcome — separate from agent `status`. */
export type DeliveryAgentReviewStatus = "pending" | "approved" | "edited" | "rejected";

export type DeliveryAgentTriggerSource = "manual" | "cron" | "test";

export type DeliveryAgentRouteLocation = {
  address?: string;
  lat?: number;
  lng?: number;
};

export type DeliveryAgentRouteLocationSnapshot = {
  lat?: number;
  lng?: number;
  normalizedAddress?: string;
  area?: string;
  zone?: string;
  clusterId?: string;
  /** Technical join keys only — learning is location-first. */
  orderIds?: string[];
  fixedStopPosition?: number;
  isEndPoint?: boolean;
  isSynthetic?: boolean;
  stopType?: string;
};

export type DeliveryAgentHandoffEvent = {
  type?: string;
  location?: DeliveryAgentRouteLocation;
  normalizedAddress?: string;
  area?: string;
  clusterId?: string;
  fromRunId?: string;
  toRunId?: string;
  notes?: string;
  createdAt?: string;
};

export type DeliveryAgentConstraintApplication = {
  code: string;
  message?: string;
  appliedAt?: string;
  details?: Record<string, unknown>;
};

export type DeliveryAgentRouteShapeIssue = {
  code: string;
  message: string;
  severity?: "info" | "warning" | "error";
  details?: Record<string, unknown>;
};

export type DeliveryAgentPlanCandidateSummary = {
  candidateId?: string;
  label?: string;
  score?: number;
  runCount?: number;
  estimatedFinishBefore1Pm?: boolean;
  details?: Record<string, unknown>;
};

export type DeliveryAgentActualOutcome = {
  recordedAt?: string;
  finishTime?: string;
  finishBefore1Pm?: boolean;
  onTimeRate?: number;
  notes?: string;
  details?: Record<string, unknown>;
};

export const PLANNING_ARTIFACTS_VERSION = "planning-artifacts-v1" as const;
export const LOCATION_ARTIFACTS_VERSION = "location-artifacts-v1" as const;
export const LEARNING_ARTIFACTS_VERSION = "learning-artifacts-v1" as const;

export type DeliveryAgentPlanningArtifacts = {
  artifactVersion: typeof PLANNING_ARTIFACTS_VERSION;
  candidatePlansTested?: DeliveryAgentPlanCandidateSummary[];
  selectedPlanSummary?: Record<string, unknown>;
  systemRecommendedCandidateId?: string;
  donaldSelectedCandidateId?: string;
  didDonaldOverrideRecommendation?: boolean;
  systemRecommendation?: Record<string, unknown>;
  scoreBreakdown?: Record<string, unknown>;
  agentReasoningSummary?: string;
  constraintApplicationLog?: DeliveryAgentConstraintApplication[];
  routeShapeIssuesDetected?: DeliveryAgentRouteShapeIssue[];
  finalAcceptedPlan?: Record<string, unknown>;
  candidatePreviewSnapshot?: Record<string, unknown>;
};

export type DeliveryAgentLocationArtifacts = {
  artifactVersion: typeof LOCATION_ARTIFACTS_VERSION;
  stopSnapshots?: DeliveryAgentRouteLocationSnapshot[];
  fixedStopUsage?: Record<string, unknown>[];
  endpointUsage?: Record<string, unknown>[];
  handoffEvents?: DeliveryAgentHandoffEvent[];
  startLocation?: DeliveryAgentRouteLocation;
  meetUpLocation?: DeliveryAgentRouteLocation;
  endLocation?: DeliveryAgentRouteLocation;
};

export type DeliveryAgentLearningArtifacts = {
  artifactVersion: typeof LEARNING_ARTIFACTS_VERSION;
  donaldFeedbackText?: string;
  donaldFeedbackTags?: string[];
  systemRecommendedCandidateId?: string;
  donaldSelectedCandidateId?: string;
  didDonaldOverrideRecommendation?: boolean;
  historicalComparison?: Record<string, unknown>;
  improvementSuggestions?: Record<string, unknown>[];
  approvedRuleChanges?: Record<string, unknown>[];
  actualOutcome?: DeliveryAgentActualOutcome;
  retryHistory?: Record<string, unknown>[];
  rejectionHistory?: Record<string, unknown>[];
  manualEdits?: Record<string, unknown>[];
  overrideHistory?: Record<string, unknown>[];
};

export type DeliveryAgentRunInvalidOrder = {
  orderId: string;
  mongoId?: string;
  area?: string;
  errors: Pick<RoutingIssue, "code" | "message" | "field">[];
};

export type DeliveryAgentRunWarning = {
  orderId: string;
  warnings: Pick<RoutingIssue, "code" | "message" | "field">[];
};

export type DeliveryAgentRunError = {
  code: string;
  message: string;
  details?: unknown;
  createdAt: Date;
};

export type DeliveryAgentRouteOptimizerRun = {
  runId: string;
  driverName: string;
  externalId: string;
  idempotencyKey: string;
  detailsLink?: string;
  driverLink?: string;
  estimatedFinishTime?: string;
  totalDurationMinutes?: number;
  optimizedRoute?: unknown[];
  startLocation?: DeliveryAgentRouteLocation;
  endLocation?: DeliveryAgentRouteLocation;
  repairActionCount?: number;
};

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

export type CreateDeliveryAgentRunLogInput = {
  deliveryDate: string;
  profileId: string;
  triggerSource: DeliveryAgentTriggerSource;
  triggeredBy?: string;
  status?: DeliveryAgentRunStatus;
  planningSessionId?: string;
  startedAt?: Date;
  orderCount: number;
  validStopCount: number;
  invalidStopCount: number;
  warningCount: number;
  orderIds: string[];
  invalidOrders?: DeliveryAgentRunInvalidOrder[];
  warnings?: DeliveryAgentRunWarning[];
  notes?: string;
  /** Log schema version — not planning profile version (see profileVersion). */
  version?: string;
  profileVersion?: string;
};

export type DeliveryAgentRunReadyForReviewSummary = {
  selectedPlanSummary?: Record<string, unknown>;
  profileSnapshot?: Record<string, unknown>;
  candidateCount?: number;
  previewCount?: number;
};

export type AttachRouteOptimizerRunsOptions = {
  routeOptimizerPlanningSessionId?: string;
};

export type DeliveryAgentRunFailureInput = {
  code: string;
  message: string;
  details?: unknown;
};

export type RecordDonaldReviewInput = {
  reviewStatus: Exclude<DeliveryAgentReviewStatus, "pending">;
  reviewedBy: string;
  reviewedAt?: Date;
  donaldFeedbackText?: string;
  donaldFeedbackTags?: string[];
};

export type AttachPlanningArtifactsInput = DeliveryAgentPlanningArtifacts;
export type AttachLocationArtifactsInput = DeliveryAgentLocationArtifacts;
export type AttachLearningArtifactsInput = DeliveryAgentLearningArtifacts;

export type SaveFinalRouteOptimizerResultInput = {
  routeOptimizerPlanningSessionId: string;
  routeOptimizerRuns: DeliveryAgentRouteOptimizerRun[];
  finalRouteOptimizerMetadata: DeliveryAgentFinalRouteOptimizerMetadata;
};

export type SaveFinalRouteOptimizerPartialResultInput = {
  routeOptimizerPlanningSessionId: string;
  routeOptimizerRuns: DeliveryAgentRouteOptimizerRun[];
  finalRouteOptimizerMetadata: DeliveryAgentFinalRouteOptimizerMetadata;
};

export type SaveFinalRouteOptimizerFailureInput = {
  routeOptimizerPlanningSessionId?: string;
  finalRouteOptimizerMetadata: DeliveryAgentFinalRouteOptimizerMetadata;
};

export type DeliveryAgentRunReviewPatch = {
  profileVersion?: string;
  planningSessionId?: string;
  selectedPlanSummary?: Record<string, unknown>;
  candidateCount?: number;
  previewCount?: number;
};

/** Default log schema version stored in DB field `version`. */
export const DEFAULT_DELIVERY_AGENT_RUN_VERSION = "m4-v1" as const;
