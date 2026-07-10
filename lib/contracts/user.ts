import { z } from "zod";

import {
  addressGeoSchema,
  addressSchema,
  mongoIdSchema,
  nonEmptyString,
  paginationQuerySchema,
} from "@/lib/contracts/common";

export const languagePreferenceSchema = z.enum(["zh", "en"]);

export const emailPreferencesSchema = z.object({
  nextWeekMenuUpdates: z.boolean().optional(),
  weeklyMenuUpdates: z.boolean().optional(),
  dailyMenuUpdates: z.boolean().optional(),
  orderUpdates: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

export const userResponseSchema = z.object({
  _id: z.string(),
  userID: z.string(),
  name: z.string(),
  nickname: z.string().optional(),
  role: z.enum(["user", "admin"]),
  email: z.string().email(),
  joined: z.string().optional(),
  status: z.string().optional(),
  sessionVersion: z.number().optional(),
  credits: z.number().optional(),
  twoDishVoucher: z.number().optional(),
  threeDishVoucher: z.number().optional(),
  weeklySIXmeals: z.number().optional(),
  weeklyEIGHTmeals: z.number().optional(),
  weeklyTENmeals: z.number().optional(),
  weeklyTWELVEmeals: z.number().optional(),
  weeklyFOURTEENmeals: z.number().optional(),
  weeklySIXTEENmeals: z.number().optional(),
  planBalances: z.record(z.number()).optional(),
  phone: z.string().optional(),
  address: addressSchema.optional(),
  addressGeo: addressGeoSchema.optional(),
  deliveryNotes: z.string().optional(),
  addressVerified: z.boolean().optional(),
  addressVerifiedAt: z.string().optional(),
  legacyAddress: addressSchema.optional(),
  isVerified: z.boolean().optional(),
  languagePreference: languagePreferenceSchema.optional(),
  emailPreferences: emailPreferencesSchema.optional(),
  emailStatus: z.enum(["active", "bounced", "blocked", "invalid"]).optional(),
  area: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  isActive: z.boolean().optional(),
  totalOrders: z.number().optional(),
  dailyOrdersCount: z.number().optional(),
  weeklyOrdersCount: z.number().optional(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

export const createUserBodySchema = z.object({
  name: nonEmptyString,
  email: z.string().trim().email(),
  password: z.string().min(6),
  role: z.enum(["user", "admin"]).default("user"),
  phone: z.string().optional(),
  address: addressSchema.optional(),
  languagePreference: languagePreferenceSchema.optional(),
  joined: z.union([z.string(), z.date()]).optional(),
  status: z.string().optional(),
  credits: z.number().optional(),
  isVerified: z.boolean().optional(),
  nickname: z.string().optional(),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;

export const updateUserBodySchema = z
  .object({
    userID: z.string().trim().optional(),
    name: nonEmptyString.optional(),
    nickname: z.string().optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().optional(),
    status: z.string().optional(),
    address: addressSchema.optional(),
    languagePreference: languagePreferenceSchema.optional(),
    emailPreferences: emailPreferencesSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;

export const usersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional().default(""),
  searchType: z.enum(["all", "name", "email", "userID", "phone"]).optional().default("all"),
});

export type UsersQuery = z.infer<typeof usersQuerySchema>;

export const userIdParamSchema = z.object({
  id: mongoIdSchema,
});

export const changePasswordBodySchema = z.object({
  currentPassword: nonEmptyString,
  newPassword: z.string().min(6),
});

export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;

export const balanceMutationTypeSchema = z.enum([
  "credits",
  "twoDishVoucher",
  "threeDishVoucher",
  "weeklySIXmeals",
  "weeklyEIGHTmeals",
  "weeklyTENmeals",
  "weeklyTWELVEmeals",
  "weeklyFOURTEENmeals",
  "weeklySIXTEENmeals",
]);

export const updateBalanceBodySchema = z.object({
  type: balanceMutationTypeSchema.optional(),
  field: balanceMutationTypeSchema.optional(),
  amount: z.coerce.number(),
  operation: z.enum(["add", "deduct"]),
  reason: z.string().optional(),
  note: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().optional(),
}).refine((value) => Boolean(value.type || value.field), {
  message: "A balance field is required",
  path: ["field"],
});

export type UpdateBalanceBody = z.infer<typeof updateBalanceBodySchema>;
