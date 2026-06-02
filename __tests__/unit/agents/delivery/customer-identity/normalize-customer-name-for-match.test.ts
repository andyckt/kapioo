import { normalizeCustomerNameForMatch } from "@/lib/agents/delivery/customer-identity/normalize-customer-name-for-match";

describe("normalizeCustomerNameForMatch", () => {
  it("trims leading and trailing spaces", () => {
    expect(normalizeCustomerNameForMatch(" Donald  ")).toBe("donald");
  });

  it("collapses repeated whitespace", () => {
    expect(normalizeCustomerNameForMatch("Donald   Cheung")).toBe("donald cheung");
  });

  it("lowercases English characters", () => {
    expect(normalizeCustomerNameForMatch("DONALD")).toBe("donald");
  });

  it("preserves Chinese characters", () => {
    expect(normalizeCustomerNameForMatch(" 王 小明 ")).toBe("王 小明");
  });

  it("returns empty string for null, undefined, and empty input", () => {
    expect(normalizeCustomerNameForMatch(null)).toBe("");
    expect(normalizeCustomerNameForMatch(undefined)).toBe("");
    expect(normalizeCustomerNameForMatch("")).toBe("");
    expect(normalizeCustomerNameForMatch("   ")).toBe("");
  });
});
