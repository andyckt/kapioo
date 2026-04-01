import { z } from "zod";

import { nonEmptyString } from "@/lib/contracts/common";

/** Query ?week=&year= — mirrors parseInt + falsy check (0 / missing → use server default). */
export const weeklyMealsWeekYearQuerySchema = z.object({
  week: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 0;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : 0;
    }),
  year: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 0;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : 0;
    }),
});

export type WeeklyMealsWeekYearQuery = z.infer<typeof weeklyMealsWeekYearQuerySchema>;

export const assignWeeklyMealBodySchema = z.object({
  day: nonEmptyString,
  mealId: nonEmptyString,
});

export const weeklyMealDayActiveBodySchema = z.object({
  day: nonEmptyString,
  active: z.boolean(),
});

export const updateWeeklyMealsWeekYearBodySchema = z.object({
  week: z.coerce.number().int().min(1).max(53),
  year: z.coerce.number().int().min(2023).max(2050),
});
