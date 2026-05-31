import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type { RouteOptimizerPreviewRequest } from "@/lib/integrations/route-optimizer/types";

/** @deprecated Use planning profile `timeRules.normalKitchenStartTime` instead. */
export const SIMPLE_ROUTE_PREVIEW_START_TIME =
  getDefaultDeliveryPlanningProfile().timeRules.normalKitchenStartTime;

export function buildSimpleRoutePreviewPayload(input: {
  deliveryDate: string;
  stops: RoutingStop[];
  kitchenAddress: string;
  startTime?: string;
}): RouteOptimizerPreviewRequest {
  const startTime =
    input.startTime?.trim() ||
    getDefaultDeliveryPlanningProfile().timeRules.normalKitchenStartTime;

  return {
    created_by_integration: "kapioo-admin",
    external_id: `kapioo-simple-preview:${input.deliveryDate}`,
    run: {
      run_date: input.deliveryDate,
      driver_name: "Simple Preview",
      start_location: input.kitchenAddress,
      start_time: startTime,
      travel_mode: "driving",
    },
    customers: input.stops.map((stop) => ({
      ...stop.routeOptimizer,
      ...(typeof stop.lat === "number" && typeof stop.lng === "number"
        ? {
            lat: stop.lat,
            lng: stop.lng,
            geocode_status: stop.routeOptimizer.geocode_status ?? "OK",
          }
        : {}),
    })),
  };
}
