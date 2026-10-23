import { NextRequest } from "next/server";
import { z } from "zod";
import { successJson, errorJson, handleRouteError } from "@/lib/api";
import connectToDatabase from "@/lib/db";
import { SupportConversation } from "@/models/Support";
import { requireSupportAccess } from "@/lib/support/conversations";
import { getSupportConfig } from "@/lib/support/config";
import { assertSameOrigin, boundedJson, rateLimit, guestToken, newToken, hashToken, GUEST_COOKIE, cookieOptions } from "@/lib/support/security";

export async function GET(request: NextRequest) {
  try {
    await requireSupportAccess(request); await connectToDatabase();
    const config = await getSupportConfig();
    return successJson({ enabled: true, aiEnabled: config.aiEnabled });
  } catch { return successJson({ enabled: false, aiEnabled: false }); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const actor = await requireSupportAccess(request); await connectToDatabase();
    await rateLimit(request, "support-start", 10, 3600);
    const data = z.object({ language: z.enum(["en", "zh"]).default("en") }).safeParse(await boundedJson(request));
    if (!data.success) return errorJson("Invalid language", 400);
    const token = guestToken(request) || newToken();
    const conversation = await SupportConversation.create({ guestHash: hashToken(token), userId: actor?.user._id, language: data.data.language });
    const response = successJson({ id: String(conversation._id) });
    response.cookies.set(GUEST_COOKIE, token, cookieOptions);
    return response;
  } catch (e) { return handleRouteError(e, "start support"); }
}
