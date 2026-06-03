import { mapOrderToLearningOrderSnapshot } from "@/lib/agents/delivery/learning/historical-cases/map-order-to-learning-snapshot";
import { createRoutingTestOrder } from "@/__tests__/unit/agents/delivery/test-fixtures";

describe("mapOrderToLearningOrderSnapshot", () => {
  it("maps a complete order into DeliveryAgentLearningOrderSnapshot", () => {
    const order = createRoutingTestOrder({
      status: "delivered",
      deliveryAddress: {
        ...createRoutingTestOrder().deliveryAddress,
        lat: 43.65,
        lng: -79.38,
      },
    });

    const snapshot = mapOrderToLearningOrderSnapshot(order, "2026-06-09");

    expect(snapshot).toEqual({
      orderId: "DD-90000001",
      customerName: "Alice Customer",
      customerPhone: "416-555-0100",
      formattedAddress:
        "Unit 1001, 123 Main St, Downtown Toronto M5V 1A1, Canada (Buzz code: 1234)",
      area: "Downtown Toronto",
      status: "delivered",
      deliveryDate: "2026-06-09",
      totalMealQuantity: 2,
      unitNumber: "1001",
      buzzCode: "1234",
      notes: "Leave at door",
      lat: 43.65,
      lng: -79.38,
    });
  });

  it("preserves orderId as string", () => {
    const snapshot = mapOrderToLearningOrderSnapshot(createRoutingTestOrder());

    expect(snapshot.orderId).toBe("DD-90000001");
    expect(typeof snapshot.orderId).toBe("string");
  });

  it("uses fallback deliveryDate when order delivery date is missing", () => {
    const snapshot = mapOrderToLearningOrderSnapshot(
      createRoutingTestOrder({
        delivery: {
          ...createRoutingTestOrder().delivery,
          dateIso: null,
        },
      }),
      "2026-05-31"
    );

    expect(snapshot.deliveryDate).toBe("2026-05-31");
  });

  it("converts missing or non-finite lat/lng to null", () => {
    const missingCoords = mapOrderToLearningOrderSnapshot(createRoutingTestOrder());
    const invalidCoords = mapOrderToLearningOrderSnapshot(
      createRoutingTestOrder({
        deliveryAddress: {
          ...createRoutingTestOrder().deliveryAddress,
          lat: Number.NaN,
          lng: Number.POSITIVE_INFINITY,
        },
      })
    );

    expect(missingCoords.lat).toBeNull();
    expect(missingCoords.lng).toBeNull();
    expect(invalidCoords.lat).toBeNull();
    expect(invalidCoords.lng).toBeNull();
  });

  it("handles missing optional fields without throwing", () => {
    const snapshot = mapOrderToLearningOrderSnapshot(
      createRoutingTestOrder({
        customer: {
          ...createRoutingTestOrder().customer,
          name: "",
          phone: "",
          area: "",
          specialInstructions: "",
        },
        deliveryAddress: {
          ...createRoutingTestOrder().deliveryAddress,
          unitNumber: "",
          buzzCode: "",
          formatted: "",
        },
        mealSummary: {
          ...createRoutingTestOrder().mealSummary,
          totalQuantity: Number.NaN,
        },
      })
    );

    expect(snapshot.customerName).toBeNull();
    expect(snapshot.customerPhone).toBeNull();
    expect(snapshot.formattedAddress).toBeNull();
    expect(snapshot.area).toBeNull();
    expect(snapshot.unitNumber).toBeNull();
    expect(snapshot.buzzCode).toBeNull();
    expect(snapshot.notes).toBeNull();
    expect(snapshot.totalMealQuantity).toBeNull();
  });

  it("does not include large raw order object by default", () => {
    const order = createRoutingTestOrder();
    const snapshot = mapOrderToLearningOrderSnapshot(order);

    expect(snapshot).not.toHaveProperty("raw");
    expect(snapshot).not.toHaveProperty("mongoId");
    expect(snapshot).not.toHaveProperty("customerEmail");
  });

  it("does not mutate input", () => {
    const order = createRoutingTestOrder();
    const before = structuredClone(order);

    mapOrderToLearningOrderSnapshot(order);

    expect(order).toEqual(before);
  });
});
