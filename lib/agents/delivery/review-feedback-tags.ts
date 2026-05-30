export type DeliveryAgentReviewFeedbackTag = {
  id: string;
  label: string;
};

export const DELIVERY_AGENT_REVIEW_FEEDBACK_TAGS: DeliveryAgentReviewFeedbackTag[] = [
  { id: "meetup_too_far_for_receiver", label: "Meet-up too far for receiver" },
  { id: "meetup_too_far_for_provider", label: "Meet-up too far for provider" },
  { id: "meetup_too_late", label: "Meet-up too late" },
  { id: "wrong_order_split", label: "Wrong order split" },
  { id: "provider_route_shape_wrong", label: "Provider route shape wrong" },
  { id: "receiver_route_shape_wrong", label: "Receiver route shape wrong" },
  { id: "wrong_endpoint", label: "Wrong endpoint" },
  { id: "not_enough_deadline_buffer", label: "Not enough 1 PM buffer" },
  { id: "self_used_too_much", label: "Self used too much" },
  { id: "self_should_be_used", label: "Self should be used" },
  { id: "too_many_stops_for_receiver", label: "Too many stops for receiver" },
  { id: "too_many_stops_for_provider", label: "Too many stops for provider" },
  { id: "route_too_risky", label: "Route too risky" },
  {
    id: "preferred_another_candidate",
    label: "Another candidate is better than the recommended one",
  },
  { id: "other", label: "Other" },
];

export const DELIVERY_AGENT_REVIEW_FEEDBACK_TAG_IDS = DELIVERY_AGENT_REVIEW_FEEDBACK_TAGS.map(
  (tag) => tag.id
);

export function isValidReviewFeedbackTag(tag: string): boolean {
  return DELIVERY_AGENT_REVIEW_FEEDBACK_TAG_IDS.includes(tag);
}
