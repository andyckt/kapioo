import { getWeeklyPlanFamilies, toWeeklyPlanId, type PlanId } from '@/lib/plans/service';

type UserLike = Record<string, any>;

export const LEGACY_WEEKLY_FIELD_BY_MEALS = {
  6: 'weeklySIXmeals',
  8: 'weeklyEIGHTmeals',
  10: 'weeklyTENmeals',
  12: 'weeklyTWELVEmeals',
  16: 'weeklySIXTEENmeals'
} as const;

export type LegacyWeeklyBalanceField =
  (typeof LEGACY_WEEKLY_FIELD_BY_MEALS)[keyof typeof LEGACY_WEEKLY_FIELD_BY_MEALS];
type LegacyWeeklyMealCount = keyof typeof LEGACY_WEEKLY_FIELD_BY_MEALS;

export interface WeeklyPlanBalanceOption {
  mealsPerWeek: number;
  planId: string;
  field: LegacyWeeklyBalanceField;
  labelEn: string;
  labelZh: string;
}

export interface WeeklyPlanBalanceRow extends WeeklyPlanBalanceOption {
  balance: number;
}

function extractWeeklyMeals(planId: string): number | null {
  const match = /^weekly-(\d+)x\d+$/.exec(planId);
  if (!match) return null;
  const meals = Number(match[1]);
  return Number.isFinite(meals) ? meals : null;
}

function isLegacyWeeklyMealCount(mealsPerWeek: number): mealsPerWeek is LegacyWeeklyMealCount {
  return Object.prototype.hasOwnProperty.call(LEGACY_WEEKLY_FIELD_BY_MEALS, mealsPerWeek);
}

export function getLegacyWeeklyBalanceField(mealsPerWeek: number): LegacyWeeklyBalanceField | null {
  return isLegacyWeeklyMealCount(mealsPerWeek)
    ? LEGACY_WEEKLY_FIELD_BY_MEALS[mealsPerWeek]
    : null;
}

export function listWeeklyPlanBalanceOptions(): WeeklyPlanBalanceOption[] {
  return getWeeklyPlanFamilies().reduce<WeeklyPlanBalanceOption[]>((options, mealsPerWeek) => {
    const field = getLegacyWeeklyBalanceField(mealsPerWeek);
    if (!field) return options;

    options.push({
      mealsPerWeek,
      planId: toWeeklyPlanId(mealsPerWeek, 1),
      field,
      labelEn: `${mealsPerWeek} Meals`,
      labelZh: `${mealsPerWeek}餐一周`,
    });

    return options;
  }, []);
}

export function getWeeklyPlanBalanceRows(user: UserLike): WeeklyPlanBalanceRow[] {
  return listWeeklyPlanBalanceOptions().map((option) => ({
    ...option,
    balance: getBalance(user, option.planId),
  }));
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
    const legacyField = getLegacyWeeklyBalanceField(meals);
    if (!legacyField) return 0;
    const fallback = Number(user[legacyField]);
    return Number.isFinite(fallback) ? fallback : 0;
  }

  return 0;
}

export function incrementBalance(user: UserLike, planId: PlanId | string, amount: number) {
  const balances = getPlanBalanceMap(user);
  const meals = extractWeeklyMeals(planId);
  if (meals) {
    const legacyField = getLegacyWeeklyBalanceField(meals);
    if (!legacyField) return;
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

