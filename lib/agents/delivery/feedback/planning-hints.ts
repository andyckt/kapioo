import type { DeliveryAgentFeedbackInterpretation } from "@/lib/agents/delivery/run-log-types";

export type PlanningHints = {
  interpretation: DeliveryAgentFeedbackInterpretation;
  pinnedMeetupOrderId?: string;
  preferredMeetupAddress?: string;
  beforeMeetupOrderIds: string[];
  orderRunOverrides: Map<string, string>;
};

export function buildPlanningHints(
  interpretation: DeliveryAgentFeedbackInterpretation
): PlanningHints {
  const orderRunOverrides = new Map<string, string>();
  const beforeMeetupOrderIds: string[] = [];

  for (const assignment of interpretation.preferredDriverAssignments) {
    if (assignment.orderId) {
      orderRunOverrides.set(assignment.orderId, assignment.preferredRunSlot);
      if (assignment.timing === "before_meetup") {
        beforeMeetupOrderIds.push(assignment.orderId);
      }
    }
  }

  return {
    interpretation,
    pinnedMeetupOrderId: interpretation.preferredMeetupOrderId,
    preferredMeetupAddress: interpretation.preferredMeetupAddress,
    beforeMeetupOrderIds,
    orderRunOverrides,
  };
}
