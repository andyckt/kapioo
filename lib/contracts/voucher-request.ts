import { z } from "zod";

import { nonEmptyString, paginationQuerySchema, requestStatusSchema } from "@/lib/contracts/common";

export const voucherRequestsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  userId: z.string().optional(),
  status: requestStatusSchema.optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type VoucherRequestsListQuery = z.infer<typeof voucherRequestsListQuerySchema>;

export const createVoucherPurchaseRequestBodySchema = z.object({
  userId: z.string().optional(),
  type: z.enum(["twoDish", "threeDish"]),
  quantity: z.coerce.number().positive(),
  imageProof: nonEmptyString,
  referenceNumber: nonEmptyString,
  notes: z.string().optional(),
  promoCode: z.string().optional(),
  requestId: z.string().optional(),
  planId: z.string().optional(),
});

export type CreateVoucherPurchaseRequestBody = z.infer<
  typeof createVoucherPurchaseRequestBodySchema
>;

export const voucherRequestIdParamSchema = z.object({
  requestId: nonEmptyString,
});

export const updateVoucherPurchaseRequestBodySchema = z.object({
  status: z.enum(["approved", "declined"]),
  adminNotes: z.string().optional(),
});

export type UpdateVoucherPurchaseRequestBody = z.infer<
  typeof updateVoucherPurchaseRequestBodySchema
>;

export const voucherPurchaseRequestExportQuerySchema = z.object({
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type VoucherPurchaseRequestExportQuery = z.infer<
  typeof voucherPurchaseRequestExportQuerySchema
>;
