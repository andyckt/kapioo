import { ALL_WEEKLY_AREAS, isDailyDeliveryArea, isWeeklyDeliveryArea } from "@/lib/constants/areas";
import { hasOrderCustomerOverride } from "@/lib/orders/effective-customer-info";
import type {
  DailyOrderBaseItem,
  DailyOrderLeanDocument,
  OrderDataIssue,
} from "@/lib/order-data/types";

export type ValidateDailyOrderBaseInput = {
  orderId: string;
  items: DailyOrderBaseItem[];
  customer: {
    name: string;
    phone: string;
    area: string;
  };
  deliveryAddress: {
    streetAddress: string;
    unitNumber: string;
    postalCode: string;
    buzzCode: string;
  };
  deliveryDateIso: string | null;
  sliceItemsToDeliveryDate: boolean;
  orderDoc: DailyOrderLeanDocument;
};

function issue(
  code: OrderDataIssue["code"],
  message: string,
  field?: string
): OrderDataIssue {
  return field ? { code, field, message } : { code, message };
}

export function validateDailyOrderBase(input: ValidateDailyOrderBaseInput): {
  valid: boolean;
  errors: OrderDataIssue[];
  warnings: OrderDataIssue[];
} {
  const errors: OrderDataIssue[] = [];
  const warnings: OrderDataIssue[] = [];

  if (!input.orderId.trim()) {
    errors.push(issue("MISSING_ORDER_ID", "Order is missing orderId", "orderId"));
  }

  if (input.items.length === 0) {
    errors.push(issue("NO_ITEMS", "Order has no items for the requested delivery date", "items"));
  }

  if (
    input.sliceItemsToDeliveryDate &&
    input.items.length > 0 &&
    input.items.every((item) => !item.dateIso)
  ) {
    errors.push(
      issue(
        "UNPARSEABLE_DELIVERY_DATE",
        "One or more order items have an unparseable delivery date",
        "items.date"
      )
    );
  }

  if (input.sliceItemsToDeliveryDate && !input.deliveryDateIso && input.items.length > 0) {
    errors.push(
      issue(
        "UNPARSEABLE_DELIVERY_DATE",
        "Could not resolve delivery date for this order",
        "delivery.dateIso"
      )
    );
  }

  if (!input.deliveryAddress.streetAddress.trim()) {
    errors.push(
      issue("MISSING_STREET_ADDRESS", "Delivery street address is required", "deliveryAddress.streetAddress")
    );
  }

  if (!input.customer.phone.trim()) {
    errors.push(issue("MISSING_PHONE", "Customer phone number is required", "customer.phone"));
  }

  if (!input.customer.area.trim()) {
    errors.push(issue("MISSING_AREA", "Delivery area is required", "customer.area"));
  }

  const area = input.customer.area.trim();
  if (area && !isDailyDeliveryArea(area)) {
    warnings.push(
      issue("NON_DAILY_DELIVERY_AREA", "Area is not in the daily delivery service list", "customer.area")
    );
  }

  if (!input.deliveryAddress.postalCode.trim()) {
    warnings.push(
      issue("MISSING_POSTAL_CODE", "Postal code is missing", "deliveryAddress.postalCode")
    );
  }

  if (!input.deliveryAddress.unitNumber.trim()) {
    warnings.push(issue("MISSING_UNIT", "Unit number is missing", "deliveryAddress.unitNumber"));
  }

  if (!input.customer.name.trim()) {
    warnings.push(issue("MISSING_CUSTOMER_NAME", "Customer name is missing", "customer.name"));
  }

  if (!input.deliveryAddress.buzzCode.trim()) {
    warnings.push(issue("MISSING_BUZZ_CODE", "Buzz code is missing", "deliveryAddress.buzzCode"));
  }

  if (hasOrderCustomerOverride(input.orderDoc)) {
    warnings.push(
      issue("HAS_ADMIN_OVERRIDE", "Order has admin customer override applied", "orderCustomerOverride")
    );
  }

  if (
    area &&
    !isWeeklyDeliveryArea(area) &&
    !ALL_WEEKLY_AREAS.includes(area as (typeof ALL_WEEKLY_AREAS)[number])
  ) {
    warnings.push(
      issue("LEGACY_AREA_STRING", "Area is not in the canonical area list", "customer.area")
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
