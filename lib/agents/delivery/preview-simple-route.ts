import { buildSimpleRoutePreviewPayload } from "@/lib/agents/delivery/build-simple-route-preview-payload";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { getEnrichedDeliveryOrdersForRouting } from "@/lib/agents/delivery/geocode";
import { getKapiooKitchenStartLocation } from "@/lib/agents/delivery/kitchen-start-location";
import { mapRouteOptimizerPreviewResult } from "@/lib/agents/delivery/map-route-optimizer-preview-result";
import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { previewDeliveryOrdersForAgent } from "@/lib/agents/delivery/preview-delivery-orders";
import type { DeliveryAgentSimpleRoutePreviewResponse } from "@/lib/contracts/delivery-agent";
import { previewRouteOptimizerRun } from "@/lib/integrations/route-optimizer/client";

const SIMPLE_ROUTE_PREVIEW_NOTES =
  "This is a simple one-run test preview. Smart DT/UT/Self planning will be added later.";

export async function previewSimpleRouteForAgent(
  deliveryDate: string
): Promise<DeliveryAgentSimpleRoutePreviewResponse> {
  const planningProfile = getDefaultDeliveryPlanningProfile();
  const startTime = planningProfile.timeRules.normalKitchenStartTime;

  const orderPreview = await previewDeliveryOrdersForAgent(deliveryDate);

  if (!orderPreview.canContinueToPlanning) {
    throw new DeliveryAgentPlanningBlockedError(orderPreview.blockingReasons);
  }

  const enriched = await getEnrichedDeliveryOrdersForRouting({
    deliveryDate,
    statuses: ["confirmed"],
  });

  if (enriched.routing.stops.length === 0) {
    throw new DeliveryAgentPlanningBlockedError([
      "No confirmed valid stops for this delivery date.",
    ]);
  }

  const kitchenAddress = getKapiooKitchenStartLocation();
  const payload = buildSimpleRoutePreviewPayload({
    deliveryDate,
    stops: enriched.routing.stops,
    kitchenAddress,
    startTime,
  });

  const routeResult = await previewRouteOptimizerRun(payload);

  return {
    deliveryDate: orderPreview.deliveryDate,
    routePreview: mapRouteOptimizerPreviewResult(routeResult, {
      deliveryDate,
      startTime,
    }),
    sourceSummary: {
      validStops: orderPreview.confirmed.validStops,
      invalidStops: orderPreview.confirmed.invalidStops,
      pendingOrders: orderPreview.pending.count,
      totalMealQuantity: orderPreview.confirmed.totalMealQuantity,
      byArea: orderPreview.confirmed.byArea,
    },
    notes: SIMPLE_ROUTE_PREVIEW_NOTES,
    coordinateCoverage: enriched.coordinateCoverage,
  };
}
