import { subtractMinutesFromIso } from "@/lib/agents/delivery/learning/outcome/time-utils";

export function normalizeFinishTimeIfStartedOnTime(args: {
  actualFinishTime?: string | null;
  startDelayMinutes?: number | null;
}): string | null {
  if (!args.actualFinishTime) {
    return null;
  }

  if (args.startDelayMinutes === null || args.startDelayMinutes === undefined) {
    return null;
  }

  return subtractMinutesFromIso(args.actualFinishTime, args.startDelayMinutes);
}
