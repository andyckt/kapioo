import { ORDER_DATA_TIMEZONE } from "@/lib/order-data/types";

const DEFAULT_ROUTE_PREVIEW_SERVICE_TIME_MINUTES = 5;

function readDateTimePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
): number {
  const value = parts.find((part) => part.type === type)?.value;
  return value ? Number(value) : 0;
}

export function parseTorontoLocalDateTime(deliveryDate: string, startTime: string): Date {
  const [year, month, day] = deliveryDate.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);

  let utcMs = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ORDER_DATA_TIMEZONE,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date(utcMs));

    const actualMs = Date.UTC(
      readDateTimePart(parts, "year"),
      readDateTimePart(parts, "month") - 1,
      readDateTimePart(parts, "day"),
      readDateTimePart(parts, "hour"),
      readDateTimePart(parts, "minute")
    );
    const desiredMs = Date.UTC(year, month - 1, day, hour, minute);
    const delta = desiredMs - actualMs;

    if (delta === 0) {
      break;
    }

    utcMs += delta;
  }

  return new Date(utcMs);
}

export function addMinutesToDate(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function computeTorontoEstimatedFinishIso(input: {
  deliveryDate: string;
  startTime: string;
  totalDurationMinutes: number;
}): string {
  const start = parseTorontoLocalDateTime(input.deliveryDate, input.startTime);
  return addMinutesToDate(start, input.totalDurationMinutes).toISOString();
}

export function computeTorontoStopArrivalIsos(input: {
  deliveryDate: string;
  startTime: string;
  stops: Array<{
    durationFromPreviousMinutes?: number;
    serviceTimeMinutes?: number;
  }>;
}): string[] {
  let current = parseTorontoLocalDateTime(input.deliveryDate, input.startTime);
  const arrivals: string[] = [];

  for (const stop of input.stops) {
    current = addMinutesToDate(current, stop.durationFromPreviousMinutes ?? 0);
    arrivals.push(current.toISOString());
    current = addMinutesToDate(
      current,
      stop.serviceTimeMinutes ?? DEFAULT_ROUTE_PREVIEW_SERVICE_TIME_MINUTES
    );
  }

  return arrivals;
}

export function formatTorontoLocalTimeForRouteOptimizer(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO datetime for Route Optimizer start_time: ${iso}`);
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ORDER_DATA_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = readDateTimePart(parts, "hour");
  const minute = readDateTimePart(parts, "minute");

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export { DEFAULT_ROUTE_PREVIEW_SERVICE_TIME_MINUTES };
