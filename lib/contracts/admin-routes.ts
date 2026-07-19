import { z } from "zod";

import { mongoIdSchema, paginationQuerySchema } from "@/lib/contracts/common";

/** Query for GET /api/admin/update-combo-text */
export const updateComboTextQuerySchema = z.object({
  dryRun: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  apply: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type UpdateComboTextQuery = z.infer<typeof updateComboTextQuerySchema>;

/** Query for GET /api/admin/eligible-users */
export const adminEligibleUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional().default(""),
  idsOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type AdminEligibleUsersQuery = z.infer<typeof adminEligibleUsersQuerySchema>;

/** Query for GET /api/admin/promo-codes */
export const adminPromoCodesListQuerySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
});

export type AdminPromoCodesListQuery = z.infer<typeof adminPromoCodesListQuerySchema>;

/** Query for GET /api/admin/promo-codes/[id]/redemptions */
export const adminPromoRedemptionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(100),
});

export type AdminPromoRedemptionsQuery = z.infer<typeof adminPromoRedemptionsQuerySchema>;

const optionalCoercedBoolean = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (typeof v === "boolean") return v;
    const s = String(v).toLowerCase();
    return s === "true" || s === "1";
  });

/** Body for POST /api/admin/next-week-email-jobs */
export const adminNextWeekEmailJobPostBodySchema = z
  .object({
    userIds: z.array(z.string()).optional().default([]),
    emails: z.array(z.string()).optional().default([]),
    createdBy: z.string().optional(),
    dryRun: optionalCoercedBoolean,
  })
  .refine((data) => !(data.userIds.length > 0 && data.emails.length > 0), {
    message: "Provide either userIds or emails, not both",
  });

export type AdminNextWeekEmailJobPostBody = z.infer<
  typeof adminNextWeekEmailJobPostBodySchema
>;

/** Body for POST /api/admin/notify-next-week-menu */
export const adminNotifyNextWeekMenuPostBodySchema = z.object({
  userIds: z.array(z.string()).optional(),
  testMode: optionalCoercedBoolean,
  testEmail: z.string().optional(),
  testBatchMode: optionalCoercedBoolean,
});

export type AdminNotifyNextWeekMenuPostBody = z.infer<
  typeof adminNotifyNextWeekMenuPostBodySchema
>;

/** Body for POST /api/admin/promo-codes (create) */
export const adminCreatePromoCodeBodySchema = z
  .object({
    code: z.string(),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.union([z.number(), z.string()]),
    description: z.string().optional(),
    active: z.boolean().optional(),
    startsAt: z.string().optional(),
    expiresAt: z.string().optional(),
    maxUses: z.union([z.number(), z.string()]).optional(),
    oneUsePerUser: z.boolean().optional(),
    promoOnlyEmt: z.boolean().optional(),
    appliesTo: z.string().optional(),
    isReferralPromo: z.boolean().optional().default(false),
    referrerUserId: z.string().optional(),
    refereeUserId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isReferralPromo) {
      return;
    }

    const referrerUserId = data.referrerUserId?.trim();
    const refereeUserId = data.refereeUserId?.trim();

    if (!referrerUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Referrer account is required for referral promos",
        path: ["referrerUserId"],
      });
    }

    if (!refereeUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Referee account is required for referral promos",
        path: ["refereeUserId"],
      });
    }

    if (referrerUserId && !mongoIdSchema.safeParse(referrerUserId).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid referrer user id",
        path: ["referrerUserId"],
      });
    }

    if (refereeUserId && !mongoIdSchema.safeParse(refereeUserId).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid referee user id",
        path: ["refereeUserId"],
      });
    }

    if (referrerUserId && refereeUserId && referrerUserId === refereeUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Referrer and referee must be different users",
        path: ["refereeUserId"],
      });
    }
  });

export type AdminCreatePromoCodeBody = z.infer<typeof adminCreatePromoCodeBodySchema>;

/** Body for PATCH /api/admin/promo-codes/[id] — partial updates, extra keys ignored */
export const adminPatchPromoCodeBodySchema = z.record(z.unknown());
