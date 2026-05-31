import { buildCombinationLabel, shortenMeetupLabel } from "@/lib/agents/delivery/candidate-plans/build-combination-label";
import { findPrimaryReceiverRun, findProviderRun } from "@/lib/agents/delivery/candidate-plans/find-run-by-slot";
import type { ActiveMeetupSelection } from "@/lib/agents/delivery/candidate-plans/preview-candidate-handoff";
import {
  buildMeetupCandidatePool,
  buildMeetupSelectionForPosition,
  buildSuccessfulMeetupSelection,
  meetupOptionDedupeKey,
  meetupVariantDedupeKey,
  rankMeetupOptions,
} from "@/lib/agents/delivery/candidate-plans/rank-meetup-options";
import { resolvePinnedMeetupScoreBoost } from "@/lib/agents/delivery/feedback/apply-planning-hints";
import type { PlanningHints } from "@/lib/agents/delivery/feedback/planning-hints";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type {
  DeliveryAgentCandidateCombinationMeta,
  DeliveryAgentCandidatePlan,
} from "@/lib/contracts/delivery-agent";

export type FullCandidateVariant = {
  plan: DeliveryAgentCandidatePlan;
  combination: DeliveryAgentCandidateCombinationMeta;
  meetupSelection?: ActiveMeetupSelection;
};

export type FullCandidateExpansionResult = {
  variants: FullCandidateVariant[];
  expansionWarnings: string[];
};

type VariantDraft = {
  plan: DeliveryAgentCandidatePlan;
  combination: DeliveryAgentCandidateCombinationMeta;
  meetupSelection?: ActiveMeetupSelection;
  preScore: number;
  dedupeKey: string;
};

function buildNoHandoffVariant(input: {
  baseSplit: DeliveryAgentCandidatePlan;
  profile: DeliveryPlanningProfile;
}): VariantDraft {
  const fullCandidateId = `${input.baseSplit.candidateId}:no-handoff`;
  const combinationLabel = buildCombinationLabel({
    baseSplitName: input.baseSplit.name,
    meetupShortLabel: "no handoff",
    meetupFixedStopPosition: 1,
    handoffSkipped: true,
  });

  return {
    preScore: 0,
    dedupeKey: `${input.baseSplit.candidateId}|no-handoff`,
    meetupSelection: undefined,
    plan: {
      ...input.baseSplit,
      candidateId: fullCandidateId,
      name: combinationLabel,
      warnings: [...input.baseSplit.warnings],
    },
    combination: {
      baseSplitCandidateId: input.baseSplit.candidateId,
      fullCandidateId,
      combinationLabel,
      splitStrategyType: input.baseSplit.strategyType,
      meetupVariantId: "no-handoff",
      meetupFixedStopPosition: 1,
      plannedStartStrategy: "profile.timeRules.normalKitchenStartTime",
      selfUsageStrategy: input.baseSplit.summary.selfUsed ? "self_fallback" : "none",
      constraintStrategy: "repair_on_demand",
      variantAssumptions: [...input.baseSplit.assumptions],
      variantWarnings: ["No meet-up options available; handoff preview will be skipped."],
    },
  };
}

export function expandFullCandidateVariants(input: {
  splits: DeliveryAgentCandidatePlan[];
  profile: DeliveryPlanningProfile;
  planningHints?: PlanningHints;
}): FullCandidateExpansionResult {
  const rules = input.profile.candidateExpansionRules;
  const expansionWarnings: string[] = [];
  const drafts: VariantDraft[] = [];
  const globalDedupe = new Set<string>();

  const splitsToExpand = input.splits.slice(0, rules.maxSplitCandidatesToExpand);

  for (const baseSplit of splitsToExpand) {
    const providerRun = findProviderRun(baseSplit.runs, input.profile);
    const receiverRun = findPrimaryReceiverRun(baseSplit.runs, input.profile);

    if (
      !input.profile.handoffRules.enabled ||
      !providerRun ||
      !receiverRun ||
      providerRun.stopCount === 0 ||
      receiverRun.stopCount === 0
    ) {
      const draft = buildNoHandoffVariant({ baseSplit, profile: input.profile });
      if (!globalDedupe.has(draft.dedupeKey)) {
        globalDedupe.add(draft.dedupeKey);
        drafts.push(draft);
      }
      continue;
    }

    const pool = buildMeetupCandidatePool(baseSplit.runs, input.profile);
    if (pool.length === 0) {
      const draft = buildNoHandoffVariant({ baseSplit, profile: input.profile });
      if (!globalDedupe.has(draft.dedupeKey)) {
        globalDedupe.add(draft.dedupeKey);
        drafts.push(draft);
      }
      continue;
    }

    const rankedMeetups = rankMeetupOptions({
      runs: baseSplit.runs,
      profile: input.profile,
      limit: rules.maxMeetupOptionsPerSplit,
    });

    const prioritizedMeetups =
      input.planningHints?.pinnedMeetupOrderId
        ? [...rankedMeetups].sort((left, right) => {
            const leftBoost = resolvePinnedMeetupScoreBoost(left.orderId, input.planningHints);
            const rightBoost = resolvePinnedMeetupScoreBoost(right.orderId, input.planningHints);
            return rightBoost + right.score - (leftBoost + left.score);
          })
        : rankedMeetups;

    for (const scoredMeetup of prioritizedMeetups) {
      const meetupKey = meetupOptionDedupeKey(scoredMeetup);
      const meetupShortLabel = shortenMeetupLabel({
        area: scoredMeetup.area,
        formattedAddress: scoredMeetup.formattedAddress,
        preferredZoneLabel: input.profile.handoffRules.meetupSelectionPreferences.preferredHandoffZoneLabel,
      });

      for (const fixedPosition of rules.allowedMeetupFixedPositions) {
        const providerRun = findProviderRun(baseSplit.runs, input.profile);
        const hintedStopBeforeMeetup =
          fixedPosition === 2 && providerRun && input.planningHints?.beforeMeetupOrderIds.length
            ? input.planningHints.beforeMeetupOrderIds.find((orderId) =>
                providerRun.stops.some((stop) => stop.orderId === orderId)
              )
            : undefined;

        const selection = hintedStopBeforeMeetup
          ? buildSuccessfulMeetupSelection({
              selected: scoredMeetup,
              profile: input.profile,
              stopBeforeMeetupOrderId: hintedStopBeforeMeetup,
            })
          : buildMeetupSelectionForPosition({
              scoredMeetup,
              profile: input.profile,
              runs: baseSplit.runs,
              fixedPosition,
            });

        if (!selection) {
          continue;
        }

        if (fixedPosition === 1 && selection.meetupFixedStopPosition !== 1) {
          continue;
        }

        if (fixedPosition === 2 && selection.meetupFixedStopPosition !== 2) {
          continue;
        }

        const dedupeKey = meetupVariantDedupeKey({
          baseSplitCandidateId: baseSplit.candidateId,
          meetupDedupeKey: meetupKey,
          fixedPosition,
        });

        if (globalDedupe.has(dedupeKey)) {
          continue;
        }

        globalDedupe.add(dedupeKey);

        const fullCandidateId = `${baseSplit.candidateId}:meetup-${scoredMeetup.orderId}:pos${fixedPosition}`;
        const meetupVariantId = `meetup-${scoredMeetup.orderId}-pos${fixedPosition}`;
        const combinationLabel = buildCombinationLabel({
          baseSplitName: baseSplit.name,
          meetupShortLabel,
          meetupFixedStopPosition: fixedPosition,
        });

        drafts.push({
          preScore:
            scoredMeetup.score + resolvePinnedMeetupScoreBoost(scoredMeetup.orderId, input.planningHints),
          dedupeKey,
          meetupSelection: selection,
          plan: {
            ...baseSplit,
            candidateId: fullCandidateId,
            name: combinationLabel,
            warnings: [...baseSplit.warnings, ...selection.warnings],
          },
          combination: {
            baseSplitCandidateId: baseSplit.candidateId,
            fullCandidateId,
            combinationLabel,
            splitStrategyType: baseSplit.strategyType,
            meetupVariantId,
            meetupFixedStopPosition: fixedPosition,
            plannedStartStrategy: "profile.timeRules.normalKitchenStartTime",
            selfUsageStrategy: baseSplit.summary.selfUsed ? "self_fallback" : "none",
            constraintStrategy: "repair_on_demand",
            variantAssumptions: [...baseSplit.assumptions],
            variantWarnings: [...selection.warnings],
          },
        });
      }
    }
  }

  const sortedDrafts = [...drafts].sort((left, right) => right.preScore - left.preScore);
  const capped =
    sortedDrafts.length > rules.maxFullCandidateVariants
      ? sortedDrafts.slice(0, rules.maxFullCandidateVariants)
      : sortedDrafts;

  if (sortedDrafts.length > rules.maxFullCandidateVariants) {
    expansionWarnings.push(
      "Variant limit reached; lower-scored combinations were skipped."
    );
  }

  if (capped.length === 0) {
    expansionWarnings.push("No full candidate variants could be built from the available splits.");
  }

  return {
    variants: capped.map((draft) => ({
      plan: draft.plan,
      combination: draft.combination,
      meetupSelection: draft.meetupSelection,
    })),
    expansionWarnings,
  };
}
