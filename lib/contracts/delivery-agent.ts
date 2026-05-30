import { z } from "zod";

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export const deliveryAgentPreviewQuerySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
});

export const deliveryAgentSimpleRoutePreviewBodySchema = z.object({
  deliveryDate: z.string().regex(DATE_YYYY_MM_DD, "deliveryDate must be YYYY-MM-DD"),
});

export type DeliveryAgentPreviewQuery = z.infer<typeof deliveryAgentPreviewQuerySchema>;

export type DeliveryAgentSimpleRoutePreviewBody = z.infer<
  typeof deliveryAgentSimpleRoutePreviewBodySchema
>;

export type DeliveryAgentPreviewStop = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  area: string;
  formattedAddress: string;
  totalMealQuantity: number;
  warningsCount: number;
};

export type DeliveryAgentPreviewInvalidOrder = {
  orderId: string;
  customerName?: string;
  area?: string;
  errors: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
};

export type DeliveryAgentPreviewWarning = {
  orderId: string;
  warnings: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
};

export type DeliveryAgentPreviewPendingOrder = {
  orderId: string;
  customerName: string;
  area: string;
  formattedAddress: string;
  totalMealQuantity: number;
  status: "pending";
};

export type DeliveryAgentPreviewResponse = {
  deliveryDate: string;
  queriedAt: string;
  confirmed: {
    totalStops: number;
    validStops: number;
    invalidStops: number;
    warningStops: number;
    totalMealQuantity: number;
    byArea: Record<string, number>;
    byStatus: Record<string, number>;
    stops: DeliveryAgentPreviewStop[];
    invalid: DeliveryAgentPreviewInvalidOrder[];
    warnings: DeliveryAgentPreviewWarning[];
  };
  pending: {
    count: number;
    orders: DeliveryAgentPreviewPendingOrder[];
  };
  canContinueToPlanning: boolean;
  blockingReasons: string[];
  notes: string;
};

export type DeliveryAgentSimpleRoutePreviewStop = {
  sequence: number;
  name?: string;
  address?: string;
  eta?: string;
  orderIds: string[];
};

export type DeliveryAgentSimpleRoutePreviewResult = {
  status?: string;
  totalDurationMinutes?: number;
  totalDistanceKm?: number;
  estimatedFinishTime?: string;
  stopCount: number;
  optimizedStops: DeliveryAgentSimpleRoutePreviewStop[];
  warnings: unknown[];
  validationErrors: unknown[];
  geocodeFailures: unknown[];
};

export type DeliveryAgentSimpleRoutePreviewSourceSummary = {
  validStops: number;
  invalidStops: number;
  pendingOrders: number;
  totalMealQuantity: number;
  byArea: Record<string, number>;
};

export type DeliveryAgentSimpleRoutePreviewResponse = {
  deliveryDate: string;
  routePreview: DeliveryAgentSimpleRoutePreviewResult;
  sourceSummary: DeliveryAgentSimpleRoutePreviewSourceSummary;
  notes: string;
};
