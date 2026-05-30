import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import {
  createFinalRouteRunFromApprovedPlan,
  FinalRouteOptimizerCreationError,
  FinalRouteRunStateError,
} from "@/lib/agents/delivery/final-route-run";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentCreateFinalRouteRunBodySchema } from "@/lib/contracts/delivery-agent";
import {
  RouteOptimizerAuthError,
  RouteOptimizerConfigError,
  RouteOptimizerNetworkError,
  RouteOptimizerResponseError,
  RouteOptimizerValidationError,
} from "@/lib/integrations/route-optimizer/errors";

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(
      request,
      deliveryAgentCreateFinalRouteRunBodySchema
    );
    if (error) {
      return error;
    }

    const createdBy = actor.user.email?.trim() || actor.user.id?.toString() || "admin";
    const result = await createFinalRouteRunFromApprovedPlan({
      deliveryDate: data.deliveryDate,
      profileId: data.profileId,
      deliveryAgentRunId: data.deliveryAgentRunId,
      createdBy,
    });

    return successJson(result);
  } catch (error: unknown) {
    if (error instanceof FinalRouteRunStateError) {
      return errorJson(error.message, 400);
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
      return errorJson("Route Optimizer rejected the final route request.", 422, {
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

    if (error instanceof FinalRouteOptimizerCreationError) {
      return errorJson(error.message, 502, {
        errorCode: error.code,
        details: error.downstreamBodyPreview,
        extra: {
          downstreamEndpoint: error.downstreamPath,
          downstreamStatusCode: error.downstreamStatus,
        },
      });
    }

    return handleRouteError(error, "POST /api/admin/delivery-agent/create-final-route-run");
  }
}
