import { z } from "zod";

export const interacPayerEmailBodySchema = z.object({
  email: z.string().trim().email(),
});

export const verifyInteracPayerEmailBodySchema = interacPayerEmailBodySchema.extend({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit verification code"),
});

export type InteracPayerEmailBody = z.infer<typeof interacPayerEmailBodySchema>;
export type VerifyInteracPayerEmailBody = z.infer<typeof verifyInteracPayerEmailBodySchema>;
