import type { MeetupSelectionResult } from "@/lib/agents/delivery/candidate-plans/select-meetup-point";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { RouteOptimizerCustomerInput } from "@/lib/integrations/route-optimizer/types";

export const SYNTHETIC_MEETUP_STOP_NAME = "Meet-up / Handoff Point";
export const SYNTHETIC_MEETUP_NOTES =
  "Operational handoff point only. Not a customer delivery.";

export function buildSyntheticMeetupOrderId(input: {
  deliveryDate: string;
  runSlot: string;
}): string {
  return `kapioo-handoff-meetup:${input.deliveryDate.trim()}:${input.runSlot.trim()}`;
}

export function isSyntheticMeetupOrderId(orderId: string | undefined): boolean {
  return Boolean(orderId?.trim().startsWith("kapioo-handoff-meetup:"));
}

export function buildSyntheticMeetupStop(input: {
  profile: DeliveryPlanningProfile;
  selection: Extract<MeetupSelectionResult, { handoffSkipped: false }>;
  deliveryDate: string;
  runSlot: string;
  contactPhone?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}): RouteOptimizerCustomerInput {
  const { handoffRules } = input.profile;
  const syntheticOrderId = buildSyntheticMeetupOrderId({
    deliveryDate: input.deliveryDate,
    runSlot: input.runSlot,
  });

  return {
    name: SYNTHETIC_MEETUP_STOP_NAME,
    phone: input.contactPhone?.trim() ?? "",
    address: input.selection.meetupAddress,
    notes: SYNTHETIC_MEETUP_NOTES,
    order_ids: [syntheticOrderId],
    is_synthetic: true,
    stop_type: handoffRules.syntheticStopType,
    service_time_minutes: handoffRules.serviceTimeMinutes,
    fixed_stop_position: input.selection.meetupFixedStopPosition,
    ...(input.coordinates
      ? {
          lat: input.coordinates.lat,
          lng: input.coordinates.lng,
          geocode_status: "OK" as const,
        }
      : {}),
  };
}
