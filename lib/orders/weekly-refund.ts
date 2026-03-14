import { incrementBalance } from '@/lib/plans/balances';
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

export function restoreWeeklyOrderEntitlement(
  user: Record<string, any>,
  order: RefundableWeeklyOrder
) {
  const refundTarget = resolveWeeklyRefundTarget(order);

  if (refundTarget.kind === 'none') {
    return refundTarget;
  }

  if (refundTarget.kind === 'credits') {
    user.credits = (Number(user.credits) || 0) + refundTarget.amount;
    return refundTarget;
  }

  incrementBalance(user, refundTarget.planId, refundTarget.amount);
  return refundTarget;
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
