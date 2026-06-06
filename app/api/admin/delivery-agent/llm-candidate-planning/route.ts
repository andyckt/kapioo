import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { runDeliveryAgentLlmCandidatePlanningForDate } from "@/lib/agents/delivery/llm-planning/candidate-planning-for-date";
import { DeliveryPlanningProfileNotFoundError } from "@/lib/agents/delivery/planning-profile";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentLlmCandidatePlanningBodySchema } from "@/lib/contracts/delivery-agent";
import { OrderDataError } from "@/lib/order-data/errors";

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(
      request,
      deliveryAgentLlmCandidatePlanningBodySchema
    );
    if (error) {
      return error;
    }

    const result = await runDeliveryAgentLlmCandidatePlanningForDate({
      deliveryDate: data.deliveryDate,
      profileId: data.profileId,
      includeHistoricalPackage: data.includeHistoricalPackage,
      forceRefresh: data.forceRefresh,
      allowProviderCall: false,
    });

    return successJson(result);
  } catch (error: unknown) {
    if (error instanceof DeliveryPlanningProfileNotFoundError) {
      return errorJson("Planning profile not found", 404, {
        details: error.message,
      });
    }

    if (error instanceof DeliveryAgentPlanningBlockedError) {
      return errorJson("LLM candidate planning is blocked", 409, {
        details: error.blockingReasons.join(" "),
        extra: { blockingReasons: error.blockingReasons },
      });
    }

    if (error instanceof OrderDataError) {
      return handleRouteError(
        new Error(error.message),
        "POST /api/admin/delivery-agent/llm-candidate-planning"
      );
    }

    return handleRouteError(error, "POST /api/admin/delivery-agent/llm-candidate-planning");
  }
}
