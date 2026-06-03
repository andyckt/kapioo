import type { DeliveryAgentLearningStopControlFeatures } from "@/lib/contracts/delivery-agent-learning";
import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

import { isSyntheticRouteOptimizerStop } from "@/lib/agents/delivery/learning/matching/flatten-route-optimizer-customer-stops";
import { inferRunRoleFromStops } from "@/lib/agents/delivery/learning/shared/infer-run-role";

export function extractDeliveryAgentLearningStopControlFeatures(args: {
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse;
}): DeliveryAgentLearningStopControlFeatures {
  const warnings: string[] = [];
  const unknownFlags: string[] = [];
  let fixedStopsUsed = false;
  let endStopsUsed = false;
  let firstStopsUsed = false;
  let handoffStopsUsed = false;

  const runs = args.routeOptimizerResponse.runs.map((run) => {
    const runRole = inferRunRoleFromStops(run.stops);

    if (runRole === "unknown") {
      unknownFlags.push(`run_role_unknown:${run.run_id}`);
    }

    const stops = run.stops.map((stop) => {
      const isSynthetic = isSyntheticRouteOptimizerStop(stop);
      const fixedStopPosition = stop.fixed_stop_position ?? null;
      const isFirstStop = stop.is_first_stop ?? false;
      const isEndPoint = stop.is_end_point ?? false;

      if (fixedStopPosition !== null && fixedStopPosition !== undefined) {
        fixedStopsUsed = true;
      }
      if (isFirstStop) {
        firstStopsUsed = true;
      }
      if (isEndPoint) {
        endStopsUsed = true;
      }
      if (isSynthetic) {
        handoffStopsUsed = true;
      }

      return {
        sequence: stop.sequence,
        orderIds: [...(stop.order_ids ?? [])],
        fixedStopPosition,
        isFirstStop,
        isEndPoint,
        isSynthetic,
        stopType: stop.stop_type ?? null,
      };
    });

    if (!run.start_time?.trim()) {
      warnings.push(`missing_start_time:${run.run_id}`);
    }

    if (run.end_location?.trim()) {
      endStopsUsed = true;
    }

    return {
      roRunId: run.run_id,
      driverName: run.driver_name,
      runRole,
      startLocation: run.start_location ?? null,
      endLocation: run.end_location ?? null,
      stops,
    };
  });

  return {
    fixedStopsUsed,
    endStopsUsed,
    firstStopsUsed,
    handoffStopsUsed,
    runs,
    unknownFlags,
    warnings,
  };
}
