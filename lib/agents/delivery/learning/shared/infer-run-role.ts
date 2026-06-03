import type { DeliveryAgentHistoricalRunRole } from "@/lib/contracts/delivery-agent-learning";

import { isSyntheticRouteOptimizerStop } from "@/lib/agents/delivery/learning/matching/flatten-route-optimizer-customer-stops";
import { countRealCustomerStopsBeforeHandoff } from "@/lib/agents/delivery/learning/shared/find-handoff-stop-index";

type StopLike = {
  sequence: number;
  is_synthetic?: boolean;
  stop_type?: string | null;
};

export function inferRunRoleFromStops(stops: StopLike[]): DeliveryAgentHistoricalRunRole {
  if (stops.length === 0) {
    return "unknown";
  }

  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const firstStop = sorted[0];

  if (firstStop && isSyntheticRouteOptimizerStop(firstStop)) {
    return "handoff_start_receiver";
  }

  const providerStopsBeforeHandoff = countRealCustomerStopsBeforeHandoff(sorted);
  const hasHandoffStop = sorted.some((stop) => isSyntheticRouteOptimizerStop(stop));

  if (hasHandoffStop && providerStopsBeforeHandoff > 0) {
    return "kitchen_start_provider";
  }

  return "independent_driver";
}
