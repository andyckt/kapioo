import { z } from "zod";

export const etransferPaymentIntentBodySchema = z.object({
  submissionKey: z.string().uuid(),
  requestKind: z.enum(["daily", "weekly"]),
  planId: z.string().trim().min(1),
  payerEmail: z.string().trim().email(),
  amountCents: z.coerce.number().int().positive().max(10_000_000),
});

export type EtransferPaymentIntentBody = z.infer<
  typeof etransferPaymentIntentBodySchema
>;
