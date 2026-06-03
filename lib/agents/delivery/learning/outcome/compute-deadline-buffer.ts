import {
  minutesBetween,
  parseDeadlineDateTime,
  parseIsoDateTime,
} from "@/lib/agents/delivery/learning/outcome/time-utils";

export function computeDeadlineBufferMinutes(args: {
  deliveryDate: string;
  finishTime?: string | null;
  deadlineTime?: string;
}): number | null {
  const finish = parseIsoDateTime(args.finishTime);
  const deadline = parseDeadlineDateTime(args.deliveryDate, args.deadlineTime ?? "13:00");

  if (!finish || !deadline) {
    return null;
  }

  return minutesBetween(finish, deadline);
}
