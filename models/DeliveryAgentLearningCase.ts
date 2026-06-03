import mongoose, { Document, Model, Schema } from "mongoose";

import {
  DELIVERY_AGENT_HISTORICAL_MATCH_CONFIDENCES,
  DELIVERY_AGENT_HISTORICAL_MATCH_METHODS,
  DELIVERY_AGENT_HISTORICAL_RUN_ROLES,
  DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION,
  DELIVERY_AGENT_LEARNING_COORDINATE_CONFIDENCES,
  DELIVERY_AGENT_LEARNING_COORDINATE_REF_TYPES,
  DELIVERY_AGENT_LEARNING_COORDINATE_SOURCES,
  DELIVERY_AGENT_LEARNING_LABELS,
  DELIVERY_AGENT_LEARNING_REVIEW_STATUSES,
  type DeliveryAgentLearningCaseContract,
} from "@/lib/contracts/delivery-agent-learning";

export interface IDeliveryAgentLearningCase
  extends Document,
    Omit<DeliveryAgentLearningCaseContract, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeliveryAgentLearningCaseModel extends Model<IDeliveryAgentLearningCase> {}

const LearningOrderSnapshotSchema = new Schema(
  {
    orderId: { type: String, required: true, trim: true },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    formattedAddress: { type: String, trim: true },
    area: { type: String, trim: true },
    status: { type: String, trim: true },
    deliveryDate: { type: String, trim: true },
    totalMealQuantity: { type: Number },
    unitNumber: { type: String, trim: true },
    buzzCode: { type: String, trim: true },
    notes: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

const MatchedStopSchema = new Schema(
  {
    kapiooOrderId: { type: String, required: true, trim: true },
    roRunId: { type: String, required: true, trim: true },
    roStopSequence: { type: Number, required: true },
    roCustomerIndex: { type: Number },
    roStopType: { type: String, trim: true },
    roCustomerName: { type: String, trim: true },
    roCustomerPhone: { type: String, trim: true },
    roCustomerAddress: { type: String, trim: true },
    matchMethod: {
      type: String,
      enum: DELIVERY_AGENT_HISTORICAL_MATCH_METHODS,
      required: true,
    },
    matchConfidence: {
      type: String,
      enum: DELIVERY_AGENT_HISTORICAL_MATCH_CONFIDENCES,
      required: true,
    },
    matchReason: { type: String, trim: true },
    coordinateRef: { type: String, trim: true },
  },
  { _id: false }
);

const UnmatchedOrderSchema = new Schema(
  {
    orderId: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    possibleRoStopRefs: { type: [String], default: [] },
  },
  { _id: false }
);

const UnmatchedRoStopSchema = new Schema(
  {
    roRunId: { type: String, required: true, trim: true },
    roStopSequence: { type: Number, required: true },
    roCustomerName: { type: String, trim: true },
    roCustomerPhone: { type: String, trim: true },
    roCustomerAddress: { type: String, trim: true },
    isSynthetic: { type: Boolean },
    stopType: { type: String, trim: true },
    reason: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const MatchCoverageSchema = new Schema(
  {
    totalOrders: { type: Number, default: 0 },
    matchedOrders: { type: Number, default: 0 },
    unmatchedOrders: { type: Number, default: 0 },
    totalRoCustomerStops: { type: Number, default: 0 },
    matchedRoCustomerStops: { type: Number, default: 0 },
    unmatchedRoCustomerStops: { type: Number, default: 0 },
    matchCoveragePercent: { type: Number, default: 0 },
    exactMatches: { type: Number, default: 0 },
    highConfidenceMatches: { type: Number, default: 0 },
    uncertainMatches: { type: Number, default: 0 },
    syntheticUnmatchedStops: { type: Number, default: 0 },
  },
  { _id: false }
);

const CoordinateSnapshotSchema = new Schema(
  {
    ref: { type: String, required: true, trim: true },
    refType: {
      type: String,
      enum: DELIVERY_AGENT_LEARNING_COORDINATE_REF_TYPES,
      required: true,
    },
    orderId: { type: String, trim: true },
    roRunId: { type: String, trim: true },
    roStopSequence: { type: Number },
    address: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number },
    coordinateSource: {
      type: String,
      enum: DELIVERY_AGENT_LEARNING_COORDINATE_SOURCES,
      required: true,
    },
    coordinateConfidence: {
      type: String,
      enum: DELIVERY_AGENT_LEARNING_COORDINATE_CONFIDENCES,
      required: true,
    },
    warnings: { type: [String], default: [] },
  },
  { _id: false }
);

const CoordinateCoverageSchema = new Schema(
  {
    totalStops: { type: Number, default: 0 },
    stopsWithCoordinates: { type: Number, default: 0 },
    stopsAddressOnly: { type: Number, default: 0 },
    coveragePercent: { type: Number, default: 0 },
    sourceBreakdown: { type: Schema.Types.Mixed, default: {} },
    handoffCoordinatesPresent: { type: Boolean, default: false },
    kitchenCoordinatesPresent: { type: Boolean, default: false },
    recommendationConfidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "low",
    },
    warnings: { type: [String], default: [] },
  },
  { _id: false }
);

const QualitySummarySchema = new Schema(
  {
    learningLabel: {
      type: String,
      enum: DELIVERY_AGENT_LEARNING_LABELS,
      default: "uncertain",
      required: true,
    },
    learningWeight: { type: Number, default: 0 },
    dataQualityScore: { type: Number, default: 0 },
    canUseForPositiveRetrieval: { type: Boolean, default: false },
    excludeReason: { type: String, trim: true },
    qualityReasons: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
  },
  { _id: false }
);

const DeliveryAgentLearningCaseSchema = new Schema<IDeliveryAgentLearningCase>(
  {
    schemaVersion: {
      type: String,
      trim: true,
      default: DELIVERY_AGENT_LEARNING_CASE_SCHEMA_VERSION,
      required: true,
    },
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
    caseKey: {
      type: String,
      required: true,
      trim: true,
    },
    sourceHash: {
      type: String,
      trim: true,
    },
    backfillBatchId: {
      type: String,
      trim: true,
    },
    deliveryAgentRunId: {
      type: String,
      trim: true,
    },
    adminOrdersSnapshot: {
      type: [LearningOrderSnapshotSchema],
      default: [],
    },
    routeOptimizerRunsSnapshot: {
      type: Schema.Types.Mixed,
    },
    matchedStops: {
      type: [MatchedStopSchema],
      default: [],
    },
    unmatchedOrders: {
      type: [UnmatchedOrderSchema],
      default: [],
    },
    unmatchedRoStops: {
      type: [UnmatchedRoStopSchema],
      default: [],
    },
    matchCoverage: {
      type: MatchCoverageSchema,
      default: () => ({}),
    },
    coordinateSnapshots: {
      type: [CoordinateSnapshotSchema],
      default: [],
    },
    coordinateCoverage: {
      type: CoordinateCoverageSchema,
      default: () => ({}),
    },
    geoFeatures: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    routeShapeFeatures: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    stopControlFeatures: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    outcomeFeatures: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    resourceProfileFeatures: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    quality: {
      type: QualitySummarySchema,
      default: () => ({}),
    },
    reviewStatus: {
      type: String,
      enum: DELIVERY_AGENT_LEARNING_REVIEW_STATUSES,
      default: "none",
      required: true,
    },
    warnings: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

DeliveryAgentLearningCaseSchema.index({ caseKey: 1 }, { unique: true });
DeliveryAgentLearningCaseSchema.index({ deliveryDate: 1, profileId: 1 }, { unique: true });
DeliveryAgentLearningCaseSchema.index({ "quality.learningLabel": 1, deliveryDate: -1 });
DeliveryAgentLearningCaseSchema.index({ "quality.dataQualityScore": -1 });
DeliveryAgentLearningCaseSchema.index({ reviewStatus: 1, deliveryDate: -1 });
DeliveryAgentLearningCaseSchema.index({ deliveryAgentRunId: 1 }, { sparse: true });

const DeliveryAgentLearningCase: IDeliveryAgentLearningCaseModel =
  (mongoose.models.DeliveryAgentLearningCase as IDeliveryAgentLearningCaseModel | undefined) ||
  mongoose.model<IDeliveryAgentLearningCase, IDeliveryAgentLearningCaseModel>(
    "DeliveryAgentLearningCase",
    DeliveryAgentLearningCaseSchema
  );

export default DeliveryAgentLearningCase;
