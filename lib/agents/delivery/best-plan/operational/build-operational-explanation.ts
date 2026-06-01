import type { SelfRecommendationReason } from "@/lib/agents/delivery/best-plan/operational/apply-comparative-self-policy";
import type { FeasibilityLabel } from "@/lib/agents/delivery/best-plan/operational/resolve-feasibility-tier";
import type { DeliveryAgentCandidatePlanPreviewCore } from "@/lib/contracts/delivery-agent";

export function buildOperationalExplanation(input: {
  candidate: DeliveryAgentCandidatePlanPreviewCore;
  score: number;
  eligibleForRecommended: boolean;
  selfRecommendationReason: SelfRecommendationReason;
  operationalNotes: string[];
  meetupBalanceNote?: string;
  anyOnTimeExists?: boolean;
  feasibilityLabel?: FeasibilityLabel;
  isSafeTwoDriver?: boolean;
}): { decisionSummary: string; operationalNotes: string[] } {
  const notes: string[] = [...input.operationalNotes];
  const onTime = input.candidate.summary.allRunsFinishBeforeDeadline;
  const minutesLate = Math.abs(input.candidate.summary.minutesBeforeOrAfterDeadline ?? 0);
  const allLate = input.anyOnTimeExists === false;

  if (input.meetupBalanceNote && !notes.includes(input.meetupBalanceNote)) {
    notes.push(input.meetupBalanceNote);
  }

  if (allLate) {
    if (input.feasibilityLabel === "infeasible_late" || minutesLate >= 30) {
      notes.unshift(
        "No feasible plan before 1 PM. Extra driver/manual help is required."
      );
    } else {
      notes.unshift(
        "No candidate finishes before 1 PM. This is the least-bad option, but extra driver/manual help is required."
      );
    }
  } else if (
    onTime &&
    !input.candidate.summary.selfUsed &&
    input.isSafeTwoDriver &&
    input.eligibleForRecommended
  ) {
    notes.unshift(
      "2-driver plan recommended — finishes before 1 PM; Self is not necessary."
    );
  } else if (
    onTime &&
    input.candidate.summary.selfUsed &&
    (input.selfRecommendationReason === "required_for_deadline" ||
      input.selfRecommendationReason === "meaningful_deadline_improvement")
  ) {
    notes.unshift(
      "Self recommended because no 2-driver plan can finish before 1 PM."
    );
  } else if (
    onTime &&
    !input.candidate.summary.selfUsed &&
    input.eligibleForRecommended
  ) {
    notes.unshift("2-driver plan recommended — finishes before 1 PM; Self is not necessary.");
  } else if (input.candidate.summary.selfUsed) {
    switch (input.selfRecommendationReason) {
      case "not_necessary":
        notes.unshift(
          "Self is used but a safe 2-driver plan exists — this plan should not be the top recommendation."
        );
        break;
      case "required_for_deadline":
        notes.unshift(
          "Self recommended because 2-driver plans are late or lack safe buffer before 1 PM."
        );
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
  } else if (input.eligibleForRecommended && onTime) {
    notes.unshift(`Recommended plan (score ${input.score}) — meets deadline and operational checks.`);
  } else if (onTime) {
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
