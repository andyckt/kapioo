import { z } from "zod";

import { nonEmptyString } from "@/lib/contracts/common";

export const applyPromoCodeBodySchema = z.object({
  code: nonEmptyString,
  purchaseType: nonEmptyString.optional(),
  paymentMethod: z.string().optional(),
  mealSubtotal: z.coerce.number().optional(),
  deliveryFeeTotal: z.coerce.number().optional(),
});

export type ApplyPromoCodeBody = z.infer<typeof applyPromoCodeBodySchema>;

/** Preview/apply route: required purchase context + optional aliases (`subtotal`, `taxRate`). */
export const applyPromoCodePreviewBodySchema = z
  .object({
    code: z.string(),
    userId: z.string().optional(),
    purchaseType: nonEmptyString,
    paymentMethod: z.string().min(1),
    mealSubtotal: z.union([z.number(), z.string()]).optional(),
    subtotal: z.union([z.number(), z.string()]).optional(),
    deliveryFeeTotal: z.union([z.number(), z.string()]).optional(),
    taxRate: z.union([z.number(), z.string()]).optional(),
  })
  .transform((b) => ({
    code: b.code,
    userId: b.userId,
    purchaseType: b.purchaseType,
    paymentMethod: b.paymentMethod,
    mealSubtotal: Number(b.mealSubtotal ?? b.subtotal),
    deliveryFeeTotal: Number(b.deliveryFeeTotal ?? 0),
    taxRate: Number(b.taxRate ?? 0.13),
  }))
  .pipe(
    z
      .object({
        code: z.string(),
        userId: z.string().optional(),
        purchaseType: z.string(),
        paymentMethod: z.string(),
        mealSubtotal: z.number(),
        deliveryFeeTotal: z.number(),
        taxRate: z.number(),
      })
      .refine((b) => !Number.isNaN(b.mealSubtotal), {
        message: "Invalid meal subtotal",
        path: ["mealSubtotal"],
      })
      .refine((b) => !Number.isNaN(b.deliveryFeeTotal), {
        message: "Invalid delivery fee total",
        path: ["deliveryFeeTotal"],
      })
      .refine((b) => !Number.isNaN(b.taxRate), {
        message: "Invalid tax rate",
        path: ["taxRate"],
      })
  );

export type ApplyPromoCodePreviewBody = z.infer<typeof applyPromoCodePreviewBodySchema>;

export const promoCodeResponseSchema = z.object({
  _id: z.string(),
  code: z.string(),
  active: z.boolean().optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.number().optional(),
  maxUses: z.number().optional(),
  usageCount: z.number().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PromoCodeResponse = z.infer<typeof promoCodeResponseSchema>;
