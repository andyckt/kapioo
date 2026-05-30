import { inferNorthYorkLean } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import type {
  NorthYorkSplitMode,
  PlanningStop,
  StopAssignment,
} from "@/lib/agents/delivery/candidate-plans/types";

function sortFlexibleStops(stops: PlanningStop[]): PlanningStop[] {
  return [...stops].sort((a, b) => {
    const aLat = a.lat ?? Number.POSITIVE_INFINITY;
    const bLat = b.lat ?? Number.POSITIVE_INFINITY;
    if (aLat !== bLat) {
      return aLat - bLat;
    }

    const aLng = a.lng ?? Number.POSITIVE_INFINITY;
    const bLng = b.lng ?? Number.POSITIVE_INFINITY;
    if (aLng !== bLng) {
      return aLng - bLng;
    }

    return a.orderId.localeCompare(b.orderId);
  });
}

function targetDtShare(mode: NorthYorkSplitMode): number {
  switch (mode) {
    case "dt_heavy":
      return 0.7;
    case "marco_heavy":
      return 0.3;
    default:
      return 0.5;
  }
}

export function splitNorthYorkStops(
  flexibleStops: PlanningStop[],
  mode: NorthYorkSplitMode
): { dt: PlanningStop[]; marco: PlanningStop[] } {
  if (flexibleStops.length === 0) {
    return { dt: [], marco: [] };
  }

  const sorted =
    flexibleStops.every((stop) => stop.lat !== undefined && stop.lng !== undefined) &&
    mode === "balanced"
      ? sortFlexibleStops(flexibleStops)
      : [...flexibleStops].sort((a, b) => a.orderId.localeCompare(b.orderId));

  const dtTargetCount = Math.round(sorted.length * targetDtShare(mode));
  const dt: PlanningStop[] = [];
  const marco: PlanningStop[] = [];

  if (mode === "balanced" && sorted.every((stop) => stop.lat !== undefined && stop.lng !== undefined)) {
    const splitIndex = Math.ceil(sorted.length / 2);
    dt.push(...sorted.slice(0, splitIndex));
    marco.push(...sorted.slice(splitIndex));
    return { dt, marco };
  }

  for (const stop of sorted) {
    const lean = inferNorthYorkLean(stop);
    if (lean === "dt" && dt.length < dtTargetCount) {
      dt.push(stop);
    } else if (lean === "marco" && marco.length < sorted.length - dtTargetCount) {
      marco.push(stop);
    } else if (dt.length < dtTargetCount) {
      dt.push(stop);
    } else {
      marco.push(stop);
    }
  }

  return { dt, marco };
}

export function buildStopAssignment(
  stops: PlanningStop[],
  mode: NorthYorkSplitMode
): StopAssignment {
  const coreDt = stops.filter((stop) => stop.areaBucket === "core_dt");
  const coreUptown = stops.filter((stop) => stop.areaBucket === "core_uptown");
  const flexible = stops.filter(
    (stop) => stop.areaBucket === "flexible_north_york" || stop.areaBucket === "unknown"
  );

  const northYorkSplit = splitNorthYorkStops(flexible, mode);

  return {
    dt: [...coreDt, ...northYorkSplit.dt],
    marco: [...coreUptown, ...northYorkSplit.marco],
    self: [],
  };
}

export function countNorthYorkSplit(assignment: StopAssignment): { dt: number; marco: number } {
  const isFlexible = (stop: PlanningStop) =>
    stop.areaBucket === "flexible_north_york" || stop.areaBucket === "unknown";

  return {
    dt: assignment.dt.filter(isFlexible).length,
    marco: assignment.marco.filter(isFlexible).length,
  };
}
