import { z } from "zod";

export const proofOfDeliverySourceSchema = z.enum(["route-optimizer", "admin-manual"]);

export const proofOfDeliverySchema = z.object({
  imageUrl: z.string().url(),
  imageKey: z.string().trim().min(1).optional(),
  capturedAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
  stopId: z.string().trim().min(1).optional(),
  driverId: z.string().trim().min(1).optional(),
  source: proofOfDeliverySourceSchema,
  note: z.string().trim().min(1).optional(),
});

export type ProofOfDelivery = z.infer<typeof proofOfDeliverySchema>;

export const routeOptimizerProofOfDeliveryBodySchema = z.object({
  orderIds: z.array(z.string().trim().min(1)).min(1).max(50),
  podImage: z.object({
    url: z.string().url().refine((value) => value.startsWith("https://"), {
      message: "POD image URL must use https",
    }),
    key: z.string().trim().min(1).optional(),
  }),
  capturedAt: z.string().datetime(),
  stopId: z.string().trim().min(1).optional(),
  driverId: z.string().trim().min(1).optional(),
  note: z.string().trim().min(1).optional(),
});

export type RouteOptimizerProofOfDeliveryBody = z.infer<
  typeof routeOptimizerProofOfDeliveryBodySchema
>;

export const proofOfDeliveryServiceSchema = z.enum(["daily", "weekly"]);
export type ProofOfDeliveryService = z.infer<typeof proofOfDeliveryServiceSchema>;

export const proofOfDeliverySkippedReasonSchema = z.enum([
  "already-delivered-with-pod",
  "terminal-status",
]);
export type ProofOfDeliverySkippedReason = z.infer<typeof proofOfDeliverySkippedReasonSchema>;

export type ProofOfDeliveryUpdatedOrder = {
  orderId: string;
  service: ProofOfDeliveryService;
};

export type ProofOfDeliverySkippedOrder = {
  orderId: string;
  service: ProofOfDeliveryService;
  reason: ProofOfDeliverySkippedReason;
  status?: string;
};

export type ProofOfDeliveryMissingOrder = {
  orderId: string;
};

export type ApplyProofOfDeliveryResult = {
  updated: ProofOfDeliveryUpdatedOrder[];
  skipped: ProofOfDeliverySkippedOrder[];
  missing: ProofOfDeliveryMissingOrder[];
  stopId?: string;
};
