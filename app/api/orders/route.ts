import { errorJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { annotateLegacyOrderRoute, LEGACY_ORDER_DOMAIN } from "@/lib/orders/domain-contract";

export async function GET(request: Request) {
  const { actor, response } = await requireUser();
  if (!actor || response) {
    return annotateLegacyOrderRoute(response!, LEGACY_ORDER_DOMAIN.listRoute);
  }

  void request;
  return annotateLegacyOrderRoute(
    errorJson(
      "Legacy order listing has been retired. Use /api/daily-delivery/order instead.",
      410
    ),
    LEGACY_ORDER_DOMAIN.listRoute
  );
}

export async function POST(request: Request) {
  void request;
  return annotateLegacyOrderRoute(
    errorJson(
      "Legacy order creation has been retired. Use /api/daily-delivery/order instead.",
      410
    ),
    LEGACY_ORDER_DOMAIN.listRoute
  );
}
