import type { RoutingStop } from "@/lib/agents/delivery/types";
import type { RouteOptimizerPreviewRequest } from "@/lib/integrations/route-optimizer/types";

export const SIMPLE_ROUTE_PREVIEW_START_TIME = "10:00";

export function buildSimpleRoutePreviewPayload(input: {
  deliveryDate: string;
  stops: RoutingStop[];
  kitchenAddress: string;
}): RouteOptimizerPreviewRequest {
  return {
    created_by_integration: "kapioo-admin",
    external_id: `kapioo-simple-preview:${input.deliveryDate}`,
    run: {
      run_date: input.deliveryDate,
      driver_name: "Simple Preview",
      start_location: input.kitchenAddress,
      start_time: SIMPLE_ROUTE_PREVIEW_START_TIME,
      travel_mode: "driving",
    },
    customers: input.stops.map((stop) => stop.routeOptimizer),
  };
}
