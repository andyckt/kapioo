import mongoose from "mongoose";

import type { AuthenticatedActor } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { isAddressVerified } from "@/lib/address/is-verified";
import {
  applyBalanceMutations,
  findBalanceMutationUser,
  type BalanceMutationEntry,
} from "@/lib/balances/mutations";
import type { CreateDailyOrderBody, CreateDailyOrderItemInput } from "@/lib/contracts/daily-order";
import { hasDailyBalance } from "@/lib/address/daily-eligibility";
import { canDeliverDaily } from "@/lib/zones/service-areas";
import DailyDeliveryOrder, { type IDailyDeliveryOrder } from "@/models/DailyDeliveryOrder";
import type { ITransaction } from "@/models/Transaction";
import type { IUser } from "@/models/User";

type VoucherTotals = {
  twoDish: number;
  threeDish: number;
};

type DailyOrderDocument = mongoose.HydratedDocument<IDailyDeliveryOrder>;

export class InsufficientDailyVouchersError extends Error {
  status: number;
  required: VoucherTotals;
  available: VoucherTotals;

  constructor(required: VoucherTotals, available: VoucherTotals) {
    super("Insufficient vouchers");
    this.name = "InsufficientDailyVouchersError";
    this.status = 400;
    this.required = required;
    this.available = available;
  }
}

export interface PlaceDailyOrderParams {
  userId: string;
  data: CreateDailyOrderBody;
  actor: AuthenticatedActor;
  request: Request;
}

export interface PlaceDailyOrderResult {
  order: DailyOrderDocument;
  updatedUser: IUser;
  transaction: ITransaction | null;
}

function countRequiredVouchers(items: CreateDailyOrderItemInput[]): VoucherTotals {
  return items.reduce<VoucherTotals>(
    (totals, item) => {
      if (item.voucherType === "twoDish") {
        totals.twoDish += Number(item.quantity ?? 0);
      } else if (item.voucherType === "threeDish") {
        totals.threeDish += Number(item.quantity ?? 0);
      }
      return totals;
    },
    { twoDish: 0, threeDish: 0 }
  );
}

function buildItemsToSave(items: CreateDailyOrderItemInput[]) {
  return items.map((item) => ({
    day: String(item.day ?? ""),
    date: String(item.date ?? ""),
    comboId: String(item.comboId ?? ""),
    comboName: String(item.comboName ?? ""),
    type: String(item.type ?? ""),
    quantity: Number(item.quantity ?? 0),
    voucherType: String(item.voucherType ?? ""),
    dishes: Array.isArray(item.dishes) ? item.dishes : [],
  }));
}

function buildVoucherMutations(vouchersNeeded: VoucherTotals): BalanceMutationEntry[] {
  const mutations: BalanceMutationEntry[] = [];

  if (vouchersNeeded.twoDish > 0) {
    mutations.push({
      field: "twoDishVoucher",
      amount: vouchersNeeded.twoDish,
      operation: "deduct",
    });
  }

  if (vouchersNeeded.threeDish > 0) {
    mutations.push({
      field: "threeDishVoucher",
      amount: vouchersNeeded.threeDish,
      operation: "deduct",
    });
  }

  return mutations;
}

async function saveDailyOrderWithUniqueId(
  user: IUser,
  data: CreateDailyOrderBody,
  vouchersNeeded: VoucherTotals,
  session: mongoose.ClientSession
): Promise<DailyOrderDocument> {
  const itemsToSave = buildItemsToSave(data.items);
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000);
    const orderId = `DD-${randomNumbers}`;

    try {
      const order = new DailyDeliveryOrder({
        userId: user._id,
        orderId,
        items: itemsToSave,
        status: "pending",
        voucherCost: vouchersNeeded,
        taxIncluded: data.taxIncluded ?? true,
        taxRate: data.taxRate ?? 0.13,
        specialInstructions: data.specialInstructions ?? "",
        deliveryAddress: data.deliveryAddress ?? {},
        phoneNumber: data.phoneNumber ?? "",
        area: data.area ?? "",
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
    lastError instanceof Error ? lastError.message : "Unable to generate a unique daily order id";
  throw new ApiError("Failed to create order", {
    status: 500,
    code: "DAILY_ORDER_CREATE_FAILED",
    details,
  });
}

export async function placeDailyOrder({
  userId,
  data,
  actor,
  request,
}: PlaceDailyOrderParams): Promise<PlaceDailyOrderResult> {
  const session = await mongoose.startSession();

  try {
    let result: PlaceDailyOrderResult | null = null;

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

      if (!canDeliverDaily({ lat: user.addressGeo?.lat, lng: user.addressGeo?.lng }, user.address?.province) && !hasDailyBalance(user)) {
        throw new ApiError("Daily delivery is not available at this address", {
          status: 403,
          code: "DAILY_SERVICE_AREA_UNAVAILABLE",
        });
      }

      const vouchersNeeded = countRequiredVouchers(data.items);
      const available = {
        twoDish: Number(user.twoDishVoucher) || 0,
        threeDish: Number(user.threeDishVoucher) || 0,
      };

      if (
        available.twoDish < vouchersNeeded.twoDish ||
        available.threeDish < vouchersNeeded.threeDish
      ) {
        throw new InsufficientDailyVouchersError(vouchersNeeded, available);
      }

      const trimmedPhoneNumber = String(data.phoneNumber ?? "").trim();
      if (trimmedPhoneNumber) {
        user.phone = trimmedPhoneNumber;
      }

      const order = await saveDailyOrderWithUniqueId(user, data, vouchersNeeded, session);

      const voucherMutations = buildVoucherMutations(vouchersNeeded);
      const balanceResult =
        voucherMutations.length > 0
          ? await applyBalanceMutations({
              user,
              mutations: voucherMutations,
              description: `Placed daily order ${order.orderId}`,
              transactionType: "Deduct",
              session,
              actor,
              request,
              auditAction: "daily-order.place",
              auditTargetType: "daily-order",
              auditTargetId: order.orderId,
              auditMetadata: {
                userId: String(user._id),
                orderId: order.orderId,
                voucherCost: vouchersNeeded,
              },
            })
          : { user, transaction: null };

      if (voucherMutations.length === 0 && trimmedPhoneNumber) {
        await user.save({ session });
      }

      result = {
        order,
        updatedUser: balanceResult.user as IUser,
        transaction: balanceResult.transaction,
      };
    });

    if (!result) {
      throw new ApiError("Failed to create order", {
        status: 500,
        code: "DAILY_ORDER_TRANSACTION_EMPTY",
      });
    }

    return result;
  } finally {
    await session.endSession();
  }
}
