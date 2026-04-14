import type { BalanceMutationEntry } from '@/lib/balances/mutations';
import { getBalanceMutationFieldForPlanId } from '@/lib/balances/mutations';
import { toWeeklyPlanId } from '@/lib/plans/service';

export type RefundWeeklyMealPlanType = 'legacy' | '6aweek' | '8aweek' | '10aweek' | '12aweek' | '16aweek';

export interface RefundableWeeklyOrder {
  creditCost?: number | null;
  mealPlanType?: RefundWeeklyMealPlanType | string | null;
  voucherDeducted?: boolean | null;
}

export type RefundTarget =
  | { kind: 'none'; amount: 0 }
  | { kind: 'credits'; amount: number }
  | { kind: 'weekly-plan'; amount: 1; planId: string };

export function resolveWeeklyRefundTarget(order: RefundableWeeklyOrder): RefundTarget {
  const voucherDeducted = typeof order.voucherDeducted === 'boolean' ? order.voucherDeducted : true;
  if (!voucherDeducted) {
    return { kind: 'none', amount: 0 };
  }

  const mealPlanType = typeof order.mealPlanType === 'string' ? order.mealPlanType : 'legacy';
  if (mealPlanType === 'legacy') {
    return {
      kind: 'credits',
      amount: Number(order.creditCost) || 0,
    };
  }

  const mealsPerWeek = Number(mealPlanType.replace('aweek', ''));
  if (!Number.isFinite(mealsPerWeek)) {
    return {
      kind: 'credits',
      amount: Number(order.creditCost) || 0,
    };
  }

  return {
    kind: 'weekly-plan',
    amount: 1,
    planId: toWeeklyPlanId(mealsPerWeek, 1),
  };
}

export function toWeeklyRefundBalanceMutation(
  refundTarget: RefundTarget
): BalanceMutationEntry | null {
  if (refundTarget.kind === 'none') {
    return null;
  }

  if (refundTarget.kind === 'credits') {
    if (refundTarget.amount <= 0) {
      return null;
    }

    return {
      field: 'credits',
      amount: refundTarget.amount,
      operation: 'add',
    };
  }

  const field = getBalanceMutationFieldForPlanId(refundTarget.planId);
  if (!field) {
    throw new Error(`Unsupported weekly refund planId: ${refundTarget.planId}`);
  }

  return {
    field,
    amount: refundTarget.amount,
    operation: 'add',
  };
}

export function describeWeeklyRefundTarget(refundTarget: RefundTarget): string {
  if (refundTarget.kind === 'none') {
    return 'no entitlement was restored';
  }

  if (refundTarget.kind === 'credits') {
    return `${refundTarget.amount} credits restored`;
  }

  return `${refundTarget.amount} weekly voucher restored (${refundTarget.planId})`;
}
