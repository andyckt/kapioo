import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { KitchenStartLocationConfigError } from "@/lib/agents/delivery/kitchen-start-location";
import { previewSimpleRouteForAgent } from "@/lib/agents/delivery/preview-simple-route";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentSimpleRoutePreviewBodySchema } from "@/lib/contracts/delivery-agent";
import {
  RouteOptimizerAuthError,
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

    const { data, error } = await parseJsonBody(request, deliveryAgentSimpleRoutePreviewBodySchema);
    if (error) {
      return error;
    }

    const result = await previewSimpleRouteForAgent(data.deliveryDate);
    return successJson(result);
  } catch (error: unknown) {
    if (error instanceof DeliveryAgentPlanningBlockedError) {
      return errorJson("Route preview is blocked", 409, {
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

    if (error instanceof RouteOptimizerAuthError) {
      return errorJson("Route Optimizer authentication failed.", 502, {
        details: error.message,
      });
    }

    if (error instanceof RouteOptimizerValidationError) {
      return errorJson("Route Optimizer rejected the preview request.", 422, {
        details: error.message,
      });
    }

    if (error instanceof RouteOptimizerNetworkError) {
      return errorJson("Could not reach Route Optimizer.", 502, {
        details: error.message,
      });
    }

    if (error instanceof RouteOptimizerResponseError) {
      return errorJson("Route Optimizer returned an invalid response.", 502, {
        details: error.message,
      });
    }

    if (error instanceof OrderDataError) {
      return handleRouteError(
        new Error(error.message),
        "POST /api/admin/delivery-agent/preview-simple-route"
      );
    }

    return handleRouteError(error, "POST /api/admin/delivery-agent/preview-simple-route");
  }
}
