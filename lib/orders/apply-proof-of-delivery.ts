import type { Model } from "mongoose";

import type {
  ApplyProofOfDeliveryResult,
  ProofOfDeliveryService,
  ProofOfDeliverySkippedReason,
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

type AuditActor = {
  user?: { _id?: unknown; email?: string };
  role?: "user" | "admin";
} | null;

type ApplyProofOfDeliveryInput = {
  payload: RouteOptimizerProofOfDeliveryBody;
  request?: Request;
};

export type ApplySingleProofOfDeliveryResult =
  | {
      ok: true;
      orderId: string;
      service: ProofOfDeliveryService;
      previousStatus: string;
    }
  | { ok: false; reason: "missing"; orderId: string }
  | {
      ok: false;
      reason: ProofOfDeliverySkippedReason;
      orderId: string;
      service: ProofOfDeliveryService;
      status?: string;
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

function buildProofOfDeliveryFromRouteOptimizer(
  payload: RouteOptimizerProofOfDeliveryBody
): IProofOfDelivery {
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
  actor?: AuditActor;
  result?: ApplyProofOfDeliveryResult;
}): Promise<ApplySingleProofOfDeliveryResult> {
  const { model, service, order, proofOfDelivery, request, actor, result } = params;
  const status = String(order.status);
  const orderId = order.orderId;

  if (status === "delivered" && hasProofOfDelivery(order)) {
    result?.skipped.push({
      orderId,
      service,
      reason: "already-delivered-with-pod",
      status,
    });
    await logAuditEvent({
      actor: actor ?? undefined,
      action: "pod.skipped",
      targetType: `${service}-order`,
      targetId: orderId,
      request,
      metadata: {
        reason: "already-delivered-with-pod",
        source: proofOfDelivery.source,
      },
    });
    return {
      ok: false,
      reason: "already-delivered-with-pod",
      orderId,
      service,
      status,
    };
  }

  if (isTerminalStatus(status) || !isWritableStatus(status)) {
    result?.skipped.push({
      orderId,
      service,
      reason: "terminal-status",
      status,
    });
    await logAuditEvent({
      actor: actor ?? undefined,
      action: "pod.skipped",
      targetType: `${service}-order`,
      targetId: orderId,
      request,
      metadata: {
        reason: "terminal-status",
        status,
        source: proofOfDelivery.source,
      },
    });
    return {
      ok: false,
      reason: "terminal-status",
      orderId,
      service,
      status,
    };
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
      result?.skipped.push({
        orderId,
        service,
        reason: "already-delivered-with-pod",
        status: String(latestOrder.status),
      });
      return {
        ok: false,
        reason: "already-delivered-with-pod",
        orderId,
        service,
        status: String(latestOrder.status),
      };
    }

    result?.skipped.push({
      orderId,
      service,
      reason: "terminal-status",
      status: latestOrder ? String(latestOrder.status) : status,
    });
    return {
      ok: false,
      reason: "terminal-status",
      orderId,
      service,
      status: latestOrder ? String(latestOrder.status) : status,
    };
  }

  result?.updated.push({
    orderId,
    service,
  });

  await logAuditEvent({
    actor: actor ?? undefined,
    action: "pod.applied",
    targetType: `${service}-order`,
    targetId: orderId,
    request,
    metadata: {
      previousStatus: status,
      source: proofOfDelivery.source,
      imageKey: proofOfDelivery.imageKey,
    },
  });

  await maybeSendDeliveredEmail({
    order: updatedOrder,
    service,
    previousStatus: status,
  });

  return {
    ok: true,
    orderId,
    service,
    previousStatus: status,
  };
}

export async function findOrderByOrderId(orderId: string) {
  const normalized = orderId.trim();
  const dailyOrder = await DailyDeliveryOrder.findOne({ orderId: normalized });
  if (dailyOrder) {
    return { service: "daily" as const, model: DailyDeliveryOrder, order: dailyOrder };
  }

  const weeklyOrder = await WeeklyOrder.findOne({ orderId: normalized });
  if (weeklyOrder) {
    return { service: "weekly" as const, model: WeeklyOrder, order: weeklyOrder };
  }

  return null;
}

/** Canonical single-order POD apply (Route Optimizer webhook + admin manual upload). */
export async function applyProofOfDeliveryToOrder(params: {
  orderId: string;
  proofOfDelivery: IProofOfDelivery;
  request?: Request;
  actor?: AuditActor;
}): Promise<ApplySingleProofOfDeliveryResult> {
  await connectToDatabase();

  const found = await findOrderByOrderId(params.orderId);
  if (!found) {
    await logAuditEvent({
      actor: params.actor ?? undefined,
      action: "pod.missing",
      targetType: "order",
      targetId: params.orderId.trim(),
      request: params.request,
      metadata: {
        source: params.proofOfDelivery.source,
      },
    });
    return { ok: false, reason: "missing", orderId: params.orderId.trim() };
  }

  return applyToOrder({
    model: found.model as Model<SupportedOrder>,
    service: found.service,
    order: found.order,
    proofOfDelivery: params.proofOfDelivery,
    request: params.request,
    actor: params.actor,
  });
}

export async function applyProofOfDelivery({
  payload,
  request,
}: ApplyProofOfDeliveryInput): Promise<ApplyProofOfDeliveryResult> {
  await connectToDatabase();

  const orderIds = dedupeOrderIds(payload.orderIds);
  const proofOfDelivery = buildProofOfDeliveryFromRouteOptimizer(payload);
  const result: ApplyProofOfDeliveryResult = {
    updated: [],
    skipped: [],
    missing: [],
    ...(payload.stopId ? { stopId: payload.stopId } : {}),
  };

  for (const orderId of orderIds) {
    const found = await findOrderByOrderId(orderId);
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
