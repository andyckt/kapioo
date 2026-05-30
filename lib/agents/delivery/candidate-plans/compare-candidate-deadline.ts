import { parseTorontoLocalDateTime } from "@/lib/agents/delivery/route-preview-time";
import { formatDateTime } from "@/lib/format";
import type { DeliveryAgentCandidateRunPreview } from "@/lib/contracts/delivery-agent";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";

export type CandidateDeadlineComparisonInput = {
  deliveryDate: string;
  profile: DeliveryPlanningProfile;
  runPreviews: DeliveryAgentCandidateRunPreview[];
  planSummary?: {
    runCount: number;
    totalStops: number;
    selfUsed: boolean;
    selfStopCount: number;
  };
};

export type CandidateDeadlineComparisonResult = {
  runCount: number;
  totalStops: number;
  selfUsed: boolean;
  selfStopCount: number;
  latestEstimatedFinishTime?: string;
  formattedLatestEstimatedFinishTime?: string;
  allRunsFinishBeforeDeadline: boolean;
  minutesBeforeOrAfterDeadline?: number;
  totalDistanceKm?: number;
  totalDurationMinutes?: number;
  runFinishTimes: Record<string, string>;
  blockingIssues: string[];
  comparisonNotes: string;
};

function readFinishTimeMs(value?: string): number | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDeadlineLabel(deadlineTime: string): string {
  const [hourRaw, minuteRaw] = deadlineTime.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return deadlineTime;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const minuteLabel = minute.toString().padStart(2, "0");

  return `${hour12}:${minuteLabel} ${period}`;
}

function findLatestFinishRun(
  runPreviews: DeliveryAgentCandidateRunPreview[],
  runFinishTimes: Record<string, string>
): { runSlot?: string; finishIso?: string } {
  let latestMs: number | null = null;
  let latestRunSlot: string | undefined;
  let latestFinishIso: string | undefined;

  for (const run of runPreviews) {
    const finishIso = runFinishTimes[run.runSlot];
    const finishMs = readFinishTimeMs(finishIso);

    if (finishMs === null) {
      continue;
    }

    if (latestMs === null || finishMs > latestMs) {
      latestMs = finishMs;
      latestRunSlot = run.runSlot;
      latestFinishIso = finishIso;
    }
  }

  return { runSlot: latestRunSlot, finishIso: latestFinishIso };
}

export function compareCandidateDeadline(
  input: CandidateDeadlineComparisonInput
): CandidateDeadlineComparisonResult {
  const deadline = parseTorontoLocalDateTime(
    input.deliveryDate,
    input.profile.timeRules.hardDeliveryDeadline
  );
  const deadlineLabel = formatDeadlineLabel(input.profile.timeRules.hardDeliveryDeadline);

  const runFinishTimes: Record<string, string> = {};
  const blockingIssues: string[] = [];
  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;
  let hasDistance = false;
  let hasDuration = false;

  for (const run of input.runPreviews) {
    if (run.previewStatus === "failed") {
      blockingIssues.push(
        run.previewError
          ? `Run ${run.runSlot} preview failed: ${run.previewError}`
          : `Run ${run.runSlot} preview failed.`
      );
      continue;
    }

    if (run.previewStatus === "skipped_no_stops") {
      continue;
    }

    if (run.estimatedFinishTime) {
      runFinishTimes[run.runSlot] = run.estimatedFinishTime;
    }

    if (typeof run.totalDistanceKm === "number") {
      totalDistanceKm += run.totalDistanceKm;
      hasDistance = true;
    }

    if (typeof run.totalDurationMinutes === "number") {
      totalDurationMinutes += run.totalDurationMinutes;
      hasDuration = true;
    }

    if (run.routeOptimizerValidationErrors.length > 0) {
      blockingIssues.push(`Run ${run.runSlot} has Route Optimizer validation errors.`);
    }

    if (run.geocodeFailures.length > 0) {
      blockingIssues.push(`Run ${run.runSlot} has geocode failures.`);
    }
  }

  const latest = findLatestFinishRun(input.runPreviews, runFinishTimes);
  const latestMs = readFinishTimeMs(latest.finishIso);
  const deadlineMs = deadline.getTime();

  let allRunsFinishBeforeDeadline = false;
  let minutesBeforeOrAfterDeadline: number | undefined;
  let comparisonNotes = "No successful run finish times available for deadline comparison.";

  if (latestMs !== null) {
    allRunsFinishBeforeDeadline = latestMs <= deadlineMs;
    minutesBeforeOrAfterDeadline = Math.round((deadlineMs - latestMs) / 60000);

    const formattedLatest = formatDateTime(new Date(latestMs).toISOString());
    const latestRunLabel = latest.runSlot ? `Run ${latest.runSlot}` : "Latest run";

    if (allRunsFinishBeforeDeadline) {
      comparisonNotes = `${latestRunLabel} finishes at ${formattedLatest} — ${minutesBeforeOrAfterDeadline} min before ${deadlineLabel} deadline.`;
    } else {
      const lateMinutes = Math.abs(minutesBeforeOrAfterDeadline);
      comparisonNotes = `${latestRunLabel} finishes at ${formattedLatest} — ${lateMinutes} min after ${deadlineLabel} deadline.`;
      blockingIssues.push(`Latest finish is ${lateMinutes} minute(s) after the hard deadline.`);
    }
  }

  return {
    runCount: input.planSummary?.runCount ?? input.runPreviews.length,
    totalStops: input.planSummary?.totalStops ?? 0,
    selfUsed: input.planSummary?.selfUsed ?? false,
    selfStopCount: input.planSummary?.selfStopCount ?? 0,
    latestEstimatedFinishTime: latest.finishIso,
    formattedLatestEstimatedFinishTime: latest.finishIso
      ? formatDateTime(latest.finishIso)
      : undefined,
    allRunsFinishBeforeDeadline,
    minutesBeforeOrAfterDeadline,
    totalDistanceKm: hasDistance ? totalDistanceKm : undefined,
    totalDurationMinutes: hasDuration ? totalDurationMinutes : undefined,
    runFinishTimes,
    blockingIssues,
    comparisonNotes,
  };
}
