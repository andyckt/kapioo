import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentResetFinalRouteRunsBodySchema } from "@/lib/contracts/delivery-agent";
import {
  FinalRouteResetError,
  resetFinalRouteRuns,
} from "@/lib/agents/delivery/final-route-run/reset-final-route-runs";

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(request, deliveryAgentResetFinalRouteRunsBodySchema);
    if (error) {
      return error;
    }

    const resetBy = actor.user.email?.trim() || actor.user.id?.toString() || "admin";
    const result = await resetFinalRouteRuns({
      ...data,
      resetBy,
    });

    return successJson(result);
  } catch (error: unknown) {
    if (error instanceof FinalRouteResetError) {
      return errorJson(error.message, 400);
    }

    return handleRouteError(error, "POST /api/admin/delivery-agent/reset-final-route-runs");
  }
}
