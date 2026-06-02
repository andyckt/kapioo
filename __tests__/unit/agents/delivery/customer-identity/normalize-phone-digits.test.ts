import {
  getLast4PhoneDigits,
  normalizePhoneDigits,
} from "@/lib/agents/delivery/customer-identity/normalize-phone-digits";

describe("normalizePhoneDigits", () => {
  it("returns digits only for a normal 10-digit phone", () => {
    expect(normalizePhoneDigits("4379891111")).toBe("4379891111");
  });

  it("strips formatting characters", () => {
    expect(normalizePhoneDigits("(437) 989-1111")).toBe("4379891111");
  });

  it("preserves country code digits", () => {
    expect(normalizePhoneDigits("+1 437 989 1111")).toBe("14379891111");
  });

  it("includes extension digits", () => {
    expect(normalizePhoneDigits(" 437-989-1111 ext 22 ")).toBe("437989111122");
  });

  it("returns empty string for null, undefined, and empty input", () => {
    expect(normalizePhoneDigits(null)).toBe("");
    expect(normalizePhoneDigits(undefined)).toBe("");
    expect(normalizePhoneDigits("")).toBe("");
    expect(normalizePhoneDigits("   ")).toBe("");
  });
});

describe("getLast4PhoneDigits", () => {
  it("returns the last 4 digits when enough digits exist", () => {
    expect(getLast4PhoneDigits("4379891111")).toBe("1111");
    expect(getLast4PhoneDigits("(437) 989-1111")).toBe("1111");
  });

  it("returns empty string when fewer than 4 digits exist", () => {
    expect(getLast4PhoneDigits("123")).toBe("");
    expect(getLast4PhoneDigits("")).toBe("");
    expect(getLast4PhoneDigits(null)).toBe("");
  });
});
