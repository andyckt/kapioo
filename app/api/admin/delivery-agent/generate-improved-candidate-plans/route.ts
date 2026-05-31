import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { generateImprovedCandidatePlansForAgent } from "@/lib/agents/delivery/candidate-plans/generate-improved-candidate-plans";
import {
  DeliveryAgentRegenerationBlockedError,
  DeliveryAgentRegenerationValidationError,
} from "@/lib/agents/delivery/candidate-plans/generate-improved-candidate-plans";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { KitchenStartLocationConfigError } from "@/lib/agents/delivery/kitchen-start-location";
import { mapGeocodeEnrichmentRouteError } from "@/lib/agents/delivery/geocode/map-geocode-enrichment-route-error";
import { DeliveryAgentReviewLockedError } from "@/lib/agents/delivery/review-plan/submit-donald-plan-review";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentGenerateImprovedCandidatePlansBodySchema } from "@/lib/contracts/delivery-agent";
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
      deliveryAgentGenerateImprovedCandidatePlansBodySchema
    );
    if (error) {
      return error;
    }

    const generatedBy = actor.user.email?.trim() || actor.user.id?.toString() || "admin";

    const result = await generateImprovedCandidatePlansForAgent({
      deliveryDate: data.deliveryDate,
      profileId: data.profileId,
      deliveryAgentRunId: data.deliveryAgentRunId,
      generatedBy,
    });

    return successJson(result);
  } catch (error: unknown) {
    if (error instanceof DeliveryAgentReviewLockedError) {
      return errorJson(error.message, 409, { details: error.message });
    }

    if (error instanceof DeliveryAgentRegenerationBlockedError) {
      return errorJson(error.message, 400, { details: error.message });
    }

    if (error instanceof DeliveryAgentRegenerationValidationError) {
      return errorJson(error.message, 422, { details: error.message });
    }

    if (error instanceof DeliveryAgentPlanningBlockedError) {
      return errorJson("Improved candidate generation is blocked", 409, {
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
      return errorJson("Route Optimizer preview failed during improved candidate generation.", 502, {
        details: error instanceof Error ? error.message : String(error),
      });
    }

    if (error instanceof OrderDataError) {
      return errorJson("Order data error during improved candidate generation.", 500, {
        details: error.message,
      });
    }

    return handleRouteError(error, "generate-improved-candidate-plans");
  }
}
