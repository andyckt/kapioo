import { z } from "zod";

export const PAGINATION_LIMIT_MAX = 200;

export const nonEmptyString = z.string().trim().min(1);

export const mongoIdSchema = z.string().trim().regex(/^[a-f0-9]{24}$/i, "Invalid identifier");

export const addressSchema = z.object({
  unitNumber: z.string().optional(),
  streetAddress: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  buzzCode: z.string().optional(),
  city: z.string().optional(),
});

export type Address = z.infer<typeof addressSchema>;

export const addressGeoSchema = z.object({
  placeId: z.string().trim().optional(),
  formattedAddress: z.string().trim().optional(),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
  streetNumber: z.string().trim().optional(),
  route: z.string().trim().optional(),
  locality: z.string().trim().optional(),
  administrativeArea: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  source: z.enum(["google", "manual"]).default("google"),
});

export const verifiedAddressGeoSchema = addressGeoSchema.superRefine((value, ctx) => {
  if (value.source === "manual") {
    return;
  }

  if (!value.placeId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["placeId"],
      message: "Google place id is required",
    });
  }

  if (typeof value.lat !== "number") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lat"],
      message: "Latitude is required",
    });
  }

  if (typeof value.lng !== "number") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lng"],
      message: "Longitude is required",
    });
  }
});

export type AddressGeo = z.infer<typeof addressGeoSchema>;

export const paginationStateSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pages: z.number().int().nonnegative(),
});

export type PaginationState = z.infer<typeof paginationStateSchema>;

export const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
};

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(PAGINATION_LIMIT_MAX).default(10),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const transactionsQuerySchema = paginationQuerySchema.extend({
  userId: z.string().optional(),
});

export type TransactionsQuery = z.infer<typeof transactionsQuerySchema>;

export const dateRangeQuerySchema = z.object({
  deliveryDate: z.string().optional(),
  deliveryDateEnd: z.string().optional(),
});

export const idParamSchema = z.object({
  id: mongoIdSchema,
});

export const requestStatusSchema = z.enum(["pending", "approved", "declined"]);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const paymentMethodSchema = z.enum(["wechat", "emt"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
