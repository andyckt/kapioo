import type {
  DeliveryAgentLearningOutcomeFeatures,
  DeliveryAgentLearningRunStartDelay,
  DeliveryAgentLearningStopControlFeatures,
} from "@/lib/contracts/delivery-agent-learning";
import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

import { computeLatenessAttribution } from "@/lib/agents/delivery/learning/outcome/compute-lateness-attribution";
import { computeDeadlineBufferMinutes } from "@/lib/agents/delivery/learning/outcome/compute-deadline-buffer";
import { computeRunStartDelayMinutes } from "@/lib/agents/delivery/learning/outcome/compute-start-delay";
import { computeEtaBasisQuality } from "@/lib/agents/delivery/learning/outcome/compute-eta-basis-quality";
import { inferHandoffDelaySignals } from "@/lib/agents/delivery/learning/outcome/infer-handoff-delay";
import { normalizeFinishTimeIfStartedOnTime } from "@/lib/agents/delivery/learning/outcome/normalize-finish-time";
import {
  minutesBetween,
  parseIsoDateTime,
} from "@/lib/agents/delivery/learning/outcome/time-utils";
import { extractDeliveryAgentLearningStopControlFeatures } from "@/lib/agents/delivery/learning/stop-controls/extract-stop-control-features";

function findLatestIsoTimestamp(values: Array<string | null | undefined>): string | null {
  let latest: { iso: string; ms: number } | null = null;

  for (const value of values) {
    const parsed = parseIsoDateTime(value ?? null);
    if (!parsed) {
      continue;
    }

    const ms = parsed.getTime();
    if (!latest || ms > latest.ms) {
      latest = { iso: parsed.toISOString(), ms };
    }
  }

  return latest?.iso ?? null;
}

function collectPerStopEtaErrors(
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse
): DeliveryAgentLearningOutcomeFeatures["perStopEtaErrorsMinutes"] {
  const errors: DeliveryAgentLearningOutcomeFeatures["perStopEtaErrorsMinutes"] = [];

  for (const run of routeOptimizerResponse.runs) {
    for (const stop of run.stops) {
      const arrival = parseIsoDateTime(stop.arrival_time ?? null);
      const completed = parseIsoDateTime(stop.completed_at ?? null);
      if (!arrival || !completed) {
        continue;
      }

      errors.push({
        roRunId: run.run_id,
        sequence: stop.sequence,
        etaErrorMinutes: minutesBetween(arrival, completed),
      });
    }
  }

  return errors;
}

function resolveProviderStartDelayMinutes(input: {
  startDelayMinutesByRun: DeliveryAgentLearningRunStartDelay[];
  stopControlFeatures: DeliveryAgentLearningStopControlFeatures;
  warnings: string[];
}): number | null {
  const providerRun = input.stopControlFeatures.runs.find(
    (run) => run.runRole === "kitchen_start_provider"
  );

  if (providerRun) {
    const providerDelay = input.startDelayMinutesByRun.find(
      (entry) => entry.roRunId === providerRun.roRunId
    );
    return providerDelay?.startDelayMinutes ?? null;
  }

  const delays = input.startDelayMinutesByRun
    .map((entry) => entry.startDelayMinutes)
    .filter((value): value is number => typeof value === "number");

  if (delays.length === 0) {
    return null;
  }

  input.warnings.push("provider_run_not_identified");
  return Math.max(...delays);
}

export function extractDeliveryAgentLearningOutcomeFeatures(args: {
  deliveryDate: string;
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse;
  stopControlFeatures?: DeliveryAgentLearningStopControlFeatures;
  deadlineTime?: string;
  meaningfulStartDelayMinutes?: number;
}): DeliveryAgentLearningOutcomeFeatures {
  const warnings: string[] = [];
  const runs = args.routeOptimizerResponse.runs;
  const stopControlFeatures =
    args.stopControlFeatures ??
    extractDeliveryAgentLearningStopControlFeatures({
      routeOptimizerResponse: args.routeOptimizerResponse,
    });

  const actualStartTimes = runs
    .map((run) => run.actual_start_time)
    .filter((value): value is string => Boolean(value?.trim()));
  const runCompletedAtTimes = runs
    .map((run) => run.run_completed_at)
    .filter((value): value is string => Boolean(value?.trim()));
  const plannedStartTimes = runs
    .map((run) => run.start_time)
    .filter((value): value is string => Boolean(value?.trim()));

  const startDelayMinutesByRun: DeliveryAgentLearningRunStartDelay[] = runs.map((run) => {
    const delay = computeRunStartDelayMinutes({
      deliveryDate: args.deliveryDate,
      plannedStartTime: run.start_time,
      actualStartTime: run.actual_start_time,
    });

    if (delay.warning) {
      warnings.push(`${run.run_id}:${delay.warning}`);
    }

    return {
      roRunId: run.run_id,
      plannedStartTime: run.start_time ?? null,
      actualStartTime: delay.actualStartTime,
      startDelayMinutes: delay.startDelayMinutes,
    };
  });

  const providerStartDelayMinutes = resolveProviderStartDelayMinutes({
    startDelayMinutesByRun,
    stopControlFeatures,
    warnings,
  });

  const latestRunCompletedAt = findLatestIsoTimestamp(runCompletedAtTimes);
  const normalizedFinishTimeIfStartedOnTime = normalizeFinishTimeIfStartedOnTime({
    actualFinishTime: latestRunCompletedAt,
    startDelayMinutes: providerStartDelayMinutes,
  });

  const lateness = computeLatenessAttribution({
    deliveryDate: args.deliveryDate,
    actualFinishTime: latestRunCompletedAt,
    normalizedFinishTimeIfStartedOnTime,
    startDelayMinutes: providerStartDelayMinutes,
    meaningfulStartDelayMinutes: args.meaningfulStartDelayMinutes,
    deadlineTime: args.deadlineTime,
  });

  warnings.push(...lateness.warnings);

  const handoffSignals = inferHandoffDelaySignals({
    runs,
    stopControlFeatures,
    providerStartDelayMinutes,
    meaningfulStartDelayMinutes: args.meaningfulStartDelayMinutes,
  });
  warnings.push(...handoffSignals.warnings);

  return {
    runCompletedBefore1pm: lateness.latenessAttribution === "on_time",
    latestRunCompletedAt,
    deadlineBufferMinutes: computeDeadlineBufferMinutes({
      deliveryDate: args.deliveryDate,
      finishTime: latestRunCompletedAt,
      deadlineTime: args.deadlineTime,
    }),
    lateMinutes: lateness.actualLateMinutes,
    etaBasisQuality: computeEtaBasisQuality(runs),
    actualStartTimes,
    runCompletedAtTimes,
    plannedStartTimes,
    startDelayMinutesByRun,
    providerStartDelayMinutes,
    normalizedFinishTimeIfStartedOnTime,
    normalizedDeadlineBufferMinutes: lateness.normalizedDeadlineBufferMinutes,
    routeWouldHaveMetDeadlineIfStartedOnTime: lateness.routeWouldHaveMetDeadlineIfStartedOnTime,
    latenessAttribution: lateness.latenessAttribution,
    handoffDelayLikely: handoffSignals.handoffDelayLikely,
    receiverLikelyDelayedByProvider: handoffSignals.receiverLikelyDelayedByProvider,
    perStopEtaErrorsMinutes: collectPerStopEtaErrors(args.routeOptimizerResponse),
    warnings,
  };
}
