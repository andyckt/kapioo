import {
  DAILY_PLANS,
  WEEKLY_DELIVERY_FEE_RULES,
  WEEKLY_PLANS,
  DailyPlanDefinition,
  DailyPlanId,
  PlanId,
  WeeklyPlanDefinition,
  WeeklyPlanId
} from '@/lib/plans/catalog';

export function listWeeklyPlans(): WeeklyPlanDefinition[] {
  return WEEKLY_PLANS.filter((p) => p.active).sort((a, b) => a.sort - b.sort);
}

export function listDailyPlans(): DailyPlanDefinition[] {
  return DAILY_PLANS.filter((p) => p.active).sort((a, b) => a.sort - b.sort);
}

export function getWeeklyPlanById(id: string): WeeklyPlanDefinition | null {
  return WEEKLY_PLANS.find((p) => p.id === id) || null;
}

export function getDailyPlanById(id: string): DailyPlanDefinition | null {
  return DAILY_PLANS.find((p) => p.id === id) || null;
}

export function getPlanById(id: string): (WeeklyPlanDefinition | DailyPlanDefinition) | null {
  return getWeeklyPlanById(id) || getDailyPlanById(id);
}

export function getWeeklyPlanBy(mealsPerWeek: number, weeks: number): WeeklyPlanDefinition | null {
  return (
    WEEKLY_PLANS.find(
      (p) => p.mealsPerWeek === mealsPerWeek && p.weeks === weeks && p.active
    ) || null
  );
}

export function getDailyPlanBy(type: 'twoDish' | 'threeDish', credits: number): DailyPlanDefinition | null {
  return (
    DAILY_PLANS.find(
      (p) => p.dishType === type && p.credits === credits && p.active
    ) || null
  );
}

export function getWeeklyDeliveryFee(region: string): number {
  if (WEEKLY_DELIVERY_FEE_RULES.premiumRegions.has(region)) {
    return WEEKLY_DELIVERY_FEE_RULES.premiumPerWeek;
  }
  return WEEKLY_DELIVERY_FEE_RULES.standardPerWeek;
}

export function toWeeklyPlanId(mealsPerWeek: number, weeks: number): WeeklyPlanId {
  return `weekly-${mealsPerWeek}x${weeks}`;
}

export function toDailyPlanId(type: 'twoDish' | 'threeDish', credits: number): DailyPlanId {
  return `daily-${type === 'twoDish' ? '2dish' : '3dish'}-${credits}`;
}

export function derivePlanIdFromWeeklyType(mealPlanType?: string, mealPlanQuantity?: number): WeeklyPlanId | null {
  if (!mealPlanType || !mealPlanQuantity) return null;
  const mealsPerWeek = Number(String(mealPlanType).replace('aweek', ''));
  if (!Number.isFinite(mealsPerWeek) || !Number.isFinite(mealPlanQuantity)) return null;
  return toWeeklyPlanId(mealsPerWeek, mealPlanQuantity);
}

export function derivePlanIdFromDaily(type?: string, quantity?: number): DailyPlanId | null {
  if (!type || !quantity) return null;
  if (type !== 'twoDish' && type !== 'threeDish') return null;
  return toDailyPlanId(type, quantity);
}

export function buildPlanLabel(
  plan: WeeklyPlanDefinition | DailyPlanDefinition,
  language: 'zh' | 'en' = 'zh'
): string {
  if (plan.kind === 'weekly') {
    return language === 'zh'
      ? `${plan.mealsPerWeek}餐一周: ${plan.weeks}星期`
      : `${plan.mealsPerWeek} meals/week: ${plan.weeks} ${plan.weeks === 1 ? 'week' : 'weeks'}`;
  }

  const dishText =
    plan.dishType === 'twoDish'
      ? language === 'zh'
        ? '两菜套餐'
        : 'Two-Dish'
      : language === 'zh'
        ? '三菜套餐'
        : 'Three-Dish';

  return language === 'zh'
    ? `${dishText} ${plan.credits}餐券`
    : `${dishText} ${plan.credits} credits`;
}

export function getWeeklyPlanFamilies(): number[] {
  return Array.from(new Set(WEEKLY_PLANS.filter((p) => p.active).map((p) => p.mealsPerWeek))).sort(
    (a, b) => a - b
  );
}

export function getWeeklyDurations(): number[] {
  return Array.from(new Set(WEEKLY_PLANS.filter((p) => p.active).map((p) => p.weeks))).sort(
    (a, b) => a - b
  );
}

export type { PlanId };

