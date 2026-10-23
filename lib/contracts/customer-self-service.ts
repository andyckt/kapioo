import { z } from "zod";

export const orderReferenceSchema = z.object({
  kind: z.enum(["daily", "weekly"]),
  orderId: z.string().trim().min(1).max(64),
}).strict();
export type OrderReference = z.infer<typeof orderReferenceSchema>;

export type OrderActionAvailability = {
  addressUntil: string | null;
  cancelUntil: string | null;
};

export const addressChoiceSchema = z.object({
  placeId: z.string().trim().min(1).max(300),
  unitNumber: z.string().trim().max(80).default(""),
  buzzCode: z.string().trim().max(80).default(""),
}).strict();

export const customerChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), order: orderReferenceSchema }).strict(),
  z.object({
    action: z.literal("address"),
    orders: z.array(orderReferenceSchema).min(1).max(50),
    address: addressChoiceSchema,
    saveForFuture: z.boolean().default(false),
  }).strict(),
]);
export type CustomerChangeInput = z.infer<typeof customerChangeSchema>;

export type OrderChangePreview = {
  operationId?: string;
  action: "cancel" | "address";
  orders: Array<OrderReference & { dates: string[]; address: string; cutoff: string }>;
  groupId?: string;
  groupCutoff?: string;
  refunds: Array<{ field: string; amount: number }>;
  newAddress?: Record<string, unknown>;
  saveForFuture?: boolean;
  expiresAt?: string;
};
