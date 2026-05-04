import { z } from "zod";

import {
  addressSchema,
  nonEmptyString,
  paginationQuerySchema,
} from "@/lib/contracts/common";

export type {
  CartItem,
  DeliveryDay,
  DeliverySection,
  MealOption,
} from "@/lib/contracts/content";

export const createWeeklyMealOptionBodySchema = z
  .object({
    name: nonEmptyString,
    nameEn: z.string().optional(),
    day: z.string().optional(),
    deliveryDayId: z.string().optional(),
    weekOffset: z.coerce.number().optional(),
    tags: z.array(z.string()).optional(),
    active: z.boolean().optional(),
    imageUrl: z.string().url().max(2048).optional().or(z.literal("")),
    imageKey: z.string().max(512).optional().or(z.literal("")),
    dishes: z.array(z.string().trim().min(1)).max(20).optional(),
    calories: z.coerce.number().nonnegative().max(10000).optional(),
    allergens: z.array(z.string().trim().min(1)).max(20).optional(),
    description: z.string().max(2000).optional(),
    sourceComboLibraryId: z.string().max(120).optional(),
    sourceComboLibraryUpdatedAt: z.coerce.date().optional(),
  })
  .refine((d) => Boolean(d.day?.trim()) || Boolean(d.deliveryDayId?.trim()), {
    message: "Name and delivery day information (day or deliveryDayId) are required",
    path: ["day"],
  });

export const updateWeeklyMealOptionBodySchema = z.object({
  name: z.string().optional(),
  nameEn: z.string().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  imageUrl: z.string().url().max(2048).optional().or(z.literal("")),
  imageKey: z.string().max(512).optional().or(z.literal("")),
  dishes: z.array(z.string().trim().min(1)).max(20).optional(),
  calories: z.coerce.number().nonnegative().max(10000).optional(),
  allergens: z.array(z.string().trim().min(1)).max(20).optional(),
  description: z.string().max(2000).optional(),
  sourceComboLibraryId: z.string().max(120).optional(),
  sourceComboLibraryUpdatedAt: z.coerce.date().optional(),
});

export const weeklySubscriptionCartItemSchema = z.object({
  dayId: z.string().min(1),
  optionId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  weekOffset: z.coerce.number().int().min(0).optional(),
});

export const weeklySubscriptionUserOrderBodySchema = z
  .object({
    items: z.array(weeklySubscriptionCartItemSchema).min(1),
    userId: z.string().optional(),
    weeklyEntitlementGroupId: z.string().optional(),
    weeklyEntitlementTotalMeals: z.coerce.number().optional(),
    splitDeliveryCount: z.coerce.number().optional(),
    mealPlanType: z.string().optional(),
    deductVoucher: z.boolean().optional(),
    specialInstructions: z.string().optional(),
    deliveryAddress: addressSchema.optional(),
    phoneNumber: z.string().optional(),
    area: z.string().optional(),
  })
  .passthrough();

export type WeeklySubscriptionUserOrderBody = z.infer<typeof weeklySubscriptionUserOrderBodySchema>;

export const weeklySubscriptionDeliveryDayUpdateSchema = z
  .object({
    id: z.string().optional(),
    day: z.string().optional(),
    weekOffset: z.coerce.number().int().min(0).optional(),
    date: z.string().optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => Boolean(d.day?.trim()) || Boolean(d.id?.trim()), {
    message: "Delivery day identifier (day or id) is required",
    path: ["day"],
  });

export const weeklySubscriptionUserHistoryQuerySchema = paginationQuerySchema.extend({
  userId: z.string().trim().min(1, "User ID is required"),
});

export type WeeklySubscriptionUserHistoryQuery = z.infer<
  typeof weeklySubscriptionUserHistoryQuerySchema
>;
