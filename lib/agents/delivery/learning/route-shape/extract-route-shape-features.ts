import type {
  DeliveryAgentHistoricalRunRole,
  DeliveryAgentLearningRouteShapeFeatures,
  DeliveryAgentLearningStopControlFeatures,
} from "@/lib/contracts/delivery-agent-learning";
import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

import type { DeliveryAgentHistoricalOrderStopMatchingResult } from "@/lib/agents/delivery/learning/matching/types";
import { isSyntheticRouteOptimizerStop } from "@/lib/agents/delivery/learning/matching/flatten-route-optimizer-customer-stops";
import { countRealCustomerStopsBeforeHandoff } from "@/lib/agents/delivery/learning/shared/find-handoff-stop-index";
import { inferRunRoleFromStops } from "@/lib/agents/delivery/learning/shared/infer-run-role";
import { isSelfOrSupportDriverName } from "@/lib/agents/delivery/learning/shared/is-self-or-support-driver";

function resolveRunRole(
  runId: string,
  stops: RouteOptimizerRunsByDateResponse["runs"][number]["stops"],
  stopControlFeatures?: DeliveryAgentLearningStopControlFeatures
): DeliveryAgentHistoricalRunRole {
  const fromStopControl = stopControlFeatures?.runs.find((run) => run.roRunId === runId)?.runRole;
  return fromStopControl ?? inferRunRoleFromStops(stops);
}

export function extractDeliveryAgentLearningRouteShapeFeatures(args: {
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse;
  matchingResult?: DeliveryAgentHistoricalOrderStopMatchingResult;
  stopControlFeatures?: DeliveryAgentLearningStopControlFeatures;
}): DeliveryAgentLearningRouteShapeFeatures {
  const warnings: string[] = [];
  const runs = args.routeOptimizerResponse.runs;
  const handoffSequencePositions: DeliveryAgentLearningRouteShapeFeatures["handoffSequencePositions"] =
    [];

  let kitchenStartRunCount = 0;
  let handoffStartRunCount = 0;
  let providerBeforeHandoffStopCount = 0;
  let receiverStartsAtHandoff: boolean | null = null;
  let supportRunUsed = false;
  let selfRunUsed = false;

  for (const run of runs) {
    const runRole = resolveRunRole(run.run_id, run.stops, args.stopControlFeatures);

    if (runRole === "kitchen_start_provider") {
      kitchenStartRunCount += 1;
      providerBeforeHandoffStopCount += countRealCustomerStopsBeforeHandoff(run.stops);
    }

    if (runRole === "handoff_start_receiver") {
      handoffStartRunCount += 1;
      receiverStartsAtHandoff = true;
    }

    if (runRole === "support_rescue") {
      supportRunUsed = true;
    }

    if (isSelfOrSupportDriverName(run.driver_name)) {
      selfRunUsed = true;
      if (runRole === "independent_driver") {
        supportRunUsed = true;
      }
    }

    for (const stop of run.stops) {
      if (isSyntheticRouteOptimizerStop(stop)) {
        handoffSequencePositions.push({
          roRunId: run.run_id,
          sequence: stop.sequence,
        });
      }
    }

    if (runRole === "unknown") {
      warnings.push(`run_role_unknown:${run.run_id}`);
    }
  }

  if (handoffSequencePositions.length === 0) {
    receiverStartsAtHandoff = receiverStartsAtHandoff ?? false;
  } else if (receiverStartsAtHandoff === null) {
    receiverStartsAtHandoff = false;
    warnings.push("handoff_stop_present_but_receiver_start_unknown");
  }

  if (args.matchingResult && args.matchingResult.warnings.length > 0) {
    warnings.push("matching_warnings_present");
  }

  return {
    runCount: runs.length,
    supportRunUsed,
    selfRunUsed,
    kitchenStartRunCount,
    handoffStartRunCount,
    providerBeforeHandoffStopCount,
    handoffSequencePositions,
    receiverStartsAtHandoff,
    backtrackingRisk: "unknown",
    routeDirectionSmoothness: "unknown",
    warnings,
  };
}
