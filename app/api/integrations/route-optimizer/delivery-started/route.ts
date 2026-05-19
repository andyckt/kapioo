import { errorJson, handleRouteError, parseInput, successJson } from "@/lib/api";
import { routeOptimizerDeliveryStartedBodySchema } from "@/lib/contracts/delivery-dispatch";
import { applyDeliveryDispatch } from "@/lib/orders/apply-delivery-dispatch";
import {
  computeBodyHash,
  isAuthorizedRouteOptimizerBearer,
  verifyRouteOptimizerSignature,
} from "@/lib/security/route-optimizer-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = `route-optimizer-delivery-started-${Date.now()}`;
  let bodyHash = "";

  try {
    const token = process.env.ROUTE_OPTIMIZER_INGEST_TOKEN;
    const secret = process.env.ROUTE_OPTIMIZER_INGEST_SECRET;

    if (!token || !secret) {
      console.error(`[${requestId}] Delivery-started ingest env vars are not fully configured`);
      return errorJson("Delivery-started ingest endpoint is not configured", 503);
    }

    if (!isAuthorizedRouteOptimizerBearer(request, token)) {
      return errorJson("Unauthorized", 401);
    }

    const rawBody = await request.text();
    bodyHash = computeBodyHash(rawBody);
    const signature = request.headers.get("x-ro-signature") || "";

    if (!verifyRouteOptimizerSignature(rawBody, signature, secret)) {
      console.warn(`[${requestId}] Invalid HMAC signature bodyHash=${bodyHash}`);
      return errorJson("Invalid signature", 401);
    }

    let rawPayload: unknown;
    try {
      rawPayload = JSON.parse(rawBody);
    } catch {
      return errorJson("Invalid request data", 400, {
        details: "Request body is not valid JSON",
      });
    }

    const { data: payload, error } = parseInput(
      rawPayload,
      routeOptimizerDeliveryStartedBodySchema
    );
    if (error || !payload) {
      return error;
    }

    const result = await applyDeliveryDispatch({
      payload,
      request,
    });

    console.info(
      `[${requestId}] Delivery-started ingest processed stopId=${payload.stopId || "none"} bodyHash=${bodyHash} updated=${result.updated.length} skipped=${result.skipped.length} missing=${result.missing.length}`
    );

    return successJson(result);
  } catch (error: unknown) {
    console.error(
      `[${requestId}] Delivery-started ingest failed bodyHash=${bodyHash || "unknown"}`
    );
    return handleRouteError(error, "POST /api/integrations/route-optimizer/delivery-started");
  }
}
