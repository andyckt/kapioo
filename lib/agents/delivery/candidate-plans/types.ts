import type { DeliveryPlanningRunSlot } from "@/lib/agents/delivery/planning-profile/types";

export type CandidateStrategyType =
  | "baseline_two_run"
  | "dt_heavy_north_york"
  | "marco_heavy_north_york"
  | "balanced_north_york"
  | "self_fallback_light"
  | "llm_generated";

export type NorthYorkSplitMode = "balanced" | "dt_heavy" | "marco_heavy";

export type PlanningAreaBucket = "core_dt" | "core_uptown" | "flexible_north_york" | "unknown";

export type PlanningRunLean = "dt" | "marco";

export type PlanningStop = {
  orderId: string;
  customerName: string;
  area: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  totalMealQuantity: number;
  planningTags: string[];
  areaBucket: PlanningAreaBucket;
  defaultRunLean: PlanningRunLean | null;
};

export type CandidatePlanStop = {
  orderId: string;
  customerName: string;
  area: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  totalMealQuantity: number;
  planningTags: string[];
};

export type CandidateRunConstraintPlan = {
  fixedStops: unknown[];
  endPoint: null;
  repairActionsPlanned: string[];
};

export type CandidateRun = {
  runSlot: DeliveryPlanningRunSlot;
  driverName: string;
  role: string;
  startType: string;
  startLocationLabel: string;
  stops: CandidatePlanStop[];
  stopCount: number;
  areaBreakdown: Record<string, number>;
  totalMealQuantity: number;
  plannedStartTimeSource: string;
  constraintPlan: CandidateRunConstraintPlan;
};

export type CandidateHandoffPlan = {
  providerRunSlot: DeliveryPlanningRunSlot;
  receiverRunSlot: DeliveryPlanningRunSlot;
  mode: "synthetic_handoff_stop_later";
  note: string;
};

export type CandidatePlanSummary = {
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

export type CandidatePlan = {
  candidateId: string;
  name: string;
  description: string;
  strategyType: CandidateStrategyType;
  profileId: string;
  profileVersion: string;
  deliveryDate: string;
  runs: CandidateRun[];
  summary: CandidatePlanSummary;
  warnings: string[];
  assumptions: string[];
  handoffPlan: CandidateHandoffPlan;
  constraintPlan: CandidateRunConstraintPlan;
};

export type CandidatePlanGenerationResponse = {
  deliveryDate: string;
  profileId: string;
  profileVersion: string;
  candidates: CandidatePlan[];
  notes: string;
};

export type StopAssignment = {
  dt: PlanningStop[];
  marco: PlanningStop[];
  self: PlanningStop[];
};

export const MIN_STOPS_FOR_SELF_FALLBACK_CANDIDATE = 4;

export const DOWNTOWN_REFERENCE = {
  lat: 43.653,
  lng: -79.383,
} as const;
