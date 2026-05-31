import { isImprovementRequestedStatus } from "@/lib/agents/delivery/review-plan/review-status-helpers";
import type {
  DeliveryAgentFinalRouteOptimizerMetadata,
  DeliveryAgentOperationalReviewState,
  DeliveryAgentReviewStatus,
} from "@/lib/agents/delivery/run-log-types";

export type ResolveOperationalReviewStateInput = {
  reviewStatus?: DeliveryAgentReviewStatus;
  reviewReopenedAt?: string | Date;
  finalRouteOptimizerMetadata?: DeliveryAgentFinalRouteOptimizerMetadata;
  finalRouteRunsMarkedMissingAt?: string;
  routeOptimizerRunCount?: number;
};

function hasActiveFinalRouteRuns(input: ResolveOperationalReviewStateInput): boolean {
  const status = input.finalRouteOptimizerMetadata?.finalRouteOptimizerStatus;
  const runCount = input.routeOptimizerRunCount ?? 0;
  return status === "created" && runCount > 0;
}

export function resolveDeliveryAgentOperationalState(
  input: ResolveOperationalReviewStateInput
): DeliveryAgentOperationalReviewState {
  const finalStatus = input.finalRouteOptimizerMetadata?.finalRouteOptimizerStatus;

  if (isImprovementRequestedStatus(input.reviewStatus)) {
    return "improvement_requested";
  }

  if (input.reviewStatus === "approved") {
    if (input.finalRouteRunsMarkedMissingAt && finalStatus === "created") {
      return "final_route_missing_or_deleted";
    }

    if (finalStatus === "partial_created") {
      return "final_route_partial_created";
    }

    if (hasActiveFinalRouteRuns(input)) {
      return "final_route_created";
    }

    if (finalStatus === "failed") {
      return "approved";
    }

    return "approved";
  }

  return "pending_review";
}

/** Future: verify Route Optimizer run existence via GET API when available. */
export function shouldVerifyRouteOptimizerRunExistence(): boolean {
  return false;
}
