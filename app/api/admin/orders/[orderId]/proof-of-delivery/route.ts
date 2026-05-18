import { errorJson, handleRouteError, successJson, type RouteContext } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import {
  applyProofOfDeliveryToOrder,
  findOrderByOrderId,
} from "@/lib/orders/apply-proof-of-delivery";
import { enrichAdminOrderResponse } from "@/lib/orders/admin-order-response";
import { withRewrittenProofOfDeliveryUrl } from "@/lib/orders/proof-of-delivery-response";
import { uploadProofOfDeliveryImageToS3 } from "@/lib/upload/proof-of-delivery-image";
import { validateMenuImageFile } from "@/lib/upload/menu-image";

const MAX_NOTE_LENGTH = 500;

export async function POST(request: Request, { params }: RouteContext<{ orderId: string }>) {
  let orderId = "";
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    ({ orderId } = await params);
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
      return errorJson("Order ID is required", 400);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return errorJson("Proof of delivery image is required", 400);
    }

    const validation = validateMenuImageFile(file);
    if (!validation.ok) {
      return errorJson(validation.message, 400);
    }

    const rawNote = formData.get("note");
    const note =
      typeof rawNote === "string" && rawNote.trim().length > 0 ? rawNote.trim() : undefined;
    if (note && note.length > MAX_NOTE_LENGTH) {
      return errorJson(`Note must be ${MAX_NOTE_LENGTH} characters or fewer`, 400);
    }

    const existing = await findOrderByOrderId(normalizedOrderId);
    if (!existing) {
      return errorJson("Order not found", 404);
    }

    const { url, key } = await uploadProofOfDeliveryImageToS3({
      file,
      orderId: normalizedOrderId,
    });

    const capturedAt = new Date();
    const applyResult = await applyProofOfDeliveryToOrder({
      orderId: normalizedOrderId,
      proofOfDelivery: {
        imageUrl: url,
        imageKey: key,
        capturedAt,
        receivedAt: new Date(),
        source: "admin-manual",
        note,
      },
      request,
      actor: { user: actor.user, role: actor.role },
    });

    if (!applyResult.ok) {
      if (applyResult.reason === "missing") {
        return errorJson("Order not found", 404);
      }
      if (applyResult.reason === "already-delivered-with-pod") {
        return errorJson("This order already has proof of delivery", 409, {
          errorCode: "already-delivered-with-pod",
        });
      }
      return errorJson(
        `Cannot upload proof of delivery for order in status "${applyResult.status ?? "unknown"}"`,
        409,
        { errorCode: "terminal-status" }
      );
    }

    const refreshed = await existing.model.findOne({ orderId: normalizedOrderId }).lean();
    if (!refreshed) {
      return errorJson("Order not found after update", 404);
    }

    return successJson(
      await enrichAdminOrderResponse(withRewrittenProofOfDeliveryUrl(refreshed))
    );
  } catch (error: unknown) {
    return handleRouteError(
      error,
      `POST /api/admin/orders/${orderId || "[orderId]"}/proof-of-delivery`
    );
  }
}
