import { z } from "zod";

import { nonEmptyString, paginationQuerySchema } from "@/lib/contracts/common";

export const userActivityQuerySchema = paginationQuerySchema.extend({
  type: z
    .enum([
      "all",
      "transaction",
      "credit-request",
      "voucher-request",
      "order",
      "weekly-order",
    ])
    .default("all"),
});

export type UserActivityQuery = z.infer<typeof userActivityQuerySchema>;

export const unsubscribeEmailBodySchema = z.object({
  email: z.string().trim().email(),
  type: z.enum([
    "next-week-menu",
    "weekly-menu",
    "daily-menu",
    "order-updates",
    "marketing",
  ]),
  token: nonEmptyString,
});

export type UnsubscribeEmailBody = z.infer<typeof unsubscribeEmailBodySchema>;

export const sendOrderSummaryEmailBodySchema = z.object({
  type: z.enum(["daily", "weekly"]),
  orderIds: z.array(z.string().trim().min(1)).min(1),
});

export type SendOrderSummaryEmailBody = z.infer<typeof sendOrderSummaryEmailBodySchema>;
