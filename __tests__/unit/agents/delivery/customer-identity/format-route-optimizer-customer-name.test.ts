import { formatRouteOptimizerCustomerName } from "@/lib/agents/delivery/customer-identity/format-route-optimizer-customer-name";

describe("formatRouteOptimizerCustomerName", () => {
  it("formats Donald + 4379891111 as Donald-1111", () => {
    const result = formatRouteOptimizerCustomerName({
      customerName: "Donald",
      phone: "4379891111",
    });

    expect(result.formattedName).toBe("Donald-1111");
    expect(result.normalizedFormattedName).toBe("donald-1111");
    expect(result.sourceName).toBe("Donald");
    expect(result.last4PhoneDigits).toBe("1111");
    expect(result.hasUsablePhoneLast4).toBe(true);
  });

  it("formats using formatted phone input", () => {
    const result = formatRouteOptimizerCustomerName({
      name: "Donald",
      customerPhone: "(437) 989-1111",
    });

    expect(result.formattedName).toBe("Donald-1111");
    expect(result.normalizedFormattedName).toBe("donald-1111");
  });

  it("normalizes uppercase source names in normalizedFormattedName", () => {
    const result = formatRouteOptimizerCustomerName({
      customerName: "DONALD",
      phone: "4379891111",
    });

    expect(result.formattedName).toBe("DONALD-1111");
    expect(result.normalizedFormattedName).toBe("donald-1111");
  });

  it("supports Chinese names with phone suffix", () => {
    const result = formatRouteOptimizerCustomerName({
      customerName: "王 小明",
      phone: "4165551234",
    });

    expect(result.formattedName).toBe("王 小明-1234");
    expect(result.normalizedFormattedName).toBe("王 小明-1234");
    expect(result.hasUsablePhoneLast4).toBe(true);
  });

  it("returns name only when phone has fewer than 4 digits", () => {
    const result = formatRouteOptimizerCustomerName({
      customerName: "Donald",
      phone: "123",
    });

    expect(result.formattedName).toBe("Donald");
    expect(result.normalizedFormattedName).toBe("donald");
    expect(result.hasUsablePhoneLast4).toBe(false);
    expect(result.last4PhoneDigits).toBe("");
  });

  it("returns unknown-last4 when name is missing but phone has last4", () => {
    const result = formatRouteOptimizerCustomerName({
      phone: "4379891111",
    });

    expect(result.formattedName).toBe("unknown-1111");
    expect(result.normalizedFormattedName).toBe("unknown-1111");
    expect(result.sourceName).toBe("");
    expect(result.hasUsablePhoneLast4).toBe(true);
  });

  it("returns empty values when both name and phone are missing", () => {
    const result = formatRouteOptimizerCustomerName({});

    expect(result.formattedName).toBe("");
    expect(result.normalizedFormattedName).toBe("");
    expect(result.sourceName).toBe("");
    expect(result.hasUsablePhoneLast4).toBe(false);
  });
});
