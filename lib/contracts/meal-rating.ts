import { z } from "zod";

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export const mealRatingSubmitBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
  overallRating: z.number().min(1).max(5),
  dishRatings: z.array(z.unknown()).optional(),
  comment: z.string().optional(),
  userEmail: z.string().optional(),
});

export type MealRatingSubmitBody = z.infer<typeof mealRatingSubmitBodySchema>;

export const mealRatingActiveDatePutBodySchema = z.object({
  date: z.string().regex(DATE_YYYY_MM_DD, "date must be YYYY-MM-DD"),
});

export type MealRatingActiveDatePutBody = z.infer<typeof mealRatingActiveDatePutBodySchema>;

export const adminMealRatingsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type AdminMealRatingsQuery = z.infer<typeof adminMealRatingsQuerySchema>;

export const ratingDishCreateBodySchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  nameEn: z.string().optional(),
  sortOrder: z.coerce.number().default(0),
});

export type RatingDishCreateBody = z.infer<typeof ratingDishCreateBodySchema>;

export const ratingDishDeleteQuerySchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});

export type RatingDishDeleteQuery = z.infer<typeof ratingDishDeleteQuerySchema>;
