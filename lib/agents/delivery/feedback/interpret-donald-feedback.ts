import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { DeliveryAgentFeedbackInterpretation } from "@/lib/agents/delivery/run-log-types";
import type { RoutingStop } from "@/lib/agents/delivery/types";

const TAG_PENALTY_MAP: Record<string, string> = {
  meetup_too_far_for_provider: "provider_meetup_too_far",
  meetup_too_far_for_receiver: "receiver_meetup_too_far",
  meetup_too_late: "meetup_too_late",
  wrong_order_split: "wrong_order_split",
  provider_route_shape_wrong: "provider_route_shape_wrong",
  receiver_route_shape_wrong: "receiver_route_shape_wrong",
  wrong_endpoint: "wrong_endpoint",
  not_enough_deadline_buffer: "deadline_buffer_low",
  self_used_too_much: "self_overused",
  self_should_be_used: "self_underused",
  too_many_stops_for_receiver: "receiver_stop_count_high",
  too_many_stops_for_provider: "provider_stop_count_high",
  route_too_risky: "route_risky",
  preferred_another_candidate: "preferred_alternate_candidate",
  other: "other_feedback",
};

const STREET_ADDRESS_PATTERN =
  /\d+\s+[A-Za-z0-9][\w\s.'-]{2,60}(?:\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Crescent|Cres|Court|Ct|Place|Pl|Lane|Ln|Highway|Hwy))\.?(?:\s*(?:#|Unit|Suite)\s*\w+)?/gi;

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeAddress(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractStreetAddresses(notes: string): string[] {
  const matches = notes.match(STREET_ADDRESS_PATTERN) ?? [];
  return [...new Set(matches.map((match) => match.trim()))];
}

function fuzzyMatchCustomerName(name: string, stops: RoutingStop[]): RoutingStop | undefined {
  const normalizedQuery = normalizeForMatch(name);
  if (!normalizedQuery) {
    return undefined;
  }

  const exact = stops.find((stop) => normalizeForMatch(stop.customerName) === normalizedQuery);
  if (exact) {
    return exact;
  }

  const partialMatches = stops.filter((stop) => {
    const normalizedStop = normalizeForMatch(stop.customerName);
    return (
      normalizedStop.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedStop) ||
      normalizedQuery.split(" ").every((part) => part.length > 1 && normalizedStop.includes(part))
    );
  });

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  return undefined;
}

function extractNameCandidates(notes: string): string[] {
  const candidates: string[] = [];
  const patterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,
    /\b(?:for|move|put|assign)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi,
    /\band\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
  ];

  for (const pattern of patterns) {
    for (const match of notes.matchAll(pattern)) {
      const name = match[1]?.trim();
      if (name && name.length >= 3) {
        candidates.push(name);
      }
    }
  }

  for (const stop of notes.matchAll(/\b([A-Z][a-z]{2,})\b/g)) {
    const token = stop[1]?.trim();
    if (
      token &&
      !["Move", "Meet", "Use", "Instead", "Before", "North", "Yonge", "St"].includes(token)
    ) {
      candidates.push(token);
    }
  }

  return [...new Set(candidates)];
}

function findMeetupOrderIdByAddress(
  address: string,
  stops: RoutingStop[]
): string | undefined {
  const normalizedAddress = normalizeAddress(address);
  const matches = stops.filter((stop) => {
    const formatted = stop.formattedAddress?.trim();
    if (!formatted) {
      return false;
    }
    const normalizedStop = normalizeAddress(formatted);
    return (
      normalizedStop.includes(normalizedAddress) ||
      normalizedAddress.includes(normalizedStop)
    );
  });

  if (matches.length === 1) {
    return matches[0].orderId;
  }

  return undefined;
}

export function interpretDonaldFeedback(input: {
  feedbackText?: string;
  feedbackTags?: string[];
  routingStops: RoutingStop[];
  profile: DeliveryPlanningProfile;
  sourceFeedbackReviewedAt: string;
}): DeliveryAgentFeedbackInterpretation {
  const warnings: string[] = [];
  const penalties = [...new Set((input.feedbackTags ?? []).map((tag) => TAG_PENALTY_MAP[tag] ?? tag))];
  const notes = input.feedbackText?.trim() ?? "";

  const addresses = extractStreetAddresses(notes);
  let preferredMeetupAddress = addresses[0];
  let preferredMeetupOrderId: string | undefined;

  if (preferredMeetupAddress) {
    preferredMeetupOrderId = findMeetupOrderIdByAddress(preferredMeetupAddress, input.routingStops);
    if (!preferredMeetupOrderId) {
      warnings.push(
        `Could not match meet-up address "${preferredMeetupAddress}" to a confirmed stop; meet-up pin may not apply.`
      );
    }
  } else if (penalties.some((penalty) => penalty.includes("meetup"))) {
    warnings.push("Meet-up feedback provided without a recognizable street address in notes.");
  }

  const providerRunSlot = input.profile.handoffRules.providerRunSlot;
  const preferredDriverAssignments: DeliveryAgentFeedbackInterpretation["preferredDriverAssignments"] =
    [];
  const unmatchedCustomerNames: string[] = [];
  const matchedOrderIds = new Set<string>();

  for (const nameCandidate of extractNameCandidates(notes)) {
    const matchedStop = fuzzyMatchCustomerName(nameCandidate, input.routingStops);
    if (!matchedStop) {
      unmatchedCustomerNames.push(nameCandidate);
      continue;
    }

    if (matchedOrderIds.has(matchedStop.orderId)) {
      continue;
    }

    matchedOrderIds.add(matchedStop.orderId);
    const wantsBeforeMeetup = /before\s+(the\s+)?meet[- ]?up|on the way|dt first/i.test(notes);
    preferredDriverAssignments.push({
      orderId: matchedStop.orderId,
      customerName: matchedStop.customerName,
      preferredRunSlot: providerRunSlot,
      timing: wantsBeforeMeetup ? "before_meetup" : "any",
    });
  }

  if (unmatchedCustomerNames.length > 0) {
    warnings.push(
      `Could not match customer name(s) to stops: ${unmatchedCustomerNames.join(", ")}.`
    );
  }

  if (/dt|downtown|provider|run a/i.test(notes) && preferredDriverAssignments.length === 0) {
    warnings.push("Notes mention DT/provider routing but no customer names were matched.");
  }

  return {
    preferredMeetupAddress,
    preferredMeetupOrderId,
    preferredDriverAssignments,
    penalties,
    unmatchedCustomerNames,
    warnings,
    sourceFeedbackReviewedAt: input.sourceFeedbackReviewedAt,
  };
}
