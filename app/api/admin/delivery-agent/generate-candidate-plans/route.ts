import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { generateCandidatePlansForAgent } from "@/lib/agents/delivery/candidate-plans";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentGenerateCandidatePlansBodySchema } from "@/lib/contracts/delivery-agent";
import { OrderDataError } from "@/lib/order-data/errors";

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(
      request,
      deliveryAgentGenerateCandidatePlansBodySchema
    );
    if (error) {
      return error;
    }

    const result = await generateCandidatePlansForAgent(data.deliveryDate);
    return successJson(result);
  } catch (error: unknown) {
    if (error instanceof DeliveryAgentPlanningBlockedError) {
      return errorJson("Candidate plan generation is blocked", 409, {
        details: error.blockingReasons.join(" "),
        extra: { blockingReasons: error.blockingReasons },
      });
    }

    if (error instanceof OrderDataError) {
      return handleRouteError(
        new Error(error.message),
        "POST /api/admin/delivery-agent/generate-candidate-plans"
      );
    }

    return handleRouteError(error, "POST /api/admin/delivery-agent/generate-candidate-plans");
  }
}
