import { z } from "zod";

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
  | "not_recommended";

export type DeliveryAgentRecommendedPlanSummary = {
  candidateId: string;
  candidateName: string;
  score: number;
  recommendationStatus: DeliveryAgentCandidateRecommendationStatus;
  formattedLatestFinishTime?: string;
  allRunsFinishBeforeDeadline: boolean;
  minutesBeforeOrAfterDeadline?: number;
  selfUsed: boolean;
  runFinishTimes: Record<string, string>;
  routeRepairStatus: string;
  decisionSummary: string;
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
};

export type DeliveryAgentCandidatePlanPreview = DeliveryAgentCandidatePlanPreviewCore & {
  score: number;
  rank: number;
  recommendationStatus: DeliveryAgentCandidateRecommendationStatus;
  scoreBreakdown: DeliveryAgentCandidateScoreBreakdownItem[];
  pros: string[];
  cons: string[];
  blockingIssues: string[];
  decisionSummary: string;
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
  notes: string;
};
