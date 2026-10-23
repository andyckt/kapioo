import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminMfa } from "@/lib/auth/guards";
import { errorJson, successJson, handleRouteError } from "@/lib/api";
import { customerChangeSchema } from "@/lib/contracts/customer-self-service";
import { listChangeableOrders, previewChange, confirmChange } from "@/lib/self-service/service";
import { assertSameOrigin, boundedJson, rateLimit } from "@/lib/support/security";

const id = z.string().regex(/^[a-f0-9]{24}$/i);
export async function GET(request: NextRequest) {
  try {
    const { actor, response } = await requireAdminMfa(request); if (!actor || response) return response;
    const customer = id.safeParse(request.nextUrl.searchParams.get("customerId"));
    if (!customer.success) return errorJson("Invalid customer", 400);
    return successJson(await listChangeableOrders(actor, customer.data));
  } catch (e) { return handleRouteError(e, "admin order changes"); }
}
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { actor, response } = await requireAdminMfa(request); if (!actor || response) return response;
    await rateLimit(request, "admin-order-changes", 30);
    const input = z.discriminatedUnion("step", [
      z.object({ step: z.literal("preview"), customerId: id, input: customerChangeSchema }),
      z.object({ step: z.literal("confirm"), customerId: id, operationId: id }),
    ]).safeParse(await boundedJson(request));
    if (!input.success) return errorJson("Invalid change", 400);
    const data = input.data;
    return successJson(data.step === "preview" ? await previewChange(data.input, actor, data.customerId) : await confirmChange(data.operationId, actor, request, data.customerId));
  } catch (e) { return handleRouteError(e, "admin order change"); }
}
