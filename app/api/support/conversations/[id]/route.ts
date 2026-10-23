import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { successJson, errorJson, handleRouteError, type RouteContext } from "@/lib/api";
import { ownedConversation, conversationView } from "@/lib/support/conversations";
import { assertSameOrigin, boundedJson, rateLimit } from "@/lib/support/security";
import { SupportConversation, SupportMessage, SupportLead, SupportEvent } from "@/models/Support";
import { publishedArticles } from "@/lib/support/knowledge";
import { answerQuestion, fallbackAnswer } from "@/lib/support/assistant";
import { recommendPlans, type Preferences } from "@/lib/support/products";
import { resolveAddress } from "@/lib/self-service/address";
import { addressChoiceSchema, orderReferenceSchema } from "@/lib/contracts/customer-self-service";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import WeeklyOrder from "@/models/WeeklyOrder";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("message"), text: z.string().trim().min(1).max(2500), clientId: z.string().uuid(), language: z.enum(["en", "zh"]) }),
  z.object({ action: z.literal("faq"), slug: z.string().max(80), language: z.enum(["en", "zh"]) }),
  z.object({ action: z.literal("handoff"), language: z.enum(["en", "zh"]).optional(), order: orderReferenceSchema.optional() }),
  z.object({ action: z.literal("lead"), name: z.string().trim().min(1).max(100), email: z.string().trim().email().max(254), consent: z.literal(true), purpose: z.enum(["support", "lead"]).default("support"), language: z.enum(["en", "zh"]).optional() }),
  z.object({ action: z.literal("preferences"), kind: z.enum(["daily", "weekly"]).optional(), meals: z.number().int().min(1).max(100).optional(), budget: z.number().min(0).max(1000).optional(), address: addressChoiceSchema.optional(), language: z.enum(["en", "zh"]) }),
  z.object({ action: z.literal("read") }),
]);

async function saveTeamReceipt(id: string, clientId: string, language: "en" | "zh", session?: mongoose.ClientSession) {
  await SupportMessage.updateOne({ conversationId: id, clientId: `receipt:${clientId}` }, { $setOnInsert: {
    role: "system", text: language === "zh"
      ? "已收到您的留言，等待团队查看。本次对话的自动回复已暂停。您可以选择「联系团队」留下邮箱接收回复，或选择「新对话」继续自助咨询。"
      : "Message received for the team. Automatic replies are paused in this conversation. Select Talk to the team to leave an email for their reply, or New chat for self-service help.",
  } }, { upsert: true, ...(session ? { session } : {}) });
}

export async function GET(request: NextRequest, ctx: RouteContext<{ id: string }>) {
  try { const { id } = await ctx.params; await ownedConversation(request, id); return successJson(await conversationView(id), { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return handleRouteError(e, "read support"); }
}

export async function POST(request: NextRequest, ctx: RouteContext<{ id: string }>) {
  try {
    assertSameOrigin(request);
    const { id } = await ctx.params;
    const { conversation, actor } = await ownedConversation(request, id);
    await rateLimit(request, "support-action", 30);
    const parsed = schema.safeParse(await boundedJson(request));
    if (!parsed.success) return errorJson("Invalid support request", 400);
    const data = parsed.data;
    if (data.action === "read") { await SupportConversation.updateOne({ _id: id }, { $set: { customerUnread: 0 } }); return successJson({ read: true }); }
    if (data.action === "handoff") {
      if (data.order) {
        if (!actor) return errorJson("Sign in to attach an order", 401);
        const Model = data.order.kind === "daily" ? DailyDeliveryOrder : WeeklyOrder;
        const order = await (Model as typeof DailyDeliveryOrder).findOne({ orderId: data.order.orderId, userId: actor.user._id });
        if (!order) return errorJson("Order not found", 404);
      }
      await SupportConversation.updateOne({ _id: id }, { $set: { humanMode: true, status: "open", language: data.language || conversation.language, ...(data.order && actor ? { userId: actor.user._id } : {}) }, $inc: { revision: 1, unread: 1 }, ...(data.order ? { $addToSet: { linkedOrders: data.order } } : {}) });
      await SupportMessage.create({ conversationId: id, clientId: randomUUID(), role: "system", text: (data.language || conversation.language) === "zh" ? "已转交团队。您可以继续留言，并留下邮箱以接收回复。" : "Your conversation is with our team. You can leave a message and an email address to receive their reply." });
    } else if (data.action === "lead") {
      await SupportLead.findOneAndUpdate({ conversationId: id }, { $set: { name: data.name, email: data.email.toLowerCase(), consentAt: new Date() }, $setOnInsert: { stage: "new" } }, { upsert: true });
      await SupportConversation.updateOne({ _id: id }, { $set: { kind: data.purpose, humanMode: true, status: "open", language: data.language || conversation.language }, $inc: { unread: 1, revision: 1 } });
      await SupportEvent.updateOne({ key: `lead:${id}` }, { $setOnInsert: { conversationId: id, kind: "lead" } }, { upsert: true });
    } else if (data.action === "faq") {
      const article = (await publishedArticles()).find(a => a.slug === data.slug);
      if (!article) return errorJson("Answer not found", 404);
      await SupportMessage.create({ conversationId: id, clientId: randomUUID(), role: "assistant", text: article[data.language].answer });
    } else if (data.action === "preferences") {
      const prefs: Preferences = { ...conversation.preferences };
      if (data.kind) prefs.kind = data.kind;
      if (data.meals !== undefined) prefs.meals = data.meals;
      if (data.budget !== undefined) prefs.budget = data.budget;
      if (data.address) {
        const verified = await resolveAddress(data.address);
        prefs.area = verified.address.province; prefs.coverage = { canDaily: verified.coverage.canDaily, canWeekly: verified.coverage.canWeekly };
        prefs.address = { ...verified.address, placeId: verified.addressGeo.placeId, lat: verified.addressGeo.lat, lng: verified.addressGeo.lng, addressGeo: verified.addressGeo };
      }
      await SupportConversation.updateOne({ _id: id }, { $set: { preferences: prefs, language: data.language } });
      const recommendation = recommendPlans(prefs, data.language);
      if (recommendation.cards.length) {
        await SupportEvent.create({ key: `recommendation:${randomUUID()}`, conversationId: id, kind: "recommendation", planId: recommendation.cards[0].planId });
      }
      return successJson({ ...await conversationView(id), recommendation });
    } else {
      await rateLimit(request, "support-messages", 60, 3600);
      const existing = await SupportMessage.findOne({ conversationId: id, clientId: data.clientId });
      if (existing) return successJson(await conversationView(id));
      const lease = await SupportConversation.findOneAndUpdate({ _id: id, $or: [{ processingUntil: null }, { processingUntil: { $lt: new Date() } }] }, { $set: { processingUntil: new Date(Date.now() + 120_000), language: data.language, status: "open" }, $inc: { unread: 1 } }, { new: true });
      if (!lease) return errorJson("Your previous message is still being processed.", 409);
      try {
        await SupportMessage.create({ conversationId: id, clientId: data.clientId, role: "customer", text: data.text });
        if (!lease.humanMode) {
          const messages = await SupportMessage.find({ conversationId: id, role: { $in: ["customer", "assistant"] } }).sort({ createdAt: -1, _id: -1 }).limit(12).lean();
          const reply = await answerQuestion(messages.reverse(), data.language, lease.preferences || {}).catch(() => ({ text: fallbackAnswer(data.language), cards: [], needsHuman: false }));
          const session = await mongoose.startSession();
          try { await session.withTransaction(async () => {
            const fresh = await SupportConversation.findOneAndUpdate({ _id: id, revision: lease.revision, humanMode: false }, { $inc: { revision: 1 }, ...(reply.needsHuman ? { $set: { humanMode: true } } : {}) }, { session });
            if (fresh) await SupportMessage.create([{ conversationId: id, clientId: `reply:${data.clientId}`, role: "assistant", text: reply.text, cards: reply.cards }], { session });
            else if (await SupportConversation.exists({ _id: id, humanMode: true }).session(session)) await saveTeamReceipt(id, data.clientId, data.language, session);
          }); } finally { await session.endSession(); }
        } else await saveTeamReceipt(id, data.clientId, data.language);
      } finally { await SupportConversation.updateOne({ _id: id }, { $unset: { processingUntil: "" } }); }
    }
    return successJson(await conversationView(id));
  } catch (e) { return handleRouteError(e, "support action"); }
}
