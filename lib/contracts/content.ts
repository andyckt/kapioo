import { z } from "zod";

import { mongoIdSchema, nonEmptyString } from "@/lib/contracts/common";

export const mealSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  image: z.string(),
  description: z.string().optional(),
  calories: z.number().optional(),
  time: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ingredients: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  day: z.string().optional(),
  date: z.string().optional(),
  active: z.boolean().optional(),
});

export type Meal = z.infer<typeof mealSchema>;

export const weeklyMealsSchema = z.record(mealSchema);
export type WeeklyMeals = z.infer<typeof weeklyMealsSchema>;

export const mealOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameEn: z.string().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean(),
  imageUrl: z.string().optional(),
  imageKey: z.string().optional(),
  calories: z.number().optional(),
  proteinGrams: z.number().optional(),
  allergens: z.array(z.string()).optional(),
  description: z.string().optional(),
  featuredInMenuPreview: z.boolean().optional(),
  sourceComboLibraryId: z.string().optional(),
  sourceComboLibraryUpdatedAt: z.string().or(z.date()).optional(),
});

export type MealOption = z.infer<typeof mealOptionSchema>;

export const deliveryDaySchema = z.object({
  id: z.string(),
  day: z.enum(["sunday", "tuesday"]),
  name: z.string(),
  date: z.string(),
  weekOffset: z.number(),
  active: z.boolean(),
  options: z.array(mealOptionSchema),
});

export type DeliveryDay = z.infer<typeof deliveryDaySchema>;

export const deliverySectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  day: deliveryDaySchema,
});

export type DeliverySection = z.infer<typeof deliverySectionSchema>;

export const cartItemSchema = z.object({
  dayId: z.string(),
  optionId: z.string(),
  quantity: z.number(),
  weekOffset: z.number().optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

export const dayBodySchema = z
  .object({
    dayId: z.string().trim().min(1),
    displayName: z.string().trim().min(1),
    date: z.string().trim().min(1),
    week: z.coerce.number(),
    isActive: z.boolean().optional(),
  })
  .passthrough();

export type DayBody = z.infer<typeof dayBodySchema>;

export const comboBodySchema = z
  .object({
    comboId: z.string().trim().min(1),
    dayId: z.string().trim().min(1),
    name: z.string().trim().min(1),
    calories: z.coerce.number(),
    proteinGrams: z.coerce.number().nonnegative().max(1000).optional().or(z.literal("")),
    tags: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    tagsEn: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    allergensZh: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    allergensEn: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    descriptionZh: z.string().trim().max(1000).optional().or(z.literal("")),
    descriptionEn: z.string().trim().max(1000).optional().or(z.literal("")),
    imageUrl: z.string().url().max(2048).optional().or(z.literal("")),
    imageKey: z.string().max(512).optional().or(z.literal("")),
    featuredInMenuPreview: z.boolean().optional(),
    sourceComboLibraryId: z.string().max(120).optional(),
    sourceComboLibraryUpdatedAt: z.coerce.date().optional(),
  })
  .passthrough();

export type ComboBody = z.infer<typeof comboBodySchema>;

export const tagBodySchema = z
  .object({
    name: z.string().trim().min(1),
  })
  .passthrough();

export type TagBody = z.infer<typeof tagBodySchema>;

export const dishBodySchema = z
  .object({
    name: z.string().trim().min(1),
    nameEn: z.string().optional(),
  })
  .passthrough();

export type DishBody = z.infer<typeof dishBodySchema>;

export const mealBodySchema = z
  .object({
    name: z.string().trim().min(1),
    image: z.string().trim().min(1),
    description: z.string().trim().min(1),
  })
  .passthrough();

export type MealBody = z.infer<typeof mealBodySchema>;

export const musicVideoItemSchema = z.object({
  id: nonEmptyString,
  videoId: nonEmptyString,
  title: nonEmptyString,
  description: z.string().optional(),
});

export type MusicVideoItem = z.infer<typeof musicVideoItemSchema>;

export const musicVideosUpdateBodySchema = z.array(musicVideoItemSchema);

export const musicSubmissionCreateBodySchema = z.object({
  songName: nonEmptyString,
  artistName: nonEmptyString,
  reason: nonEmptyString,
  submitterName: nonEmptyString,
});

export type MusicSubmissionCreateBody = z.infer<typeof musicSubmissionCreateBodySchema>;

export const musicSubmissionPatchBodySchema = z.object({
  submissionId: mongoIdSchema,
  status: z.enum(["pending", "approved", "rejected"]),
});

export type MusicSubmissionPatchBody = z.infer<typeof musicSubmissionPatchBodySchema>;
