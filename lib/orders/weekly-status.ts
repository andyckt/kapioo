export const WEEKLY_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'delivery',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export type WeeklyOrderStatus = (typeof WEEKLY_ORDER_STATUSES)[number];

type TimestampLike = Date | string | null | undefined;

export interface WeeklyStatusOrderLike {
  status?: string | null;
  confirmedAt?: TimestampLike;
  deliveredAt?: TimestampLike;
  refundedAt?: TimestampLike;
}

export interface WeeklyStatusTransitionResult {
  ok: boolean;
  currentStatus: WeeklyOrderStatus;
  nextStatus: WeeklyOrderStatus;
  noOp: boolean;
  patch?: Record<string, WeeklyOrderStatus | Date | null>;
  allowedNextStatuses: WeeklyOrderStatus[];
  error?: string;
}

const ALLOWED_NEXT_STATUS: Record<WeeklyOrderStatus, WeeklyOrderStatus[]> = {
  pending: ['confirmed', 'cancelled', 'refunded'],
  confirmed: ['pending', 'delivery', 'delivered', 'cancelled', 'refunded'],
  delivery: ['confirmed', 'delivered', 'cancelled', 'refunded'],
  delivered: ['delivery', 'refunded'],
  cancelled: ['pending', 'refunded'],
  refunded: [],
};

export function isWeeklyOrderStatus(value: unknown): value is WeeklyOrderStatus {
  return typeof value === 'string' && WEEKLY_ORDER_STATUSES.includes(value as WeeklyOrderStatus);
}

function normalizeCurrentStatus(value: unknown): WeeklyOrderStatus {
  return isWeeklyOrderStatus(value) ? value : 'pending';
}

export function getAllowedWeeklyStatusTransitions(currentStatus: unknown): WeeklyOrderStatus[] {
  return ALLOWED_NEXT_STATUS[normalizeCurrentStatus(currentStatus)];
}

export function resolveWeeklyStatusTransition(
  order: WeeklyStatusOrderLike,
  requestedStatus: unknown,
  now = new Date()
): WeeklyStatusTransitionResult {
  if (!isWeeklyOrderStatus(requestedStatus)) {
    return {
      ok: false,
      currentStatus: normalizeCurrentStatus(order.status),
      nextStatus: 'pending',
      noOp: false,
      allowedNextStatuses: getAllowedWeeklyStatusTransitions(order.status),
      error: 'Invalid status',
    };
  }

  const currentStatus = normalizeCurrentStatus(order.status);
  const nextStatus = requestedStatus;
  const allowedNextStatuses = getAllowedWeeklyStatusTransitions(currentStatus);

  if (currentStatus === nextStatus) {
    return {
      ok: true,
      currentStatus,
      nextStatus,
      noOp: true,
      patch: { status: nextStatus },
      allowedNextStatuses,
    };
  }

  if (!allowedNextStatuses.includes(nextStatus)) {
    return {
      ok: false,
      currentStatus,
      nextStatus,
      noOp: false,
      allowedNextStatuses,
      error: `Cannot move weekly order from ${currentStatus} to ${nextStatus}`,
    };
  }

  const patch: Record<string, WeeklyOrderStatus | Date | null> = {
    status: nextStatus,
  };

  switch (nextStatus) {
    case 'pending':
      patch.confirmedAt = null;
      patch.deliveredAt = null;
      patch.refundedAt = null;
      break;
    case 'confirmed':
      patch.confirmedAt = order.confirmedAt ? new Date(order.confirmedAt) : now;
      patch.deliveredAt = null;
      patch.refundedAt = null;
      break;
    case 'delivery':
      patch.confirmedAt = order.confirmedAt ? new Date(order.confirmedAt) : now;
      patch.deliveredAt = null;
      patch.refundedAt = null;
      break;
    case 'delivered':
      patch.confirmedAt = order.confirmedAt ? new Date(order.confirmedAt) : now;
      patch.deliveredAt = now;
      patch.refundedAt = null;
      break;
    case 'cancelled':
      patch.deliveredAt = null;
      patch.refundedAt = null;
      break;
    case 'refunded':
      patch.refundedAt = now;
      break;
  }

  return {
    ok: true,
    currentStatus,
    nextStatus,
    noOp: false,
    patch,
    allowedNextStatuses,
  };
}
