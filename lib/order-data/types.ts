import type { DailyOrderStatus } from "@/lib/contracts/daily-order";
import type { DeliveryAddress } from "@/lib/orders/effective-customer-info";
import type { IDeliveryDispatch } from "@/lib/models/delivery-dispatch";
import type { IProofOfDelivery } from "@/lib/models/proof-of-delivery";

export const ORDER_DATA_TIMEZONE = "America/Toronto" as const;

export type OrderDataIssueCode =
  | "MISSING_ORDER_ID"
  | "NO_ITEMS"
  | "UNPARSEABLE_DELIVERY_DATE"
  | "MISSING_STREET_ADDRESS"
  | "MISSING_PHONE"
  | "MISSING_AREA"
  | "NON_DAILY_DELIVERY_AREA"
  | "MISSING_POSTAL_CODE"
  | "MISSING_UNIT"
  | "MISSING_CUSTOMER_NAME"
  | "MISSING_BUZZ_CODE"
  | "HAS_ADMIN_OVERRIDE"
  | "LEGACY_AREA_STRING";

export type OrderDataIssue = {
  code: OrderDataIssueCode;
  field?: string;
  message: string;
};

export type GetDailyOrdersBaseInput = {
  deliveryDate?: string;
  deliveryDateEnd?: string;
  statuses?: DailyOrderStatus[];
  excludeStatuses?: DailyOrderStatus[];
  areas?: string[];
  dailyDeliveryAreasOnly?: boolean;
  userId?: string;
  orderIds?: string[];
  comboName?: string;
  sliceItemsToDeliveryDate?: boolean;
  now?: Date;
  page?: number;
  limit?: number;
  includeValidation?: boolean;
  sort?: Record<string, 1 | -1>;
};

export type NormalizedDailyOrdersFilters = {
  deliveryDate?: string;
  deliveryDateEnd?: string;
  statuses?: DailyOrderStatus[];
  excludeStatuses?: DailyOrderStatus[];
  areas?: string[];
  dailyDeliveryAreasOnly: boolean;
  userId?: string;
  orderIds?: string[];
  comboName?: string;
  sliceItemsToDeliveryDate: boolean;
};

export type DailyOrderBaseItem = {
  day: string;
  date: string;
  dateIso: string | null;
  comboId: string;
  comboName: string;
  type: string;
  quantity: number;
  voucherType: string;
  dishes: string[];
};

export type DailyOrderBaseAddress = {
  unitNumber: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  buzzCode: string;
  formatted: string;
};

export type DailyOrderBaseCustomer = {
  name: string;
  email: string;
  phone: string;
  area: string;
  specialInstructions: string;
  hasAdminOverride: boolean;
  overrideMeta?: {
    updatedAt?: string;
    updatedBy?: string;
  };
};

export type DailyOrderMealSummaryLine = {
  comboName: string;
  type: string;
  typeLabel: string;
  quantity: number;
  voucherType: string;
  dishes: string[];
};

export type DailyOrderMealSummary = {
  totalQuantity: number;
  twoDishVouchers: number;
  threeDishVouchers: number;
  lines: DailyOrderMealSummaryLine[];
  summaryText: string;
};

export type DailyOrderBaseDelivery = {
  dateIso: string | null;
  dateDisplay: string | null;
  dayLabel: string | null;
  windowLabel: string;
  isDailyDeliveryArea: boolean;
};

export type DailyOrderBaseRaw = {
  deliveryAddress: DeliveryAddress;
  area: string | null;
  phoneNumber: string | null;
  specialInstructions: string | null;
  voucherCost: {
    twoDish: number;
    threeDish: number;
  };
};

export type DailyOrderBaseValidation = {
  valid: boolean;
  errors: OrderDataIssue[];
  warnings: OrderDataIssue[];
};

export type DailyOrderBase = {
  mongoId: string;
  orderId: string;
  userId: string;
  status: DailyOrderStatus;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  deliveredAt?: string;
  refundedAt?: string;
  customer: DailyOrderBaseCustomer;
  deliveryAddress: DailyOrderBaseAddress;
  delivery: DailyOrderBaseDelivery;
  items: DailyOrderBaseItem[];
  mealSummary: DailyOrderMealSummary;
  raw: DailyOrderBaseRaw;
  deliveryDispatch?: IDeliveryDispatch;
  proofOfDelivery?: IProofOfDelivery;
  validation: DailyOrderBaseValidation;
};

export type DailyOrderBaseExclusionReason = "NON_DAILY_DELIVERY_AREA";

export type DailyOrderBaseExclusion = {
  orderId: string;
  mongoId?: string;
  reason: DailyOrderBaseExclusionReason;
};

export type GetDailyOrdersBaseSummary = {
  orderCount: number;
  itemCount: number;
  totalMealQuantity: number;
  byStatus: Partial<Record<DailyOrderStatus, number>>;
  byArea: Record<string, number>;
};

export type GetDailyOrdersBasePagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type GetDailyOrdersBaseResult = {
  queriedAt: string;
  timezone: typeof ORDER_DATA_TIMEZONE;
  filters: NormalizedDailyOrdersFilters;
  pagination?: GetDailyOrdersBasePagination;
  summary: GetDailyOrdersBaseSummary;
  orders: DailyOrderBase[];
  excluded?: DailyOrderBaseExclusion[];
};

export type DailyOrderLeanItem = {
  day?: string;
  date?: string;
  comboId?: string;
  comboName?: string;
  type?: string;
  quantity?: number;
  voucherType?: string;
  dishes?: Array<{ dishId?: string; name?: string } | string>;
};

export type DailyOrderLeanDocument = {
  _id: unknown;
  userId: unknown;
  orderId?: string;
  items?: DailyOrderLeanItem[];
  status?: string;
  voucherCost?: { twoDish?: number; threeDish?: number };
  specialInstructions?: string | null;
  deliveryAddress?: DeliveryAddress | null;
  phoneNumber?: string | null;
  area?: string | null;
  orderCustomerOverride?: {
    name?: string;
    phoneNumber?: string;
    area?: string;
    specialInstructions?: string;
    deliveryAddress?: DeliveryAddress;
    updatedAt?: Date | string;
    updatedBy?: string;
  } | null;
  confirmedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  refundedAt?: Date | string | null;
  proofOfDelivery?: IProofOfDelivery;
  deliveryDispatch?: IDeliveryDispatch;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type UserLeanForOrderData = {
  _id: unknown;
  name?: string;
  email?: string;
  phone?: string;
};
