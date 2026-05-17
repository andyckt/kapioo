import type { Model } from "mongoose";

import type {
  ApplyProofOfDeliveryResult,
  ProofOfDeliveryService,
  RouteOptimizerProofOfDeliveryBody,
} from "@/lib/contracts/proof-of-delivery";
import connectToDatabase from "@/lib/db";
import type { IProofOfDelivery } from "@/lib/models/proof-of-delivery";
import { logAuditEvent } from "@/lib/security/audit";
import { sendDailyOrderStatusUpdateNotification } from "@/lib/services/notifications";
import DailyDeliveryOrder, { type IDailyDeliveryOrder } from "@/models/DailyDeliveryOrder";
import User from "@/models/User";
import WeeklyOrder, { type IWeeklyOrder } from "@/models/WeeklyOrder";

const ACTIVE_STATUSES = ["pending", "confirmed", "delivery"] as const;
const TERMINAL_STATUSES = ["cancelled", "refunded"] as const;

type SupportedOrder = IDailyDeliveryOrder | IWeeklyOrder;

type ApplyProofOfDeliveryInput = {
  payload: RouteOptimizerProofOfDeliveryBody;
  request?: Request;
};

function dedupeOrderIds(orderIds: string[]): string[] {
  return Array.from(
    new Set(orderIds.map((orderId) => orderId.trim()).filter((orderId) => orderId.length > 0))
  );
}

function hasProofOfDelivery(order: SupportedOrder): boolean {
  return typeof order.proofOfDelivery?.imageUrl === "string" && order.proofOfDelivery.imageUrl.length > 0;
}

function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

function isWritableStatus(status: string): boolean {
  return status === "delivered" || (ACTIVE_STATUSES as readonly string[]).includes(status);
}

function buildProofOfDelivery(payload: RouteOptimizerProofOfDeliveryBody): IProofOfDelivery {
  return {
    imageUrl: payload.podImage.url,
    imageKey: payload.podImage.key,
    capturedAt: new Date(payload.capturedAt),
    receivedAt: new Date(),
    stopId: payload.stopId,
    driverId: payload.driverId,
    source: "route-optimizer",
    note: payload.note,
  };
}

async function maybeSendDeliveredEmail(params: {
  order: SupportedOrder;
  service: ProofOfDeliveryService;
  previousStatus: string;
}) {
  if (process.env.POD_NOTIFY_CUSTOMER !== "true") {
    return;
  }

  try {
    const user = await User.findById(params.order.userId)
      .select("name email languagePreference")
      .lean<{ name?: string; email?: string; languagePreference?: "zh" | "en" } | null>();
    if (!user?.email) {
      return;
    }

    await sendDailyOrderStatusUpdateNotification(
      user.email,
      user.name || "Kapioo User",
      params.order.orderId,
      "delivered",
      params.order.items,
      params.previousStatus,
      user.languagePreference || "zh",
      params.order.createdAt,
      params.service === "daily" ? (params.order as IDailyDeliveryOrder).voucherCost : undefined
    );
  } catch (error) {
    console.error("POD delivered email failed:", error);
  }
}

async function applyToOrder<TOrder extends SupportedOrder>(params: {
  model: Model<TOrder>;
  service: ProofOfDeliveryService;
  order: TOrder;
  proofOfDelivery: IProofOfDelivery;
  request?: Request;
  result: ApplyProofOfDeliveryResult;
}) {
  const { model, service, order, proofOfDelivery, request, result } = params;
  const status = String(order.status);

  if (status === "delivered" && hasProofOfDelivery(order)) {
    result.skipped.push({
      orderId: order.orderId,
      service,
      reason: "already-delivered-with-pod",
      status,
    });
    await logAuditEvent({
      action: "pod.skipped",
      targetType: `${service}-order`,
      targetId: order.orderId,
      request,
      metadata: {
        reason: "already-delivered-with-pod",
        stopId: proofOfDelivery.stopId,
      },
    });
    return;
  }

  if (isTerminalStatus(status) || !isWritableStatus(status)) {
    result.skipped.push({
      orderId: order.orderId,
      service,
      reason: "terminal-status",
      status,
    });
    await logAuditEvent({
      action: "pod.skipped",
      targetType: `${service}-order`,
      targetId: order.orderId,
      request,
      metadata: {
        reason: "terminal-status",
        status,
        stopId: proofOfDelivery.stopId,
      },
    });
    return;
  }

  const setPayload: Record<string, unknown> = {
    proofOfDelivery,
    status: "delivered",
  };

  if (status !== "delivered" || !order.deliveredAt) {
    setPayload.deliveredAt = proofOfDelivery.capturedAt;
  }

  const updatedOrder = await model.findOneAndUpdate(
    {
      _id: order._id,
      status: status === "delivered" ? "delivered" : { $in: ACTIVE_STATUSES },
      $or: [{ proofOfDelivery: { $exists: false } }, { proofOfDelivery: null }],
    },
    { $set: setPayload },
    { new: true }
  );

  if (!updatedOrder) {
    const latestOrder = await model.findById(order._id);
    if (latestOrder && String(latestOrder.status) === "delivered" && hasProofOfDelivery(latestOrder)) {
      result.skipped.push({
        orderId: order.orderId,
        service,
        reason: "already-delivered-with-pod",
        status: String(latestOrder.status),
      });
      return;
    }

    result.skipped.push({
      orderId: order.orderId,
      service,
      reason: "terminal-status",
      status: latestOrder ? String(latestOrder.status) : status,
    });
    return;
  }

  result.updated.push({
    orderId: order.orderId,
    service,
  });

  await logAuditEvent({
    action: "pod.applied",
    targetType: `${service}-order`,
    targetId: order.orderId,
    request,
    metadata: {
      previousStatus: status,
      stopId: proofOfDelivery.stopId,
      driverId: proofOfDelivery.driverId,
      imageKey: proofOfDelivery.imageKey,
    },
  });

  await maybeSendDeliveredEmail({
    order: updatedOrder,
    service,
    previousStatus: status,
  });
}

async function findOrderById(orderId: string) {
  const dailyOrder = await DailyDeliveryOrder.findOne({ orderId });
  if (dailyOrder) {
    return { service: "daily" as const, model: DailyDeliveryOrder, order: dailyOrder };
  }

  const weeklyOrder = await WeeklyOrder.findOne({ orderId });
  if (weeklyOrder) {
    return { service: "weekly" as const, model: WeeklyOrder, order: weeklyOrder };
  }

  return null;
}

export async function applyProofOfDelivery({
  payload,
  request,
}: ApplyProofOfDeliveryInput): Promise<ApplyProofOfDeliveryResult> {
  await connectToDatabase();

  const orderIds = dedupeOrderIds(payload.orderIds);
  const proofOfDelivery = buildProofOfDelivery(payload);
  const result: ApplyProofOfDeliveryResult = {
    updated: [],
    skipped: [],
    missing: [],
    ...(payload.stopId ? { stopId: payload.stopId } : {}),
  };

  for (const orderId of orderIds) {
    const found = await findOrderById(orderId);
    if (!found) {
      result.missing.push({ orderId });
      await logAuditEvent({
        action: "pod.missing",
        targetType: "order",
        targetId: orderId,
        request,
        metadata: {
          stopId: payload.stopId,
        },
      });
      continue;
    }

    await applyToOrder({
      model: found.model as Model<SupportedOrder>,
      service: found.service,
      order: found.order,
      proofOfDelivery,
      request,
      result,
    });
  }

  return result;
}
