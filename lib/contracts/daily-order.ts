import { z } from "zod";

import {
  addressSchema,
  dateRangeQuerySchema,
  paginationQuerySchema,
} from "@/lib/contracts/common";

export const dailyOrderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "delivery",
  "delivered",
  "cancelled",
  "refunded",
]);

export type DailyOrderStatus = z.infer<typeof dailyOrderStatusSchema>;

export const dailyOrderDishSchema = z.union([
  z.string(),
  z.object({
    dishId: z.string().optional(),
    name: z.string().optional(),
  }),
]);

export const dailyOrderItemSchema = z.object({
  day: z.string(),
  date: z.string(),
  comboId: z.string(),
  comboName: z.string(),
  type: z.string(),
  quantity: z.number(),
  voucherType: z.string(),
  dishes: z.array(dailyOrderDishSchema).optional(),
});

export type DailyOrderItem = z.infer<typeof dailyOrderItemSchema>;

export const dailyVoucherCostSchema = z.object({
  twoDish: z.number(),
  threeDish: z.number(),
});

export const dailyOrderResponseSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  orderId: z.string(),
  items: z.array(dailyOrderItemSchema),
  status: dailyOrderStatusSchema,
  voucherCost: dailyVoucherCostSchema,
  taxIncluded: z.boolean().optional(),
  taxRate: z.number().optional(),
  specialInstructions: z.string().optional(),
  deliveryAddress: addressSchema.optional(),
  phoneNumber: z.string().optional(),
  area: z.string().optional(),
  confirmedAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  refundedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DailyOrderResponse = z.infer<typeof dailyOrderResponseSchema>;

export const adminDailyOrdersQuerySchema = paginationQuerySchema
  .merge(dateRangeQuerySchema)
  .extend({
    status: dailyOrderStatusSchema.or(z.literal("all")).optional(),
    search: z.string().optional(),
    area: z.string().optional(),
    comboName: z.string().optional(),
  });

export type AdminDailyOrdersQuery = z.infer<typeof adminDailyOrdersQuerySchema>;

export const updateDailyOrderStatusBodySchema = z.object({
  status: dailyOrderStatusSchema,
});

export type UpdateDailyOrderStatusBody = z.infer<typeof updateDailyOrderStatusBodySchema>;

export const dailyOrderCustomerOverrideBodySchema = z.object({
  name: z.string().trim().min(1),
  phoneNumber: z.string().trim().min(1),
  area: z.string().trim().min(1),
  specialInstructions: z.string().optional(),
  deliveryAddress: addressSchema,
});

export type DailyOrderCustomerOverrideBody = z.infer<typeof dailyOrderCustomerOverrideBodySchema>;

/** Raw item shape from clients (coerced server-side). */
export const createDailyOrderItemInputSchema = z
  .object({
    day: z.unknown().optional(),
    date: z.unknown().optional(),
    comboId: z.unknown().optional(),
    comboName: z.unknown().optional(),
    type: z.unknown().optional(),
    quantity: z.unknown().optional(),
    voucherType: z.unknown().optional(),
    dishes: z.unknown().optional(),
  })
  .passthrough();

export type CreateDailyOrderItemInput = z.infer<typeof createDailyOrderItemInputSchema>;

/** Normalize JSON before Zod parse (e.g. `items` sent as string). */
export function preprocessDailyOrderCreateBody(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) {
    return raw;
  }
  const o = { ...(raw as Record<string, unknown>) };
  if (typeof o.items === "string") {
    try {
      o.items = JSON.parse(o.items);
    } catch {
      /* leave as string; schema validation will fail */
    }
  }
  return o;
}

export const createDailyOrderBodySchema = z
  .object({
    idempotencyKey: z.string().optional(),
    userId: z.string().optional(),
    items: z.array(createDailyOrderItemInputSchema).min(1),
    taxIncluded: z.boolean().optional(),
    taxRate: z.number().optional(),
    specialInstructions: z.union([z.string(), z.null()]).optional(),
    deliveryAddress: z.record(z.unknown()).optional().nullable(),
    phoneNumber: z.union([z.string(), z.null()]).optional(),
    area: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();

export type CreateDailyOrderBody = z.infer<typeof createDailyOrderBodySchema>;

export const userDailyOrdersListQuerySchema = paginationQuerySchema.extend({
  userId: z.string().optional(),
  status: z.string().optional(),
});

export type UserDailyOrdersListQuery = z.infer<typeof userDailyOrdersListQuerySchema>;

/** Admin PATCH customer-info: partial fields, validated in route logic. */
export const dailyOrderCustomerInfoPatchBodySchema = z.record(z.string(), z.unknown());
