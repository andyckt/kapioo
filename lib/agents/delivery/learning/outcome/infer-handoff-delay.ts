import type { DeliveryAgentLearningStopControlFeatures } from "@/lib/contracts/delivery-agent-learning";
import type { RouteOptimizerHistoricalRun } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

import { isSyntheticRouteOptimizerStop } from "@/lib/agents/delivery/learning/matching/flatten-route-optimizer-customer-stops";
import { parseIsoDateTime } from "@/lib/agents/delivery/learning/outcome/time-utils";

export function inferHandoffDelaySignals(args: {
  runs: RouteOptimizerHistoricalRun[];
  stopControlFeatures?: DeliveryAgentLearningStopControlFeatures;
  providerStartDelayMinutes?: number | null;
  meaningfulStartDelayMinutes?: number;
}): {
  handoffDelayLikely: boolean;
  receiverLikelyDelayedByProvider: boolean | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  const meaningfulStartDelayMinutes = args.meaningfulStartDelayMinutes ?? 10;
  const hasHandoffStop = args.runs.some((run) =>
    run.stops.some((stop) => isSyntheticRouteOptimizerStop(stop))
  );

  if (!hasHandoffStop) {
    return {
      handoffDelayLikely: false,
      receiverLikelyDelayedByProvider: null,
      warnings,
    };
  }

  const providerRun =
    args.stopControlFeatures?.runs.find((run) => run.runRole === "kitchen_start_provider") ??
    null;
  const receiverRun =
    args.stopControlFeatures?.runs.find((run) => run.runRole === "handoff_start_receiver") ??
    null;

  const providerDelay = args.providerStartDelayMinutes ?? null;
  const providerDelayed =
    providerDelay !== null && providerDelay >= meaningfulStartDelayMinutes;

  if (!providerDelayed) {
    return {
      handoffDelayLikely: false,
      receiverLikelyDelayedByProvider: receiverRun ? false : null,
      warnings,
    };
  }

  if (!receiverRun) {
    warnings.push("receiver_run_not_identified_for_handoff_delay");
    return {
      handoffDelayLikely: true,
      receiverLikelyDelayedByProvider: null,
      warnings,
    };
  }

  if (!providerRun) {
    warnings.push("provider_run_not_identified_for_handoff_delay");
    return {
      handoffDelayLikely: true,
      receiverLikelyDelayedByProvider: null,
      warnings,
    };
  }

  const providerHistoricalRun = args.runs.find((run) => run.run_id === providerRun.roRunId);
  const receiverHistoricalRun = args.runs.find((run) => run.run_id === receiverRun.roRunId);
  const providerActualStart = parseIsoDateTime(providerHistoricalRun?.actual_start_time ?? null);
  const receiverActualStart = parseIsoDateTime(receiverHistoricalRun?.actual_start_time ?? null);

  const receiverLikelyDelayedByProvider =
    receiverActualStart === null ||
    providerActualStart === null ||
    receiverActualStart.getTime() >= providerActualStart.getTime();

  return {
    handoffDelayLikely: true,
    receiverLikelyDelayedByProvider,
    warnings,
  };
}
