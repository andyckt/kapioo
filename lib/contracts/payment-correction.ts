import { z } from "zod";

import { nonEmptyString } from "@/lib/contracts/common";

export const paymentCorrectionReasonSchema = z.enum([
  "payer_email_mismatch",
  "payment_not_found",
  "amount_mismatch",
  "other",
]);

export const correctPaymentInfoBodySchema = z.object({
  requestKind: z.enum(["daily", "weekly"]),
  requestId: nonEmptyString,
  payerEmail: z.string().trim().email(),
});

export type PaymentCorrectionReasonInput = z.infer<typeof paymentCorrectionReasonSchema>;
