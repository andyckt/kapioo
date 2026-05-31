import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { getDonaldPlanReview, submitDonaldPlanReview } from "@/lib/agents/delivery/review-plan";
import {
  DeliveryAgentReviewLockedError,
  DeliveryAgentReviewValidationError,
} from "@/lib/agents/delivery/review-plan/submit-donald-plan-review";
import { requireAdminMfa } from "@/lib/auth/guards";
import {
  deliveryAgentReviewPlanBodySchema,
  deliveryAgentReviewPlanQuerySchema,
  type DeliveryAgentPreviewCandidatePlansResponse,
  type DeliveryAgentRecommendedPlanSummary,
} from "@/lib/contracts/delivery-agent";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const url = new URL(request.url);
    const parsed = deliveryAgentReviewPlanQuerySchema.safeParse({
      deliveryDate: url.searchParams.get("deliveryDate") ?? "",
      profileId: url.searchParams.get("profileId") ?? "",
    });

    if (!parsed.success) {
      return errorJson("Invalid query parameters", 400, {
        details: parsed.error.issues.map((issue) => issue.message).join(" "),
      });
    }

    const result = await getDonaldPlanReview(parsed.data);
    return successJson(result);
  } catch (error: unknown) {
    return handleRouteError(error, "GET /api/admin/delivery-agent/review-plan");
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(request, deliveryAgentReviewPlanBodySchema);
    if (error) {
      return error;
    }

    const reviewedBy = actor.user.email?.trim() || actor.user.id?.toString() || "admin";

    const result = await submitDonaldPlanReview({
      deliveryDate: data.deliveryDate,
      profileId: data.profileId,
      profileVersion: data.profileVersion,
      planningSessionId: data.planningSessionId,
      reviewStatus: data.reviewStatus,
      feedbackText: data.feedbackText,
      feedbackTags: data.feedbackTags,
      recommendedCandidateId: data.recommendedCandidateId,
      selectedCandidateId: data.selectedCandidateId,
      didDonaldOverrideRecommendation: data.didDonaldOverrideRecommendation,
      recommendedPlanSummary: data.recommendedPlanSummary as
        | DeliveryAgentRecommendedPlanSummary
        | undefined,
      selectedPlanSummary: data.selectedPlanSummary,
      candidatePreviewSnapshot: data.candidatePreviewSnapshot as
        | DeliveryAgentPreviewCandidatePlansResponse
        | undefined,
      orderSnapshot: data.orderSnapshot,
      reviewedBy,
    });

    return successJson(result);
  } catch (error: unknown) {
    if (error instanceof DeliveryAgentReviewValidationError) {
      return errorJson(error.message, 400);
    }

    if (error instanceof DeliveryAgentReviewLockedError) {
      return errorJson(error.message, 409);
    }

    return handleRouteError(error, "POST /api/admin/delivery-agent/review-plan");
  }
}
