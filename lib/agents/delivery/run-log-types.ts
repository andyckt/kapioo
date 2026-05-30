import type { RoutingIssue } from "@/lib/agents/delivery/types";

export type DeliveryAgentRunStatus =
  | "draft"
  | "previewing"
  | "ready_for_review"
  | "created"
  | "failed"
  | "cancelled";

export type DeliveryAgentTriggerSource = "manual" | "cron" | "test";

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
  version?: string;
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

export const DEFAULT_DELIVERY_AGENT_RUN_VERSION = "m4-v1" as const;
