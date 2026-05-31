import { describe, expect, it } from "vitest";

import {
  buildGeocodeIdempotencyKey,
  buildNormalizedAddressKey,
} from "@/lib/agents/delivery/geocode/normalize-address-key";
import type { RoutingStop } from "@/lib/agents/delivery/types";

function buildStop(overrides: Partial<RoutingStop> = {}): RoutingStop {
  return {
    orderId: "DD-1",
    mongoId: "mongo-1",
    customerName: "Customer",
    customerPhone: "4165550100",
    customerEmail: "test@example.com",
    area: "North York",
    formattedAddress: "Unit 5, 123 Main St, North York M2N 1A1, Canada",
    deliveryAddress: {
      unitNumber: "5",
      streetAddress: "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M2N 1A1",
      country: "Canada",
      buzzCode: "",
    },
    notes: "",
    specialInstructions: "",
    deliveryDate: "2026-06-09",
    deliveryWindow: "11:00-13:00",
    mealSummary: "2 meals",
    totalMealQuantity: 2,
    items: [],
    status: "confirmed",
    hasAdminOverride: false,
    routeOptimizer: {
      name: "Customer",
      phone: "4165550100",
      address: "Unit 5, 123 Main St, North York M2N 1A1, Canada",
      notes: "",
      order_ids: ["DD-1"],
    },
    ...overrides,
  };
}

describe("normalize-address-key", () => {
  it("builds stable keys for equivalent address formatting", () => {
    const stopA = buildStop();
    const stopB = buildStop({
      formattedAddress: "unit 5, 123 main st, north york m2n 1a1, canada",
    });

    expect(buildNormalizedAddressKey(stopA)).toBe(buildNormalizedAddressKey(stopB));
  });

  it("builds deterministic geocode idempotency keys", () => {
    expect(buildGeocodeIdempotencyKey("2026-06-09", ["b", "a"])).toBe(
      buildGeocodeIdempotencyKey("2026-06-09", ["a", "b"])
    );
  });
});
