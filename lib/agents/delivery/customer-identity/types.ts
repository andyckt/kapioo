export type KapiooCustomerIdentityInput = {
  orderId?: string | number | null;
  customerName?: string | null;
  name?: string | null;
  phone?: string | null;
  customerPhone?: string | null;
  address?: string | null;
};

export type RouteOptimizerStopIdentityInput = {
  orderId?: string | number | null;
  orderIds?: Array<string | number> | null;
  customerName?: string | null;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type HistoricalMatchMethod = "order_id" | "derived_route_optimizer_name" | "none";

export type HistoricalMatchConfidence = "exact" | "high" | "none";

export type HistoricalOrderStopMatchResult = {
  matched: boolean;
  method: HistoricalMatchMethod;
  confidence: HistoricalMatchConfidence;
  reason: string;
  kapiooOrderId?: string;
  routeOptimizerOrderId?: string;
  derivedRouteOptimizerCustomerName?: string;
  normalizedKapiooRouteOptimizerName?: string;
  normalizedRouteOptimizerCustomerName?: string;
};

export type FormatRouteOptimizerCustomerNameResult = {
  formattedName: string;
  normalizedFormattedName: string;
  sourceName: string;
  last4PhoneDigits: string;
  hasUsablePhoneLast4: boolean;
};
