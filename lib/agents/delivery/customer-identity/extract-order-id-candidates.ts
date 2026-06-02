import type { RouteOptimizerStopIdentityInput } from "@/lib/agents/delivery/customer-identity/types";

export function normalizeOrderIdForMatch(orderId: unknown): string {
  if (orderId === null || orderId === undefined) {
    return "";
  }

  const normalized = String(orderId).trim();
  return normalized;
}

export function getRouteOptimizerOrderIdCandidates(input: RouteOptimizerStopIdentityInput): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const single = normalizeOrderIdForMatch(input.orderId);
  if (single && !seen.has(single)) {
    seen.add(single);
    candidates.push(single);
  }

  for (const orderId of input.orderIds ?? []) {
    const normalized = normalizeOrderIdForMatch(orderId);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      candidates.push(normalized);
    }
  }

  return candidates;
}
