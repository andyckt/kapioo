import { isSyntheticRouteOptimizerStop } from "@/lib/agents/delivery/learning/matching/flatten-route-optimizer-customer-stops";

type StopLike = {
  sequence: number;
  is_synthetic?: boolean;
  stop_type?: string | null;
};

export function findHandoffStopIndex(stops: StopLike[]): number | null {
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const handoffStop = sorted.find((stop) => isSyntheticRouteOptimizerStop(stop));
  return handoffStop ? handoffStop.sequence : null;
}

export function countRealCustomerStopsBeforeHandoff(stops: StopLike[]): number {
  const handoffIndex = findHandoffStopIndex(stops);
  if (handoffIndex === null) {
    return 0;
  }

  return stops.filter(
    (stop) => stop.sequence < handoffIndex && !isSyntheticRouteOptimizerStop(stop)
  ).length;
}
