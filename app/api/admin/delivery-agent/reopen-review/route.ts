import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentReopenReviewBodySchema } from "@/lib/contracts/delivery-agent";
import {
  DeliveryAgentReopenReviewError,
  reopenDonaldPlanReview,
} from "@/lib/agents/delivery/review-plan/reopen-donald-plan-review";

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(request, deliveryAgentReopenReviewBodySchema);
    if (error) {
      return error;
    }

    const reopenedBy = actor.user.email?.trim() || actor.user.id?.toString() || "admin";
    const result = await reopenDonaldPlanReview({
      ...data,
      reopenedBy,
    });

    return successJson(result);
  } catch (error: unknown) {
    if (error instanceof DeliveryAgentReopenReviewError) {
      return errorJson(error.message, 400);
    }

    return handleRouteError(error, "POST /api/admin/delivery-agent/reopen-review");
  }
}
