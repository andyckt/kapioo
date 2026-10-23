import { successJson, handleRouteError } from "@/lib/api";
import connectToDatabase from "@/lib/db";
import { publishedArticles } from "@/lib/support/knowledge";
export async function GET() {
  try { await connectToDatabase(); return successJson(await publishedArticles(), { headers: { "Cache-Control": "public, max-age=60", "X-Support-Published": String(process.env.SUPPORT_PUBLIC_ENABLED === "true") } }); }
  catch (e) { return handleRouteError(e, "support knowledge"); }
}
