import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db";
import { createTestUser } from "../helpers/factories";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import WeeklyOrder from "@/models/WeeklyOrder";
import WeeklyEntitlementGroup from "@/models/WeeklyEntitlementGroup";
import Settings from "@/models/Settings";
import { getOrderActionAvailability } from "@/lib/self-service/action-availability";
import { isBeforeChangeDeadline } from "@/lib/self-service/deadline";

const { requireUserMock } = vi.hoisted(() => ({ requireUserMock: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: requireUserMock, requireAdminMfa: vi.fn() }));
vi.mock("@/lib/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
import { GET as dailyHistory } from "@/app/api/daily-delivery/order/route";
import { GET as dailyDetail } from "@/app/api/daily-delivery/order/[id]/route";
import { GET as weeklyHistory } from "@/app/api/weekly-subscription/user/history/route";
import { GET as weeklyDetail } from "@/app/api/weekly-orders/[id]/route";

async function seed() {
  const user = await createTestUser();
  requireUserMock.mockResolvedValue({ actor: { user, role: "user", sessionVersion: 1 }, response: null });
  const daily = await DailyDeliveryOrder.create({
    userId: user._id, orderId: "DD-CUTOFF01", status: "confirmed",
    items: [{ day: "Monday", date: "2090-06-20", comboId: "combo", comboName: "Chicken", type: "A", quantity: 2, voucherType: "twoDish" }],
    voucherCost: { twoDish: 2, threeDish: 0 },
  });
  await WeeklyEntitlementGroup.create({ userId: user._id, groupId: "cutoff-group", mealPlanType: "6aweek", voucherCountUsed: 1, totalMealsForWeek: 6, splitDeliveryCount: 2 });
  for (const [index, date] of ["2090-06-20", "2090-06-22"].entries()) {
    await WeeklyOrder.create({
      userId: user._id, orderId: `WS-CUTOFF0${index}`, status: "confirmed",
      weeklyEntitlementGroupId: "cutoff-group", mealPlanType: "6aweek",
      voucherDeducted: index === 0, creditCost: 3, allocatedMealCount: 3,
      items: [{ dayId: index ? "tuesday" : "sunday", optionId: "meal", optionName: "Meal", quantity: 3, date }],
      area: "North York", deliveryAddress: { streetAddress: "Street", province: "North York", postalCode: "M2N 5X1", country: "Canada" },
      phoneNumber: "1234567890", createdAt: new Date(`2089-01-0${index + 1}T12:00:00Z`),
    });
  }
  return { user, daily };
}

describe("order history action deadlines", () => {
  beforeAll(setupTestDb);
  beforeEach(clearCollections);
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  afterAll(teardownTestDb);

  it("returns matching daily list/detail deadlines and hides both at the exact cutoff with confirmed status", async () => {
    const { user } = await seed();
    vi.useFakeTimers({ toFake: ["Date"] });
    const list = async () => {
      const response = await dailyHistory(new Request(`http://localhost/api/daily-delivery/order?userId=${user._id}`));
      expect(response.status).toBe(200);
      return (await response.json()).data.orders[0];
    };
    const detail = async () => {
      const response = await dailyDetail(new Request("http://localhost"), { params: Promise.resolve({ id: "DD-CUTOFF01" }) });
      expect(response.status).toBe(200);
      return (await response.json()).data;
    };
    vi.setSystemTime(new Date("2090-06-19T15:58:59Z"));
    const before = (await list()).selfService;
    expect(before).toEqual({ addressUntil: "2090-06-19 11:59:00 America/Toronto", cancelUntil: "2090-06-19 11:59:00 America/Toronto" });
    expect((await detail()).selfService).toEqual(before);
    vi.setSystemTime(new Date("2090-06-19T15:59:00Z"));
    expect(isBeforeChangeDeadline(before.cancelUntil)).toBe(false); // Already-open page.
    for (const order of [await list(), await detail()]) {
      expect(order.status).toBe("confirmed");
      expect(order.selfService).toEqual({ addressUntil: null, cancelUntil: null });
    }
  });

  it("uses the earlier weekly delivery outside the displayed page while retaining a future address change", async () => {
    const { user } = await seed();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2090-06-19T15:58:59Z"));
    const list = async () => {
      const response = await weeklyHistory(new Request(`http://localhost/api/weekly-subscription/user/history?userId=${user._id}&limit=1&page=1`));
      expect(response.status).toBe(200);
      return (await response.json()).data.orders[0];
    };
    const detail = async () => {
      const response = await weeklyDetail(new Request("http://localhost"), { params: Promise.resolve({ id: "WS-CUTOFF01" }) });
      expect(response.status).toBe(200);
      return (await response.json()).data;
    };
    const before = await list();
    expect(before.orderId).toBe("WS-CUTOFF01");
    expect(before.selfService).toEqual({ addressUntil: "2090-06-21 11:59:00 America/Toronto", cancelUntil: "2090-06-19 11:59:00 America/Toronto" });
    expect((await detail()).selfService).toEqual(before.selfService);
    vi.setSystemTime(new Date("2090-06-19T15:59:00Z"));
    expect(isBeforeChangeDeadline(before.selfService.cancelUntil)).toBe(false);
    expect(isBeforeChangeDeadline(before.selfService.addressUntil)).toBe(true);
    for (const order of [await list(), await detail()]) {
      expect(order.status).toBe("confirmed");
      expect(order.selfService).toEqual({ addressUntil: before.selfService.addressUntil, cancelUntil: null });
    }
    vi.setSystemTime(new Date("2090-06-21T15:59:00Z"));
    expect((await detail()).selfService).toEqual({ addressUntil: null, cancelUntil: null });
  });

  it.each(["cancelled", "refunded", "delivered"])("keeps both actions hidden for %s orders", async status => {
    const { daily } = await seed();
    await DailyDeliveryOrder.updateOne({ _id: daily._id }, { $set: { status } });
    const orders = await DailyDeliveryOrder.find();
    const result = await getOrderActionAvailability(orders, "daily", new Date("2090-01-01"));
    expect(result.get(daily.orderId)).toEqual({ addressUntil: null, cancelUntil: null });
  });

  it("hides cancellation for incomplete weekly groups and uncertain dates", async () => {
    await seed();
    await WeeklyOrder.deleteOne({ orderId: "WS-CUTOFF00" });
    const remaining = await WeeklyOrder.find();
    expect((await getOrderActionAvailability(remaining, "weekly", new Date("2090-01-01"))).get("WS-CUTOFF01")?.cancelUntil).toBeNull();
    await WeeklyOrder.updateOne({ orderId: "WS-CUTOFF01" }, { $set: { "items.0.date": "June 22" } });
    expect((await getOrderActionAvailability(await WeeklyOrder.find(), "weekly", new Date("2090-01-01"))).get("WS-CUTOFF01")).toEqual({ addressUntil: null, cancelUntil: null });
  });

  it("keeps cancellation available when only the ordering cutoff is invalid", async () => {
    const { daily } = await seed();
    await Settings.create({ key: "cutoffTime", value: { hour: 10, minute: 30 } });
    expect((await getOrderActionAvailability([daily], "daily", new Date("2090-06-19T14:30:00Z"))).get(daily.orderId)?.addressUntil).toBeNull();
    await Settings.updateOne({ key: "cutoffTime" }, { $set: { value: { hour: 25, minute: 0 } } });
    expect((await getOrderActionAvailability([daily], "daily", new Date("2090-01-01"))).get(daily.orderId)).toEqual({ addressUntil: null, cancelUntil: "2090-06-19 11:59:00 America/Toronto" });
  });
  it("keeps daily and weekly cancellation open after ordering closes when the cancellation deadline is later", async () => {
    const { daily } = await seed();
    await Settings.create([{ key: "cutoffTime", value: { hour: 8, minute: 0 } }, { key: "cancellationTime", value: { hour: 14, minute: 0 } }]);
    const now = new Date("2090-06-19T16:00:00Z"); // noon Toronto
    expect((await getOrderActionAvailability([daily], "daily", now)).get(daily.orderId)).toEqual({ addressUntil: null, cancelUntil: "2090-06-19 14:00:00 America/Toronto" });
    const weekly = await getOrderActionAvailability(await WeeklyOrder.find(), "weekly", now);
    expect(weekly.get("WS-CUTOFF00")).toEqual({ addressUntil: null, cancelUntil: "2090-06-19 14:00:00 America/Toronto" });
    expect(weekly.get("WS-CUTOFF01")).toEqual({ addressUntil: "2090-06-21 08:00:00 America/Toronto", cancelUntil: "2090-06-19 14:00:00 America/Toronto" });
    const closed = await getOrderActionAvailability(await WeeklyOrder.find(), "weekly", new Date("2090-06-19T18:00:00Z"));
    expect(closed.get("WS-CUTOFF01")?.cancelUntil).toBeNull();
  });
  it("closes cancellation earlier without closing address changes", async () => {
    const { daily } = await seed();
    await Settings.create({ key: "cancellationTime", value: { hour: 8, minute: 0 } });
    const now = new Date("2090-06-19T12:00:00Z");
    expect((await getOrderActionAvailability([daily], "daily", now)).get(daily.orderId)).toEqual({ addressUntil: "2090-06-19 11:59:00 America/Toronto", cancelUntil: null });
    expect((await getOrderActionAvailability(await WeeklyOrder.find(), "weekly", now)).get("WS-CUTOFF01")?.cancelUntil).toBeNull();
  });
  it("fails closed only for cancellation when its setting is invalid", async () => {
    const { daily } = await seed();
    await Settings.create({ key: "cancellationTime", value: { hour: 25, minute: 0 } });
    expect((await getOrderActionAvailability([daily], "daily", new Date("2090-01-01"))).get(daily.orderId)).toEqual({ addressUntil: "2090-06-19 11:59:00 America/Toronto", cancelUntil: null });
    expect((await getOrderActionAvailability(await WeeklyOrder.find(), "weekly", new Date("2090-01-01"))).get("WS-CUTOFF01")?.cancelUntil).toBeNull();
  });

});
