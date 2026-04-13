import mongoose from "mongoose";

import { ApiError } from "@/lib/api/errors";
import type { AuthenticatedActor } from "@/lib/api/types";
import { applyBalanceMutations } from "@/lib/balances/mutations";
import DailyDeliveryOrder, { type IDailyDeliveryOrder } from "@/models/DailyDeliveryOrder";
import type { ITransaction } from "@/models/Transaction";
import User from "@/models/User";

type DailyOrderDocument = mongoose.HydratedDocument<IDailyDeliveryOrder>;

type DailyRefundMutationResult = {
  originalOrder: DailyOrderDocument;
  updatedOrder: DailyOrderDocument;
  refundedTransaction: ITransaction | null;
};

type DailyDeleteMutationResult = {
  deletedOrder: DailyOrderDocument;
  refundedTransaction: ITransaction | null;
};

type BaseDailyAdminMutationParams = {
  orderId: string;
  actor: AuthenticatedActor;
  request: Request;
};

export interface RefundDailyOrderParams extends BaseDailyAdminMutationParams {}

export interface DeleteDailyOrderParams extends BaseDailyAdminMutationParams {
  returnVouchers: boolean;
}

function buildRefundMutations(order: IDailyDeliveryOrder) {
  const mutations = [];

  if ((order.voucherCost?.twoDish || 0) > 0) {
    mutations.push({
      field: "twoDishVoucher" as const,
      amount: order.voucherCost.twoDish,
      operation: "add" as const,
    });
  }

  if ((order.voucherCost?.threeDish || 0) > 0) {
    mutations.push({
      field: "threeDishVoucher" as const,
      amount: order.voucherCost.threeDish,
      operation: "add" as const,
    });
  }

  return mutations;
}

async function refundDailyOrderVouchers(
  order: IDailyDeliveryOrder,
  actor: AuthenticatedActor,
  request: Request,
  session: mongoose.ClientSession
) {
  const mutations = buildRefundMutations(order);
  if (mutations.length === 0) {
    return null;
  }

  const user = await User.findById(order.userId).session(session);
  if (!user) {
    throw new ApiError("User not found for daily order refund", {
      status: 404,
      code: "DAILY_ORDER_REFUND_USER_NOT_FOUND",
    });
  }

  const { transaction } = await applyBalanceMutations({
    user,
    mutations,
    description: `Refunded daily order ${order.orderId}`,
    transactionType: "refund",
    session,
    actor,
    request,
    auditAction: "daily-order.refund",
    auditTargetType: "daily-order",
    auditTargetId: order.orderId,
    auditMetadata: {
      orderId: order.orderId,
      voucherCost: order.voucherCost,
    },
  });

  return transaction;
}

export async function refundDailyOrder({
  orderId,
  actor,
  request,
}: RefundDailyOrderParams): Promise<DailyRefundMutationResult> {
  const session = await mongoose.startSession();

  try {
    let result: DailyRefundMutationResult | null = null;

    await session.withTransaction(async () => {
      const order = await DailyDeliveryOrder.findOne({ orderId }).session(session);
      if (!order) {
        throw new ApiError("Order not found", { status: 404, code: "DAILY_ORDER_NOT_FOUND" });
      }

      const originalOrder = order;
      let refundedTransaction: ITransaction | null = null;

      if (order.status !== "refunded") {
        refundedTransaction = await refundDailyOrderVouchers(order, actor, request, session);
      }

      order.status = "refunded";
      order.refundedAt = new Date();
      await order.save({ session });

      result = {
        originalOrder,
        updatedOrder: order,
        refundedTransaction,
      };
    });

    if (!result) {
      throw new ApiError("Failed to refund daily order", {
        status: 500,
        code: "DAILY_ORDER_REFUND_EMPTY",
      });
    }

    return result;
  } finally {
    await session.endSession();
  }
}

export async function deleteDailyOrder({
  orderId,
  returnVouchers,
  actor,
  request,
}: DeleteDailyOrderParams): Promise<DailyDeleteMutationResult> {
  const session = await mongoose.startSession();

  try {
    let result: DailyDeleteMutationResult | null = null;

    await session.withTransaction(async () => {
      const order = await DailyDeliveryOrder.findOne({ orderId }).session(session);
      if (!order) {
        throw new ApiError("Order not found", { status: 404, code: "DAILY_ORDER_NOT_FOUND" });
      }

      let refundedTransaction: ITransaction | null = null;
      if (returnVouchers && order.status !== "refunded") {
        refundedTransaction = await refundDailyOrderVouchers(order, actor, request, session);
      }

      await order.deleteOne({ session });

      result = {
        deletedOrder: order,
        refundedTransaction,
      };
    });

    if (!result) {
      throw new ApiError("Failed to delete daily order", {
        status: 500,
        code: "DAILY_ORDER_DELETE_EMPTY",
      });
    }

    return result;
  } finally {
    await session.endSession();
  }
}
