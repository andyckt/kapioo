import { z } from "zod";

import { addressSchema, paginationStateSchema } from "@/lib/contracts/common";
import { proofOfDeliverySchema } from "@/lib/contracts/proof-of-delivery";

export const adminOrderAddressSchema = addressSchema.pick({
  unitNumber: true,
  streetAddress: true,
  postalCode: true,
  country: true,
  buzzCode: true,
});

export type AdminOrderAddress = z.infer<typeof adminOrderAddressSchema>;

export const adminOrderCustomerInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  area: z.string().optional(),
  specialInstructions: z.string().optional(),
  deliveryAddress: adminOrderAddressSchema.optional(),
});

export type AdminOrderCustomerInfo = z.infer<typeof adminOrderCustomerInfoSchema>;

export const adminOrderOverrideChangeDetailSchema = z.object({
  field: z.string(),
  from: z.string(),
  to: z.string(),
});

export type AdminOrderOverrideChangeDetail = z.infer<typeof adminOrderOverrideChangeDetailSchema>;

export const adminOrderUpdateLogSchema = z
  .object({
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
    reason: z.string().optional(),
    changedFields: z.array(z.string()).optional(),
    changedDetails: z.array(adminOrderOverrideChangeDetailSchema).optional(),
    previousCustomerInfo: adminOrderCustomerInfoSchema.optional(),
    newCustomerInfo: adminOrderCustomerInfoSchema.optional(),
  })
  .catchall(z.unknown());

export type AdminOrderUpdateLog = z.infer<typeof adminOrderUpdateLogSchema>;

const adminOrderDishSchema = z
  .object({
    dishId: z.string().optional(),
    name: z.string().optional(),
  })
  .catchall(z.unknown());

export const adminOrderItemSchema = z
  .object({
    comboId: z.string().optional(),
    comboName: z.string().optional(),
    itemType: z.string().optional(),
    type: z.string().optional(),
    date: z.string().optional(),
    day: z.string().optional(),
    dayId: z.string().optional(),
    dayName: z.string().optional(),
    optionName: z.string().optional(),
    deliveryDate: z.string().optional(),
    quantity: z.number().optional(),
    dishes: z.array(z.union([z.string(), adminOrderDishSchema])).optional(),
  })
  .catchall(z.unknown());

export type AdminOrderItem = z.infer<typeof adminOrderItemSchema>;

export const weeklyEntitlementSummarySchema = z
  .object({
    mealCount: z.number().optional(),
    deliveryCount: z.number().optional(),
    label: z.string().optional(),
    labelEn: z.string().optional(),
    labelZh: z.string().optional(),
    description: z.string().optional(),
    allocatedMealCount: z.number().optional(),
  })
  .catchall(z.unknown());

export type WeeklyEntitlementSummary = z.infer<typeof weeklyEntitlementSummarySchema>;

export const linkedWeeklyGroupSchema = z
  .object({
    groupId: z.string().optional(),
    parentOrderId: z.string().optional(),
    childOrderIds: z.array(z.string()).optional(),
    allocatedMealCount: z.number().optional(),
    parentRecordExists: z.boolean().optional(),
    linkedChildOrderCount: z.number().optional(),
    otherLinkedChildOrders: z.array(z.unknown()).optional(),
  })
  .catchall(z.unknown());

export type LinkedWeeklyGroup = z.infer<typeof linkedWeeklyGroupSchema>;

export const adminOrderSchema = z
  .object({
    _id: z.string(),
    orderId: z.string().optional(),
    userId: z.string().optional(),
    userEmail: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    area: z.string().optional(),
    status: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deliveryDate: z.string().optional(),
    deliveryAddress: adminOrderAddressSchema.optional(),
    specialInstructions: z.string().optional(),
    items: z.array(adminOrderItemSchema).optional(),
    effectiveCustomerInfo: adminOrderCustomerInfoSchema.optional(),
    orderCustomerOverrideLogs: z.array(adminOrderUpdateLogSchema).optional(),
    proofOfDelivery: proofOfDeliverySchema.optional(),
    weeklyEntitlementSummary: weeklyEntitlementSummarySchema.optional(),
    weeklyEntitlementGroupId: z.string().optional(),
    linkedWeeklyGroup: linkedWeeklyGroupSchema.optional(),
  })
  .catchall(z.unknown());

export type AdminOrder = z.infer<typeof adminOrderSchema>;

export const adminOrderFiltersSchema = z.object({
  status: z.string(),
  search: z.string(),
  area: z.string(),
  deliveryDate: z.string(),
  deliveryDateEnd: z.string(),
  comboName: z.string().optional(),
});

export type AdminOrderFilters = z.infer<typeof adminOrderFiltersSchema>;

export const adminOrderOverrideFormSchema = adminOrderCustomerInfoSchema.extend({
  name: z.string(),
  phoneNumber: z.string(),
  area: z.string(),
  specialInstructions: z.string(),
  deliveryAddress: adminOrderAddressSchema.extend({
    unitNumber: z.string(),
    streetAddress: z.string(),
    postalCode: z.string(),
    country: z.string(),
    buzzCode: z.string(),
  }),
});

export type AdminOrderOverrideForm = z.infer<typeof adminOrderOverrideFormSchema>;

export const adminOrderDeliveryDateOptionSchema = z.object({
  date: z.string(),
  day: z.string(),
  display: z.string(),
});

export type AdminOrderDeliveryDateOption = z.infer<typeof adminOrderDeliveryDateOptionSchema>;

export const adminOrdersListResponseSchema = z.object({
  orders: z.array(adminOrderSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
});

export type AdminOrdersListResponse = z.infer<typeof adminOrdersListResponseSchema>;

export const adminOrdersStateSchema = z.object({
  orders: z.array(adminOrderSchema),
  pagination: paginationStateSchema,
});

export type AdminOrdersState = z.infer<typeof adminOrdersStateSchema>;
