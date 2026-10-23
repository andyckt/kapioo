import { NextRequest } from "next/server";
import { z } from "zod";
import { successJson, errorJson, handleRouteError } from "@/lib/api";
import { ownedConversation } from "@/lib/support/conversations";
import { planCard } from "@/lib/support/products";
import { getPlanById } from "@/lib/plans/service";
import { SupportEvent } from "@/models/Support";
import { signAttribution } from "@/lib/support/attribution";
import { assertSameOrigin, boundedJson, rateLimit, ATTRIBUTION_COOKIE, cookieOptions } from "@/lib/support/security";
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const data = z.object({ conversationId: z.string().regex(/^[a-f0-9]{24}$/i), planId: z.string().max(80) }).safeParse(await boundedJson(request));
    if (!data.success) return errorJson("Invalid plan selection", 400);
    const { conversation, actor } = await ownedConversation(request, data.data.conversationId);
    await rateLimit(request, "support-checkout", 20);
    const card = planCard(data.data.planId, conversation.preferences || {}, conversation.language as "en" | "zh");
    if (!card?.coverageConfirmed) return errorJson("Please confirm delivery coverage first.", 422);
    const plan = getPlanById(card.planId)!;
    const at = Date.now();
    await SupportEvent.updateOne({ key: `checkout:${conversation._id}:${card.planId}` }, { $setOnInsert: { conversationId: conversation._id, userId: actor?.user._id, kind: "checkout", planId: card.planId } }, { upsert: true });
    const destination = actor ? `/dashboard?tab=${card.kind === "weekly" ? "credits" : "meal-vouchers"}&selectPlan=true&plan=${encodeURIComponent(card.planId)}` : `/signup?from=${card.kind === "weekly" ? "weekly-meal" : "daily-delivery"}&plan=${encodeURIComponent(card.planId)}`;
    const response = successJson({ destination, plan, address: conversation.preferences?.address, coverage: conversation.preferences?.coverage, area: conversation.preferences?.area });
    response.cookies.set(ATTRIBUTION_COOKIE, signAttribution({ conversationId: String(conversation._id), planId: card.planId, at }), { ...cookieOptions, maxAge: 7 * 86400 });
    return response;
  } catch (e) { return handleRouteError(e, "support checkout"); }
}
