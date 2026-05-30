import { errorJson, handleRouteError, parseSearchParams, successJson } from "@/lib/api";
import {
  DeliveryPlanningProfileNotFoundError,
  getDeliveryPlanningProfile,
  toDeliveryPlanningProfileSummary,
} from "@/lib/agents/delivery/planning-profile";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentPlanningProfileQuerySchema } from "@/lib/contracts/delivery-agent";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = parseSearchParams(request, deliveryAgentPlanningProfileQuerySchema);
    if (error) {
      return error;
    }

    const profile = getDeliveryPlanningProfile(data.profileId);
    return successJson(toDeliveryPlanningProfileSummary(profile));
  } catch (error: unknown) {
    if (error instanceof DeliveryPlanningProfileNotFoundError) {
      return errorJson("Planning profile not found", 404, {
        details: error.message,
      });
    }

    return handleRouteError(error, "GET /api/admin/delivery-agent/planning-profile");
  }
}
