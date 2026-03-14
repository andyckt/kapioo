import { PlanId } from '@/lib/plans/service';

type UserLike = Record<string, any>;

const LEGACY_WEEKLY_FIELD_BY_MEALS: Record<number, string> = {
  6: 'weeklySIXmeals',
  8: 'weeklyEIGHTmeals',
  10: 'weeklyTENmeals',
  12: 'weeklyTWELVEmeals',
  16: 'weeklySIXTEENmeals'
};

function extractWeeklyMeals(planId: string): number | null {
  const match = /^weekly-(\d+)x\d+$/.exec(planId);
  if (!match) return null;
  const meals = Number(match[1]);
  return Number.isFinite(meals) ? meals : null;
}

function getPlanBalanceMap(user: UserLike): Record<string, number> {
  const raw = user.planBalances;
  if (!raw) return {};
  if (raw instanceof Map) return Object.fromEntries(raw.entries());
  return raw as Record<string, number>;
}

function setPlanBalanceMap(user: UserLike, balances: Record<string, number>) {
  user.planBalances = balances;
}

export function getBalance(user: UserLike, planId: PlanId | string): number {
  const balances = getPlanBalanceMap(user);
  const direct = Number(balances[planId]);
  if (Number.isFinite(direct)) return direct;

  const meals = extractWeeklyMeals(planId);
  if (meals) {
    const legacyField = LEGACY_WEEKLY_FIELD_BY_MEALS[meals];
    const fallback = Number(user[legacyField]);
    return Number.isFinite(fallback) ? fallback : 0;
  }

  return 0;
}

export function incrementBalance(user: UserLike, planId: PlanId | string, amount: number) {
  const balances = getPlanBalanceMap(user);
  const meals = extractWeeklyMeals(planId);
  if (meals) {
    const legacyField = LEGACY_WEEKLY_FIELD_BY_MEALS[meals];
    const nextBalance = (Number(user[legacyField]) || 0) + amount;
    user[legacyField] = nextBalance;
    balances[planId] = nextBalance;
    setPlanBalanceMap(user, balances);
    return;
  }

  balances[planId] = (Number(balances[planId]) || 0) + amount;
  setPlanBalanceMap(user, balances);
}

export function decrementBalance(user: UserLike, planId: PlanId | string, amount: number) {
  incrementBalance(user, planId, -Math.abs(amount));
}

export function seedWeeklyPlanBalances(user: UserLike) {
  const balances = getPlanBalanceMap(user);
  Object.entries(LEGACY_WEEKLY_FIELD_BY_MEALS).forEach(([mealKey, field]) => {
    const mealCount = Number(mealKey);
    const legacyValue = Number(user[field] || 0);
    if (legacyValue <= 0) return;
    const key = `weekly-${mealCount}x1`;
    if (!Number.isFinite(Number(balances[key]))) {
      balances[key] = legacyValue;
    }
  });
  setPlanBalanceMap(user, balances);
}

