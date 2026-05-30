import { mapOrderToRoutingStop } from "@/lib/agents/delivery/map-order-to-routing-stop";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import { createRoutingTestOrder } from "../test-fixtures";

export function buildRoutingStop(
  overrides: {
    orderId?: string;
    area?: string;
    streetAddress?: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
    totalMealQuantity?: number;
  } = {}
): RoutingStop {
  const order = createRoutingTestOrder({
    orderId: overrides.orderId ?? "DD-90000001",
    customer: {
      name: "Alice Customer",
      email: "alice@example.com",
      phone: "416-555-0100",
      area: overrides.area ?? "Downtown Toronto",
      specialInstructions: "",
      hasAdminOverride: false,
    },
    deliveryAddress: {
      unitNumber: "1001",
      streetAddress: overrides.streetAddress ?? "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: overrides.postalCode ?? "M5V 1A1",
      country: "Canada",
      buzzCode: "",
      formatted: `Unit 1001, ${overrides.streetAddress ?? "123 Main St"}, ${overrides.area ?? "Downtown Toronto"} ${overrides.postalCode ?? "M5V 1A1"}, Canada`,
    },
    mealSummary: {
      totalQuantity: overrides.totalMealQuantity ?? 2,
      twoDishVouchers: overrides.totalMealQuantity ?? 2,
      threeDishVouchers: 0,
      lines: [],
      summaryText: "Combo 1 (2 dishes) x2",
    },
  });

  const stop = mapOrderToRoutingStop(order, "2026-06-09");

  if (overrides.lat !== undefined) {
    (stop as RoutingStop & { lat: number }).lat = overrides.lat;
  }

  if (overrides.lng !== undefined) {
    (stop as RoutingStop & { lng: number }).lng = overrides.lng;
  }

  return stop;
}

export function buildMixedAreaRoutingStops(): RoutingStop[] {
  return [
    buildRoutingStop({ orderId: "DD-90000001", area: "Downtown Toronto" }),
    buildRoutingStop({ orderId: "DD-90000002", area: "Midtown" }),
    buildRoutingStop({ orderId: "DD-90000003", area: "Markham" }),
    buildRoutingStop({
      orderId: "DD-90000004",
      area: "North York",
      streetAddress: "4000 Yonge St",
      postalCode: "M2N 5N8",
    }),
    buildRoutingStop({
      orderId: "DD-90000005",
      area: "North York",
      streetAddress: "1000 Finch Ave E",
      postalCode: "M2J 2X5",
    }),
    buildRoutingStop({
      orderId: "DD-90000006",
      area: "Richmond Hill",
      streetAddress: "9000 Yonge St",
      postalCode: "L4C 6Z8",
    }),
  ];
}
