import { z } from "zod";

import {
  deliveryAgentLearningLabelSchema,
  deliveryAgentLearningReviewStatusSchema,
} from "@/lib/contracts/delivery-agent-learning";
import type {
  DeliveryAgentLearningLabel,
  DeliveryAgentLearningReviewStatus,
} from "@/lib/contracts/delivery-agent-learning";

export const DELIVERY_AGENT_HISTORICAL_RETRIEVAL_VERSION =
  "delivery-agent-historical-retrieval-v1" as const;

export const DELIVERY_AGENT_HISTORICAL_RETRIEVAL_MATCH_USE_AS = [
  "positive_example",
  "avoid_example",
  "context_only",
] as const;

export type DeliveryAgentHistoricalRetrievalMatchUseAs =
  (typeof DELIVERY_AGENT_HISTORICAL_RETRIEVAL_MATCH_USE_AS)[number];

export const deliveryAgentHistoricalRetrievalMatchUseAsSchema = z.enum(
  DELIVERY_AGENT_HISTORICAL_RETRIEVAL_MATCH_USE_AS
);

export const DELIVERY_AGENT_HISTORICAL_RETRIEVAL_DIMENSION_KEYS = [
  "area_distribution",
  "profile",
  "order_count",
  "route_shape",
  "spread",
  "outliers",
  "coordinate_quality",
  "same_building_clusters",
  "learning_quality",
] as const;

export type DeliveryAgentHistoricalRetrievalDimensionKey =
  (typeof DELIVERY_AGENT_HISTORICAL_RETRIEVAL_DIMENSION_KEYS)[number];

export const deliveryAgentHistoricalRetrievalDimensionKeySchema = z.enum(
  DELIVERY_AGENT_HISTORICAL_RETRIEVAL_DIMENSION_KEYS
);

export type DeliveryAgentHistoricalRetrievalTarget = {
  deliveryDate?: string;
  profileId: string;
  orderCount: number;
  areaDistribution: Record<string, number>;
  coordinateCoveragePercent?: number | null;
  spreadKm?: { northSouth: number; eastWest: number } | null;
  dynamicOutlierCount: number;
  dynamicOutlierDirections: string[];
  sameBuildingClusterCount: number;
  plannedRunCount?: number | null;
  hiredDriverRunCount?: number | null;
  availableRunCount?: number | null;
  supportAvailable?: boolean | null;
  needsHandoff?: boolean | null;
  needsSelfOrSupport?: boolean | null;
  fixedStopsExpected?: boolean | null;
  endStopsExpected?: boolean | null;
};

export type DeliveryAgentHistoricalRetrievalDimensionScore = {
  key: DeliveryAgentHistoricalRetrievalDimensionKey;
  label: string;
  points: number;
  weight: number;
  weightedScore: number;
  reason: string;
};

export type DeliveryAgentHistoricalRetrievalMatch = {
  caseKey: string;
  deliveryDate: string;
  profileId: string;
  learningLabel: DeliveryAgentLearningLabel;
  reviewStatus: DeliveryAgentLearningReviewStatus;
  useAs: DeliveryAgentHistoricalRetrievalMatchUseAs;
  similarityScore: number;
  dataQualityScore: number;
  orderCount: number;
  areaDistribution: Record<string, number>;
  dimensionScores: DeliveryAgentHistoricalRetrievalDimensionScore[];
  warnings: string[];
};

export type DeliveryAgentHistoricalRetrievalResult = {
  retrievalVersion: typeof DELIVERY_AGENT_HISTORICAL_RETRIEVAL_VERSION;
  target: DeliveryAgentHistoricalRetrievalTarget;
  candidateCaseCount: number;
  eligibleCaseCount: number;
  omittedCaseCount: number;
  matches: DeliveryAgentHistoricalRetrievalMatch[];
  selectedPositiveCaseIds: string[];
  selectedAvoidCaseIds: string[];
  selectedContextCaseIds: string[];
  warnings: string[];
};

const historicalRetrievalSpreadSchema = z.object({
  northSouth: z.number().finite().min(0),
  eastWest: z.number().finite().min(0),
});

export const deliveryAgentHistoricalRetrievalTargetSchema = z.object({
  deliveryDate: z.string().trim().min(1).optional(),
  profileId: z.string().trim().min(1),
  orderCount: z.number().int().min(0),
  areaDistribution: z.record(z.string(), z.number().int().min(0)),
  coordinateCoveragePercent: z.number().finite().min(0).max(100).nullable().optional(),
  spreadKm: historicalRetrievalSpreadSchema.nullable().optional(),
  dynamicOutlierCount: z.number().int().min(0),
  dynamicOutlierDirections: z.array(z.string().trim().min(1)),
  sameBuildingClusterCount: z.number().int().min(0),
  plannedRunCount: z.number().int().min(0).nullable().optional(),
  hiredDriverRunCount: z.number().int().min(0).nullable().optional(),
  availableRunCount: z.number().int().min(0).nullable().optional(),
  supportAvailable: z.boolean().nullable().optional(),
  needsHandoff: z.boolean().nullable().optional(),
  needsSelfOrSupport: z.boolean().nullable().optional(),
  fixedStopsExpected: z.boolean().nullable().optional(),
  endStopsExpected: z.boolean().nullable().optional(),
});

export const deliveryAgentHistoricalRetrievalDimensionScoreSchema = z.object({
  key: deliveryAgentHistoricalRetrievalDimensionKeySchema,
  label: z.string().trim().min(1),
  points: z.number().finite().min(0).max(100),
  weight: z.number().finite().min(0),
  weightedScore: z.number().finite().min(0),
  reason: z.string().trim().min(1),
});

export const deliveryAgentHistoricalRetrievalMatchSchema = z.object({
  caseKey: z.string().trim().min(1),
  deliveryDate: z.string().trim().min(1),
  profileId: z.string().trim().min(1),
  learningLabel: deliveryAgentLearningLabelSchema,
  reviewStatus: deliveryAgentLearningReviewStatusSchema,
  useAs: deliveryAgentHistoricalRetrievalMatchUseAsSchema,
  similarityScore: z.number().finite().min(0).max(100),
  dataQualityScore: z.number().finite().min(0).max(100),
  orderCount: z.number().int().min(0),
  areaDistribution: z.record(z.string(), z.number().int().min(0)),
  dimensionScores: z.array(deliveryAgentHistoricalRetrievalDimensionScoreSchema),
  warnings: z.array(z.string().trim().min(1)),
});

export const deliveryAgentHistoricalRetrievalResultSchema = z.object({
  retrievalVersion: z.literal(DELIVERY_AGENT_HISTORICAL_RETRIEVAL_VERSION),
  target: deliveryAgentHistoricalRetrievalTargetSchema,
  candidateCaseCount: z.number().int().min(0),
  eligibleCaseCount: z.number().int().min(0),
  omittedCaseCount: z.number().int().min(0),
  matches: z.array(deliveryAgentHistoricalRetrievalMatchSchema),
  selectedPositiveCaseIds: z.array(z.string().trim().min(1)),
  selectedAvoidCaseIds: z.array(z.string().trim().min(1)),
  selectedContextCaseIds: z.array(z.string().trim().min(1)),
  warnings: z.array(z.string().trim().min(1)),
});
