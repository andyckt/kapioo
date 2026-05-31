import type { SelfRecommendationReason } from "@/lib/agents/delivery/best-plan/operational/apply-comparative-self-policy";
import type { DeliveryAgentCandidatePlanPreviewCore } from "@/lib/contracts/delivery-agent";

export function buildOperationalExplanation(input: {
  candidate: DeliveryAgentCandidatePlanPreviewCore;
  score: number;
  eligibleForRecommended: boolean;
  selfRecommendationReason: SelfRecommendationReason;
  operationalNotes: string[];
  meetupBalanceNote?: string;
}): { decisionSummary: string; operationalNotes: string[] } {
  const notes: string[] = [...input.operationalNotes];
  const buffer = input.candidate.summary.minutesBeforeOrAfterDeadline;
  const bufferText =
    buffer !== undefined && input.candidate.summary.allRunsFinishBeforeDeadline
      ? `${buffer} min before 1 PM`
      : undefined;

  if (input.meetupBalanceNote && !notes.includes(input.meetupBalanceNote)) {
    notes.push(input.meetupBalanceNote);
  }

  if (!input.candidate.summary.selfUsed && input.eligibleForRecommended) {
    if (bufferText) {
      notes.unshift(`2-driver plan preferred — finishes before 1 PM with ${bufferText}; Self is not necessary.`);
    } else {
      notes.unshift("2-driver plan preferred — meets deadline without Self.");
    }
  } else if (input.candidate.summary.selfUsed) {
    switch (input.selfRecommendationReason) {
      case "not_necessary":
        notes.unshift(
          "Self is used but a safe 2-driver plan exists — this plan should not be the top recommendation."
        );
        break;
      case "required_for_deadline":
        notes.unshift("Self recommended because 2-driver plans are late or lack safe buffer before 1 PM.");
        break;
      case "meaningful_deadline_improvement":
        notes.unshift(
          input.eligibleForRecommended
            ? "Self recommended because it meaningfully improves finish time or deadline safety vs 2-driver options."
            : "Self is used but does not meet all recommendation criteria."
        );
        break;
      default:
        break;
    }
  } else if (input.eligibleForRecommended) {
    notes.unshift(`Recommended plan (score ${input.score}) — meets deadline and operational checks.`);
  } else if (input.candidate.summary.allRunsFinishBeforeDeadline) {
    notes.unshift(`Score ${input.score}; meets deadline but has operational warnings blocking recommendation.`);
  } else {
    notes.unshift(`Score ${input.score}; does not meet all recommendation criteria.`);
  }

  const uniqueNotes = [...new Set(notes)].slice(0, 5);
  const decisionSummary = uniqueNotes[0] ?? `Score ${input.score}.`;

  return {
    decisionSummary,
    operationalNotes: uniqueNotes,
  };
}

export function extractMeetupBalanceNote(
  scoreBreakdown: Array<{ key: string; reason: string; points: number }>
): string | undefined {
  const meetupItem = scoreBreakdown.find((item) => item.key === "meetupOperationalBalance");
  if (!meetupItem) {
    return undefined;
  }

  if (meetupItem.points >= 80) {
    return "Meet-up point is balanced between DT and Marco.";
  }

  if (meetupItem.reason.includes("too close to kitchen")) {
    return "Meet-up may be too close to kitchen for Marco's uptown route.";
  }

  if (meetupItem.reason.includes("too far south")) {
    return "This plan avoids making Marco drive too far south.";
  }

  if (meetupItem.reason.includes("on-the-way") || meetupItem.key === "onTheWayBeforeMeetup") {
    return undefined;
  }

  return meetupItem.reason.length <= 120 ? meetupItem.reason : undefined;
}
