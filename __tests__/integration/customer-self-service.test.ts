import { setupTestDb, clearCollections, teardownTestDb } from "../helpers/db";
import { createTestUser } from "../helpers/factories";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import WeeklyOrder from "@/models/WeeklyOrder";
import WeeklyEntitlementGroup from "@/models/WeeklyEntitlementGroup";
import CustomerOrderChange from "@/models/CustomerOrderChange";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import Settings from "@/models/Settings";
import { previewChange, confirmChange } from "@/lib/self-service/service";
import { placeWeeklyOrder } from "@/lib/orders/place-weekly-order";
import { resolveEffectiveOrderCustomerInfo } from "@/lib/orders/effective-customer-info";
import type { AuthenticatedActor } from "@/lib/api";
import * as coverageRules from "@/lib/zones/service-areas";

vi.mock("@/lib/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
const { resolveAddressMock } = vi.hoisted(() => ({ resolveAddressMock: vi.fn() }));
vi.mock("@/lib/self-service/address", () => ({ resolveAddress: resolveAddressMock }));

function actor(user: any): AuthenticatedActor { return { user, role: "user", sessionVersion: 1 }; }
const req = new Request("http://localhost:3000/api/self-service/confirm");
const future = "2090-06-20";
async function daily(userId: unknown, orderId = "DD-12345678", extra: object = {}) {
  return DailyDeliveryOrder.create({ userId, orderId, status: "pending", items: [{ day: "Monday", date: future, comboId: "combo", comboName: "Chicken", type: "A", quantity: 2, voucherType: "twoDish" }], voucherCost: { twoDish: 2, threeDish: 0 }, deliveryAddress: { streetAddress: "Old street", province: "North York", postalCode: "M2N 5X1", unitNumber: "123", buzzCode: "456", lat: 43.7, lng: -79.4 }, orderCustomerOverride: { deliveryAddress: { streetAddress: "Override street", unitNumber: "789", buzzCode: "999" }, name: "Keep this name" }, ...extra });
}
async function group(userId: unknown) {
  await WeeklyEntitlementGroup.create({ userId, groupId: "group-test", mealPlanType: "6aweek", voucherCountUsed: 1, totalMealsForWeek: 6, splitDeliveryCount: 2 });
  for (const [index, date] of [future, "2090-06-22"].entries()) await WeeklyOrder.create({ userId, orderId: `WS-1234567${index}`, status: "pending", weeklyEntitlementGroupId: "group-test", mealPlanType: "6aweek", voucherDeducted: index === 0, creditCost: 3, allocatedMealCount: 3, items: [{ dayId: index ? "tuesday" : "sunday", optionId: "meal", optionName: "Meal", quantity: 3, date }], area: "North York", deliveryAddress: { streetAddress: "Street", province: "North York", postalCode: "M2N 5X1", country: "Canada" }, phoneNumber: "1234567890" });
}
describe("transactional customer self-service", () => {
  beforeAll(async () => { await setupTestDb(); await Promise.all([DailyDeliveryOrder.init(), WeeklyOrder.init(), WeeklyEntitlementGroup.init(), CustomerOrderChange.init(), Transaction.init()]); });
  beforeEach(async () => { await clearCollections(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  afterAll(teardownTestDb);
  it("cancels and restores daily vouchers once even for concurrent confirmations", async () => {
    const user = await createTestUser({ twoDishVoucher: 0 }); await daily(user._id);
    const preview = await previewChange({ action: "cancel", order: { kind: "daily", orderId: "DD-12345678" } }, actor(user));
    await Promise.all([confirmChange(preview.operationId!, actor(user), req), confirmChange(preview.operationId!, actor(user), req)]);
    expect((await User.findById(user._id))?.twoDishVoucher).toBe(2);
    expect(await Transaction.countDocuments({ type: "refund" })).toBe(1);
    expect((await DailyDeliveryOrder.findOne({ orderId: "DD-12345678" }))?.status).toBe("refunded");
  });
  it("prevents another customer previewing or confirming the change", async () => {
    const user = await createTestUser(), other = await createTestUser(); await daily(user._id);
    await expect(previewChange({ action: "cancel", order: { kind: "daily", orderId: "DD-12345678" } }, actor(other))).rejects.toThrow("not found");
    const preview = await previewChange({ action: "cancel", order: { kind: "daily", orderId: "DD-12345678" } }, actor(user));
    await expect(confirmChange(preview.operationId!, actor(other), req)).rejects.toThrow("not found");
  });
  it("cancels the entire weekly group and restores only its original voucher", async () => {
    const user = await createTestUser({ weeklySIXmeals: 0 }); await group(user._id);
    const preview = await previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345671" } }, actor(user));
    expect(preview.orders).toHaveLength(2); expect(preview.refunds[0].amount).toBe(1);
    await confirmChange(preview.operationId!, actor(user), req);
    expect(await WeeklyOrder.countDocuments({ status: "refunded" })).toBe(2);
    expect((await WeeklyEntitlementGroup.findOne({ groupId: "group-test" }))?.refundedAt).toBeTruthy();
    expect((await User.findById(user._id))?.weeklySIXmeals).toBe(1);
    await expect(placeWeeklyOrder({ userId: String(user._id), data: { items: [] } as any, orderItems: [], mealPlanType: "6aweek", shouldDeductVoucher: true, totalItems: 3, weeklyEntitlementGroupId: "group-test", weeklyEntitlementTotalMeals: 6, splitDeliveryCount: 2, actor: actor(user), request: req })).rejects.toThrow(/cancelled/);
    expect((await User.findById(user._id))?.weeklySIXmeals).toBe(1);
  });
  it("restores legacy credits once and rejects uncertain group allocation", async () => {
    const user = await createTestUser({ credits: 0 }); await group(user._id);
    await WeeklyEntitlementGroup.updateOne({ groupId: "group-test" }, { $set: { mealPlanType: "legacy", voucherCountUsed: 0 } });
    await WeeklyOrder.updateMany({}, { $set: { mealPlanType: "legacy" } });
    await WeeklyOrder.updateOne({ orderId: "WS-12345670" }, { $set: { allocatedMealCount: 4 } });
    await expect(previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345670" } }, actor(user))).rejects.toThrow(/allocation/);
    await WeeklyOrder.updateOne({ orderId: "WS-12345670" }, { $set: { allocatedMealCount: 3 } });
    const preview = await previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345670" } }, actor(user));
    expect(preview.refunds).toEqual([{ field: "credits", amount: 3 }]);
    await confirmChange(preview.operationId!, actor(user), req); await confirmChange(preview.operationId!, actor(user), req);
    expect((await User.findById(user._id))?.credits).toBe(3);
  });
  it("cancels unchanged weekly records whose older meal items have no stored IDs", async () => {
    const user = await createTestUser({ weeklySIXmeals: 0 }); await group(user._id);
    await WeeklyOrder.collection.updateMany({}, { $unset: { "items.0._id": "" } });
    const input = { action: "cancel" as const, order: { kind: "weekly" as const, orderId: "WS-12345671" } };
    const first = await previewChange(input, actor(user));
    const second = await previewChange(input, actor(user));
    expect((await CustomerOrderChange.findById(first.operationId))?.snapshot).toBe((await CustomerOrderChange.findById(second.operationId))?.snapshot);
    await confirmChange(second.operationId!, actor(user), req);
    await confirmChange(second.operationId!, actor(user), req);
    expect(await WeeklyOrder.countDocuments({ status: "refunded" })).toBe(2);
    expect((await User.findById(user._id))?.weeklySIXmeals).toBe(1);
    expect(await Transaction.countDocuments({ type: "refund" })).toBe(1);
  });
  it("rejects mixed delivery coverage before making any address changes", async () => {
    const user = await createTestUser(); await daily(user._id); await group(user._id);
    resolveAddressMock.mockResolvedValue({ address: { streetAddress: "Hamilton address", province: "Hamilton", postalCode: "L8P 1A1", country: "Canada" }, addressGeo: { placeId: "outside-daily", lat: 43.256, lng: -79.87, postalCode: "L8P 1A1" }, coverage: { canDaily: false, canWeekly: true } });
    await expect(previewChange({ action: "address", orders: [{ kind: "daily", orderId: "DD-12345678" }, { kind: "weekly", orderId: "WS-12345670" }], address: { placeId: "outside-daily", unitNumber: "", buzzCode: "" }, saveForFuture: false }, actor(user))).rejects.toThrow(/outside/);
    expect(await CustomerOrderChange.countDocuments()).toBe(0);
  });
  it.each([
    { name: "overlap supports both", kinds: ["daily", "weekly"], lat: 43.65, lng: -79.39, postal: "M5V 1J1", allowed: true },
    { name: "weekly-only supports weekly", kinds: ["weekly"], lat: 43.256, lng: -79.87, postal: "L8H 1A1", allowed: true },
    { name: "weekly-only rejects daily", kinds: ["daily"], lat: 43.256, lng: -79.87, postal: "L8H 1A1", allowed: false },
    { name: "weekly-only rejects a mixed selection", kinds: ["daily", "weekly"], lat: 43.256, lng: -79.87, postal: "L8H 1A1", allowed: false },
    // Synthetic mismatched postcode verifies daily eligibility cannot grant weekly access.
    { name: "daily polygon does not override weekly postal restrictions", kinds: ["weekly"], lat: 43.65, lng: -79.39, postal: "A1A 1A1", allowed: false },
    { name: "daily eligibility is independent of the weekly list", kinds: ["daily"], lat: 43.65, lng: -79.39, postal: "A1A 1A1", allowed: true },
    { name: "no service rejects both", kinds: ["daily", "weekly"], lat: 47.56, lng: -52.71, postal: "A1A 1A1", allowed: false },
    { name: "missing daily coordinates never fall back to a city name", kinds: ["daily"], lat: undefined, lng: undefined, postal: "M5V 1J1", allowed: false },
    { name: "missing weekly postcode never falls back to a city name", kinds: ["weekly"], lat: 43.65, lng: -79.39, postal: "", allowed: false },
  ])("strict address coverage: $name", async ({ kinds, lat, lng, postal, allowed }) => {
    const user = await createTestUser(); await daily(user._id); await group(user._id);
    resolveAddressMock.mockResolvedValue({ address: { streetAddress: "Coverage test address", province: "Downtown Toronto", postalCode: postal, country: "Canada" }, addressGeo: { placeId: "coverage-test", lat, lng, postalCode: postal }, coverage: { canDaily: true, canWeekly: true } });
    const input = { action: "address" as const, orders: kinds.map(kind => ({ kind: kind as "daily" | "weekly", orderId: kind === "daily" ? "DD-12345678" : "WS-12345670" })), address: { placeId: "coverage-test", unitNumber: "", buzzCode: "" }, saveForFuture: false };
    if (allowed) {
      const preview = await previewChange(input, actor(user));
      await confirmChange(preview.operationId!, actor(user), req);
      if (kinds.includes("daily")) expect((await DailyDeliveryOrder.findOne({ orderId: "DD-12345678" }))?.deliveryAddress?.streetAddress).toBe("Coverage test address");
      if (kinds.includes("weekly")) expect((await WeeklyOrder.findOne({ orderId: "WS-12345670" }))?.deliveryAddress?.streetAddress).toBe("Coverage test address");
    } else {
      await expect(previewChange(input, actor(user))).rejects.toMatchObject({ code: "ADDRESS_OUTSIDE_COVERAGE" });
      expect(await CustomerOrderChange.countDocuments()).toBe(0);
      expect((await DailyDeliveryOrder.findOne({ orderId: "DD-12345678" }))?.deliveryAddress?.streetAddress).toBe("Old street");
      expect((await WeeklyOrder.findOne({ orderId: "WS-12345670" }))?.deliveryAddress?.streetAddress).toBe("Street");
    }
    expect((await User.findById(user._id))?.address?.streetAddress).toBe(user.address?.streetAddress);
  });
  it("rechecks current coverage at confirmation and changes nothing if one service is no longer covered", async () => {
    const user = await createTestUser(); await daily(user._id); await group(user._id);
    resolveAddressMock.mockResolvedValue({ address: { streetAddress: "New address", province: "Downtown Toronto", postalCode: "M5V 1J1", country: "Canada" }, addressGeo: { placeId: "coverage-test", lat: 43.65, lng: -79.39, postalCode: "M5V 1J1" } });
    const preview = await previewChange({ action: "address", orders: [{ kind: "daily", orderId: "DD-12345678" }, { kind: "weekly", orderId: "WS-12345670" }], address: { placeId: "coverage-test", unitNumber: "", buzzCode: "" }, saveForFuture: true }, actor(user));
    const actual = coverageRules.resolveServiceability;
    vi.spyOn(coverageRules, "resolveServiceability").mockImplementation(input => ({ ...actual(input), canWeekly: false }));
    await expect(confirmChange(preview.operationId!, actor(user), req)).rejects.toMatchObject({ code: "ADDRESS_OUTSIDE_COVERAGE" });
    expect((await DailyDeliveryOrder.findOne({ orderId: "DD-12345678" }))?.deliveryAddress?.streetAddress).toBe("Old street");
    expect((await WeeklyOrder.findOne({ orderId: "WS-12345670" }))?.deliveryAddress?.streetAddress).toBe("Street");
    expect((await User.findById(user._id))?.address?.streetAddress).toBe(user.address?.streetAddress);
    expect((await CustomerOrderChange.findById(preview.operationId))?.state).toBe("preview");
  });
  it("still rejects genuine item changes without relying on generated item IDs or timestamps", async () => {
    const user = await createTestUser(); await group(user._id);
    await WeeklyOrder.collection.updateMany({}, { $unset: { "items.0._id": "" } });
    const preview = await previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345671" } }, actor(user));
    await WeeklyOrder.collection.updateOne({ orderId: "WS-12345670" }, { $set: { "items.0.optionName": "Changed meal" } });
    await expect(confirmChange(preview.operationId!, actor(user), req)).rejects.toMatchObject({ code: "REVIEW_CHANGED" });
    expect(await Transaction.countDocuments({ type: "refund" })).toBe(0);
  });
  it("rejects incomplete or partially fulfilled groups without restoring anything", async () => {
    const user = await createTestUser(); await group(user._id);
    await WeeklyOrder.updateOne({ orderId: "WS-12345670" }, { $set: { status: "delivered" } });
    await expect(previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345671" } }, actor(user))).rejects.toThrow();
    await WeeklyOrder.deleteOne({ orderId: "WS-12345670" });
    await expect(previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345671" } }, actor(user))).rejects.toThrow(/incomplete/);
    expect(await Transaction.countDocuments()).toBe(0);
  });
  it.each(["pending", "confirmed"])("blocks cancelling the future member when the first delivery has passed but still says %s", async status => {
    const user = await createTestUser({ weeklySIXmeals: 0 }); await group(user._id);
    await WeeklyOrder.updateMany({}, { $set: { status } });
    vi.useFakeTimers({ toFake: ["Date"] });
    // June 20 has passed; June 22 has not reached its own cutoff.
    vi.setSystemTime(new Date("2090-06-21T14:00:00Z"));
    await expect(previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345671" } }, actor(user))).rejects.toThrow(/deadline/);
    expect(await CustomerOrderChange.countDocuments()).toBe(0);
    expect(await Transaction.countDocuments({ type: "refund" })).toBe(0);
    expect((await User.findById(user._id))?.weeklySIXmeals).toBe(0);
    expect(await WeeklyOrder.countDocuments({ status })).toBe(2);
    expect((await WeeklyEntitlementGroup.findOne({ groupId: "group-test" }))?.refundedAt).toBeFalsy();
  });
  it("rechecks the earliest group cutoff at confirmation even when all statuses are unchanged", async () => {
    const user = await createTestUser({ weeklySIXmeals: 0 }); await group(user._id);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2090-06-19T15:58:59Z")); // 11:58:59 Toronto
    const preview = await previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345671" } }, actor(user));
    expect(preview.groupCutoff).toBe("2090-06-19 11:59:00 America/Toronto");
    vi.setSystemTime(new Date("2090-06-19T15:59:00Z")); // Exact group cutoff
    await expect(confirmChange(preview.operationId!, actor(user), req)).rejects.toThrow(/deadline/);
    expect((await CustomerOrderChange.findById(preview.operationId))?.state).toBe("preview");
    expect(await Transaction.countDocuments({ type: "refund" })).toBe(0);
    expect((await User.findById(user._id))?.weeklySIXmeals).toBe(0);
    expect(await WeeklyOrder.countDocuments({ status: "pending" })).toBe(2);
    expect((await WeeklyEntitlementGroup.findOne({ groupId: "group-test" }))?.refundedAt).toBeFalsy();
  });
  it("uses the earliest delivery date rather than order IDs or the selected member", async () => {
    const user = await createTestUser(); await group(user._id);
    await WeeklyOrder.updateOne({ orderId: "WS-12345670" }, { $set: { "items.0.date": "2090-06-22" } });
    await WeeklyOrder.updateOne({ orderId: "WS-12345671" }, { $set: { "items.0.date": "2090-06-20" } });
    const preview = await previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345670" } }, actor(user));
    expect(preview.groupCutoff).toBe("2090-06-19 11:59:00 America/Toronto");
  });
  it("rejects stale order and cutoff previews", async () => {
    const user = await createTestUser(); await daily(user._id);
    const preview = await previewChange({ action: "cancel", order: { kind: "daily", orderId: "DD-12345678" } }, actor(user));
    await DailyDeliveryOrder.updateOne({ orderId: "DD-12345678" }, { $set: { status: "delivery" } });
    await expect(confirmChange(preview.operationId!, actor(user), req)).rejects.toThrow();
    expect(await Transaction.countDocuments()).toBe(0);
    await DailyDeliveryOrder.updateOne({ orderId: "DD-12345678" }, { $set: { status: "pending" } });
    const newer = await previewChange({ action: "cancel", order: { kind: "daily", orderId: "DD-12345678" } }, actor(user));
    await Settings.create({ key: "cancellationTime", value: { hour: 10, minute: 0 } });
    await expect(confirmChange(newer.operationId!, actor(user), req)).rejects.toThrow(/changed/);
  });
  it("rolls back balances when any order write fails", async () => {
    const user = await createTestUser({ twoDishVoucher: 0 }); await daily(user._id);
    const preview = await previewChange({ action: "cancel", order: { kind: "daily", orderId: "DD-12345678" } }, actor(user));
    const spy = vi.spyOn(DailyDeliveryOrder, "updateOne").mockRejectedValueOnce(new Error("write failed"));
    await expect(confirmChange(preview.operationId!, actor(user), req)).rejects.toThrow("write failed"); spy.mockRestore();
    expect((await User.findById(user._id))?.twoDishVoucher).toBe(0); expect(await Transaction.countDocuments()).toBe(0);
    expect((await CustomerOrderChange.findById(preview.operationId))?.state).toBe("preview");
  });
  it("changes selected addresses atomically, clears old overrides and optionally saves profile", async () => {
    const user = await createTestUser(); await daily(user._id); await daily(user._id, "DD-12345679");
    resolveAddressMock.mockResolvedValue({ address: { streetAddress: "5100 Yonge St", province: "North York", postalCode: "M2N 5V7", country: "Canada", unitNumber: "", buzzCode: "" }, addressGeo: { placeId: "verified", lat: 43.767, lng: -79.412, postalCode: "M2N 5V7", source: "google" }, coverage: { canDaily: true, canWeekly: true } });
    const preview = await previewChange({ action: "address", orders: [{ kind: "daily", orderId: "DD-12345678" }], address: { placeId: "verified", unitNumber: "", buzzCode: "" }, saveForFuture: true }, actor(user));
    await confirmChange(preview.operationId!, actor(user), req);
    const saved = await DailyDeliveryOrder.findOne({ orderId: "DD-12345678" });
    expect(saved?.deliveryAddress?.unitNumber).toBe(""); expect(saved?.deliveryAddress?.lat).toBe(43.767);
    expect(saved?.orderCustomerOverride?.deliveryAddress?.streetAddress).toBeUndefined(); expect(saved?.orderCustomerOverride?.name).toBe("Keep this name");
    expect(resolveEffectiveOrderCustomerInfo(saved!).deliveryAddress.streetAddress).toBe("5100 Yonge St");
    expect((await DailyDeliveryOrder.findOne({ orderId: "DD-12345679" }))?.deliveryAddress?.streetAddress).toBe("Old street");
    expect((await User.findById(user._id))?.address?.streetAddress).toBe("5100 Yonge St");
  });
  it("rolls back every selected address when a concurrent write changes one delivery", async () => {
    const user = await createTestUser(); await daily(user._id); await daily(user._id, "DD-12345679");
    resolveAddressMock.mockResolvedValue({ address: { streetAddress: "5100 Yonge St", province: "North York", postalCode: "M2N 5V7", country: "Canada" }, addressGeo: { placeId: "verified", lat: 43.767, lng: -79.412, postalCode: "M2N 5V7" }, coverage: { canDaily: true, canWeekly: true } });
    const preview = await previewChange({ action: "address", orders: [{ kind: "daily", orderId: "DD-12345678" }, { kind: "daily", orderId: "DD-12345679" }], address: { placeId: "verified", unitNumber: "", buzzCode: "" }, saveForFuture: false }, actor(user));
    const original = DailyDeliveryOrder.updateOne.bind(DailyDeliveryOrder); let writes = 0;
    const spy = vi.spyOn(DailyDeliveryOrder, "updateOne").mockImplementation((...args: any[]) => { if (++writes === 2) throw new Error("concurrent write"); return (original as any)(...args); });
    await expect(confirmChange(preview.operationId!, actor(user), req)).rejects.toThrow("concurrent write"); spy.mockRestore();
    expect(await DailyDeliveryOrder.countDocuments({ "deliveryAddress.streetAddress": "Old street" })).toBe(2);
    expect((await User.findById(user._id))?.address?.streetAddress).toBe(user.address?.streetAddress);
  });
  it("uses the separate cancellation time for previews and confirmation, including the earliest weekly delivery", async () => {
    const user = await createTestUser({ twoDishVoucher: 0, weeklySIXmeals: 0 }); await daily(user._id); await group(user._id);
    await Settings.create([{ key: "cutoffTime", value: { hour: 8, minute: 0 } }, { key: "cancellationTime", value: { hour: 14, minute: 0 } }]);
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2090-06-19T16:00:00Z"));
    const d = await previewChange({ action: "cancel", order: { kind: "daily", orderId: "DD-12345678" } }, actor(user));
    const w = await previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345671" } }, actor(user));
    expect(d.orders[0].cutoff).toBe("2090-06-19 14:00:00 America/Toronto");
    expect(w.groupCutoff).toBe("2090-06-19 14:00:00 America/Toronto");
    // An ordering-only edit must not invalidate a reviewed cancellation.
    await Settings.updateOne({ key: "cutoffTime" }, { $set: { value: { hour: 7, minute: 0 } } });
    await confirmChange(d.operationId!, actor(user), req);
    await confirmChange(w.operationId!, actor(user), req);
    expect((await User.findById(user._id))?.twoDishVoucher).toBe(2);
    expect((await User.findById(user._id))?.weeklySIXmeals).toBe(1);
  });
  it("blocks cancellation at its earlier deadline while address changes still use ordering time", async () => {
    const user = await createTestUser(); await daily(user._id); await group(user._id);
    await Settings.create({ key: "cancellationTime", value: { hour: 8, minute: 0 } });
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2090-06-19T12:00:00Z"));
    await expect(previewChange({ action: "cancel", order: { kind: "daily", orderId: "DD-12345678" } }, actor(user))).rejects.toThrow(/deadline/);
    await expect(previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345671" } }, actor(user))).rejects.toThrow(/deadline/);
    resolveAddressMock.mockResolvedValue({ address: { streetAddress: "5100 Yonge St", province: "North York", postalCode: "M2N 5V7", country: "Canada" }, addressGeo: { placeId: "verified", lat: 43.767, lng: -79.412, postalCode: "M2N 5V7" }, coverage: { canDaily: true, canWeekly: true } });
    const p = await previewChange({ action: "address", orders: [{ kind: "daily", orderId: "DD-12345678" }], address: { placeId: "verified", unitNumber: "", buzzCode: "" }, saveForFuture: false }, actor(user));
    expect(p.orders[0].cutoff).toBe("2090-06-19 11:59:00 America/Toronto");
    await Settings.updateOne({ key: "cancellationTime" }, { $set: { value: { hour: 7, minute: 0 } } });
    await confirmChange(p.operationId!, actor(user), req);
    expect(await Transaction.countDocuments({ type: "refund" })).toBe(0);
  });
  it("rechecks the separate cancellation deadline when confirming a weekly group", async () => {
    const user = await createTestUser(); await group(user._id);
    await Settings.create({ key: "cancellationTime", value: { hour: 8, minute: 0 } });
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2090-06-19T11:59:59Z"));
    const p = await previewChange({ action: "cancel", order: { kind: "weekly", orderId: "WS-12345671" } }, actor(user));
    vi.setSystemTime(new Date("2090-06-19T12:00:00Z"));
    await expect(confirmChange(p.operationId!, actor(user), req)).rejects.toThrow(/deadline/);
    expect(await Transaction.countDocuments({ type: "refund" })).toBe(0);
    expect(await WeeklyOrder.countDocuments({ status: "pending" })).toBe(2);
  });

});
