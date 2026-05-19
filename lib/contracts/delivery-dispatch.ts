import { z } from "zod";

export const deliveryDispatchSourceSchema = z.enum(["route-optimizer"]);

export const deliveryDispatchSchema = z.object({
  eta: z.string().datetime(),
  dispatchedAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
  stopId: z.string().trim().min(1).optional(),
  driverId: z.string().trim().min(1).optional(),
  source: deliveryDispatchSourceSchema,
  note: z.string().trim().min(1).optional(),
});

export type DeliveryDispatch = z.infer<typeof deliveryDispatchSchema>;

export const routeOptimizerDeliveryStartedBodySchema = z.object({
  orderIds: z.array(z.string().trim().min(1)).min(1).max(50),
  eta: z.string().datetime(),
  startedAt: z.string().datetime(),
  stopId: z.string().trim().min(1).optional(),
  driverId: z.string().trim().min(1).optional(),
  note: z.string().trim().min(1).optional(),
});

export type RouteOptimizerDeliveryStartedBody = z.infer<
  typeof routeOptimizerDeliveryStartedBodySchema
>;

export const deliveryDispatchSkippedReasonSchema = z.enum(["terminal-status"]);
export type DeliveryDispatchSkippedReason = z.infer<
  typeof deliveryDispatchSkippedReasonSchema
>;

export type DeliveryDispatchUpdatedOrder = {
  orderId: string;
};

export type DeliveryDispatchSkippedOrder = {
  orderId: string;
  reason: DeliveryDispatchSkippedReason;
  status?: string;
};

export type DeliveryDispatchMissingOrder = {
  orderId: string;
};

export type ApplyDeliveryDispatchResult = {
  updated: DeliveryDispatchUpdatedOrder[];
  skipped: DeliveryDispatchSkippedOrder[];
  missing: DeliveryDispatchMissingOrder[];
  stopId?: string;
};
