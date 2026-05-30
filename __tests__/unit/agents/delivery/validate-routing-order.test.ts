import { validateRoutingOrder } from "@/lib/agents/delivery/validate-routing-order";
import { createRoutingTestOrder } from "./test-fixtures";

describe("lib/agents/delivery/validate-routing-order", () => {
  it("returns valid for a complete routing order", () => {
    const result = validateRoutingOrder(createRoutingTestOrder());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("blocks when phone is missing", () => {
    const result = validateRoutingOrder(
      createRoutingTestOrder({
        customer: {
          ...createRoutingTestOrder().customer,
          phone: "",
        },
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("ROUTING_MISSING_PHONE");
  });

  it("warns when postal code is missing but does not block", () => {
    const result = validateRoutingOrder(
      createRoutingTestOrder({
        deliveryAddress: {
          ...createRoutingTestOrder().deliveryAddress,
          postalCode: "",
        },
      })
    );

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.code)).toContain("ROUTING_MISSING_POSTAL_CODE");
  });

  it("blocks when area is not a daily delivery area", () => {
    const result = validateRoutingOrder(
      createRoutingTestOrder({
        customer: {
          ...createRoutingTestOrder().customer,
          area: "Scarborough",
        },
        delivery: {
          ...createRoutingTestOrder().delivery,
          isDailyDeliveryArea: false,
        },
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("ROUTING_NON_DAILY_DELIVERY_AREA");
  });

  it("does not warn when unit number or buzz code is missing", () => {
    const result = validateRoutingOrder(
      createRoutingTestOrder({
        deliveryAddress: {
          ...createRoutingTestOrder().deliveryAddress,
          unitNumber: "",
          buzzCode: "",
        },
      })
    );

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.code)).not.toContain("ROUTING_MISSING_UNIT");
    expect(result.warnings.map((issue) => issue.code)).not.toContain("ROUTING_MISSING_BUZZ_CODE");
  });

  it("warns on admin override and address review", () => {
    const result = validateRoutingOrder(
      createRoutingTestOrder({
        customer: {
          ...createRoutingTestOrder().customer,
          hasAdminOverride: true,
        },
        raw: {
          ...createRoutingTestOrder().raw,
          deliveryAddress: {
            streetAddress: "999 Override St",
          },
        },
      })
    );

    expect(result.warnings.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["ROUTING_HAS_ADMIN_OVERRIDE", "ROUTING_ADDRESS_MAY_NEED_REVIEW"])
    );
  });
});
