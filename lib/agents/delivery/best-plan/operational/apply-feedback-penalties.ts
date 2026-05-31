import type { CandidateAssignedRun, CandidateScoringInput } from "@/lib/agents/delivery/best-plan/types";
import type { DeliveryPlanningMeetupSelectionPreferences } from "@/lib/agents/delivery/planning-profile/types";

import { buildAssignedRunLookup } from "@/lib/agents/delivery/best-plan/operational/score-operational-dimensions";
import {
  hasLatLng,
  manhattanDistance,
  readCoordinate,
} from "@/lib/agents/delivery/best-plan/operational/geo-helpers";

export type FeedbackPenaltyAdjustment = {
  scoreDelta: number;
  notes: string[];
};

export function applyFeedbackPenalties(input: {
  scoringInput: CandidateScoringInput;
  penalties: string[];
  preferredOrderRunOverrides?: Map<string, string>;
  meetupPrefs: DeliveryPlanningMeetupSelectionPreferences;
}): FeedbackPenaltyAdjustment {
  const notes: string[] = [];
  let scoreDelta = 0;

  if (input.penalties.length === 0) {
    return { scoreDelta: 0, notes: [] };
  }

  const penaltySet = new Set(input.penalties);
  const candidate = input.scoringInput.candidate;
  const assignedLookup = buildAssignedRunLookup(input.scoringInput.assignedRuns);

  if (penaltySet.has("receiver_meetup_too_far")) {
    const meetupBalance = candidate.handoffPlan?.selectedMeetup;
    const receiverRef = {
      lat: readCoordinate(input.meetupPrefs.receiverReferenceLat, 43.856),
      lng: readCoordinate(input.meetupPrefs.receiverReferenceLng, -79.337),
    };

    if (meetupBalance && typeof meetupBalance.lat === "number" && typeof meetupBalance.lng === "number") {
      const dist = manhattanDistance(
        { lat: meetupBalance.lat, lng: meetupBalance.lng },
        receiverRef
      );
      if (dist > 0.14) {
        scoreDelta -= 12;
        notes.push("Feedback: meet-up too far for receiver — penalized.");
      }
    } else {
      scoreDelta -= 5;
      notes.push("Feedback: receiver meet-up distance concern noted.");
    }
  }

  if (penaltySet.has("provider_meetup_too_far")) {
    scoreDelta -= 10;
    notes.push("Feedback: provider meet-up burden — penalized.");
  }

  if (penaltySet.has("provider_route_shape_wrong")) {
    const shapeIssues = candidate.candidateRepairSummary.issuesDetected.filter(
      (issue) =>
        issue.issueType === "north_york_after_downtown" ||
        issue.issueType === "downtown_before_meetup"
    );
    if (shapeIssues.length > 0) {
      scoreDelta -= 15;
      notes.push("Feedback: provider route shape wrong — extra penalty applied.");
    } else {
      scoreDelta -= 8;
      notes.push("Feedback: provider route shape concern noted.");
    }
  }

  if (penaltySet.has("wrong_order_split") && input.preferredOrderRunOverrides) {
    let matched = 0;
    let total = 0;

    for (const [orderId, preferredRun] of input.preferredOrderRunOverrides) {
      total += 1;
      const assignment = assignedLookup.get(orderId);
      if (assignment?.runSlot === preferredRun) {
        matched += 1;
      }
    }

    if (total > 0 && matched === total) {
      scoreDelta += 12;
      notes.push("Feedback: order split adjusted as requested.");
    } else if (total > 0) {
      scoreDelta -= 8;
      notes.push("Feedback: wrong order split — candidate does not match preferred assignments.");
    }
  }

  if (penaltySet.has("self_overused") && candidate.summary.selfUsed) {
    scoreDelta -= 15;
    notes.push("Feedback: Self used too much — additional penalty.");
  }

  if (penaltySet.has("self_underused") && !candidate.summary.selfUsed) {
    scoreDelta += 5;
    notes.push("Feedback: Self should be used — reduced Self avoidance when applicable.");
  }

  if (penaltySet.has("deadline_buffer_low")) {
    const buffer = candidate.summary.minutesBeforeOrAfterDeadline ?? 0;
    if (candidate.summary.allRunsFinishBeforeDeadline && buffer < input.scoringInput.preferredDeadlineBufferMinutes) {
      scoreDelta -= 10;
      notes.push("Feedback: deadline buffer too low — penalized.");
    }
  }

  if (penaltySet.has("receiver_stop_count_high")) {
    const runB = input.scoringInput.assignedRuns?.find((run) => run.runSlot === "B");
    if (runB && runB.stops.length >= 5) {
      scoreDelta -= 8;
      notes.push("Feedback: receiver stop count high — penalized.");
    }
  }

  return { scoreDelta, notes: [...new Set(notes)] };
}
