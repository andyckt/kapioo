import { countNorthYorkSplit } from "@/lib/agents/delivery/candidate-plans/split-north-york";
import type {
  CandidatePlan,
  CandidatePlanSummary,
  CandidateRun,
  StopAssignment,
} from "@/lib/agents/delivery/candidate-plans/types";

function buildByArea(runs: CandidateRun[]): Record<string, number> {
  const byArea: Record<string, number> = {};

  for (const run of runs) {
    for (const [area, count] of Object.entries(run.areaBreakdown)) {
      byArea[area] = (byArea[area] ?? 0) + count;
    }
  }

  return byArea;
}

export function summarizeCandidatePlan(
  runs: CandidateRun[],
  assignment: StopAssignment,
  warnings: string[] = []
): CandidatePlanSummary {
  const selfRun = runs.find((run) => run.runSlot === "C");
  const selfStopCount = selfRun?.stopCount ?? 0;

  return {
    totalStops: runs.reduce((sum, run) => sum + run.stopCount, 0),
    totalMeals: runs.reduce((sum, run) => sum + run.totalMealQuantity, 0),
    runCount: runs.length,
    selfUsed: selfStopCount > 0,
    selfStopCount,
    byRun: Object.fromEntries(runs.map((run) => [run.runSlot, run.stopCount])),
    byArea: buildByArea(runs),
    northYorkSplit: countNorthYorkSplit(assignment),
    warnings,
  };
}

export function attachSummaryToCandidate(
  candidate: Omit<CandidatePlan, "summary">,
  assignment: StopAssignment,
  extraWarnings: string[] = []
): CandidatePlan {
  const summary = summarizeCandidatePlan(candidate.runs, assignment, [
    ...candidate.warnings,
    ...extraWarnings,
  ]);

  return {
    ...candidate,
    summary,
  };
}
