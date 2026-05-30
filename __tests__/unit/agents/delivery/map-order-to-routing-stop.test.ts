import { mapOrderToRoutingStop } from "@/lib/agents/delivery/map-order-to-routing-stop";
import { createRoutingTestOrder } from "./test-fixtures";

describe("lib/agents/delivery/map-order-to-routing-stop", () => {
  it("maps DailyOrderBase to a Route Optimizer-ready stop shape", () => {
    const stop = mapOrderToRoutingStop(createRoutingTestOrder(), "2026-06-09");

    expect(stop.orderId).toBe("DD-90000001");
    expect(stop.customerName).toBe("Alice Customer");
    expect(stop.customerPhone).toBe("416-555-0100");
    expect(stop.formattedAddress).toContain("Downtown Toronto");
    expect(stop.deliveryDate).toBe("2026-06-09");
    expect(stop.deliveryWindow).toBe("11am – 1pm");
    expect(stop.mealSummary).toBe("Combo 1 (2 dishes) x2");
    expect(stop.totalMealQuantity).toBe(2);
    expect(stop.notes).toContain("Leave at door");
    expect(stop.notes).toContain("Buzz: 1234");
    expect(stop.routeOptimizer).toEqual({
      name: "Alice Customer",
      phone: "416-555-0100",
      address: stop.formattedAddress,
      notes: stop.notes,
      order_ids: ["DD-90000001"],
    });
  });
});
