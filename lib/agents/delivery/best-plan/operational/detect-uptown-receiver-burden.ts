import type { CandidateAssignedRun } from "@/lib/agents/delivery/best-plan/types";
import type { DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";

const UPTOWN_AREAS = new Set(["markham", "richmond hill"]);

function normalizeArea(area: string): string {
  return area.trim().toLowerCase();
}

export function runHasUptownReceiverBurden(
  runs: Array<{ runSlot: string; role: string; stops: Array<{ area: string }> }>
): boolean {
  for (const run of runs) {
    if (run.runSlot !== "B" && run.role !== "uptown") {
      continue;
    }

    for (const stop of run.stops) {
      if (UPTOWN_AREAS.has(normalizeArea(stop.area))) {
        return true;
      }
    }
  }

  return false;
}

export function assignedRunsHaveUptownReceiverBurden(assignedRuns?: CandidateAssignedRun[]): boolean {
  if (!assignedRuns) {
    return false;
  }

  return runHasUptownReceiverBurden(assignedRuns);
}

export function candidateRunsHaveUptownReceiverBurden(
  runs: DeliveryAgentCandidateRun[] | Array<{ runSlot: string; role: string; stops: Array<{ area: string }> }>
): boolean {
  return runHasUptownReceiverBurden(runs);
}
