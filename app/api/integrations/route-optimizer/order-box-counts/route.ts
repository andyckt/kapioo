import { errorJson, handleRouteError, successJson } from "@/lib/api";
import connectToDatabase from "@/lib/db";
import {
  computeBodyHash,
  isAuthorizedRouteOptimizerBearer,
  verifyRouteOptimizerSignature,
} from "@/lib/security/route-optimizer-webhook";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";

export const runtime = "nodejs";

const MAX_ORDER_IDS = 200;

function normalizeOrderIds(value: unknown) {
  if (!Array.isArray(value)) return null;

  const unique = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed) unique.add(trimmed);
  }

  return Array.from(unique);
}

function sumItemQuantities(items: unknown) {
  if (!Array.isArray(items)) return 0;

  return items.reduce((total, item) => {
    if (!item || typeof item !== "object") return total;
    const quantity = (item as { quantity?: unknown }).quantity;
    return total + (typeof quantity === "number" && Number.isFinite(quantity) ? quantity : 0);
  }, 0);
}

export async function POST(request: Request) {
  const requestId = `route-optimizer-order-box-counts-${Date.now()}`;
  let bodyHash = "";

  try {
    const token = process.env.ROUTE_OPTIMIZER_INGEST_TOKEN;
    const secret = process.env.ROUTE_OPTIMIZER_INGEST_SECRET;

    if (!token || !secret) {
      console.error(`[${requestId}] Order box count env vars are not fully configured`);
      return errorJson("Order box count endpoint is not configured", 503);
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

    const orderIds = normalizeOrderIds(
      rawPayload && typeof rawPayload === "object"
        ? (rawPayload as { orderIds?: unknown }).orderIds
        : undefined
    );

    if (!orderIds) {
      return errorJson("Invalid request data", 400, {
        details: "orderIds must be an array",
      });
    }

    if (orderIds.length > MAX_ORDER_IDS) {
      return errorJson("Too many order IDs", 400, {
        details: `orderIds is capped at ${MAX_ORDER_IDS} per request`,
      });
    }

    if (orderIds.length === 0) {
      return successJson({ counts: {}, missing: [] });
    }

    await connectToDatabase();

    const orders = await DailyDeliveryOrder.find(
      { orderId: { $in: orderIds } },
      { orderId: 1, items: 1 }
    ).lean();

    const counts: Record<string, number> = {};
    for (const order of orders) {
      counts[String(order.orderId)] = sumItemQuantities(order.items);
    }

    const missing = orderIds.filter((orderId) => counts[orderId] === undefined);

    console.info(
      `[${requestId}] Order box counts processed bodyHash=${bodyHash} requested=${orderIds.length} found=${orders.length} missing=${missing.length}`
    );

    return successJson({ counts, missing });
  } catch (error: unknown) {
    console.error(`[${requestId}] Order box count lookup failed bodyHash=${bodyHash || "unknown"}`);
    return handleRouteError(
      error,
      "POST /api/integrations/route-optimizer/order-box-counts"
    );
  }
}
