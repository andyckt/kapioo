export {
  getRouteOptimizerOrderIdCandidates,
  normalizeOrderIdForMatch,
} from "@/lib/agents/delivery/customer-identity/extract-order-id-candidates";
export { formatRouteOptimizerCustomerName } from "@/lib/agents/delivery/customer-identity/format-route-optimizer-customer-name";
export { matchKapiooOrderToRoStop } from "@/lib/agents/delivery/customer-identity/match-kapioo-order-to-ro-stop";
export { normalizeCustomerNameForMatch } from "@/lib/agents/delivery/customer-identity/normalize-customer-name-for-match";
export {
  getLast4PhoneDigits,
  normalizePhoneDigits,
} from "@/lib/agents/delivery/customer-identity/normalize-phone-digits";
export { normalizeRouteOptimizerCustomerNameForMatch } from "@/lib/agents/delivery/customer-identity/normalize-route-optimizer-customer-name-for-match";
export type {
  FormatRouteOptimizerCustomerNameResult,
  HistoricalMatchConfidence,
  HistoricalMatchMethod,
  HistoricalOrderStopMatchResult,
  KapiooCustomerIdentityInput,
  RouteOptimizerStopIdentityInput,
} from "@/lib/agents/delivery/customer-identity/types";
