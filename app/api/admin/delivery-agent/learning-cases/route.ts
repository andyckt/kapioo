import { handleRouteError, parseSearchParams, successJson } from "@/lib/api";
import { listDeliveryAgentLearningCasesForReview } from "@/lib/agents/delivery/learning/review/learning-case-review-service";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentLearningReviewListQuerySchema } from "@/lib/contracts/delivery-agent-learning-review";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = parseSearchParams(request, deliveryAgentLearningReviewListQuerySchema);
    if (error) {
      return error;
    }

    const result = await listDeliveryAgentLearningCasesForReview(data);
    return successJson(result);
  } catch (error: unknown) {
    return handleRouteError(error, "GET /api/admin/delivery-agent/learning-cases");
  }
}
