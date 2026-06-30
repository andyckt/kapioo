const mocks = vi.hoisted(() => {
  const session = {
    withTransaction: vi.fn(async (callback: () => Promise<void>) => callback()),
    endSession: vi.fn(),
  };

  return {
    session,
    startSession: vi.fn(async () => session),
    findBalanceMutationUser: vi.fn(),
  };
});

vi.mock("mongoose", () => ({
  default: {
    startSession: mocks.startSession,
  },
}));

vi.mock("@/lib/balances/mutations", () => ({
  findBalanceMutationUser: mocks.findBalanceMutationUser,
  applyBalanceMutations: vi.fn(),
}));

vi.mock("@/models/DailyDeliveryOrder", () => ({
  default: class DailyDeliveryOrder {},
}));

vi.mock("@/models/WeeklyOrder", () => ({
  default: class WeeklyOrder {},
}));

vi.mock("@/models/WeeklyEntitlementGroup", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/models/UserSubscription", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

import { placeDailyOrder } from "@/lib/orders/place-daily-order";
import { placeWeeklyOrder } from "@/lib/orders/place-weekly-order";

describe("order serviceability guards", () => {
  const verifiedRichmondHillWeeklyOnlyUser = {
    _id: "507f1f77bcf86cd799439011",
    role: "user",
    addressVerified: true,
    address: {
      streetAddress: "123 Main St",
      province: "Richmond Hill",
      postalCode: "L4Z 1A1",
    },
    addressGeo: {
      source: "google",
      placeId: "place-id",
      lat: 43.85,
      lng: -79.38,
      postalCode: "L4Z 1A1",
    },
    twoDishVoucher: 10,
    threeDishVoucher: 10,
    weeklySIXmeals: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findBalanceMutationUser.mockResolvedValue(verifiedRichmondHillWeeklyOnlyUser);
  });

  it("blocks new daily orders when the verified address is outside the daily postal zone", async () => {
    await expect(
      placeDailyOrder({
        userId: "507f1f77bcf86cd799439011",
        actor: { user: verifiedRichmondHillWeeklyOnlyUser as any, role: "user", sessionVersion: 1 },
        request: new Request("https://example.test"),
        data: {
          phoneNumber: "416-555-0100",
          area: "Richmond Hill",
          deliveryAddress: { streetAddress: "123 Main St", postalCode: "L4Z 1A1" },
          items: [
            {
              day: "monday",
              date: "2026-06-09",
              comboId: "c1",
              comboName: "Combo",
              type: "A",
              quantity: 1,
              voucherType: "twoDish",
              dishes: [],
            },
          ],
        },
      })
    ).rejects.toMatchObject({
      code: "DAILY_SERVICE_AREA_UNAVAILABLE",
      status: 403,
    });
  });

  it("allows the weekly guard for the same Richmond Hill postal zone", async () => {
    await expect(
      placeWeeklyOrder({
        userId: "507f1f77bcf86cd799439011",
        actor: { user: verifiedRichmondHillWeeklyOnlyUser as any, role: "user", sessionVersion: 1 },
        request: new Request("https://example.test"),
        orderItems: [],
        mealPlanType: "6aweek",
        shouldDeductVoucher: false,
        totalItems: 0,
        weeklyEntitlementGroupId: null,
        weeklyEntitlementTotalMeals: 0,
        splitDeliveryCount: 0,
        data: {
          phoneNumber: "416-555-0100",
          area: "Richmond Hill",
          deliveryAddress: { streetAddress: "123 Main St", postalCode: "L4Z 1A1" },
          specialInstructions: "",
          items: [],
        },
      })
    ).rejects.not.toMatchObject({
      code: "WEEKLY_SERVICE_AREA_UNAVAILABLE",
    });
  });
});
