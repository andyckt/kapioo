import type { DailyOrderStatus } from "@/lib/contracts/daily-order";
import connectToDatabase from "@/lib/db";
import { isDailyDeliveryArea } from "@/lib/constants/areas";
import {
  buildDailyOrdersQuery,
  normalizeDailyOrdersFilters,
} from "@/lib/order-data/build-daily-orders-query";
import {
  filterDailyOrderItems,
  getDayLabelFromItem,
} from "@/lib/order-data/filter-daily-order-items";
import { loadUsersByIds } from "@/lib/order-data/load-users-by-ids";
import { summarizeDailyOrderItems } from "@/lib/order-data/summarize-daily-order-items";
import type {
  DailyOrderBase,
  DailyOrderBaseAddress,
  DailyOrderBaseExclusion,
  DailyOrderLeanDocument,
  GetDailyOrdersBaseInput,
  GetDailyOrdersBaseResult,
  GetDailyOrdersBaseSummary,
  UserLeanForOrderData,
} from "@/lib/order-data/types";
import { ORDER_DATA_TIMEZONE } from "@/lib/order-data/types";
import { validateDailyOrderBase } from "@/lib/order-data/validate-daily-order-base";
import {
  getOrderOnlyOverrideMeta,
  hasOrderCustomerOverride,
  resolveEffectiveOrderCustomerInfo,
} from "@/lib/orders/effective-customer-info";
import { formatExportDeliveryAddress } from "@/lib/orders/export-address";
import { getStandardDeliveryWindow } from "@/lib/user-order-delivery-display";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";

function toIsoString(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return undefined;
}

function buildDeliveryAddress(
  effectiveAddress: ReturnType<typeof resolveEffectiveOrderCustomerInfo>["deliveryAddress"],
  effectiveArea: string
): DailyOrderBaseAddress {
  const unitNumber = effectiveAddress.unitNumber ?? "";
  const streetAddress = effectiveAddress.streetAddress ?? "";
  const city = effectiveAddress.city ?? "";
  const province = effectiveAddress.province ?? "";
  const postalCode = effectiveAddress.postalCode ?? "";
  const country = effectiveAddress.country ?? "";
  const buzzCode = effectiveAddress.buzzCode ?? "";

  return {
    unitNumber,
    streetAddress,
    city,
    province,
    postalCode,
    country,
    buzzCode,
    formatted: formatExportDeliveryAddress(effectiveAddress, effectiveArea),
  };
}

function mapOrderToDailyOrderBase(params: {
  order: DailyOrderLeanDocument;
  user: UserLeanForOrderData | undefined;
  filters: ReturnType<typeof normalizeDailyOrdersFilters>;
  now: Date;
  includeValidation: boolean;
}): DailyOrderBase {
  const { order, user, filters, now, includeValidation } = params;
  const effective = resolveEffectiveOrderCustomerInfo(order, user);
  const overrideMeta = getOrderOnlyOverrideMeta(order);

  const slicedItems = filterDailyOrderItems({
    items: order.items,
    deliveryDate: filters.deliveryDate,
    deliveryDateEnd: filters.deliveryDateEnd,
    orderCreatedAt: order.createdAt,
    now,
    sliceItemsToDeliveryDate: filters.sliceItemsToDeliveryDate,
  });

  const firstItem = slicedItems[0] ?? null;
  const deliveryDateIso = firstItem?.dateIso ?? null;
  const deliveryDateDisplay = firstItem?.date ?? null;
  const dayLabel = firstItem ? getDayLabelFromItem(firstItem) : null;

  const deliveryAddress = buildDeliveryAddress(effective.deliveryAddress, effective.area);
  const mealSummary = summarizeDailyOrderItems(slicedItems, order.voucherCost);

  const validation = includeValidation
    ? validateDailyOrderBase({
        orderId: String(order.orderId ?? ""),
        items: slicedItems,
        customer: {
          name: effective.name,
          phone: effective.phoneNumber,
          area: effective.area,
        },
        deliveryAddress: {
          streetAddress: deliveryAddress.streetAddress,
          unitNumber: deliveryAddress.unitNumber,
          postalCode: deliveryAddress.postalCode,
          buzzCode: deliveryAddress.buzzCode,
        },
        deliveryDateIso,
        sliceItemsToDeliveryDate: filters.sliceItemsToDeliveryDate,
        orderDoc: order,
      })
    : { valid: true, errors: [], warnings: [] };

  return {
    mongoId: String(order._id),
    orderId: String(order.orderId ?? ""),
    userId: String(order.userId),
    status: String(order.status ?? "pending") as DailyOrderStatus,
    createdAt: toIsoString(order.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(order.updatedAt) ?? new Date(0).toISOString(),
    confirmedAt: toIsoString(order.confirmedAt),
    deliveredAt: toIsoString(order.deliveredAt),
    refundedAt: toIsoString(order.refundedAt),
    customer: {
      name: effective.name,
      email: effective.email,
      phone: effective.phoneNumber,
      area: effective.area,
      specialInstructions: effective.specialInstructions,
      hasAdminOverride: hasOrderCustomerOverride(order),
      overrideMeta: overrideMeta.updatedAt || overrideMeta.updatedBy
        ? {
            updatedAt: toIsoString(overrideMeta.updatedAt),
            updatedBy: overrideMeta.updatedBy,
          }
        : undefined,
    },
    deliveryAddress,
    delivery: {
      dateIso: deliveryDateIso,
      dateDisplay: deliveryDateDisplay,
      dayLabel,
      windowLabel: getStandardDeliveryWindow("daily", "en"),
      isDailyDeliveryArea: isDailyDeliveryArea(effective.area),
    },
    items: slicedItems,
    mealSummary,
    raw: {
      deliveryAddress: order.deliveryAddress ?? {},
      area: order.area ?? null,
      phoneNumber: order.phoneNumber ?? null,
      specialInstructions: order.specialInstructions ?? null,
      voucherCost: {
        twoDish: Number(order.voucherCost?.twoDish) || 0,
        threeDish: Number(order.voucherCost?.threeDish) || 0,
      },
    },
    deliveryDispatch: order.deliveryDispatch,
    proofOfDelivery: order.proofOfDelivery,
    validation,
  };
}

function buildSummary(orders: DailyOrderBase[]): GetDailyOrdersBaseSummary {
  const byStatus: Partial<Record<DailyOrderStatus, number>> = {};
  const byArea: Record<string, number> = {};

  let itemCount = 0;
  let totalMealQuantity = 0;

  for (const order of orders) {
    byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
    const areaKey = order.customer.area || "Unknown";
    byArea[areaKey] = (byArea[areaKey] ?? 0) + 1;
    itemCount += order.items.length;
    totalMealQuantity += order.mealSummary.totalQuantity;
  }

  return {
    orderCount: orders.length,
    itemCount,
    totalMealQuantity,
    byStatus,
    byArea,
  };
}

export async function getDailyOrdersBase(
  input: GetDailyOrdersBaseInput
): Promise<GetDailyOrdersBaseResult> {
  const now = input.now ?? new Date();
  const includeValidation = input.includeValidation !== false;
  const filters = normalizeDailyOrdersFilters(input);

  const { query } = await buildDailyOrdersQuery(input);

  await connectToDatabase();
  const sort = input.sort ?? { createdAt: -1 };

  let mongoQuery = DailyDeliveryOrder.find(query).sort(sort).lean();

  let total = 0;
  let pagination: GetDailyOrdersBaseResult["pagination"];

  if (input.page !== undefined && input.limit !== undefined) {
    const page = input.page > 0 ? input.page : 1;
    const limit = input.limit > 0 ? input.limit : 10;
    const skip = (page - 1) * limit;

    total = await DailyDeliveryOrder.countDocuments(query);
    mongoQuery = mongoQuery.skip(skip).limit(limit);
    pagination = {
      page,
      limit,
      total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  const leanOrders = (await mongoQuery) as DailyOrderLeanDocument[];
  const userMap = await loadUsersByIds(leanOrders.map((order) => String(order.userId)));

  const orders: DailyOrderBase[] = [];
  const excluded: DailyOrderBaseExclusion[] = [];

  for (const order of leanOrders) {
    const user = userMap.get(String(order.userId));
    const effective = resolveEffectiveOrderCustomerInfo(order, user);

    if (filters.dailyDeliveryAreasOnly && !isDailyDeliveryArea(effective.area)) {
      excluded.push({
        orderId: String(order.orderId ?? ""),
        mongoId: String(order._id),
        reason: "NON_DAILY_DELIVERY_AREA",
      });
      continue;
    }

    orders.push(
      mapOrderToDailyOrderBase({
        order,
        user,
        filters,
        now,
        includeValidation,
      })
    );
  }

  return {
    queriedAt: now.toISOString(),
    timezone: ORDER_DATA_TIMEZONE,
    filters,
    pagination,
    summary: buildSummary(orders),
    orders,
    excluded: excluded.length > 0 ? excluded : undefined,
  };
}
