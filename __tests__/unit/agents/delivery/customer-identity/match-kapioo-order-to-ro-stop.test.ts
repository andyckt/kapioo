import { formatRouteOptimizerCustomerName } from "@/lib/agents/delivery/customer-identity/format-route-optimizer-customer-name";
import { matchKapiooOrderToRoStop } from "@/lib/agents/delivery/customer-identity/match-kapioo-order-to-ro-stop";

describe("matchKapiooOrderToRoStop", () => {
  it("matches by exact order ID even when names differ", () => {
    const result = matchKapiooOrderToRoStop(
      { orderId: "DD-90000001", customerName: "Donald", phone: "4379891111" },
      { orderIds: ["DD-90000001"], customerName: "Someone Else-9999" }
    );

    expect(result).toMatchObject({
      matched: true,
      method: "order_id",
      confidence: "exact",
      kapiooOrderId: "DD-90000001",
      routeOptimizerOrderId: "DD-90000001",
    });
  });

  it("matches when orderIds array contains the Kapioo order ID", () => {
    const result = matchKapiooOrderToRoStop(
      { orderId: "DD-2", customerName: "Donald", phone: "4379891111" },
      { orderIds: ["DD-1", "DD-2"] }
    );

    expect(result.matched).toBe(true);
    expect(result.method).toBe("order_id");
    expect(result.routeOptimizerOrderId).toBe("DD-2");
  });

  it("matches by derived Donald-1111 name when order ID is missing", () => {
    const formatted = formatRouteOptimizerCustomerName({
      customerName: "Donald",
      phone: "4379891111",
    });

    const result = matchKapiooOrderToRoStop(
      { customerName: "Donald", phone: "4379891111" },
      { customerName: formatted.formattedName }
    );

    expect(result).toMatchObject({
      matched: true,
      method: "derived_route_optimizer_name",
      confidence: "high",
      derivedRouteOptimizerCustomerName: formatted.formattedName,
      normalizedKapiooRouteOptimizerName: formatted.normalizedFormattedName,
      normalizedRouteOptimizerCustomerName: formatted.normalizedFormattedName,
    });
  });

  it("matches derived names case-insensitively", () => {
    const formatted = formatRouteOptimizerCustomerName({
      customerName: "Donald",
      phone: "4379891111",
    });

    const result = matchKapiooOrderToRoStop(
      { customerName: "Donald", phone: "4379891111" },
      { name: formatted.formattedName.toUpperCase() }
    );

    expect(result.matched).toBe(true);
    expect(result.method).toBe("derived_route_optimizer_name");
  });

  it("matches derived names with extra spaces normalized away", () => {
    const formatted = formatRouteOptimizerCustomerName({
      customerName: "Donald   Cheung",
      phone: "4379891111",
    });

    const result = matchKapiooOrderToRoStop(
      { customerName: "Donald   Cheung", phone: "4379891111" },
      { customerName: `  ${formatted.formattedName}  ` }
    );

    expect(result.matched).toBe(true);
    expect(result.method).toBe("derived_route_optimizer_name");
  });

  it("matches Chinese name + last4 derived names", () => {
    const formatted = formatRouteOptimizerCustomerName({
      customerName: "王 小明",
      phone: "4165551234",
    });

    const result = matchKapiooOrderToRoStop(
      { customerName: "王 小明", phone: "4165551234" },
      { customerName: formatted.formattedName }
    );

    expect(result.matched).toBe(true);
    expect(result.method).toBe("derived_route_optimizer_name");
  });

  it("does not match when phone last4 is missing and only the bare name matches", () => {
    const result = matchKapiooOrderToRoStop(
      { customerName: "Donald", phone: "123" },
      { customerName: "Donald" }
    );

    expect(result).toMatchObject({
      matched: false,
      method: "none",
      confidence: "none",
      reason: "derived name missing phone suffix",
    });
  });

  it("does not match when order ID and derived name both differ", () => {
    const result = matchKapiooOrderToRoStop(
      { orderId: "DD-1", customerName: "Donald", phone: "4379891111" },
      { orderIds: ["DD-2"], customerName: "Alice-2222" }
    );

    expect(result.matched).toBe(false);
    expect(result.method).toBe("none");
    expect(result.reason).toContain("Order ID did not match");
  });

  it("does not match when both sides are missing identity", () => {
    const result = matchKapiooOrderToRoStop({}, {});

    expect(result).toMatchObject({
      matched: false,
      method: "none",
      confidence: "none",
      reason: "No order ID or customer identity available on either side.",
    });
  });

  it("includes useful debug fields on no-match results", () => {
    const formatted = formatRouteOptimizerCustomerName({
      customerName: "Donald",
      phone: "4379891111",
    });

    const result = matchKapiooOrderToRoStop(
      { customerName: "Donald", phone: "4379891111" },
      { customerName: "Alice-1111" }
    );

    expect(result.matched).toBe(false);
    expect(result.derivedRouteOptimizerCustomerName).toBe(formatted.formattedName);
    expect(result.normalizedKapiooRouteOptimizerName).toBe(formatted.normalizedFormattedName);
    expect(result.normalizedRouteOptimizerCustomerName).toBe("alice-1111");
    expect(result.reason).toBe("Derived Route Optimizer customer name did not match.");
  });
});
