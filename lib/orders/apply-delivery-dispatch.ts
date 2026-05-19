import type {
  ApplyDeliveryDispatchResult,
  RouteOptimizerDeliveryStartedBody,
} from "@/lib/contracts/delivery-dispatch";
import connectToDatabase from "@/lib/db";
import type { IDeliveryDispatch } from "@/lib/models/delivery-dispatch";
import { logAuditEvent } from "@/lib/security/audit";
import DailyDeliveryOrder, { type IDailyDeliveryOrder } from "@/models/DailyDeliveryOrder";

const WRITABLE_STATUSES = ["pending", "confirmed", "delivery"] as const;
const TERMINAL_STATUSES = ["delivered", "cancelled", "refunded"] as const;

type ApplyDeliveryDispatchInput = {
  payload: RouteOptimizerDeliveryStartedBody;
  request?: Request;
};

function dedupeOrderIds(orderIds: string[]): string[] {
  return Array.from(
    new Set(orderIds.map((orderId) => orderId.trim()).filter((orderId) => orderId.length > 0))
  );
}

function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

function isWritableStatus(status: string): boolean {
  return (WRITABLE_STATUSES as readonly string[]).includes(status);
}

function buildDeliveryDispatchFromRouteOptimizer(
  payload: RouteOptimizerDeliveryStartedBody
): IDeliveryDispatch {
  return {
    eta: new Date(payload.eta),
    dispatchedAt: new Date(payload.startedAt),
    receivedAt: new Date(),
    stopId: payload.stopId,
    driverId: payload.driverId,
    source: "route-optimizer",
    note: payload.note,
  };
}

async function applyToDailyOrder(params: {
  order: IDailyDeliveryOrder;
  deliveryDispatch: IDeliveryDispatch;
  request?: Request;
  result: ApplyDeliveryDispatchResult;
}): Promise<void> {
  const { order, deliveryDispatch, request, result } = params;
  const status = String(order.status);
  const orderId = order.orderId;

  if (isTerminalStatus(status) || !isWritableStatus(status)) {
    result.skipped.push({
      orderId,
      reason: "terminal-status",
      status,
    });
    await logAuditEvent({
      action: "delivery-dispatch.skipped",
      targetType: "daily-order",
      targetId: orderId,
      request,
      metadata: {
        reason: "terminal-status",
        status,
        source: deliveryDispatch.source,
      },
    });
    return;
  }

  const updatedOrder = await DailyDeliveryOrder.findOneAndUpdate(
    {
      _id: order._id,
      status: { $in: WRITABLE_STATUSES },
    },
    {
      $set: {
        deliveryDispatch,
        status: "delivery",
      },
    },
    { new: true }
  );

  if (!updatedOrder) {
    const latestOrder = await DailyDeliveryOrder.findById(order._id);
    const latestStatus = latestOrder ? String(latestOrder.status) : status;
    result.skipped.push({
      orderId,
      reason: "terminal-status",
      status: latestStatus,
    });
    await logAuditEvent({
      action: "delivery-dispatch.skipped",
      targetType: "daily-order",
      targetId: orderId,
      request,
      metadata: {
        reason: "terminal-status",
        status: latestStatus,
        source: deliveryDispatch.source,
      },
    });
    return;
  }

  result.updated.push({ orderId });

  await logAuditEvent({
    action: "delivery-dispatch.applied",
    targetType: "daily-order",
    targetId: orderId,
    request,
    metadata: {
      previousStatus: status,
      source: deliveryDispatch.source,
      eta: deliveryDispatch.eta.toISOString(),
    },
  });
}

export async function applyDeliveryDispatch({
  payload,
  request,
}: ApplyDeliveryDispatchInput): Promise<ApplyDeliveryDispatchResult> {
  await connectToDatabase();

  const orderIds = dedupeOrderIds(payload.orderIds);
  const deliveryDispatch = buildDeliveryDispatchFromRouteOptimizer(payload);
  const result: ApplyDeliveryDispatchResult = {
    updated: [],
    skipped: [],
    missing: [],
    ...(payload.stopId ? { stopId: payload.stopId } : {}),
  };

  for (const orderId of orderIds) {
    const order = await DailyDeliveryOrder.findOne({ orderId });
    if (!order) {
      result.missing.push({ orderId });
      await logAuditEvent({
        action: "delivery-dispatch.missing",
        targetType: "order",
        targetId: orderId,
        request,
        metadata: {
          stopId: payload.stopId,
        },
      });
      continue;
    }

    await applyToDailyOrder({
      order,
      deliveryDispatch,
      request,
      result,
    });
  }

  return result;
}
