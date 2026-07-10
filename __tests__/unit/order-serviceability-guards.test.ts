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

/**
 * Outside the daily polygon (lat 44.1 is far north) AND outside the weekly FSA list.
 * Uses postal code A1A (Newfoundland) — confirmed not in WEEKLY_FSA_LIST.
 */
const baseOutsideUser = {
  _id: "507f1f77bcf86cd799439011",
  role: "user",
  addressVerified: true,
  address: {
    streetAddress: "123 Main St",
    province: "St. John's",
    postalCode: "A1A 1A1",
  },
  addressGeo: {
    source: "google",
    placeId: "place-id",
    // Far north of both interim polygons — outside the global daily zone
    lat: 44.1,
    lng: -79.4,
    postalCode: "A1A 1A1",
  },
};

const zeroBalanceUser = { ...baseOutsideUser, twoDishVoucher: 0, threeDishVoucher: 0, weeklySIXmeals: 0 };
const balanceHolderUser = { ...baseOutsideUser, twoDishVoucher: 5, threeDishVoucher: 3, weeklySIXmeals: 4 };

const dailyOrderData = {
  phoneNumber: "416-555-0100",
  area: "St. John's",
  deliveryAddress: { streetAddress: "123 Main St", postalCode: "A1A 1A1" },
  items: [
    {
      day: "monday",
      date: "2026-06-09",
      comboId: "c1",
      comboName: "Combo",
      type: "A",
      quantity: 1,
      voucherType: "twoDish" as const,
      dishes: [],
    },
  ],
};

const weeklyOrderArgs = {
  userId: "507f1f77bcf86cd799439011",
  request: new Request("https://example.test"),
  orderItems: [],
  mealPlanType: "6aweek" as const,
  shouldDeductVoucher: false,
  totalItems: 0,
  weeklyEntitlementGroupId: null,
  weeklyEntitlementTotalMeals: 0,
  splitDeliveryCount: 0,
  data: {
    phoneNumber: "416-555-0100",
    area: "St. John's",
    deliveryAddress: { streetAddress: "123 Main St", postalCode: "A1A 1A1" },
    specialInstructions: "",
    items: [],
  },
};

describe("order serviceability guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("zero-balance user outside service area", () => {
    beforeEach(() => {
      mocks.findBalanceMutationUser.mockResolvedValue(zeroBalanceUser);
    });

    it("blocks daily order when address is outside polygon and no daily vouchers", async () => {
      await expect(
        placeDailyOrder({
          userId: "507f1f77bcf86cd799439011",
          actor: { user: zeroBalanceUser as any, role: "user", sessionVersion: 1 },
          request: new Request("https://example.test"),
          data: dailyOrderData,
        })
      ).rejects.toMatchObject({ code: "DAILY_SERVICE_AREA_UNAVAILABLE", status: 403 });
    });

    it("blocks weekly order when address is outside FSA list and no weekly vouchers", async () => {
      await expect(
        placeWeeklyOrder({
          ...weeklyOrderArgs,
          actor: { user: zeroBalanceUser as any, role: "user", sessionVersion: 1 },
        })
      ).rejects.toMatchObject({ code: "WEEKLY_SERVICE_AREA_UNAVAILABLE" });
    });
  });

  describe("balance holder outside service area (legacy voucher use-up)", () => {
    beforeEach(() => {
      mocks.findBalanceMutationUser.mockResolvedValue(balanceHolderUser);
    });

    it("allows daily order when outside polygon but user still has daily vouchers", async () => {
      await expect(
        placeDailyOrder({
          userId: "507f1f77bcf86cd799439011",
          actor: { user: balanceHolderUser as any, role: "user", sessionVersion: 1 },
          request: new Request("https://example.test"),
          data: dailyOrderData,
        })
      ).rejects.not.toMatchObject({ code: "DAILY_SERVICE_AREA_UNAVAILABLE" });
    });

    it("allows weekly order when outside FSA list but user still has weekly vouchers", async () => {
      await expect(
        placeWeeklyOrder({
          ...weeklyOrderArgs,
          actor: { user: balanceHolderUser as any, role: "user", sessionVersion: 1 },
        })
      ).rejects.not.toMatchObject({ code: "WEEKLY_SERVICE_AREA_UNAVAILABLE" });
    });
  });
});
