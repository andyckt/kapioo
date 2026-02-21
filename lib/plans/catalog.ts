export type WeeklyPlanId = `weekly-${number}x${number}`;
export type DailyPlanId = `daily-${'2dish' | '3dish'}-${number}`;
export type PlanId = WeeklyPlanId | DailyPlanId;

export interface WeeklyPlanDefinition {
  id: WeeklyPlanId;
  kind: 'weekly';
  mealsPerWeek: number;
  weeks: number;
  basePrice: number;
  pricePerMeal: number;
  sort: number;
  active: boolean;
  tags?: {
    en?: string;
    zh?: string;
  };
}

export interface DailyPlanDefinition {
  id: DailyPlanId;
  kind: 'daily';
  dishType: 'twoDish' | 'threeDish';
  credits: number;
  basePrice: number;
  pricePerMeal: number;
  sort: number;
  active: boolean;
  tags?: {
    en?: string;
    zh?: string;
  };
}

export const WEEKLY_PLANS: WeeklyPlanDefinition[] = [
  { id: 'weekly-6x1', kind: 'weekly', mealsPerWeek: 6, weeks: 1, basePrice: 112, pricePerMeal: 18.67, sort: 10, active: true },
  { id: 'weekly-8x1', kind: 'weekly', mealsPerWeek: 8, weeks: 1, basePrice: 148, pricePerMeal: 18.5, sort: 11, active: true },
  { id: 'weekly-10x1', kind: 'weekly', mealsPerWeek: 10, weeks: 1, basePrice: 183, pricePerMeal: 18.3, sort: 12, active: true },
  { id: 'weekly-12x1', kind: 'weekly', mealsPerWeek: 12, weeks: 1, basePrice: 217, pricePerMeal: 18.08, sort: 13, active: true },
  { id: 'weekly-16x1', kind: 'weekly', mealsPerWeek: 16, weeks: 1, basePrice: 286, pricePerMeal: 17.88, sort: 14, active: true },
  { id: 'weekly-6x2', kind: 'weekly', mealsPerWeek: 6, weeks: 2, basePrice: 219, pricePerMeal: 18.25, sort: 20, active: true, tags: { en: 'First Time Recommended', zh: '首次推荐' } },
  { id: 'weekly-8x2', kind: 'weekly', mealsPerWeek: 8, weeks: 2, basePrice: 290, pricePerMeal: 18.13, sort: 21, active: true, tags: { en: 'First Time Recommended', zh: '首次推荐' } },
  { id: 'weekly-10x2', kind: 'weekly', mealsPerWeek: 10, weeks: 2, basePrice: 359, pricePerMeal: 17.95, sort: 22, active: true, tags: { en: 'First Time Recommended', zh: '首次推荐' } },
  { id: 'weekly-12x2', kind: 'weekly', mealsPerWeek: 12, weeks: 2, basePrice: 428, pricePerMeal: 17.83, sort: 23, active: true, tags: { en: 'First Time Recommended', zh: '首次推荐' } },
  { id: 'weekly-16x2', kind: 'weekly', mealsPerWeek: 16, weeks: 2, basePrice: 562, pricePerMeal: 17.56, sort: 24, active: true, tags: { en: 'First Time Recommended', zh: '首次推荐' } },
  { id: 'weekly-6x4', kind: 'weekly', mealsPerWeek: 6, weeks: 4, basePrice: 398, pricePerMeal: 16.58, sort: 30, active: true },
  { id: 'weekly-8x4', kind: 'weekly', mealsPerWeek: 8, weeks: 4, basePrice: 525, pricePerMeal: 16.41, sort: 31, active: true },
  { id: 'weekly-10x4', kind: 'weekly', mealsPerWeek: 10, weeks: 4, basePrice: 648, pricePerMeal: 16.2, sort: 32, active: true },
  { id: 'weekly-12x4', kind: 'weekly', mealsPerWeek: 12, weeks: 4, basePrice: 765, pricePerMeal: 15.94, sort: 33, active: true },
  { id: 'weekly-16x4', kind: 'weekly', mealsPerWeek: 16, weeks: 4, basePrice: 998, pricePerMeal: 15.59, sort: 34, active: true },
  { id: 'weekly-6x8', kind: 'weekly', mealsPerWeek: 6, weeks: 8, basePrice: 744, pricePerMeal: 15.5, sort: 40, active: true, tags: { en: 'Best value', zh: '最超值' } },
  { id: 'weekly-8x8', kind: 'weekly', mealsPerWeek: 8, weeks: 8, basePrice: 979, pricePerMeal: 15.3, sort: 41, active: true, tags: { en: 'Best value', zh: '最超值' } },
  { id: 'weekly-10x8', kind: 'weekly', mealsPerWeek: 10, weeks: 8, basePrice: 1210, pricePerMeal: 15.13, sort: 42, active: true, tags: { en: 'Best value', zh: '最超值' } },
  { id: 'weekly-12x8', kind: 'weekly', mealsPerWeek: 12, weeks: 8, basePrice: 1428, pricePerMeal: 14.88, sort: 43, active: true, tags: { en: 'Best value', zh: '最超值' } },
  { id: 'weekly-16x8', kind: 'weekly', mealsPerWeek: 16, weeks: 8, basePrice: 1870, pricePerMeal: 14.61, sort: 44, active: true, tags: { en: 'Best value', zh: '最超值' } }
];

export const DAILY_PLANS: DailyPlanDefinition[] = [
  { id: 'daily-2dish-6', kind: 'daily', dishType: 'twoDish', credits: 6, basePrice: 131, pricePerMeal: 21.83, sort: 10, active: true },
  { id: 'daily-2dish-10', kind: 'daily', dishType: 'twoDish', credits: 10, basePrice: 195, pricePerMeal: 19.5, sort: 11, active: true, tags: { en: 'First Time Recommend!', zh: '首次推荐' } },
  { id: 'daily-2dish-22', kind: 'daily', dishType: 'twoDish', credits: 22, basePrice: 356, pricePerMeal: 16.18, sort: 12, active: true, tags: { en: 'Most Cost-effective', zh: '最超值' } },
  { id: 'daily-2dish-46', kind: 'daily', dishType: 'twoDish', credits: 46, basePrice: 712, pricePerMeal: 15.48, sort: 13, active: true, tags: { en: 'Most Cost-effective', zh: '最超值' } },
  { id: 'daily-3dish-6', kind: 'daily', dishType: 'threeDish', credits: 6, basePrice: 150, pricePerMeal: 25, sort: 20, active: true },
  { id: 'daily-3dish-10', kind: 'daily', dishType: 'threeDish', credits: 10, basePrice: 228, pricePerMeal: 22.8, sort: 21, active: true, tags: { en: 'First Time Recommend!', zh: '首次推荐' } },
  { id: 'daily-3dish-22', kind: 'daily', dishType: 'threeDish', credits: 22, basePrice: 417, pricePerMeal: 18.95, sort: 22, active: true, tags: { en: 'Most Cost-effective', zh: '最超值' } },
  { id: 'daily-3dish-46', kind: 'daily', dishType: 'threeDish', credits: 46, basePrice: 818, pricePerMeal: 17.78, sort: 23, active: true, tags: { en: 'Most Cost-effective', zh: '最超值' } }
];

export const WEEKLY_DELIVERY_FEE_RULES = {
  premiumRegions: new Set(['Hamilton', 'Burlington']),
  standardPerWeek: 11.99,
  premiumPerWeek: 15.99
} as const;

