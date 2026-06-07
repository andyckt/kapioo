import { z } from "zod";

import type { DeliveryAgentLearningBackfillReadiness } from "@/lib/agents/delivery/learning/backfill/learning-backfill-readiness";
import {
  DELIVERY_AGENT_LEARNING_LABELS,
  DELIVERY_AGENT_LEARNING_MANUAL_REVIEW_ACTIONS,
  DELIVERY_AGENT_LEARNING_REVIEW_STATUSES,
  type DeliveryAgentLearningLabel,
  type DeliveryAgentLearningManualReview,
  type DeliveryAgentLearningManualReviewAction,
  type DeliveryAgentLearningReviewStatus,
} from "@/lib/contracts/delivery-agent-learning";

export const DELIVERY_AGENT_LEARNING_REVIEW_READINESS_FILTERS = [
  "all",
  "ready",
  "needs_review",
  "blocked",
] as const;

const optionalEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

export const deliveryAgentLearningReviewListQuerySchema = z.object({
  reviewStatus: optionalEmptyString
    .pipe(z.enum(["all", ...DELIVERY_AGENT_LEARNING_REVIEW_STATUSES]).optional())
    .default("all"),
  label: optionalEmptyString
    .pipe(z.enum(["all", ...DELIVERY_AGENT_LEARNING_LABELS]).optional())
    .default("all"),
  readiness: optionalEmptyString
    .pipe(z.enum(DELIVERY_AGENT_LEARNING_REVIEW_READINESS_FILTERS).optional())
    .default("all"),
  search: optionalEmptyString.default(""),
  page: z.coerce.number().int().min(1).max(200).default(1),
  limit: z.coerce.number().int().min(5).max(50).default(20),
});

export type DeliveryAgentLearningReviewListQuery = z.infer<
  typeof deliveryAgentLearningReviewListQuerySchema
>;

export const deliveryAgentLearningCaseReviewBodySchema = z.object({
  action: z.enum(DELIVERY_AGENT_LEARNING_MANUAL_REVIEW_ACTIONS),
  notes: z.string().trim().max(2000).optional().default(""),
});

export type DeliveryAgentLearningCaseReviewBody = z.infer<
  typeof deliveryAgentLearningCaseReviewBodySchema
>;

export type DeliveryAgentLearningReviewCaseSummary = {
  id: string;
  deliveryDate: string;
  profileId: string;
  caseKey: string;
  reviewStatus: DeliveryAgentLearningReviewStatus;
  learningLabel: DeliveryAgentLearningLabel;
  learningWeight: number;
  dataQualityScore: number;
  canUseForPositiveRetrieval: boolean;
  readiness: DeliveryAgentLearningBackfillReadiness;
  positiveRetrievalReady: boolean;
  readinessReasons: string[];
  warningCount: number;
  orderCount: number;
  matchedOrders: number;
  unmatchedOrders: number;
  matchCoveragePercent: number;
  coordinateCoveragePercent: number;
  runCount: number;
  selfRunUsed: boolean;
  supportRunUsed: boolean;
  completedBefore1pm: boolean | null;
  deadlineBufferMinutes: number | null;
  latestRunCompletedAt: string | null;
  handoffStopsUsed: boolean;
  majorClusterSummary: string | null;
  manualReview?: DeliveryAgentLearningManualReview | null;
  updatedAt?: string | null;
};

export type DeliveryAgentLearningReviewCaseDetail = DeliveryAgentLearningReviewCaseSummary & {
  qualityReasons: string[];
  warnings: string[];
  coordinateWarnings: string[];
  unmatchedOrderSummaries: Array<{ orderId: string; reason: string }>;
  unmatchedRoStopSummaries: Array<{
    roRunId: string;
    sequence: number;
    customerName?: string | null;
    address?: string | null;
    reason: string;
  }>;
  areaDistribution: Record<string, number>;
  dynamicOutliers: Array<{
    ref: string;
    orderId?: string | null;
    distanceFromCenterKm: number;
    direction?: string | null;
    reason: string;
  }>;
  runSummaries: Array<{
    roRunId: string;
    driverName?: string | null;
    role: string;
    stopCount: number;
    startLocation?: string | null;
    endLocation?: string | null;
  }>;
  reviewActions: Array<{
    action: DeliveryAgentLearningManualReviewAction;
    label: string;
    description: string;
    requiresNotes: boolean;
    disabled: boolean;
    disabledReason?: string;
  }>;
};

export type DeliveryAgentLearningReviewSummaryStats = {
  total: number;
  ready: number;
  needsReview: number;
  blocked: number;
  pending: number;
  reviewed: number;
  none: number;
  trustedPositiveReady: number;
  labels: Record<DeliveryAgentLearningLabel, number>;
};

export type DeliveryAgentLearningReviewListResponse = {
  summary: DeliveryAgentLearningReviewSummaryStats;
  cases: DeliveryAgentLearningReviewCaseSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type DeliveryAgentLearningReviewUpdateResponse = {
  case: DeliveryAgentLearningReviewCaseDetail;
  message: string;
};
