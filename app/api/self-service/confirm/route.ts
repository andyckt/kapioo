import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { successJson, errorJson, handleRouteError } from "@/lib/api";
import { confirmChange } from "@/lib/self-service/service";
import { assertSameOrigin, boundedJson, rateLimit } from "@/lib/support/security";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { actor, response } = await requireUser(); if (!actor || response) return response;
    if (process.env.NEXT_PUBLIC_SELF_SERVICE_ENABLED !== "true" && actor.role !== "admin") return errorJson("Self-service is not yet available", 404);
    await rateLimit(request, "order-confirm", 15);
    const input = z.object({ operationId: z.string().regex(/^[a-f0-9]{24}$/i) }).strict().safeParse(await boundedJson(request));
    if (!input.success) return errorJson("Invalid confirmation", 400);
    return successJson(await confirmChange(input.data.operationId, actor, request));
  } catch (e) { return handleRouteError(e, "self-service confirm"); }
}
