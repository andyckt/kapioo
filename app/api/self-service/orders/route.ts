import { requireUser } from "@/lib/auth/guards";
import { successJson, errorJson, handleRouteError } from "@/lib/api";
import { listChangeableOrders } from "@/lib/self-service/service";
export async function GET() {
  try {
    const { actor, response } = await requireUser(); if (!actor || response) return response;
    if (process.env.NEXT_PUBLIC_SELF_SERVICE_ENABLED !== "true" && actor.role !== "admin") return errorJson("Self-service is not yet available", 404);
    return successJson(await listChangeableOrders(actor));
  } catch (e) { return handleRouteError(e, "self-service orders"); }
}
