import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import {
  DeliveryAgentPreviewActionInFlightError,
  withDeliveryAgentPreviewActionLock,
} from "@/lib/agents/delivery/candidate-plans/preview-action-lock";
import { previewDeliveryAgentLlmCandidatesForDate } from "@/lib/agents/delivery/llm-planning/preview-llm-candidates-for-date";
import { createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor } from "@/lib/agents/delivery/llm-planning/openai-compatible-provider";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { KitchenStartLocationConfigError } from "@/lib/agents/delivery/kitchen-start-location";
import { mapGeocodeEnrichmentRouteError } from "@/lib/agents/delivery/geocode/map-geocode-enrichment-route-error";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentLlmCandidatePreviewBodySchema } from "@/lib/contracts/delivery-agent";
import {
  RouteOptimizerConfigError,
  RouteOptimizerNetworkError,
  RouteOptimizerResponseError,
  RouteOptimizerValidationError,
} from "@/lib/integrations/route-optimizer/errors";
import { OrderDataError } from "@/lib/order-data/errors";

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(
      request,
      deliveryAgentLlmCandidatePreviewBodySchema
    );
    if (error) {
      return error;
    }

    const allowProviderCall = data.allowProviderCall === true;
    const result = await withDeliveryAgentPreviewActionLock(
      `llm-candidate-preview:${data.deliveryDate}`,
      () =>
        previewDeliveryAgentLlmCandidatesForDate({
          deliveryDate: data.deliveryDate,
          profileId: data.profileId,
          includeHistoricalPackage: data.includeHistoricalPackage,
          forceRefresh: data.forceRefresh,
          allowProviderCall,
          provider: allowProviderCall
            ? createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor()
            : undefined,
        })
    );

    return successJson(result);
  } catch (error: unknown) {
    if (error instanceof DeliveryAgentPreviewActionInFlightError) {
      return errorJson("LLM candidate preview is already running", 409, {
        details: error.message,
      });
    }

    if (error instanceof DeliveryAgentPlanningBlockedError) {
      return errorJson("LLM candidate preview is blocked", 409, {
        details: error.blockingReasons.join(" "),
        extra: { blockingReasons: error.blockingReasons },
      });
    }

    if (error instanceof KitchenStartLocationConfigError) {
      return errorJson(
        "Kitchen start location is not configured. Set KAPIOO_KITCHEN_START_LOCATION.",
        503,
        { details: error.message }
      );
    }

    if (error instanceof RouteOptimizerConfigError) {
      return errorJson(
        "Route Optimizer is not configured. Set ROUTE_OPTIMIZER_BASE_URL and ROUTE_OPTIMIZER_API_KEY.",
        503,
        { details: error.message }
      );
    }

    const geocodeError = mapGeocodeEnrichmentRouteError(error);
    if (geocodeError) {
      return geocodeError;
    }

    if (
      error instanceof RouteOptimizerNetworkError ||
      error instanceof RouteOptimizerResponseError ||
      error instanceof RouteOptimizerValidationError
    ) {
      return errorJson("Route Optimizer preview failed during LLM candidate preview.", 502, {
        details: error instanceof Error ? error.message : String(error),
      });
    }

    if (error instanceof OrderDataError) {
      return errorJson("Order data error during LLM candidate preview.", 500, {
        details: error.message,
      });
    }

    return handleRouteError(error, "llm-candidate-preview");
  }
}
