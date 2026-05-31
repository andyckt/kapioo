import { errorJson, handleRouteError, successJson } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import { verifyRouteOptimizerGeocodeEndpoint } from "@/lib/integrations/route-optimizer/verify-geocode-endpoint";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const result = await verifyRouteOptimizerGeocodeEndpoint();
    return successJson(result);
  } catch (error: unknown) {
    return handleRouteError(error, "GET /api/admin/delivery-agent/verify-geocode-endpoint");
  }
}

export async function POST(request: Request) {
  return GET(request);
}
