import { getDeliveryOrdersForRouting } from "@/lib/agents/delivery/get-delivery-orders-for-routing";
import type { GetDeliveryOrdersForRoutingInput, GetDeliveryOrdersForRoutingResult } from "@/lib/agents/delivery/types";
import { enrichRoutingStops } from "@/lib/agents/delivery/geocode/enrich-routing-stops";
import type {
  DeliveryAgentCoordinateCoverageSummary,
  DeliveryAgentGeocodeEnrichment,
} from "@/lib/agents/delivery/geocode/types";
import { attachGeocodeEnrichment } from "@/lib/agents/delivery/run-log";

export type GetEnrichedDeliveryOrdersForRoutingResult = {
  routing: GetDeliveryOrdersForRoutingResult;
  coordinateCoverage: DeliveryAgentCoordinateCoverageSummary;
  geocodeEnrichment: DeliveryAgentGeocodeEnrichment;
};

export async function getEnrichedDeliveryOrdersForRouting(
  input: GetDeliveryOrdersForRoutingInput & {
    deliveryAgentRunId?: string;
  }
): Promise<GetEnrichedDeliveryOrdersForRoutingResult> {
  const routing = await getDeliveryOrdersForRouting(input);
  const enrichment = await enrichRoutingStops({
    deliveryDate: routing.deliveryDate,
    stops: routing.stops,
  });

  if (input.deliveryAgentRunId?.trim()) {
    await attachGeocodeEnrichment(input.deliveryAgentRunId.trim(), enrichment.geocodeEnrichment);
  }

  return {
    routing: {
      ...routing,
      stops: enrichment.stops,
    },
    coordinateCoverage: enrichment.geocodeEnrichment.coordinateCoverage,
    geocodeEnrichment: enrichment.geocodeEnrichment,
  };
}
