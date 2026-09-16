import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { etransferPaymentIntentBodySchema } from "@/lib/contracts/etransfer-payment-intent";
import connectToDatabase from "@/lib/db";
import { recordEtransferPaymentIntent } from "@/lib/etransfer/payment-intent";
import { getDailyPlanById, getWeeklyPlanById } from "@/lib/plans/service";

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) return response;

    const { data, error } = await parseJsonBody(
      request,
      etransferPaymentIntentBodySchema
    );
    if (error) return error;

    const plan =
      data.requestKind === "daily"
        ? getDailyPlanById(data.planId)
        : getWeeklyPlanById(data.planId);
    if (!plan || !plan.active || plan.kind !== data.requestKind) {
      return errorJson("Invalid voucher plan", 400);
    }

    await connectToDatabase();
    const intent = await recordEtransferPaymentIntent({
      userId: String(actor.user._id),
      ...data,
    });

    return successJson({
      recorded: Boolean(intent),
      status: intent?.status || null,
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/etransfer/payment-intents");
  }
}
