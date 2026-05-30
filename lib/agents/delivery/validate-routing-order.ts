import type { DailyOrderBase } from "@/lib/order-data/types";
import type { RoutingIssue, RoutingIssueCode } from "@/lib/agents/delivery/types";

function issue(code: RoutingIssueCode, message: string, field?: string): RoutingIssue {
  return field ? { code, field, message } : { code, message };
}

function hasLegacyAreaWarning(order: DailyOrderBase): boolean {
  return order.validation.warnings.some((warning) => warning.code === "LEGACY_AREA_STRING");
}

function hasAddressOrAreaOverride(order: DailyOrderBase): boolean {
  const override = order.customer.hasAdminOverride;
  if (!override) {
    return false;
  }

  return Boolean(
    order.raw.deliveryAddress?.streetAddress ||
      order.raw.deliveryAddress?.unitNumber ||
      order.raw.deliveryAddress?.postalCode ||
      order.raw.area
  );
}

export function validateRoutingOrder(order: DailyOrderBase): {
  valid: boolean;
  errors: RoutingIssue[];
  warnings: RoutingIssue[];
} {
  const errors: RoutingIssue[] = [];
  const warnings: RoutingIssue[] = [];

  if (!order.orderId.trim()) {
    errors.push(issue("ROUTING_MISSING_ORDER_ID", "Order is missing orderId", "orderId"));
  }

  if (!order.customer.name.trim()) {
    errors.push(issue("ROUTING_MISSING_NAME", "Customer name is required for routing", "customerName"));
  }

  if (!order.customer.phone.trim()) {
    errors.push(issue("ROUTING_MISSING_PHONE", "Customer phone is required for routing", "customerPhone"));
  }

  if (!order.deliveryAddress.streetAddress.trim()) {
    errors.push(
      issue(
        "ROUTING_MISSING_STREET_ADDRESS",
        "Street address is required for routing",
        "deliveryAddress.streetAddress"
      )
    );
  }

  if (!order.customer.area.trim()) {
    errors.push(issue("ROUTING_MISSING_AREA", "Delivery area is required for routing", "area"));
  }

  if (order.customer.area.trim() && !order.delivery.isDailyDeliveryArea) {
    errors.push(
      issue(
        "ROUTING_NON_DAILY_DELIVERY_AREA",
        "Area is not in the daily delivery service list",
        "area"
      )
    );
  }

  if (order.items.length === 0) {
    errors.push(
      issue(
        "ROUTING_NO_ITEMS_FOR_DATE",
        "Order has no items for the requested delivery date",
        "items"
      )
    );
  }

  if (!order.deliveryAddress.postalCode.trim()) {
    warnings.push(
      issue(
        "ROUTING_MISSING_POSTAL_CODE",
        "Postal code is missing; geocoding may be less reliable",
        "deliveryAddress.postalCode"
      )
    );
  }

  if (order.customer.hasAdminOverride) {
    warnings.push(
      issue(
        "ROUTING_HAS_ADMIN_OVERRIDE",
        "Order has admin customer override applied",
        "hasAdminOverride"
      )
    );
  }

  if (hasAddressOrAreaOverride(order) || hasLegacyAreaWarning(order)) {
    warnings.push(
      issue(
        "ROUTING_ADDRESS_MAY_NEED_REVIEW",
        "Address or area may need manual review before routing",
        "deliveryAddress"
      )
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
