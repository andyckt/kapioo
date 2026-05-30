import { buildSimpleRoutePreviewPayload, SIMPLE_ROUTE_PREVIEW_START_TIME } from "@/lib/agents/delivery/build-simple-route-preview-payload";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { getDeliveryOrdersForRouting } from "@/lib/agents/delivery/get-delivery-orders-for-routing";
import { getKapiooKitchenStartLocation } from "@/lib/agents/delivery/kitchen-start-location";
import { mapRouteOptimizerPreviewResult } from "@/lib/agents/delivery/map-route-optimizer-preview-result";
import { previewDeliveryOrdersForAgent } from "@/lib/agents/delivery/preview-delivery-orders";
import type { DeliveryAgentSimpleRoutePreviewResponse } from "@/lib/contracts/delivery-agent";
import { previewRouteOptimizerRun } from "@/lib/integrations/route-optimizer/client";

const SIMPLE_ROUTE_PREVIEW_NOTES =
  "This is a simple one-run test preview. Smart DT/UT/Self planning will be added later.";

export async function previewSimpleRouteForAgent(
  deliveryDate: string
): Promise<DeliveryAgentSimpleRoutePreviewResponse> {
  const orderPreview = await previewDeliveryOrdersForAgent(deliveryDate);

  if (!orderPreview.canContinueToPlanning) {
    throw new DeliveryAgentPlanningBlockedError(orderPreview.blockingReasons);
  }

  const routing = await getDeliveryOrdersForRouting({
    deliveryDate,
    statuses: ["confirmed"],
  });

  if (routing.stops.length === 0) {
    throw new DeliveryAgentPlanningBlockedError([
      "No confirmed valid stops for this delivery date.",
    ]);
  }

  const kitchenAddress = getKapiooKitchenStartLocation();
  const payload = buildSimpleRoutePreviewPayload({
    deliveryDate,
    stops: routing.stops,
    kitchenAddress,
  });

  const routeResult = await previewRouteOptimizerRun(payload);

  return {
    deliveryDate: orderPreview.deliveryDate,
    routePreview: mapRouteOptimizerPreviewResult(routeResult, {
      deliveryDate,
      startTime: SIMPLE_ROUTE_PREVIEW_START_TIME,
    }),
    sourceSummary: {
      validStops: orderPreview.confirmed.validStops,
      invalidStops: orderPreview.confirmed.invalidStops,
      pendingOrders: orderPreview.pending.count,
      totalMealQuantity: orderPreview.confirmed.totalMealQuantity,
      byArea: orderPreview.confirmed.byArea,
    },
    notes: SIMPLE_ROUTE_PREVIEW_NOTES,
  };
}
