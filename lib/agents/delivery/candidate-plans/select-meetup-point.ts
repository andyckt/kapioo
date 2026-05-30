import { findPrimaryReceiverRun, findProviderRun } from "@/lib/agents/delivery/candidate-plans/find-run-by-slot";
import {
  buildMeetupCandidatePool,
  buildSuccessfulMeetupSelection,
  findStopBeforeMeetup,
  rankMeetupOptions,
} from "@/lib/agents/delivery/candidate-plans/rank-meetup-options";
import type { DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";
import type { DeliveryAgentMeetupScoreBreakdownItem } from "@/lib/contracts/delivery-agent";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { MeetupSourceTier } from "@/lib/agents/delivery/candidate-plans/score-meetup-candidate";

export type MeetupVariant = "meetup_stop_1" | "meetup_stop_2_with_one_before";

export type MeetupStopCandidate = {
  orderId: string;
  area: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  runSlot: string;
};

export type MeetupSelectionConfidence = "high" | "medium" | "low";

export type MeetupSelectionResult =
  | {
      handoffSkipped: false;
      meetupAddress: string;
      meetupFixedStopPosition: 1 | 2;
      variant: MeetupVariant;
      sourceOrderId: string;
      sourceArea: string;
      stopBeforeMeetupOrderId?: string;
      syntheticHandoffStopUsed: true;
      score: number;
      scoreBreakdown: DeliveryAgentMeetupScoreBreakdownItem[];
      reasoning: string;
      warnings: string[];
      selectionConfidence: MeetupSelectionConfidence;
      sourceTier: MeetupSourceTier;
    }
  | {
      handoffSkipped: true;
      skipReason: string;
    };

export function selectMeetupPoint(input: {
  runs: DeliveryAgentCandidateRun[];
  profile: DeliveryPlanningProfile;
}): MeetupSelectionResult {
  const providerRun = findProviderRun(input.runs, input.profile);
  const receiverRun = findPrimaryReceiverRun(input.runs, input.profile);

  if (!providerRun || !receiverRun || providerRun.stopCount === 0 || receiverRun.stopCount === 0) {
    return {
      handoffSkipped: true,
      skipReason: "Handoff preview requires both provider and receiver runs with stops.",
    };
  }

  if (!input.profile.handoffRules.enabled) {
    return {
      handoffSkipped: true,
      skipReason: "Planning profile handoff rules are disabled.",
    };
  }

  const pool = buildMeetupCandidatePool(input.runs, input.profile);

  if (pool.length === 0) {
    return {
      handoffSkipped: true,
      skipReason:
        "No North York stop available for meet-up selection; using temporary receiver start preview.",
    };
  }

  const [selected] = rankMeetupOptions({
    runs: input.runs,
    profile: input.profile,
    limit: 1,
  });

  const stopBeforeMeetupOrderId = findStopBeforeMeetup(
    providerRun.stops,
    selected,
    input.profile,
    input.runs
  );

  return buildSuccessfulMeetupSelection({
    selected,
    profile: input.profile,
    stopBeforeMeetupOrderId,
  });
}

export { buildMeetupCandidatePool } from "@/lib/agents/delivery/candidate-plans/rank-meetup-options";
