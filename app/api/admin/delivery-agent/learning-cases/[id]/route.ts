import { handleRouteError, parseJsonBody, successJson, type RouteContext } from "@/lib/api";
import {
  getDeliveryAgentLearningCaseReviewDetail,
  updateDeliveryAgentLearningCaseReview,
} from "@/lib/agents/delivery/learning/review/learning-case-review-service";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentLearningCaseReviewBodySchema } from "@/lib/contracts/delivery-agent-learning-review";

export async function GET(request: Request, { params }: RouteContext<{ id: string }>) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { id } = await params;
    const result = await getDeliveryAgentLearningCaseReviewDetail(id);
    return successJson(result);
  } catch (error: unknown) {
    return handleRouteError(error, "GET /api/admin/delivery-agent/learning-cases/[id]");
  }
}

export async function PATCH(request: Request, { params }: RouteContext<{ id: string }>) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(request, deliveryAgentLearningCaseReviewBodySchema);
    if (error) {
      return error;
    }

    const { id } = await params;
    const reviewedBy = actor.user.email?.trim() || actor.user.id?.toString() || "admin";
    const result = await updateDeliveryAgentLearningCaseReview({
      id,
      body: data,
      reviewedBy,
    });

    return successJson(result);
  } catch (error: unknown) {
    return handleRouteError(error, "PATCH /api/admin/delivery-agent/learning-cases/[id]");
  }
}
