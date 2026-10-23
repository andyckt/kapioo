import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminMfa } from "@/lib/auth/guards";
import { successJson, errorJson, handleRouteError } from "@/lib/api";
import { SupportConversation, SupportMessage, SupportLead, SupportArticle, SupportBudget, SupportEvent } from "@/models/Support";
import Settings from "@/models/Settings";
import { assertSameOrigin, boundedJson, newToken, hashToken, rateLimit } from "@/lib/support/security";
import { articleContentSchema, publishedArticles, SEED_ARTICLES } from "@/lib/support/knowledge";
import { conversationView } from "@/lib/support/conversations";
import { getSupportConfig } from "@/lib/support/config";
import { budgetMonth } from "@/lib/support/budget";
import { sendEmail } from "@/lib/services/email";
import { logAuditEvent } from "@/lib/security/audit";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("conversation"), id: idSchema, humanMode: z.boolean().optional(), status: z.enum(["open", "waiting", "resolved"]).optional(), stage: z.enum(["new", "contacted", "purchased", "closed"]).optional() }),
  z.object({ action: z.literal("reply"), id: idSchema, text: z.string().trim().min(1).max(6000), clientId: z.string().uuid() }),
  z.object({ action: z.literal("article"), slug: z.string().regex(/^[a-z0-9-]{1,70}$/), content: articleContentSchema, publish: z.boolean() }),
  z.object({ action: z.literal("config"), aiEnabled: z.boolean(), monthlyCapUsd: z.number().min(0).max(1000) }),
]);
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET(request: NextRequest) {
  try {
    const { actor, response } = await requireAdminMfa(request); if (!actor || response) return response;
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      if (!idSchema.safeParse(id).success) return errorJson("Invalid conversation", 400);
      await SupportConversation.updateOne({ _id: id }, { $set: { unread: 0 } });
      const customer = await SupportConversation.findById(id).select("userId").lean();
      return successJson({ ...await conversationView(id), customerId: customer?.userId, lead: await SupportLead.findOne({ conversationId: id }).lean() });
    }
    const page = Math.max(1, Math.min(1000, Number(request.nextUrl.searchParams.get("page")) || 1));
    const kind = request.nextUrl.searchParams.get("kind");
    const filter = kind === "lead" || kind === "support" ? { kind } : {};
    const [conversations, total, articles, published, config, budget, metrics] = await Promise.all([
      SupportConversation.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * 30).limit(30).select("kind status humanMode unread updatedAt language preferences linkedOrders").lean(),
      SupportConversation.countDocuments(filter),
      SupportArticle.find().limit(100).lean(), publishedArticles(), getSupportConfig(), SupportBudget.findOne({ month: budgetMonth() }).lean(),
      SupportEvent.aggregate([{ $group: { _id: "$kind", count: { $sum: 1 }, amountCents: { $sum: "$amountCents" } } }]),
    ]);
    const leads = await SupportLead.find({ conversationId: { $in: conversations.map(c => c._id) } }).lean();
    return successJson({ conversations, total, page, leads, articles, published, seeds: SEED_ARTICLES, config, budget, metrics });
  } catch (e) { return handleRouteError(e, "admin support"); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { actor, response } = await requireAdminMfa(request); if (!actor || response) return response;
    await rateLimit(request, "admin-support", 60);
    const parsed = schema.safeParse(await boundedJson(request, 24000));
    if (!parsed.success) return errorJson("Invalid support update", 400);
    const data = parsed.data;
    if (data.action === "config") {
      await Settings.updateOne({ key: "supportAssistant" }, { $set: { value: { aiEnabled: data.aiEnabled, monthlyCapUsd: data.monthlyCapUsd } } }, { upsert: true });
    } else if (data.action === "article") {
      if (["coverage", "cutoff"].includes(data.slug)) return errorJson("This answer uses live settings and cannot be edited here.", 409);
      await SupportArticle.updateOne({ slug: data.slug }, { $set: { draft: data.content, ...(data.publish ? { published: data.content, publishedAt: new Date() } : {}) } }, { upsert: true });
    } else if (data.action === "conversation") {
      const update: Record<string, unknown> = { unread: 0 };
      if (data.humanMode !== undefined) update.humanMode = data.humanMode;
      if (data.status) update.status = data.status;
      await SupportConversation.updateOne({ _id: data.id }, { $set: update, $inc: { revision: 1 } });
      if (data.stage) await SupportLead.updateOne({ conversationId: data.id }, { $set: { stage: data.stage } });
    } else {
      const conversation = await SupportConversation.findById(data.id);
      if (!conversation) return errorJson("Conversation not found", 404);
      const existing = await SupportMessage.findOne({ conversationId: data.id, clientId: data.clientId });
      if (existing) return successJson({ ...await conversationView(data.id), emailStatus: existing.emailStatus });
      const lead = await SupportLead.findOne({ conversationId: data.id });
      await SupportConversation.updateOne({ _id: data.id }, { $set: { humanMode: true, status: "waiting", unread: 0 }, $inc: { revision: 1, customerUnread: 1 } });
      const message = await SupportMessage.create({ conversationId: data.id, clientId: data.clientId, role: "staff", text: data.text, ...(lead ? { emailStatus: "pending" } : {}) });
      if (lead) {
        const token = newToken();
        await SupportConversation.updateOne({ _id: data.id }, { $set: { returnTokenHash: hashToken(token), returnTokenExpires: new Date(Date.now() + 7 * 86400_000) } });
        const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.kapioo.com";
        const link = `${base.replace(/\/$/, "")}/support#token=${encodeURIComponent(token)}`;
        try {
          await sendEmail({ to: lead.email, subject: conversation.language === "zh" ? "Kapioo 团队回复了您的咨询" : "A reply from Kapioo", html: `<p>${escapeHtml(lead.name)},</p><p>${escapeHtml(data.text).replace(/\n/g, "<br>")}</p><p><a href="${escapeHtml(link)}">${conversation.language === "zh" ? "查看对话并回复" : "View conversation and reply"}</a></p>`, idempotencyKey: `support-${message._id}` });
          message.emailStatus = "sent";
        } catch { message.emailStatus = "failed"; }
        await message.save();
        if (lead.stage === "new") { lead.stage = "contacted"; await lead.save(); }
      }
      return successJson({ ...await conversationView(data.id), emailStatus: message.emailStatus });
    }
    await logAuditEvent({ actor, request, action: `support.${data.action}`, targetType: "support", metadata: { action: data.action } });
    return successJson({ saved: true });
  } catch (e) { return handleRouteError(e, "admin support update"); }
}
