import { requireUser } from "@/lib/auth/guards";
import { successJson, errorJson, handleRouteError } from "@/lib/api";
import { customerChangeSchema } from "@/lib/contracts/customer-self-service";
import { previewChange } from "@/lib/self-service/service";
import { assertSameOrigin, boundedJson, rateLimit } from "@/lib/support/security";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { actor, response } = await requireUser(); if (!actor || response) return response;
    if (process.env.NEXT_PUBLIC_SELF_SERVICE_ENABLED !== "true" && actor.role !== "admin") return errorJson("Self-service is not yet available", 404);
    await rateLimit(request, "order-preview", 15);
    const input = customerChangeSchema.safeParse(await boundedJson(request));
    if (!input.success) return errorJson("Invalid order change", 400);
    return successJson(await previewChange(input.data, actor));
  } catch (e) { return handleRouteError(e, "self-service preview"); }
}
