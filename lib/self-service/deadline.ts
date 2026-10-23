export const TORONTO = "America/Toronto";

export function torontoParts(now: Date) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(p => [p.type, p.value]));
}

/** Compare Toronto wall times without using the visitor's local time zone. */
export function isBeforeChangeDeadline(deadline: string | null | undefined, now = new Date()) {
  if (!deadline || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} America\/Toronto$/.test(deadline)) return false;
  const p = torontoParts(now);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} America/Toronto` < deadline;
}
