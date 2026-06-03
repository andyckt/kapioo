import type { DeliveryAgentLearningEtaBasisQuality } from "@/lib/contracts/delivery-agent-learning";
import type { RouteOptimizerHistoricalRun } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

export function computeEtaBasisQuality(
  runs: RouteOptimizerHistoricalRun[]
): DeliveryAgentLearningEtaBasisQuality {
  const basisCounts = {
    post_start: 0,
    planned: 0,
    unknown: 0,
  };

  for (const run of runs) {
    const runBasis = run.eta_basis ?? "unknown";
    if (runBasis === "post_start") {
      basisCounts.post_start += 1;
    } else if (runBasis === "planned") {
      basisCounts.planned += 1;
    } else {
      basisCounts.unknown += 1;
    }

    for (const stop of run.stops) {
      const stopBasis = stop.eta_basis ?? runBasis;
      if (stopBasis === "post_start") {
        basisCounts.post_start += 1;
      } else if (stopBasis === "planned") {
        basisCounts.planned += 1;
      } else {
        basisCounts.unknown += 1;
      }
    }
  }

  const total = basisCounts.post_start + basisCounts.planned + basisCounts.unknown;
  if (total === 0) {
    return "unknown";
  }

  if (basisCounts.post_start > total / 2) {
    return "post_start_majority";
  }

  if (basisCounts.planned > 0 && basisCounts.post_start === 0) {
    return "planned_only";
  }

  if (basisCounts.post_start > 0 && basisCounts.planned > 0) {
    return "mixed";
  }

  return "unknown";
}
