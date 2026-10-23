import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { setupTestDb, clearCollections, teardownTestDb } from "../helpers/db";
import { createTestUser, createTestAdmin } from "../helpers/factories";
import * as models from "@/models/Support";
import { newToken, hashToken, GUEST_COOKIE, ATTRIBUTION_COOKIE } from "@/lib/support/security";
import { ownedConversation } from "@/lib/support/conversations";
import { publishedArticles } from "@/lib/support/knowledge";
import { signAttribution, bindPurchaseAttribution, recordAssistedPurchase } from "@/lib/support/attribution";
import { POST as action } from "@/app/api/support/conversations/[id]/route";
import { POST as adminAction } from "@/app/api/admin/support/route";
import { POST as returnToConversation } from "@/app/api/support/return/route";
import { POST as checkout } from "@/app/api/support/checkout/route";
import { POST as startConversation } from "@/app/api/support/conversations/route";

const mocks = vi.hoisted(() => ({ actor: null as any, admin: null as any, answer: vi.fn(), email: vi.fn() }));
vi.mock("@/lib/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/auth/guards", () => ({ getAuthenticatedActor: () => mocks.actor, requireAdminMfa: async () => ({ actor: mocks.admin, response: mocks.admin ? null : new Response(null, { status: 403 }) }) }));
vi.mock("@/lib/support/assistant", () => ({ answerQuestion: mocks.answer, fallbackAnswer: () => "Use guided help or contact our team." }));
vi.mock("@/lib/services/email", () => ({ sendEmail: mocks.email }));
const origin = "http://localhost:3000";
function request(path: string, body?: unknown, token?: string, cookie?: string) {
  return new NextRequest(`${origin}${path}`, { method: body ? "POST" : "GET", headers: { origin, "Content-Type": "application/json", cookie: cookie || (token ? `${GUEST_COOKIE}=${token}` : ""), "x-forwarded-for": randomUUID() }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function conversation(extra: object = {}) {
  const token = newToken(); const c = await models.SupportConversation.create({ guestHash: hashToken(token), ...extra });
  return { c, token, ctx: { params: Promise.resolve({ id: String(c._id) }) } };
}
async function transact(work: (s: mongoose.ClientSession) => Promise<unknown>) {
  const s = await mongoose.startSession(); try { await s.withTransaction(() => work(s)); } finally { await s.endSession(); }
}
describe("support privacy, handoff, publication and attribution", () => {
  beforeAll(async () => { process.env.SUPPORT_PUBLIC_ENABLED = "true"; await setupTestDb(); await Promise.all(Object.values(models).map(m => m.init())); });
  beforeEach(async () => { await clearCollections(); mocks.actor = null; mocks.admin = null; mocks.answer.mockReset().mockResolvedValue({ text: "Hello", cards: [], needsHuman: false }); mocks.email.mockReset().mockResolvedValue({}); });
  afterAll(teardownTestDb);

  it("isolates guest conversations and refuses a different signed-in account", async () => {
    const user = await createTestUser(), other = await createTestUser(); const { c, token } = await conversation({ userId: user._id });
    await expect(ownedConversation(request("/", undefined, newToken()), String(c._id))).rejects.toThrow("not found");
    await expect(ownedConversation(request("/", undefined, token), String(c._id))).resolves.toBeTruthy();
    mocks.actor = { user: other, role: "user" };
    await expect(ownedConversation(request("/", undefined, token), String(c._id))).rejects.toThrow("not found");
  });

  it("requires explicit follow-up consent and distinguishes support from sales", async () => {
    const { c, token, ctx } = await conversation();
    const body = { action: "lead", name: "Visitor", email: "visitor@example.com", purpose: "lead", consent: false };
    expect((await action(request("/", body, token), ctx)).status).toBe(400);
    expect(await models.SupportLead.countDocuments()).toBe(0);
    expect((await action(request("/", { ...body, consent: true }, token), ctx)).status).toBe(200);
    expect((await models.SupportConversation.findById(c._id))?.kind).toBe("lead");
    expect(mocks.answer).not.toHaveBeenCalled(); expect(mocks.email).not.toHaveBeenCalled();
  });

  it("pauses an in-flight AI reply when staff take over, and resumes explicitly", async () => {
    const { c, token, ctx } = await conversation();
    let release!: (value: unknown) => void;
    mocks.answer.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const pending = action(request("/", { action: "message", text: "Help me choose", language: "en", clientId: randomUUID() }, token), ctx);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    mocks.admin = { user: await createTestAdmin(), role: "admin", sessionVersion: 1 };
    expect((await adminAction(request("/", { action: "conversation", id: String(c._id), humanMode: true }))).status).toBe(200);
    release({ text: "Stale AI reply", cards: [], needsHuman: false }); await pending;
    expect(await models.SupportMessage.countDocuments({ role: "assistant" })).toBe(0);
    expect(await models.SupportMessage.countDocuments({ role: "system", text: /Message received for the team/ })).toBe(1);
    await action(request("/", { action: "message", text: "Another question", language: "en", clientId: randomUUID() }, token), ctx);
    expect(mocks.answer).toHaveBeenCalledTimes(1);
    await adminAction(request("/", { action: "conversation", id: String(c._id), humanMode: false }));
    await action(request("/", { action: "message", text: "Continue please", language: "en", clientId: randomUUID() }, token), ctx);
    expect(mocks.answer).toHaveBeenCalledTimes(2);
  });

  it.each(["en", "zh"] as const)("acknowledges messages in team mode exactly once without AI (%s)", async language => {
    const { c, token, ctx } = await conversation({ humanMode: true });
    const body = { action: "message", text: "hi", language, clientId: randomUUID() };
    const response = await action(request("/", body, token), ctx);
    const data = (await response.json()).data;
    expect(data.conversation.humanMode).toBe(true);
    expect(data.messages.map((m: any) => m.role)).toEqual(["customer", "system"]);
    expect(data.messages[1].text).toContain(language === "zh" ? "自动回复已暂停" : "Automatic replies are paused");
    await action(request("/", body, token), ctx);
    expect(await models.SupportMessage.countDocuments({ conversationId: c._id })).toBe(2);
    expect(mocks.answer).not.toHaveBeenCalled();
  });

  it("starts a separate assistant chat while preserving access to the team conversation", async () => {
    const { c, token } = await conversation({ humanMode: true });
    const response = await startConversation(request("/", { language: "en" }, token));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.id).not.toBe(String(c._id));
    const fresh = await ownedConversation(request("/", undefined, token), data.id);
    expect(fresh.conversation.humanMode).toBe(false);
    expect((await ownedConversation(request("/", undefined, token), String(c._id))).conversation.humanMode).toBe(true);
    await action(request("/", { action: "message", text: "Hello", language: "en", clientId: randomUUID() }, token), { params: Promise.resolve({ id: data.id }) });
    expect(mocks.answer).toHaveBeenCalledTimes(1);
  });

  it("serves published bilingual FAQs directly and never exposes drafts", async () => {
    const content = { en: { question: "Test question", answer: "Approved answer" }, zh: { question: "测试问题", answer: "已发布的答案" } };
    await models.SupportArticle.create({ slug: "custom", draft: content });
    expect((await publishedArticles()).some(a => a.slug === "custom")).toBe(false);
    await models.SupportArticle.updateOne({ slug: "custom" }, { $set: { published: content } });
    const { token, ctx } = await conversation();
    const response = await action(request("/", { action: "faq", slug: "custom", language: "zh" }, token), ctx);
    expect((await response.json()).data.messages[0].text).toBe(content.zh.answer);
    expect(mocks.answer).not.toHaveBeenCalled();
  });

  it("sends escaped staff email with a conversation-only expiring link", async () => {
    const { c } = await conversation(); const other = await conversation();
    await models.SupportLead.create({ conversationId: c._id, name: "Visitor", email: "visitor@example.com", consentAt: new Date() });
    mocks.admin = { user: await createTestAdmin(), role: "admin", sessionVersion: 1 };
    const body = { action: "reply", id: String(c._id), text: "<script>hello</script>", clientId: randomUUID() };
    expect((await adminAction(request("/", body))).status).toBe(200);
    await adminAction(request("/", body)); expect(mocks.email).toHaveBeenCalledTimes(1);
    const html = mocks.email.mock.calls[0][0].html;
    expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>");
    const token = /#token=([\w-]+)/.exec(html)![1];
    const response = await returnToConversation(request("/", { token })); expect(response.status).toBe(200);
    const cookieToken = /kapioo-support-guest=([\w-]+)/.exec(response.headers.get("set-cookie")!)![1];
    await expect(ownedConversation(request("/", undefined, cookieToken), String(other.c._id))).rejects.toThrow("not found");
    const attach = await action(request("/", { action: "handoff", order: { kind: "daily", orderId: "DD-12345678" } }, cookieToken), { params: Promise.resolve({ id: String(c._id) }) });
    expect(attach.status).toBe(401);
    await models.SupportConversation.updateOne({ _id: c._id }, { $set: { returnTokenExpires: new Date(0) } });
    expect((await returnToConversation(request("/", { token }))).status).toBe(404);
  });

  it("retains server-verified plan/address through guest checkout and deduplicates approval", async () => {
    const { c, token } = await conversation({ preferences: { area: "North York", coverage: { canDaily: true, canWeekly: true }, address: { streetAddress: "5100 Yonge St", postalCode: "M2N 5V7", addressGeo: { placeId: "place" } } } });
    const response = await checkout(request("/", { conversationId: String(c._id), planId: "weekly-6x1" }, token));
    expect(response.status).toBe(200);
    const data = (await response.json()).data;
    expect(data.destination).toContain("/signup?from=weekly-meal&plan=weekly-6x1"); expect(data.address.addressGeo.placeId).toBe("place");
    const cookie = response.headers.get("set-cookie")!.split(";")[0]; const user = await createTestUser();
    await transact(s => bindPurchaseAttribution(request("/", undefined, undefined, cookie), "weekly:request-1", user._id, "weekly-6x1", s));
    expect(await models.SupportEvent.countDocuments({ kind: "purchase" })).toBe(0);
    await transact(s => recordAssistedPurchase("weekly:request-1", 14011, s));
    await transact(s => recordAssistedPurchase("weekly:request-1", 14011, s));
    expect(await models.SupportEvent.countDocuments({ kind: "purchase" })).toBe(1);
    expect((await models.SupportConversation.findById(c._id))?.userId?.toString()).toBe(String(user._id));
    const stale = signAttribution({ conversationId: String(c._id), planId: "weekly-6x1", at: Date.now() - 8 * 86400_000 });
    await transact(s => bindPurchaseAttribution(request("/", undefined, undefined, `${ATTRIBUTION_COOKIE}=${stale}`), "weekly:stale", user._id, "weekly-6x1", s));
    expect(await models.SupportAttribution.countDocuments()).toBe(1);
  });
});
