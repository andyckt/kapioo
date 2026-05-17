import crypto from "node:crypto";

import { errorJson, handleRouteError, parseInput, successJson } from "@/lib/api";
import { routeOptimizerProofOfDeliveryBodySchema } from "@/lib/contracts/proof-of-delivery";
import { applyProofOfDelivery } from "@/lib/orders/apply-proof-of-delivery";

export const runtime = "nodejs";

function isAuthorizedBearer(request: Request, token: string) {
  return request.headers.get("authorization") === `Bearer ${token}`;
}

function computeBodyHash(rawBody: string) {
  return crypto.createHash("sha256").update(rawBody).digest("hex");
}

function verifySignature(rawBody: string, signature: string, secret: string) {
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

function isAllowedPodHost(url: string) {
  const allowlist = (process.env.POD_IMAGE_HOST_ALLOWLIST || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return false;
  }

  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowlist.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const requestId = `route-optimizer-pod-${Date.now()}`;
  let bodyHash = "";

  try {
    const token = process.env.ROUTE_OPTIMIZER_INGEST_TOKEN;
    const secret = process.env.ROUTE_OPTIMIZER_INGEST_SECRET;

    if (!token || !secret || !process.env.POD_IMAGE_HOST_ALLOWLIST) {
      console.error(`[${requestId}] POD ingest env vars are not fully configured`);
      return errorJson("POD ingest endpoint is not configured", 503);
    }

    if (!isAuthorizedBearer(request, token)) {
      return errorJson("Unauthorized", 401);
    }

    const rawBody = await request.text();
    bodyHash = computeBodyHash(rawBody);
    const signature = request.headers.get("x-ro-signature") || "";

    if (!verifySignature(rawBody, signature, secret)) {
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
      routeOptimizerProofOfDeliveryBodySchema
    );
    if (error || !payload) {
      return error;
    }

    if (!isAllowedPodHost(payload.podImage.url)) {
      return errorJson("Invalid POD image host", 400, {
        details: "POD image URL host is not allowlisted",
      });
    }

    const result = await applyProofOfDelivery({
      payload,
      request,
    });

    console.info(
      `[${requestId}] POD ingest processed stopId=${payload.stopId || "none"} bodyHash=${bodyHash} updated=${result.updated.length} skipped=${result.skipped.length} missing=${result.missing.length}`
    );

    return successJson(result);
  } catch (error: unknown) {
    console.error(`[${requestId}] POD ingest failed bodyHash=${bodyHash || "unknown"}`);
    return handleRouteError(error, "POST /api/integrations/route-optimizer/proof-of-delivery");
  }
}
