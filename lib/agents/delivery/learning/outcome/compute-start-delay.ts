import {
  minutesBetween,
  parseIsoDateTime,
  parseRunStartDateTime,
} from "@/lib/agents/delivery/learning/outcome/time-utils";

export function computeRunStartDelayMinutes(args: {
  deliveryDate: string;
  plannedStartTime?: string | null;
  actualStartTime?: string | null;
}): {
  plannedStartDateTime: string | null;
  actualStartTime: string | null;
  startDelayMinutes: number | null;
  warning?: string;
} {
  const plannedStart = parseRunStartDateTime({
    deliveryDate: args.deliveryDate,
    startTime: args.plannedStartTime,
  });
  const actualStart = parseIsoDateTime(args.actualStartTime);

  if (!plannedStart) {
    return {
      plannedStartDateTime: null,
      actualStartTime: args.actualStartTime ?? null,
      startDelayMinutes: null,
      warning: "planned_start_time_unparseable",
    };
  }

  if (!actualStart) {
    return {
      plannedStartDateTime: plannedStart.toISOString(),
      actualStartTime: args.actualStartTime ?? null,
      startDelayMinutes: null,
      warning: "actual_start_time_missing_or_unparseable",
    };
  }

  const delayMinutes = Math.max(0, minutesBetween(plannedStart, actualStart));

  return {
    plannedStartDateTime: plannedStart.toISOString(),
    actualStartTime: actualStart.toISOString(),
    startDelayMinutes: delayMinutes,
  };
}
