import { normalizeCustomerNameForMatch } from "@/lib/agents/delivery/customer-identity/normalize-customer-name-for-match";

export function normalizeRouteOptimizerCustomerNameForMatch(name: unknown): string {
  return normalizeCustomerNameForMatch(name);
}
