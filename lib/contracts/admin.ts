import { z } from "zod";

import { addressSchema, paymentMethodSchema, requestStatusSchema } from "@/lib/contracts/common";

export const adminUserSchema = z.object({
  _id: z.string(),
  userID: z.string().optional(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  role: z.string(),
  joined: z.string().optional(),
  address: addressSchema.optional(),
  credits: z.number().optional(),
  twoDishVoucher: z.number().optional(),
  threeDishVoucher: z.number().optional(),
  weeklySIXmeals: z.number().optional(),
  weeklyEIGHTmeals: z.number().optional(),
  weeklyTENmeals: z.number().optional(),
  weeklyTWELVEmeals: z.number().optional(),
  weeklyFOURTEENmeals: z.number().optional(),
  weeklySIXTEENmeals: z.number().optional(),
  dailyOrdersCount: z.number().optional(),
  weeklyOrdersCount: z.number().optional(),
  totalOrderCount: z.number().optional(),
  planBalances: z.record(z.number()).optional(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const creditRequestUserSummarySchema = z.object({
  _id: z.string().optional(),
  userID: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
});

export type CreditRequestUserSummary = z.infer<typeof creditRequestUserSummarySchema>;

export const creditRequestSchema = z.object({
  _id: z.string(),
  requestId: z.string().optional(),
  userId: z.union([z.string(), creditRequestUserSummarySchema, z.null()]).optional(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  amount: z.number().optional(),
  status: requestStatusSchema,
  planId: z.string().optional(),
  planLabel: z.string().optional(),
  planDescription: z.string().optional(),
  mealPlanType: z.string().optional(),
  mealPlanQuantity: z.number().optional(),
  paymentMethod: z.union([paymentMethodSchema, z.string()]).optional(),
  referenceNumber: z.string().optional(),
  promoCode: z.string().optional(),
  promoDiscountAmount: z.number().optional(),
  mealSubtotal: z.number().optional(),
  originalSubtotal: z.number().optional(),
  originalPrice: z.number().optional(),
  deliveryFeeTotal: z.number().optional(),
  deliveryFeePerWeek: z.number().optional(),
  taxAmount: z.number().optional(),
  finalTotal: z.number().optional(),
  notes: z.string().optional(),
  imageProof: z.string().optional(),
  proofOfPayment: z.string().optional(),
  adminNotes: z.string().optional(),
  createdAt: z.string(),
  approvedAt: z.string().optional(),
  declinedAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CreditRequest = z.infer<typeof creditRequestSchema>;

export const adminTransactionSchema = z.object({
  _id: z.string(),
  transactionId: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  userID: z.string().optional(),
  sourceRequestId: z.string().optional(),
  sourceRequest: z
    .object({
      requestId: z.string().optional(),
      planDescription: z.string().optional(),
      status: z.string().optional(),
      amount: z.number().optional(),
      finalTotal: z.number().optional(),
      paymentMethod: z.string().optional(),
      referenceNumber: z.string().optional(),
    })
    .optional(),
  type: z.string(),
  amount: z.number().optional(),
  description: z.string().optional(),
  createdAt: z.string(),
});

export type AdminTransaction = z.infer<typeof adminTransactionSchema>;

export const adminDateRangeSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export type AdminDateRange = z.infer<typeof adminDateRangeSchema>;

export const userActivitySchema = z.object({
  _id: z.string(),
  activityType: z.string().optional(),
  type: z.string().optional(),
  title: z.string().optional(),
  details: z.string().optional(),
  status: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UserActivity = z.infer<typeof userActivitySchema>;

export const orderNotificationTriggerBodySchema = z.object({
  notificationType: z.enum([
    "new_order",
    "order_confirmed",
    "order_delivery",
    "order_delivered",
    "order_cancelled",
    "order_refunded",
    "credits_added",
  ]),
  orderId: z.string().optional(),
  userId: z.string().optional(),
  previousStatus: z.string().optional(),
  transactionId: z.string().optional(),
  amount: z.number().optional(),
});

export type OrderNotificationTriggerBody = z.infer<typeof orderNotificationTriggerBodySchema>;
