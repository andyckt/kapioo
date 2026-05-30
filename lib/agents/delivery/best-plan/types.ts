import type { DeliveryPlanningScoringWeights } from "@/lib/agents/delivery/planning-profile/types";
import type {
  DeliveryAgentCandidatePlanPreviewCore,
  DeliveryAgentCandidateScoreBreakdownItem,
  DeliveryAgentRecommendedPlanSummary,
} from "@/lib/contracts/delivery-agent";

export type ScoringWeightKey = keyof DeliveryPlanningScoringWeights;

export const SCORING_DIMENSION_LABELS: Record<ScoringWeightKey, string> = {
  finishBeforeDeadline: "Finish before deadline",
  deadlineBuffer: "Deadline buffer",
  routeShapeCorrectness: "Route shape correctness",
  correctDriverEndpoint: "Correct driver endpoint",
  latLngClusterFit: "Location cluster fit",
  historicalPatternSimilarity: "Historical pattern similarity",
  avoidSelfUsage: "Avoid Self usage",
  minimizeSelfStops: "Minimize Self stops",
  balanceDriverDuration: "Balance driver duration",
  areaLabelMatch: "Area label match",
  mealQuantityBalance: "Meal quantity balance",
};

export type CandidateAssignedRunStop = {
  orderId: string;
  area: string;
  lat?: number;
  lng?: number;
  totalMealQuantity: number;
};

export type CandidateAssignedRun = {
  runSlot: string;
  role: string;
  stops: CandidateAssignedRunStop[];
};

export type CandidateScoringInput = {
  candidate: DeliveryAgentCandidatePlanPreviewCore;
  assignedRuns?: CandidateAssignedRun[];
  routingStopByOrderId?: Map<string, { area: string; orderId: string; lat?: number; lng?: number; totalMealQuantity: number }>;
  preferredDeadlineBufferMinutes: number;
  scoringWeights: DeliveryPlanningScoringWeights;
};

export type CandidateScoringResult = {
  score: number;
  scoreBreakdown: DeliveryAgentCandidateScoreBreakdownItem[];
  pros: string[];
  cons: string[];
  blockingIssues: string[];
  decisionSummary: string;
  eligibleForRecommended: boolean;
  hasBlockingRouteShapeIssues: boolean;
  hasRepairFailure: boolean;
  hasPreviewFailures: boolean;
  missingFinishTime: boolean;
};

export type RankedCandidatePlanPreview = DeliveryAgentCandidatePlanPreviewCore &
  Pick<
    import("@/lib/contracts/delivery-agent").DeliveryAgentCandidatePlanPreview,
    | "score"
    | "rank"
    | "recommendationStatus"
    | "scoreBreakdown"
    | "pros"
    | "cons"
    | "blockingIssues"
    | "decisionSummary"
  >;

export type BestCandidateSelectionResult = {
  rankedCandidates: RankedCandidatePlanPreview[];
  recommendedCandidateId: string | null;
  recommendedPlanSummary: DeliveryAgentRecommendedPlanSummary | null;
  selectionNotes: string;
  selectionWarnings: string[];
};

export type { DeliveryAgentRecommendedPlanSummary } from "@/lib/contracts/delivery-agent";
