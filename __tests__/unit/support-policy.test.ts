import { assertEligible, parseDeliveryDate } from "@/lib/self-service/eligibility";
import { planCard, recommendPlans } from "@/lib/support/products";
import { readAttribution, signAttribution } from "@/lib/support/attribution";
import { budgetMonth } from "@/lib/support/budget";
import { snapshotScheduledDate } from "@/lib/orders/scheduled-date";
import { isBeforeChangeDeadline } from "@/lib/self-service/deadline";

describe("customer support policy", () => {
  const order = { status: "pending", items: [{ date: "2026-07-20" }] };
  const cutoff = { hour: 11, minute: 59 };
  it("uses Toronto time and disallows the exact cutoff", () => {
    expect(() => assertEligible(order, cutoff, new Date("2026-07-19T15:58:59Z"))).not.toThrow();
    expect(() => assertEligible(order, cutoff, new Date("2026-07-19T15:59:00Z"))).toThrow(/deadline/);
    expect(() => assertEligible({ ...order, items: [{ date: "2026-01-20" }] }, cutoff, new Date("2026-01-19T16:59:00Z"))).toThrow(/deadline/);
  });
  it("handles DST and year boundaries with calendar days", () => {
    expect(() => assertEligible({ ...order, items: [{ date: "2026-03-09" }] }, cutoff, new Date("2026-03-08T15:58:59Z"))).not.toThrow();
    expect(() => assertEligible({ ...order, items: [{ date: "2027-01-01" }] }, cutoff, new Date("2026-12-31T16:59:00Z"))).toThrow();
    expect(budgetMonth(new Date("2026-10-01T02:00:00Z"))).toBe("2026-09");
  });
  it.each([
    ["2026-07-19", "2026-07-19T15:59:00Z"],
    ["2026-01-19", "2026-01-19T16:59:00Z"],
    ["2026-03-08", "2026-03-08T15:59:00Z"],
    ["2026-11-01", "2026-11-01T16:59:00Z"],
  ])("hides client actions at the Toronto cutoff on %s", (day, instant) => {
    const deadline = `${day} 11:59:00 America/Toronto`;
    expect(isBeforeChangeDeadline(deadline, new Date(Date.parse(instant) - 1))).toBe(true);
    expect(isBeforeChangeDeadline(deadline, new Date(instant))).toBe(false);
    expect(isBeforeChangeDeadline(null, new Date(instant))).toBe(false);
  });
  it("rejects ambiguous/invalid dates and all dispatched or terminal states", () => {
    expect(parseDeliveryDate("April 14")).toBeNull();
    expect(parseDeliveryDate("2026-02-30")).toBeNull();
    expect(parseDeliveryDate("April 14, 2026")).toBe("2026-04-14");
    for (const status of ["delivery", "delivered", "cancelled", "refunded", "unknown"]) expect(() => assertEligible({ ...order, status }, cutoff, new Date("2026-01-01"))).toThrow();
    expect(() => assertEligible({ ...order, deliveryDispatch: {} }, cutoff, new Date("2026-01-01"))).toThrow();
  });
  it("quotes active plans using delivery fees and tax and excludes unsupported plans", () => {
    const card = planCard("weekly-6x1", { area: "Hamilton", coverage: { canDaily: false, canWeekly: true } }, "en")!;
    expect(card.mealSubtotal).toBe(112); expect(card.deliveryFee).toBe(15.99); expect(card.tax).toBe(16.64); expect(card.total).toBe(144.63);
    expect(planCard("daily-2dish-6", { coverage: { canDaily: false, canWeekly: true } }, "en")).toBeNull();
    expect(planCard("invented-plan", {}, "en")).toBeNull();
    expect(planCard("weekly-6x1", {}, "en")?.total).toBeNull();
  });
  it("asks one missing preference at a time, including Chinese", () => {
    expect(recommendPlans({}, "en").ask).toBe("address");
    const location = { area: "North York", coverage: { canDaily: true, canWeekly: true } };
    expect(recommendPlans(location, "zh").ask).toBe("kind");
    expect(recommendPlans({ ...location, kind: "weekly" }, "en").ask).toBe("meals");
    expect(recommendPlans({ ...location, kind: "weekly", meals: 6 }, "en").ask).toBe("budget");
    expect(recommendPlans({ ...location, kind: "weekly", meals: 6, budget: 0 }, "en").cards[0].planId).toBe("weekly-6x1");
  });
  it("rejects altered and expired attribution cookies", () => {
    const value = { conversationId: "1234567890abcdef12345678", planId: "weekly-6x1", at: Date.now() };
    expect(readAttribution(signAttribution(value))).toEqual(value);
    expect(readAttribution(signAttribution(value) + "x")).toBeNull();
    expect(readAttribution(signAttribution({ ...value, at: Date.now() - 8 * 86400_000 }))).toBeNull();
  });
  it("snapshots only a current published schedule, including a new year", () => {
    expect(snapshotScheduledDate("January 4", new Date("2026-12-28T12:00:00Z"))).toBe("2027-01-04");
    expect(snapshotScheduledDate("April 14", new Date("2026-12-28T12:00:00Z"))).toBeUndefined();
    expect(() => assertEligible({ status: "pending", items: [{ date: "July 20", deliveryDateISO: "2026-07-20" }] }, cutoff, new Date("2026-07-19T15:58:59Z"))).not.toThrow();
  });
});
