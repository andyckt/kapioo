import { handleRouteError, parseSearchParams, successJson } from "@/lib/api";
import { previewDeliveryOrdersForAgent } from "@/lib/agents/delivery/preview-delivery-orders";
import { requireAdminMfa } from "@/lib/auth/guards";
import { deliveryAgentPreviewQuerySchema } from "@/lib/contracts/delivery-agent";
import { OrderDataError } from "@/lib/order-data/errors";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error } = parseSearchParams(request, deliveryAgentPreviewQuerySchema);
    if (error) {
      return error;
    }

    const preview = await previewDeliveryOrdersForAgent(data.deliveryDate);
    return successJson(preview);
  } catch (error: unknown) {
    if (error instanceof OrderDataError) {
      return handleRouteError(
        new Error(error.message),
        "GET /api/admin/delivery-agent/preview-orders"
      );
    }

    return handleRouteError(error, "GET /api/admin/delivery-agent/preview-orders");
  }
}
