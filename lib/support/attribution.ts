import { createHmac, timingSafeEqual } from "node:crypto";
import mongoose, { type ClientSession } from "mongoose";
import { AUTH_SECRET } from "@/lib/env";
import { SupportAttribution, SupportConversation, SupportEvent, SupportLead } from "@/models/Support";
import { ATTRIBUTION_COOKIE } from "./security";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import WeeklyOrder from "@/models/WeeklyOrder";

export type CheckoutAttribution = { conversationId: string; planId: string; at: number };
export function signAttribution(value: CheckoutAttribution) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${createHmac("sha256", AUTH_SECRET).update(`support-checkout:${payload}`).digest("base64url")}`;
}
export function readAttribution(raw?: string | null): CheckoutAttribution | null {
  if (!raw || raw.length > 1000) return null;
  const [payload, signature, extra] = raw.split(".");
  if (extra !== undefined) return null;
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", AUTH_SECRET).update(`support-checkout:${payload}`).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!mongoose.isValidObjectId(value.conversationId) || typeof value.planId !== "string" || !Number.isFinite(value.at) || value.at > Date.now() || Date.now() - value.at > 7 * 86400_000) return null;
    return value;
  } catch { return null; }
}
export async function bindPurchaseAttribution(request: Request, purchaseKey: string, userId: unknown, planId: string, session: ClientSession) {
  const cookie = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${ATTRIBUTION_COOKIE}=`))?.slice(ATTRIBUTION_COOKIE.length + 1);
  const value = readAttribution(cookie);
  if (!value || value.planId !== planId) return;
  const conversation = await SupportConversation.findById(value.conversationId).session(session);
  if (!conversation || (conversation.userId && String(conversation.userId) !== String(userId))) return;
  if (!conversation.userId) { conversation.userId = new mongoose.Types.ObjectId(String(userId)); await conversation.save({ session }); }
  await SupportAttribution.updateOne({ purchaseKey }, { $setOnInsert: { conversationId: conversation._id, userId, planId } }, { upsert: true, session });
}
export async function recordAssistedPurchase(purchaseKey: string, amountCents: number, session: ClientSession) {
  const attribution = await SupportAttribution.findOne({ purchaseKey }).session(session);
  if (!attribution) return;
  await SupportEvent.updateOne({ key: `purchase:${purchaseKey}` }, { $setOnInsert: { kind: "purchase", conversationId: attribution.conversationId, userId: attribution.userId, planId: attribution.planId, purchaseKey, amountCents } }, { upsert: true, session });
  await SupportLead.updateOne({ conversationId: attribution.conversationId }, { $set: { stage: "purchased" } }, { session });
}
export async function recordAssistedFirstOrder(userId: unknown, session: ClientSession) {
  const purchase = await SupportEvent.findOne({ userId, kind: "purchase" }).sort({ createdAt: -1 }).session(session);
  if (!purchase) return;
  const daily = await DailyDeliveryOrder.countDocuments({ userId }).session(session);
  const weekly = await WeeklyOrder.countDocuments({ userId }).session(session);
  if (daily + weekly !== 1) return;
  await SupportEvent.updateOne({ key: `first-order:${String(userId)}` }, { $setOnInsert: { kind: "first-order", userId, conversationId: purchase.conversationId } }, { upsert: true, session });
}
