import { z } from "zod";

import {
  addressSchema,
  dateRangeQuerySchema,
  paginationQuerySchema,
} from "@/lib/contracts/common";

export const weeklyMealPlanTypeSchema = z.enum([
  "legacy",
  "6aweek",
  "8aweek",
  "10aweek",
  "12aweek",
  "16aweek",
]);

export type WeeklyMealPlanType = z.infer<typeof weeklyMealPlanTypeSchema>;

export const weeklyOrderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "delivery",
  "delivered",
  "cancelled",
  "refunded",
]);

export type WeeklyOrderStatus = z.infer<typeof weeklyOrderStatusSchema>;

export const weeklyOrderItemSchema = z.object({
  dayId: z.string(),
  optionId: z.string(),
  optionName: z.string(),
  quantity: z.number(),
  date: z.string(),
});

export type WeeklyOrderItem = z.infer<typeof weeklyOrderItemSchema>;

export const weeklyOrderResponseSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  orderId: z.string(),
  items: z.array(weeklyOrderItemSchema),
  status: weeklyOrderStatusSchema,
  creditCost: z.number(),
  mealPlanType: weeklyMealPlanTypeSchema.optional(),
  voucherDeducted: z.boolean(),
  weeklyEntitlementGroupId: z.string().optional(),
  allocatedMealCount: z.number().optional(),
  specialInstructions: z.string().optional(),
  deliveryAddress: addressSchema,
  phoneNumber: z.string(),
  area: z.string(),
  confirmedAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  refundedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WeeklyOrderResponse = z.infer<typeof weeklyOrderResponseSchema>;

export const adminWeeklyOrdersQuerySchema = paginationQuerySchema
  .merge(dateRangeQuerySchema)
  .extend({
    status: z.string().optional(),
    search: z.string().optional(),
    area: z.string().optional(),
  });

export type AdminWeeklyOrdersQuery = z.infer<typeof adminWeeklyOrdersQuerySchema>;

export const adminWeeklyOrdersExportQuerySchema = dateRangeQuerySchema.extend({
  status: z.string().optional(),
  search: z.string().optional(),
  area: z.string().optional(),
});

export type AdminWeeklyOrdersExportQuery = z.infer<typeof adminWeeklyOrdersExportQuerySchema>;

export const weeklyOrderUserPatchBodySchema = z
  .object({
    specialInstructions: z.unknown().optional(),
    status: z.unknown().optional(),
  })
  .passthrough();

export type WeeklyOrderUserPatchBody = z.infer<typeof weeklyOrderUserPatchBodySchema>;

export const adminWeeklyOrderCustomerInfoPatchSchema = z
  .object({
    name: z.unknown().optional(),
    phoneNumber: z.unknown().optional(),
    area: z.unknown().optional(),
    specialInstructions: z.unknown().optional(),
    deliveryAddress: z.unknown().optional(),
  })
  .passthrough()
  .refine(
    (d) =>
      (["name", "phoneNumber", "area", "specialInstructions", "deliveryAddress"] as const).some(
        (k) => k in d
      ),
    { message: "No editable fields provided" }
  );

export type AdminWeeklyOrderCustomerInfoPatchBody = z.infer<
  typeof adminWeeklyOrderCustomerInfoPatchSchema
>;

export const updateWeeklyOrderStatusBodySchema = z.object({
  status: weeklyOrderStatusSchema,
});

export type UpdateWeeklyOrderStatusBody = z.infer<typeof updateWeeklyOrderStatusBodySchema>;
