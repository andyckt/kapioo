import mongoose, { Document, Model, Schema } from "mongoose";

import type {
  DeliveryAgentLearningArtifacts,
  DeliveryAgentLocationArtifacts,
  DeliveryAgentPlanningArtifacts,
  DeliveryAgentReviewStatus,
  DeliveryAgentRouteOptimizerRun,
  DeliveryAgentRunError,
  DeliveryAgentRunInvalidOrder,
  DeliveryAgentRunStatus,
  DeliveryAgentRunWarning,
  DeliveryAgentTriggerSource,
} from "@/lib/agents/delivery/run-log-types";

export interface IDeliveryAgentRun extends Omit<Document, "errors"> {
  deliveryDate: string;
  profileId: string;
  planningSessionId: string;
  duplicatePreventionKey: string;
  triggeredBy?: string;
  triggerSource: DeliveryAgentTriggerSource;
  startedAt?: Date;
  completedAt?: Date;
  /** Agent/RO pipeline lifecycle — not Donald's human review (see reviewStatus). */
  status: DeliveryAgentRunStatus;
  orderCount: number;
  validStopCount: number;
  invalidStopCount: number;
  warningCount: number;
  orderIds: string[];
  invalidOrders?: DeliveryAgentRunInvalidOrder[];
  warnings?: DeliveryAgentRunWarning[];
  selectedPlanSummary?: Record<string, unknown>;
  profileSnapshot?: Record<string, unknown>;
  candidateCount?: number;
  previewCount?: number;
  /** Planning profile version — not log schema version (see version). */
  profileVersion?: string;
  /** Donald's review outcome — separate from agent status. */
  reviewStatus?: DeliveryAgentReviewStatus;
  reviewedAt?: Date;
  reviewedBy?: string;
  donaldFeedbackText?: string;
  donaldFeedbackTags?: string[];
  planningArtifacts?: DeliveryAgentPlanningArtifacts;
  locationArtifacts?: DeliveryAgentLocationArtifacts;
  learningArtifacts?: DeliveryAgentLearningArtifacts;
  routeOptimizerPlanningSessionId?: string;
  routeOptimizerRuns?: DeliveryAgentRouteOptimizerRun[];
  errors?: DeliveryAgentRunError[];
  notes?: string;
  /** Log schema version — not planning profile version (see profileVersion). */
  version?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeliveryAgentRunModel extends Model<IDeliveryAgentRun> {}

const RoutingIssueSnapshotSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    field: { type: String, trim: true },
  },
  { _id: false }
);

const InvalidOrderSnapshotSchema = new Schema(
  {
    orderId: { type: String, required: true, trim: true },
    mongoId: { type: String, trim: true },
    area: { type: String, trim: true },
    errors: { type: [RoutingIssueSnapshotSchema], default: [] },
  },
  { _id: false }
);

const WarningSnapshotSchema = new Schema(
  {
    orderId: { type: String, required: true, trim: true },
    warnings: { type: [RoutingIssueSnapshotSchema], default: [] },
  },
  { _id: false }
);

const RouteLocationSchema = new Schema(
  {
    address: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

const RouteOptimizerRunSchema = new Schema(
  {
    runId: { type: String, required: true, trim: true },
    driverName: { type: String, required: true, trim: true },
    externalId: { type: String, required: true, trim: true },
    idempotencyKey: { type: String, required: true, trim: true },
    detailsLink: { type: String, trim: true },
    driverLink: { type: String, trim: true },
    estimatedFinishTime: { type: String, trim: true },
    totalDurationMinutes: { type: Number },
    optimizedRoute: { type: [Schema.Types.Mixed], default: undefined },
    startLocation: { type: RouteLocationSchema },
    endLocation: { type: RouteLocationSchema },
    repairActionCount: { type: Number },
  },
  { _id: false }
);

const RunErrorSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    details: { type: Schema.Types.Mixed },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const DeliveryAgentRunSchema = new Schema<IDeliveryAgentRun>(
  {
    deliveryDate: {
      type: String,
      required: true,
      trim: true,
    },
    profileId: {
      type: String,
      required: true,
      trim: true,
    },
    planningSessionId: {
      type: String,
      required: true,
      trim: true,
    },
    duplicatePreventionKey: {
      type: String,
      required: true,
      trim: true,
    },
    triggeredBy: {
      type: String,
      trim: true,
    },
    triggerSource: {
      type: String,
      enum: ["manual", "cron", "test"],
      required: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["draft", "previewing", "ready_for_review", "created", "failed", "cancelled"],
      default: "draft",
      required: true,
    },
    orderCount: {
      type: Number,
      required: true,
      default: 0,
    },
    validStopCount: {
      type: Number,
      required: true,
      default: 0,
    },
    invalidStopCount: {
      type: Number,
      required: true,
      default: 0,
    },
    warningCount: {
      type: Number,
      required: true,
      default: 0,
    },
    orderIds: {
      type: [String],
      default: [],
    },
    invalidOrders: {
      type: [InvalidOrderSnapshotSchema],
      default: [],
    },
    warnings: {
      type: [WarningSnapshotSchema],
      default: [],
    },
    selectedPlanSummary: {
      type: Schema.Types.Mixed,
    },
    profileSnapshot: {
      type: Schema.Types.Mixed,
    },
    candidateCount: {
      type: Number,
    },
    previewCount: {
      type: Number,
    },
    profileVersion: {
      type: String,
      trim: true,
    },
    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "edited", "rejected"],
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: String,
      trim: true,
    },
    donaldFeedbackText: {
      type: String,
      trim: true,
    },
    donaldFeedbackTags: {
      type: [String],
      default: undefined,
    },
    planningArtifacts: {
      type: Schema.Types.Mixed,
    },
    locationArtifacts: {
      type: Schema.Types.Mixed,
    },
    learningArtifacts: {
      type: Schema.Types.Mixed,
    },
    routeOptimizerPlanningSessionId: {
      type: String,
      trim: true,
    },
    routeOptimizerRuns: {
      type: [RouteOptimizerRunSchema],
      default: [],
    },
    errors: {
      type: [RunErrorSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
    version: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

DeliveryAgentRunSchema.index({ duplicatePreventionKey: 1 }, { unique: true });
DeliveryAgentRunSchema.index({ deliveryDate: 1 });
DeliveryAgentRunSchema.index({ planningSessionId: 1 });
DeliveryAgentRunSchema.index({ status: 1 });
DeliveryAgentRunSchema.index({ createdAt: 1 });
DeliveryAgentRunSchema.index({ deliveryDate: 1, profileVersion: 1 });
DeliveryAgentRunSchema.index({ reviewStatus: 1, deliveryDate: 1 });

const DeliveryAgentRun: IDeliveryAgentRunModel =
  (mongoose.models.DeliveryAgentRun as IDeliveryAgentRunModel | undefined) ||
  mongoose.model<IDeliveryAgentRun, IDeliveryAgentRunModel>(
    "DeliveryAgentRun",
    DeliveryAgentRunSchema
  );

export default DeliveryAgentRun;
