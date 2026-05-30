import { FinalRouteRunStateError } from "@/lib/agents/delivery/final-route-run/errors";
import type { IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

export type FinalRoutePlanningSessionSource =
  | "final_route_metadata"
  | "route_optimizer_planning_session"
  | "delivery_agent_planning_session"
  | "derived_final_run";

export type ResolvedFinalRoutePlanningSession = {
  planningSessionId: string;
  source: FinalRoutePlanningSessionSource;
};

function readNonEmpty(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveFinalRoutePlanningSessionId(
  run: IDeliveryAgentRun
): ResolvedFinalRoutePlanningSession {
  const fromMetadata = readNonEmpty(run.finalRouteOptimizerMetadata?.planningSessionId);
  if (fromMetadata) {
    return {
      planningSessionId: fromMetadata,
      source: "final_route_metadata",
    };
  }

  const fromRouteOptimizer = readNonEmpty(run.routeOptimizerPlanningSessionId);
  if (fromRouteOptimizer) {
    return {
      planningSessionId: fromRouteOptimizer,
      source: "route_optimizer_planning_session",
    };
  }

  const fromDeliveryAgentRun = readNonEmpty(run.planningSessionId);
  if (fromDeliveryAgentRun) {
    return {
      planningSessionId: fromDeliveryAgentRun,
      source: "delivery_agent_planning_session",
    };
  }

  const runId = readNonEmpty(String(run.id));
  if (runId) {
    return {
      planningSessionId: `final:${runId}`,
      source: "derived_final_run",
    };
  }

  throw new FinalRouteRunStateError(
    "Cannot create final Route Optimizer run because planning_session_id is missing."
  );
}
