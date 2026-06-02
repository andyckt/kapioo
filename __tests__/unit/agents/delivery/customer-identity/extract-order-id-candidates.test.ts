import {
  getRouteOptimizerOrderIdCandidates,
  normalizeOrderIdForMatch,
} from "@/lib/agents/delivery/customer-identity/extract-order-id-candidates";

describe("normalizeOrderIdForMatch", () => {
  it("trims string order IDs and preserves case", () => {
    expect(normalizeOrderIdForMatch(" DD-90000001 ")).toBe("DD-90000001");
  });

  it("converts numeric order IDs to strings", () => {
    expect(normalizeOrderIdForMatch(90000001)).toBe("90000001");
  });

  it("returns empty string for null, undefined, and empty input", () => {
    expect(normalizeOrderIdForMatch(null)).toBe("");
    expect(normalizeOrderIdForMatch(undefined)).toBe("");
    expect(normalizeOrderIdForMatch("")).toBe("");
  });
});

describe("getRouteOptimizerOrderIdCandidates", () => {
  it("includes single orderId and orderIds array values", () => {
    expect(
      getRouteOptimizerOrderIdCandidates({
        orderId: "DD-1",
        orderIds: ["DD-2", "DD-3"],
      })
    ).toEqual(["DD-1", "DD-2", "DD-3"]);
  });

  it("removes duplicates while preserving stable order", () => {
    expect(
      getRouteOptimizerOrderIdCandidates({
        orderId: "DD-1",
        orderIds: ["DD-1", "DD-2", "DD-2"],
      })
    ).toEqual(["DD-1", "DD-2"]);
  });

  it("ignores empty and null values", () => {
    expect(
      getRouteOptimizerOrderIdCandidates({
        orderId: null,
        orderIds: ["", "  ", "DD-4"],
      })
    ).toEqual(["DD-4"]);
  });

  it("handles numeric IDs in orderIds", () => {
    expect(
      getRouteOptimizerOrderIdCandidates({
        orderIds: [123, "DD-5"],
      })
    ).toEqual(["123", "DD-5"]);
  });
});
