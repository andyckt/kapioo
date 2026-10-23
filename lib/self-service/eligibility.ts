import { ApiError } from "@/lib/api/errors";
import { torontoParts } from "./deadline";
export { TORONTO, torontoParts } from "./deadline";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Financial decisions must not guess the year of historical display labels. */
export function parseDeliveryDate(raw: string): string | null {
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  let y: number, m: number, d: number;
  if (match) [, y, m, d] = match.map(Number);
  else {
    match = /^([A-Za-z]+) (\d{1,2}),? (\d{4})$/.exec(raw.trim());
    if (!match) return null;
    y = Number(match[3]); m = MONTHS.indexOf(match[1].slice(0, 3).toLowerCase()) + 1; d = Number(match[2]);
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (!m || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

export function assertEligible(order: {
  status: string; items: Array<{ date?: string; deliveryDateISO?: string }>;
  deliveryDispatch?: unknown; deliveredAt?: unknown; proofOfDelivery?: unknown;
}, cutoff: { hour: number; minute: number }, now = new Date()): string {
  if (!["pending", "confirmed"].includes(order.status) || order.deliveryDispatch || order.deliveredAt || order.proofOfDelivery) {
    throw new ApiError("This order can no longer be changed online. Please contact support.", { status: 409, code: "ORDER_NOT_CHANGEABLE" });
  }
  const dates = order.items.map(i => parseDeliveryDate(i.deliveryDateISO || i.date || ""));
  if (!dates.length || dates.some(d => !d)) {
    throw new ApiError("The delivery date needs staff verification. Please contact support.", { status: 409, code: "DATE_REVIEW_REQUIRED" });
  }
  const first = [...dates].sort()[0]!;
  const previous = new Date(`${first}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const deadline = `${previous.toISOString().slice(0, 10)}T${String(cutoff.hour).padStart(2, "0")}:${String(cutoff.minute).padStart(2, "0")}:00`;
  const p = torontoParts(now);
  const localNow = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  if (localNow >= deadline) throw new ApiError("The change deadline has passed. Please contact support.", { status: 409, code: "CUTOFF_PASSED" });
  return `${deadline.replace("T", " ")} America/Toronto`;
}
