import { z } from "zod";

import {
  nonEmptyString,
  paginationQuerySchema,
  paymentMethodSchema,
  requestStatusSchema,
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

export const createCreditRequestBodySchema = z.object({
  userId: z.string().optional(),
  requestId: z.string().optional(),
  imageProof: nonEmptyString,
  paymentMethod: paymentMethodSchema,
  referenceNumber: nonEmptyString,
  notes: z.string().optional(),
  planDescription: z.string().optional(),
  mealPlanType: weeklyMealPlanTypeSchema.optional(),
  mealPlanQuantity: z.coerce.number().int().positive().optional(),
  mealsPerWeek: z.coerce.number().int().positive().optional(),
  duration: z.coerce.number().int().positive().optional(),
  planId: z.string().optional(),
  promoCode: z.string().optional(),
});

export type CreateCreditRequestBody = z.infer<typeof createCreditRequestBodySchema>;

export const creditRequestsQuerySchema = paginationQuerySchema.extend({
  userId: z.string().optional(),
  status: requestStatusSchema.optional(),
});

export type CreditRequestsQuery = z.infer<typeof creditRequestsQuerySchema>;

/** Admin list + export filters for credit purchase requests */
export const adminCreditPurchaseRequestsQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
});

export type AdminCreditPurchaseRequestsQuery = z.infer<
  typeof adminCreditPurchaseRequestsQuerySchema
>;

export const creditPurchaseRequestExportQuerySchema = z.object({
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreditPurchaseRequestExportQuery = z.infer<
  typeof creditPurchaseRequestExportQuerySchema
>;

export const adminCreditPurchaseActionBodySchema = z.object({
  requestId: nonEmptyString,
  action: z.enum(["approve", "decline"]),
  approvedSixMeals: z.coerce.number().default(0),
  approvedEightMeals: z.coerce.number().default(0),
  approvedTenMeals: z.coerce.number().default(0),
  approvedTwelveMeals: z.coerce.number().default(0),
  approvedSixteenMeals: z.coerce.number().default(0),
  approvedCredits: z.coerce.number().default(0),
  adminNotes: z.string().optional(),
});

export type AdminCreditPurchaseActionBody = z.infer<
  typeof adminCreditPurchaseActionBodySchema
>;

export const creditRequestResponseSchema = z.object({
  _id: z.string(),
  requestId: z.string(),
  userId: z.string(),
  planId: z.string().optional(),
  amount: z.number(),
  paymentMethod: paymentMethodSchema,
  originalPrice: z.number().optional(),
  currency: z.literal("CAD").optional(),
  originalSubtotal: z.number().optional(),
  finalTotal: z.number().optional(),
  promoCode: z.string().optional(),
  promoDiscountType: z.enum(["percentage", "fixed"]).optional(),
  promoDiscountValue: z.number().optional(),
  promoDiscountAmount: z.number().optional(),
  mealSubtotal: z.number().optional(),
  deliveryFeePerWeek: z.number().optional(),
  deliveryFeeTotal: z.number().optional(),
  taxAmount: z.number().optional(),
  imageProof: z.string(),
  referenceNumber: z.string(),
  status: requestStatusSchema,
  requestedCredits: z.number().optional(),
  approvedCredits: z.number().optional(),
  approvedSixMeals: z.number().optional(),
  approvedEightMeals: z.number().optional(),
  approvedTenMeals: z.number().optional(),
  approvedTwelveMeals: z.number().optional(),
  approvedSixteenMeals: z.number().optional(),
  approvedPlans: z
    .array(
      z.object({
        planId: z.string(),
        quantity: z.number(),
      })
    )
    .optional(),
  mealPlanType: weeklyMealPlanTypeSchema.optional(),
  mealPlanQuantity: z.number().optional(),
  notes: z.string().optional(),
  adminNotes: z.string().optional(),
  planDescription: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  approvedAt: z.string().optional(),
  declinedAt: z.string().optional(),
});

export type CreditRequestResponse = z.infer<typeof creditRequestResponseSchema>;
