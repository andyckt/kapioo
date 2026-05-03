import { z } from "zod";

import { nonEmptyString } from "@/lib/contracts/common";

export const emailSchema = z.string().trim().email();

export const passwordResetRequestBodySchema = z.object({
  email: emailSchema,
});

export type PasswordResetRequestBody = z.infer<typeof passwordResetRequestBodySchema>;

export const resetPasswordBodySchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object") {
      return value;
    }

    const input = value as Record<string, unknown>;
    if (typeof input.newPassword !== "string" && typeof input.password === "string") {
      return {
        ...input,
        newPassword: input.password,
      };
    }

    return value;
  },
  z.object({
    email: emailSchema,
    code: nonEmptyString,
    newPassword: z.string().min(6),
  })
);

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

export const verificationCodeBodySchema = z.object({
  email: emailSchema.optional(),
  phone: z.string().optional(),
  code: nonEmptyString.optional(),
});

export type VerificationCodeBody = z.infer<typeof verificationCodeBodySchema>;

export const emailOnlyBodySchema = z.object({
  email: emailSchema,
});

export type EmailOnlyBody = z.infer<typeof emailOnlyBodySchema>;

export const emailCodeBodySchema = z.object({
  email: emailSchema,
  code: nonEmptyString,
});

export type EmailCodeBody = z.infer<typeof emailCodeBodySchema>;

export const sendVerificationBodySchema = z.object({
  email: emailSchema,
  name: nonEmptyString,
  code: nonEmptyString,
  language: z.enum(["zh", "en"]).optional(),
});

export type SendVerificationBody = z.infer<typeof sendVerificationBodySchema>;

export const userIdBodySchema = z.object({
  userId: nonEmptyString,
});

export type UserIdBody = z.infer<typeof userIdBodySchema>;

export const phoneOnlyBodySchema = z.object({
  phone: nonEmptyString,
});

export type PhoneOnlyBody = z.infer<typeof phoneOnlyBodySchema>;

export const adminMfaActionBodySchema = z
  .object({
    action: z.enum(["send", "verify"]).default("send"),
    code: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "verify" && !value.code?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Verification code is required",
        path: ["code"],
      });
    }
  });

export type AdminMfaActionBody = z.infer<typeof adminMfaActionBodySchema>;
