import { normalizeRouteOptimizerCustomerNameForMatch } from "@/lib/agents/delivery/customer-identity/normalize-route-optimizer-customer-name-for-match";

describe("normalizeRouteOptimizerCustomerNameForMatch", () => {
  it("normalizes spaced and cased Route Optimizer customer names", () => {
    expect(normalizeRouteOptimizerCustomerNameForMatch(" Donald-1111 ")).toBe("donald-1111");
  });

  it("preserves Chinese characters in Route Optimizer names", () => {
    expect(normalizeRouteOptimizerCustomerNameForMatch(" 王 小明-1234 ")).toBe("王 小明-1234");
  });
});
