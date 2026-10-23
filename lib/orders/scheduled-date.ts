import { parseDeliveryDate, torontoParts } from "@/lib/self-service/eligibility";

/** Snapshot a NEW order's current published schedule. Never use this on historical orders. */
export function snapshotScheduledDate(label: string, now = new Date()): string | undefined {
  const full = parseDeliveryDate(label);
  if (full) return full;
  const match = /^([A-Za-z]+)\s+(\d{1,2})$/.exec(label.trim());
  if (!match) return;
  const p = torontoParts(now);
  const today = new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`);
  for (let offset = 0; offset <= 28; offset++) {
    const day = new Date(today); day.setUTCDate(day.getUTCDate() + offset);
    const month = day.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
    if (month.slice(0, 3).toLowerCase() === match[1].slice(0, 3).toLowerCase() && day.getUTCDate() === Number(match[2])) return day.toISOString().slice(0, 10);
  }
}
