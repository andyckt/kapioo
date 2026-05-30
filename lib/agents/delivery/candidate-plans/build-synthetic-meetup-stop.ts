import type { MeetupSelectionResult } from "@/lib/agents/delivery/candidate-plans/select-meetup-point";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { RouteOptimizerCustomerInput } from "@/lib/integrations/route-optimizer/types";

export function buildSyntheticMeetupStop(input: {
  profile: DeliveryPlanningProfile;
  selection: Extract<MeetupSelectionResult, { handoffSkipped: false }>;
}): RouteOptimizerCustomerInput {
  const { handoffRules } = input.profile;

  return {
    name: handoffRules.syntheticMeetupStopName,
    phone: "",
    address: input.selection.meetupAddress,
    order_ids: [],
    is_synthetic: true,
    stop_type: handoffRules.syntheticStopType,
    service_time_minutes: handoffRules.serviceTimeMinutes,
    fixed_stop_position: input.selection.meetupFixedStopPosition,
  };
}
