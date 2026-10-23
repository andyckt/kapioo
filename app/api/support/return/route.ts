import { NextRequest } from "next/server";
import { z } from "zod";
import connectToDatabase from "@/lib/db";
import { successJson, errorJson, handleRouteError } from "@/lib/api";
import { SupportConversation } from "@/models/Support";
import { requireSupportAccess } from "@/lib/support/conversations";
import { assertSameOrigin, boundedJson, rateLimit, newToken, hashToken, GUEST_COOKIE, cookieOptions } from "@/lib/support/security";
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); await requireSupportAccess(request); await connectToDatabase();
    await rateLimit(request, "support-return", 10);
    const data = z.object({ token: z.string().regex(/^[\w-]{43}$/) }).safeParse(await boundedJson(request));
    if (!data.success) return errorJson("Invalid conversation link", 400);
    const token = newToken();
    const conversation = await SupportConversation.findOneAndUpdate({ returnTokenHash: hashToken(data.data.token), returnTokenExpires: { $gt: new Date() } }, { $set: { guestHash: hashToken(token) } }, { new: true });
    if (!conversation) return errorJson("This conversation link has expired.", 404);
    const response = successJson({ id: String(conversation._id) }); response.cookies.set(GUEST_COOKIE, token, cookieOptions); return response;
  } catch (e) { return handleRouteError(e, "support return"); }
}
