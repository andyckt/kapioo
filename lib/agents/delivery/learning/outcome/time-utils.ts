import { addMinutesToDate, parseTorontoLocalDateTime } from "@/lib/agents/delivery/route-preview-time";

export function normalizeTimeTo24Hour(value: string): string | null {
  const trimmed = value.trim();
  const twentyFourHourMatch = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    }
    return null;
  }

  const twelveHourMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
  if (!twelveHourMatch) {
    return null;
  }

  let hour = Number(twelveHourMatch[1]);
  const minute = Number(twelveHourMatch[2]);
  const period = twelveHourMatch[3]?.toUpperCase();

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute > 59) {
    return null;
  }

  if (period === "AM") {
    if (hour === 12) {
      hour = 0;
    }
  } else if (hour !== 12) {
    hour += 12;
  }

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function parseIsoDateTime(value: string | null | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Date(parsed);
}

export function parseRunStartDateTime(args: {
  deliveryDate: string;
  startTime?: string | null;
}): Date | null {
  if (!args.startTime?.trim()) {
    return null;
  }

  const normalizedTime = normalizeTimeTo24Hour(args.startTime);
  if (!normalizedTime) {
    return null;
  }

  return parseTorontoLocalDateTime(args.deliveryDate, normalizedTime);
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function subtractMinutesFromIso(iso: string, minutes: number): string | null {
  const date = parseIsoDateTime(iso);
  if (!date) {
    return null;
  }

  return addMinutesToDate(date, -Math.max(minutes, 0)).toISOString();
}

export function parseDeadlineDateTime(deliveryDate: string, deadlineTime = "13:00"): Date | null {
  const normalized = normalizeTimeTo24Hour(deadlineTime);
  if (!normalized) {
    return null;
  }

  return parseTorontoLocalDateTime(deliveryDate, normalized);
}
