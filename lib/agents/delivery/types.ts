import type { DailyOrderStatus } from "@/lib/contracts/daily-order";
import type { DailyOrderBaseItem } from "@/lib/order-data/types";
import { ORDER_DATA_TIMEZONE } from "@/lib/order-data/types";

export const DEFAULT_ROUTING_PROFILE_ID = "daily-default" as const;

export const DEFAULT_ROUTING_STATUSES: DailyOrderStatus[] = ["pending", "confirmed"];

export type RoutingIssueCode =
  | "ROUTING_MISSING_ORDER_ID"
  | "ROUTING_MISSING_NAME"
  | "ROUTING_MISSING_PHONE"
  | "ROUTING_MISSING_STREET_ADDRESS"
  | "ROUTING_MISSING_AREA"
  | "ROUTING_NON_DAILY_DELIVERY_AREA"
  | "ROUTING_NO_ITEMS_FOR_DATE"
  | "ROUTING_MISSING_POSTAL_CODE"
  | "ROUTING_MISSING_UNIT"
  | "ROUTING_MISSING_BUZZ_CODE"
  | "ROUTING_HAS_ADMIN_OVERRIDE"
  | "ROUTING_ADDRESS_MAY_NEED_REVIEW";

export type RoutingIssue = {
  code: RoutingIssueCode;
  field?: string;
  message: string;
};

export type RoutingStopAddress = {
  unitNumber: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  buzzCode: string;
};

export type RouteOptimizerStopPayload = {
  name: string;
  phone: string;
  address: string;
  notes: string;
  order_ids: string[];
};

export type RoutingStop = {
  orderId: string;
  mongoId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  area: string;
  formattedAddress: string;
  deliveryAddress: RoutingStopAddress;
  notes: string;
  specialInstructions: string;
  deliveryDate: string;
  deliveryWindow: string;
  mealSummary: string;
  totalMealQuantity: number;
  items: DailyOrderBaseItem[];
  status: DailyOrderStatus;
  hasAdminOverride: boolean;
  routeOptimizer: RouteOptimizerStopPayload;
};

export type RoutingInvalidOrder = {
  orderId: string;
  mongoId?: string;
  customerName?: string;
  area?: string;
  errors: RoutingIssue[];
  warnings: RoutingIssue[];
};

export type RoutingOrderWarning = {
  orderId: string;
  warnings: RoutingIssue[];
};

export type RoutingOrdersSummary = {
  totalOrders: number;
  validStops: number;
  invalidStops: number;
  warningStops: number;
  byArea: Record<string, number>;
  byStatus: Partial<Record<DailyOrderStatus, number>>;
  totalMealQuantity: number;
};

export type SourceOrderResultSummary = {
  orderCount: number;
  excludedCount: number;
  itemCount: number;
  totalMealQuantity: number;
  byStatus: Partial<Record<DailyOrderStatus, number>>;
  byArea: Record<string, number>;
};

export type GetDeliveryOrdersForRoutingInput = {
  deliveryDate: string;
  profileId?: string;
  statuses?: DailyOrderStatus[];
  areas?: string[];
  now?: Date;
};

export type GetDeliveryOrdersForRoutingResult = {
  deliveryDate: string;
  profileId: string;
  queriedAt: string;
  timezone: typeof ORDER_DATA_TIMEZONE;
  summary: RoutingOrdersSummary;
  stops: RoutingStop[];
  invalid: RoutingInvalidOrder[];
  warnings: RoutingOrderWarning[];
  sourceOrderResultSummary: SourceOrderResultSummary;
};
