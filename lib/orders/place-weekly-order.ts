import mongoose from "mongoose";

import { ApiError } from "@/lib/api/errors";
import type { AuthenticatedActor } from "@/lib/api/types";
import { isAddressVerified } from "@/lib/address/is-verified";
import {
  applyBalanceMutations,
  type BalanceMutationEntry,
  findBalanceMutationUser,
} from "@/lib/balances/mutations";
import type { WeeklySubscriptionUserOrderBody } from "@/lib/contracts/weekly-subscription";
import { toWeeklyPlanId } from "@/lib/plans/service";
import WeeklyEntitlementGroup from "@/models/WeeklyEntitlementGroup";
import WeeklyOrder, { type IWeeklyOrder } from "@/models/WeeklyOrder";
import type { ITransaction } from "@/models/Transaction";
import UserSubscription, { type IUserSubscription } from "@/models/UserSubscription";
import type { IUser } from "@/models/User";

type WeeklyOrderItemInput = {
  dayId: string;
  optionId: string;
  optionName: string;
  quantity: number;
  date: string;
};

export class InsufficientWeeklyEntitlementError extends Error {
  status: number;
  requiredCredits: number;
  availableCredits: number;
  mealPlanType: string;

  constructor({
    requiredCredits,
    availableCredits,
    mealPlanType,
  }: {
    requiredCredits: number;
    availableCredits: number;
    mealPlanType: string;
  }) {
    super("Not enough meal plans");
    this.name = "InsufficientWeeklyEntitlementError";
    this.status = 400;
    this.requiredCredits = requiredCredits;
    this.availableCredits = availableCredits;
    this.mealPlanType = mealPlanType;
  }
}

export interface PlaceWeeklyOrderParams {
  userId: string;
  data: WeeklySubscriptionUserOrderBody;
  orderItems: WeeklyOrderItemInput[];
  mealPlanType: string;
  shouldDeductVoucher: boolean;
  totalItems: number;
  weeklyEntitlementGroupId: string | null;
  weeklyEntitlementTotalMeals: number;
  splitDeliveryCount: number;
  actor: AuthenticatedActor;
  request: Request;
}

export interface PlaceWeeklyOrderResult {
  order: IWeeklyOrder;
  subscription: IUserSubscription;
  updatedUser: IUser;
  transaction: ITransaction | null;
}

function getAvailableWeeklyBalance(user: IUser, mealPlanType: string) {
  if (mealPlanType === "6aweek") {
    return Number(user.weeklySIXmeals) || 0;
  }
  if (mealPlanType === "8aweek") {
    return Number(user.weeklyEIGHTmeals) || 0;
  }
  if (mealPlanType === "10aweek") {
    return Number(user.weeklyTENmeals) || 0;
  }
  if (mealPlanType === "12aweek") {
    return Number(user.weeklyTWELVEmeals) || 0;
  }
  if (mealPlanType === "16aweek") {
    return Number(user.weeklySIXTEENmeals) || 0;
  }
  return Number(user.credits) || 0;
}

function buildWeeklyBalanceMutation(
  mealPlanType: string,
  totalItems: number
): BalanceMutationEntry {
  if (mealPlanType === "6aweek") {
    return { field: "weeklySIXmeals", amount: 1, operation: "deduct" };
  }
  if (mealPlanType === "8aweek") {
    return { field: "weeklyEIGHTmeals", amount: 1, operation: "deduct" };
  }
  if (mealPlanType === "10aweek") {
    return { field: "weeklyTENmeals", amount: 1, operation: "deduct" };
  }
  if (mealPlanType === "12aweek") {
    return { field: "weeklyTWELVEmeals", amount: 1, operation: "deduct" };
  }
  if (mealPlanType === "16aweek") {
    return { field: "weeklySIXTEENmeals", amount: 1, operation: "deduct" };
  }
  return { field: "credits", amount: totalItems, operation: "deduct" };
}

function getRequiredWeeklyBalanceAmount(mealPlanType: string, totalItems: number) {
  return mealPlanType === "legacy" ? totalItems : 1;
}

async function ensureWeeklyEntitlementGroup(params: {
  user: IUser;
  weeklyEntitlementGroupId: string;
  mealPlanType: string;
  weeklyEntitlementTotalMeals: number;
  splitDeliveryCount: number;
  session: mongoose.ClientSession;
}) {
  const {
    user,
    weeklyEntitlementGroupId,
    mealPlanType,
    weeklyEntitlementTotalMeals,
    splitDeliveryCount,
    session,
  } = params;

  const validateExistingGroup = (group: {
    userId: unknown;
    mealPlanType: unknown;
    totalMealsForWeek: unknown;
  }) => {
    if (String(group.userId) !== String(user._id)) {
      throw new ApiError("Weekly entitlement group belongs to a different user", {
        status: 409,
        code: "WEEKLY_ENTITLEMENT_GROUP_USER_MISMATCH",
      });
    }

    if (String(group.mealPlanType) !== String(mealPlanType)) {
      throw new ApiError("Weekly entitlement group meal plan type mismatch", {
        status: 409,
        code: "WEEKLY_ENTITLEMENT_GROUP_PLAN_MISMATCH",
      });
    }

    if (Number(group.totalMealsForWeek) !== weeklyEntitlementTotalMeals) {
      throw new ApiError("Weekly entitlement group total meals mismatch", {
        status: 409,
        code: "WEEKLY_ENTITLEMENT_GROUP_TOTAL_MISMATCH",
      });
    }
  };

  const existingGroup = await WeeklyEntitlementGroup.findOne({
    groupId: weeklyEntitlementGroupId,
  }).session(session);

  if (existingGroup) {
    validateExistingGroup(existingGroup);
    return existingGroup;
  }

  try {
    const createdGroup = new WeeklyEntitlementGroup({
      userId: user._id,
      groupId: weeklyEntitlementGroupId,
      mealPlanType,
      voucherCountUsed: mealPlanType === "legacy" ? 0 : 1,
      totalMealsForWeek: weeklyEntitlementTotalMeals,
      splitDeliveryCount,
    });
    await createdGroup.save({ session });
    return createdGroup;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === 11000
    ) {
      const concurrentGroup = await WeeklyEntitlementGroup.findOne({
        groupId: weeklyEntitlementGroupId,
      }).session(session);
      if (!concurrentGroup) {
        throw error;
      }
      validateExistingGroup(concurrentGroup);
      return concurrentGroup;
    }
    throw error;
  }
}

async function saveWeeklyOrderWithUniqueId(params: {
  user: IUser;
  orderItems: WeeklyOrderItemInput[];
  mealPlanType: string;
  shouldDeductVoucher: boolean;
  totalItems: number;
  weeklyEntitlementGroupId: string | null;
  data: WeeklySubscriptionUserOrderBody;
  session: mongoose.ClientSession;
}) {
  const {
    user,
    orderItems,
    mealPlanType,
    shouldDeductVoucher,
    totalItems,
    weeklyEntitlementGroupId,
    data,
    session,
  } = params;
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000);
    const orderId = `WS-${randomNumbers}`;

    try {
      const order = new WeeklyOrder({
        userId: user._id,
        orderId,
        items: orderItems,
        status: "pending",
        creditCost: totalItems,
        mealPlanType,
        voucherDeducted: shouldDeductVoucher,
        weeklyEntitlementGroupId: weeklyEntitlementGroupId || undefined,
        allocatedMealCount: totalItems,
        specialInstructions: data.specialInstructions || "",
        deliveryAddress: data.deliveryAddress || {},
        phoneNumber: data.phoneNumber || "",
        area: data.area || "",
      });
      await order.save({ session });
      return order;
    } catch (error) {
      lastError = error;
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === 11000
      ) {
        continue;
      }
      throw error;
    }
  }

  const details =
    lastError instanceof Error ? lastError.message : "Unable to generate a unique weekly order id";
  throw new ApiError("Failed to create weekly order", {
    status: 500,
    code: "WEEKLY_ORDER_CREATE_FAILED",
    details,
  });
}

async function upsertActiveSubscription(params: {
  user: IUser;
  data: WeeklySubscriptionUserOrderBody;
  session: mongoose.ClientSession;
}) {
  const { user, data, session } = params;
  const existingSubscription = await UserSubscription.findOne({
    userId: user._id,
    status: "active",
  }).session(session);

  if (existingSubscription) {
    existingSubscription.items = data.items.map((item) => ({
      dayId: item.dayId,
      optionId: item.optionId,
      quantity: item.quantity,
    }));
    await existingSubscription.save({ session });
    return existingSubscription;
  }

  const subscription = new UserSubscription({
    userId: user._id,
    items: data.items,
    status: "active",
    specialInstructions: data.specialInstructions || "",
    deliveryAddress: data.deliveryAddress || {},
    phoneNumber: data.phoneNumber || "",
    area: data.area || "",
  });
  await subscription.save({ session });
  return subscription;
}

export async function placeWeeklyOrder({
  userId,
  data,
  orderItems,
  mealPlanType,
  shouldDeductVoucher,
  totalItems,
  weeklyEntitlementGroupId,
  weeklyEntitlementTotalMeals,
  splitDeliveryCount,
  actor,
  request,
}: PlaceWeeklyOrderParams): Promise<PlaceWeeklyOrderResult> {
  const session = await mongoose.startSession();

  try {
    let result: PlaceWeeklyOrderResult | null = null;

    await session.withTransaction(async () => {
      const user = await findBalanceMutationUser(userId, session);
      if (!user) {
        throw new ApiError("User not found", { status: 404, code: "USER_NOT_FOUND" });
      }

      if (!isAddressVerified(user)) {
        throw new ApiError("Please verify your delivery address before placing an order", {
          status: 403,
          code: "ADDRESS_VERIFICATION_REQUIRED",
        });
      }

      if (weeklyEntitlementGroupId) {
        await ensureWeeklyEntitlementGroup({
          user,
          weeklyEntitlementGroupId,
          mealPlanType,
          weeklyEntitlementTotalMeals,
          splitDeliveryCount,
          session,
        });
      }

      if (data.phoneNumber?.trim()) {
        user.phone = data.phoneNumber.trim();
      }

      const order = await saveWeeklyOrderWithUniqueId({
        user,
        orderItems,
        mealPlanType,
        shouldDeductVoucher,
        totalItems,
        weeklyEntitlementGroupId,
        data,
        session,
      });
      const subscription = await upsertActiveSubscription({ user, data, session });

      let transaction: ITransaction | null = null;

      if (shouldDeductVoucher) {
        const availableBalance = getAvailableWeeklyBalance(user, mealPlanType);
        const requiredBalance = getRequiredWeeklyBalanceAmount(mealPlanType, totalItems);

        if (availableBalance < requiredBalance) {
          throw new InsufficientWeeklyEntitlementError({
            requiredCredits: requiredBalance,
            availableCredits: availableBalance,
            mealPlanType,
          });
        }

        const balanceMutation = buildWeeklyBalanceMutation(mealPlanType, totalItems);
        const balanceResult = await applyBalanceMutations({
          user,
          mutations: [balanceMutation],
          description: `Placed weekly order ${order.orderId}`,
          transactionType: "Deduct",
          session,
          actor,
          request,
          auditAction: "weekly-order.place",
          auditTargetType: "weekly-order",
          auditTargetId: order.orderId,
          auditMetadata: {
            orderId: order.orderId,
            mealPlanType,
            deductedAmount: requiredBalance,
            allocatedMealCount: totalItems,
            weeklyPlanId:
              mealPlanType === "legacy"
                ? null
                : toWeeklyPlanId(Number(String(mealPlanType).replace("aweek", "")), 1),
          },
        });
        transaction = balanceResult.transaction;
      } else if (data.phoneNumber?.trim()) {
        await user.save({ session });
      }

      result = {
        order,
        subscription,
        updatedUser: user,
        transaction,
      };
    });

    if (!result) {
      throw new ApiError("Failed to place weekly order", {
        status: 500,
        code: "WEEKLY_ORDER_TRANSACTION_EMPTY",
      });
    }

    return result;
  } finally {
    await session.endSession();
  }
}
