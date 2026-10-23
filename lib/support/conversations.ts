import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { getAuthenticatedActor, requireAdminMfa } from "@/lib/auth/guards";
import { SupportConversation, SupportMessage } from "@/models/Support";
import { guestToken, hashToken } from "./security";

export async function requireSupportAccess(request: NextRequest) {
  if (process.env.SUPPORT_PUBLIC_ENABLED !== "true") {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) throw new ApiError("Support preview is available to verified admins only.", { status: 404 });
    return actor;
  }
  return getAuthenticatedActor();
}

export async function ownedConversation(request: NextRequest, id: string) {
  const actor = await requireSupportAccess(request);
  await connectToDatabase();
  if (!mongoose.isValidObjectId(id)) throw new ApiError("Conversation not found", { status: 404 });
  const token = guestToken(request);
  const ownership: Record<string, unknown>[] = [];
  if (token) ownership.push({ guestHash: hashToken(token) });
  if (actor) ownership.push({ userId: actor.user._id });
  if (!ownership.length) throw new ApiError("Conversation not found", { status: 404 });
  const conversation = await SupportConversation.findOne({ _id: id, $or: ownership });
  if (!conversation) throw new ApiError("Conversation not found", { status: 404 });
  // Never silently transfer an account-bound conversation to another account.
  if (conversation.userId && actor && String(conversation.userId) !== String(actor.user._id)) throw new ApiError("Conversation not found", { status: 404 });
  return { conversation, actor };
}

export async function conversationView(id: string) {
  const [conversation, latest] = await Promise.all([
    SupportConversation.findById(id).select("language kind status humanMode preferences linkedOrders customerUnread").lean(),
    SupportMessage.find({ conversationId: id }).sort({ createdAt: -1, _id: -1 }).limit(100).select("role text cards createdAt emailStatus").lean(),
  ]);
  return { conversation, messages: latest.reverse() };
}
