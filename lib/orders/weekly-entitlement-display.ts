import type { WeeklyMealPlanType } from '@/models/WeeklyOrder';

type OrderLike = Record<string, any>;
type GroupLike = Record<string, any> | null | undefined;

export interface WeeklyEntitlementSummary {
  source: 'group' | 'order-meal-plan' | 'legacy-credit-cost';
  kind: 'weekly-plan' | 'legacy-credits';
  groupId: string | null;
  mealPlanType: string | null;
  voucherCountUsed: number;
  totalMealsForWeek: number;
  allocatedMealCount: number;
  labelZh: string;
  labelEn: string;
}

export function parseWeeklyMealPlanMeals(mealPlanType?: string | null): number | null {
  if (!mealPlanType || mealPlanType === 'legacy') {
    return null;
  }

  const parsed = Number(String(mealPlanType).replace('aweek', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveAllocatedMealCount(order: OrderLike): number {
  const explicitAllocated = Number(order.allocatedMealCount);
  if (Number.isFinite(explicitAllocated) && explicitAllocated >= 0) {
    return explicitAllocated;
  }

  if (Array.isArray(order.items)) {
    const fromItems = order.items.reduce(
      (sum: number, item: any) => sum + (Number(item?.quantity) || 0),
      0
    );
    if (Number.isFinite(fromItems)) {
      return fromItems;
    }
  }

  return Number(order.creditCost) || 0;
}

function buildWeeklyPlanLabels(mealsPerWeek: number, voucherCountUsed: number) {
  const safeVoucherCount = Math.max(1, voucherCountUsed || 1);
  return {
    zh: `${mealsPerWeek}餐一周: ${safeVoucherCount}张`,
    en: `${mealsPerWeek} meals/week: ${safeVoucherCount} voucher${safeVoucherCount === 1 ? '' : 's'}`,
  };
}

function buildLegacyLabels(totalMealsForWeek: number) {
  return {
    zh: `${totalMealsForWeek}餐`,
    en: `${totalMealsForWeek} meals`,
  };
}

export function buildWeeklyEntitlementSummary(
  order: OrderLike,
  group?: GroupLike
): WeeklyEntitlementSummary {
  const allocatedMealCount = resolveAllocatedMealCount(order);
  const groupId = typeof group?.groupId === 'string' ? group.groupId : null;
  const groupMealPlanType = typeof group?.mealPlanType === 'string' ? group.mealPlanType : null;
  const orderMealPlanType = typeof order?.mealPlanType === 'string' ? order.mealPlanType : null;
  const mealPlanType = groupMealPlanType || orderMealPlanType || 'legacy';

  const source: WeeklyEntitlementSummary['source'] = groupId
    ? 'group'
    : mealPlanType !== 'legacy'
      ? 'order-meal-plan'
      : 'legacy-credit-cost';

  const mealsPerWeek = parseWeeklyMealPlanMeals(mealPlanType);
  const voucherCountUsed =
    mealsPerWeek !== null
      ? Math.max(1, Number(group?.voucherCountUsed) || 1)
      : 0;

  if (mealsPerWeek !== null) {
    const labels = buildWeeklyPlanLabels(mealsPerWeek, voucherCountUsed);
    return {
      source,
      kind: 'weekly-plan',
      groupId,
      mealPlanType,
      voucherCountUsed,
      totalMealsForWeek: Number(group?.totalMealsForWeek) || mealsPerWeek,
      allocatedMealCount,
      labelZh: labels.zh,
      labelEn: labels.en,
    };
  }

  const totalMealsForWeek = Number(group?.totalMealsForWeek) || Number(order.creditCost) || allocatedMealCount;
  const labels = buildLegacyLabels(totalMealsForWeek);

  return {
    source,
    kind: 'legacy-credits',
    groupId,
    mealPlanType: mealPlanType as WeeklyMealPlanType,
    voucherCountUsed: 0,
    totalMealsForWeek,
    allocatedMealCount,
    labelZh: labels.zh,
    labelEn: labels.en,
  };
}
