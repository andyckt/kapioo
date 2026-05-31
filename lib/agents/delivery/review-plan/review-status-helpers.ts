import type { DeliveryAgentReviewStatus } from "@/lib/agents/delivery/run-log-types";

export function isImprovementRequestedStatus(
  reviewStatus: DeliveryAgentReviewStatus | undefined
): boolean {
  return (
    reviewStatus === "improvement_requested" ||
    reviewStatus === "rejected" ||
    reviewStatus === "edited"
  );
}

export function normalizeReviewStatusForWrite(
  reviewStatus: DeliveryAgentReviewStatus
): Exclude<DeliveryAgentReviewStatus, "pending"> {
  if (reviewStatus === "rejected" || reviewStatus === "edited") {
    return "improvement_requested";
  }
  return reviewStatus as Exclude<DeliveryAgentReviewStatus, "pending">;
}

export function normalizeReviewStatusForDisplay(
  reviewStatus: DeliveryAgentReviewStatus | undefined
): DeliveryAgentReviewStatus | undefined {
  if (reviewStatus === "rejected" || reviewStatus === "edited") {
    return "improvement_requested";
  }
  return reviewStatus;
}
