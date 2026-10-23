"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, ArrowRight, Headphones, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useLanguage } from "@/lib/language-context";
import { useClientAuth } from "@/lib/client-auth";
import { setStarterAddressSelection } from "@/lib/plan-flow-state";
import { saveSupportCheckoutAddress } from "@/lib/support/checkout-address";
import type { HelpArticle } from "@/lib/support/knowledge";
import type { PlanCard } from "@/lib/support/products";
import type { OrderReference } from "@/lib/contracts/customer-self-service";

type Message = { _id: string; role: string; text: string; cards: PlanCard[]; createdAt: string };
type View = { conversation?: { humanMode: boolean; customerUnread: number }; messages?: Message[]; recommendation?: { question: string; ask: string | null; cards: PlanCard[] } };
const fieldClass = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C2884E]/40";
export default function SupportWidget({ open, onClose, initialRequest, aiEnabled }: { aiEnabled: boolean; open: boolean; onClose: () => void; initialRequest?: { order?: OrderReference; team?: boolean } }) {
  const { language, chooseLanguage } = useLanguage(); const zh = language === "zh"; const { authenticated } = useClientAuth(); const router = useRouter();
  const [id, setId] = useState(""), [view, setView] = useState<View>({}), [text, setText] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [previousId, setPreviousId] = useState("");
  const [articles, setArticles] = useState<HelpArticle[]>([]), [mode, setMode] = useState<"chat" | "faq" | "choose" | "team" | "menus">("chat"), [search, setSearch] = useState("");
  const [purpose, setPurpose] = useState<"support" | "lead">("support");
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [consent, setConsent] = useState(false), [contactSaved, setContactSaved] = useState(false);
  const [street, setStreet] = useState(""), [placeId, setPlaceId] = useState(""), [meals, setMeals] = useState(6), [budget, setBudget] = useState(20);
  const endRef = useRef<HTMLDivElement>(null), initialHandled = useRef(false), startPromise = useRef<Promise<string> | null>(null), activeId = useRef("");
  function selectConversation(nextId: string, nextView: View) {
    activeId.current = nextId; setId(nextId); setView(nextView);
    localStorage.setItem("kapioo.support.conversation", nextId);
  }
  async function api(path: string, body?: unknown) {
    const response = await fetch(`/api/support/${path}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || "Please try again."); return result.data;
  }
  async function ensureConversation(): Promise<string> {
    if (id) return id;
    if (startPromise.current) return startPromise.current;
    startPromise.current = (async () => {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
      if (token) {
        const data = await api("return", { token });
        window.history.replaceState(null, "", window.location.pathname);
        selectConversation(data.id, await api(`conversations/${data.id}`)); return data.id;
      }
      const saved = localStorage.getItem("kapioo.support.conversation");
      if (saved) { try { const data = await api(`conversations/${saved}`); selectConversation(saved, data); return saved; } catch { localStorage.removeItem("kapioo.support.conversation"); } }
      const data = await api("conversations", { language }); selectConversation(data.id, {}); return data.id;
    })().finally(() => { startPromise.current = null; });
    return startPromise.current;
  }
  useEffect(() => {
    setPreviousId(localStorage.getItem("kapioo.support.previousConversation") || "");
    void ensureConversation().catch(e => setError(e.message));
    api("knowledge").then(setArticles).catch(() => {});
  }, []);
  useEffect(() => {
    if (!id || !initialRequest?.team || initialHandled.current) return;
    initialHandled.current = true; setMode("team");
    api(`conversations/${id}`, { action: "handoff", language, ...(initialRequest.order ? { order: initialRequest.order } : {}) }).then(setView).catch(e => setError(e.message));
  }, [id, initialRequest]);
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try { const data = await api(`conversations/${id}`); if (activeId.current !== id) return; setView(prev => ({ ...data, recommendation: prev.recommendation })); if (data.conversation?.customerUnread) await api(`conversations/${id}`, { action: "read" }); } catch {}
    }, 10000);
    return () => clearInterval(timer);
  }, [id]);
  useEffect(() => { if (mode === "chat") endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [view.messages?.length, mode]);
  async function act(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try { const current = await ensureConversation(); const data = await api(`conversations/${current}`, { language, ...body }); setView(prev => ({ ...prev, ...data })); return data; }
    catch (e) { setError((e as Error).message); return null; } finally { setBusy(false); }
  }
  async function switchChat(previous = false) {
    if (busy || !id) return;
    setBusy(true); setError("");
    try {
      const nextId = previous ? previousId : (await api("conversations", { language })).id;
      const nextView = previous ? await api(`conversations/${nextId}`) : {};
      // Starting another enquiry never resumes or removes the team's thread.
      localStorage.setItem("kapioo.support.previousConversation", id); setPreviousId(id);
      selectConversation(nextId, nextView); setMode("chat");
      setContactSaved(false); setConsent(false); setName(""); setEmail(""); setStreet(""); setPlaceId("");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function choose(body: Record<string, unknown> = {}) { setMode("choose"); await act({ action: "preferences", language, ...body }); }
  async function checkout(card: PlanCard) {
    setBusy(true); setError("");
    try {
      if (!card.coverageConfirmed) { await choose(); return; }
      const data = await api("checkout", { conversationId: id, planId: card.planId });
      const a = data.address, p = data.plan;
      saveSupportCheckoutAddress(a);
      setStarterAddressSelection({ areaLabel: data.area, postalCode: a.postalCode, fsa: a.postalCode?.replace(/\s/g, "").slice(0, 3), streetAddress: a.streetAddress, canDaily: data.coverage.canDaily, canWeekly: data.coverage.canWeekly });
      localStorage.setItem("selectedMealPlan", JSON.stringify(p.kind === "weekly" ? { id: p.id, duration: p.weeks, mealsPerWeek: p.mealsPerWeek, totalPrice: p.basePrice, pricePerMeal: p.pricePerMeal } : { id: p.id, type: p.dishType, quantity: p.credits, price: p.basePrice, pricePerMeal: p.pricePerMeal }));
      sessionStorage.setItem("kapioo.assistant.returnTo", JSON.stringify({ path: `/dashboard?tab=${p.kind === "weekly" ? "credits" : "meal-vouchers"}&selectPlan=true&plan=${encodeURIComponent(p.id)}`, expiresAt: Date.now() + 30 * 60_000 }));
      onClose(); router.push(data.destination);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function cards(items: PlanCard[]) {
    return items.map((card, index) => <div key={card.planId} className="mt-3 rounded-xl border border-[#DFCBB7] bg-white p-4 text-sm shadow-sm">
      <span className="text-xs font-semibold text-[#8A5D3B]">{index === 0 ? (zh ? "为您推荐" : "Suggested for you") : (zh ? "另一选择" : "Another option")}</span><h3 className="mt-1 font-semibold">{card.label}</h3>
      <dl className="my-3 space-y-1"><div className="flex justify-between"><dt>{zh ? "餐食" : "Meals"}</dt><dd>CA${card.mealSubtotal.toFixed(2)}</dd></div><div className="flex justify-between"><dt>{zh ? "配送" : "Delivery"}</dt><dd>{card.deliveryFee === null ? (zh ? "确认地址后计算" : "After address check") : `CA$${card.deliveryFee.toFixed(2)}`}</dd></div><div className="flex justify-between"><dt>{zh ? "税费" : "Tax"}</dt><dd>{card.tax === null ? "—" : `CA$${card.tax.toFixed(2)}`}</dd></div><div className="flex justify-between border-t pt-2 font-semibold"><dt>{zh ? "合计" : "Total"}</dt><dd>{card.total === null ? "—" : `CA$${card.total.toFixed(2)}`}</dd></div></dl>
      <Button className="w-full" disabled={busy} onClick={() => checkout(card)}>{card.coverageConfirmed ? (zh ? "选择此计划" : "Choose this plan") : (zh ? "确认配送地址" : "Check my address")}<ArrowRight size={15} className="ml-2"/></Button>
    </div>);
  }
  const shortcuts = [["choose", zh ? "帮我选餐" : "Help me choose"], ["menus", zh ? "菜单与价格" : "Menus & prices"], ["coverage", zh ? "配送区域" : "Delivery coverage"], ["orders", zh ? "管理订单" : "Manage my order"], ["faq", zh ? "常见问题" : "FAQs"]];
  return <Dialog modal={false} open={open} onOpenChange={v => { if (!v) onClose(); }}><DialogContent onInteractOutside={e => e.preventDefault()} className="!fixed !bottom-3 !left-auto !right-3 !top-auto !translate-x-0 !translate-y-0 flex h-[min(780px,90svh)] w-[calc(100vw-1.5rem)] max-w-[420px] flex-col gap-0 overflow-hidden rounded-2xl border-[#E5D7C9] p-0 sm:bottom-5 sm:right-5">
    <header className="border-b bg-[#FBF7F2] px-5 py-4"><div className="mb-2 flex flex-wrap gap-2 pr-5"><button className="rounded border px-2 py-1 text-xs" onClick={() => chooseLanguage(zh ? "en" : "zh")} aria-label="Switch chat language">{zh ? "English" : "中文"}</button><button disabled={busy || !id} className="rounded border px-2 py-1 text-xs disabled:opacity-50" onClick={() => switchChat()}>{zh ? "新对话" : "New chat"}</button>{previousId && previousId !== id && <button disabled={busy || !id} className="rounded border px-2 py-1 text-xs disabled:opacity-50" onClick={() => switchChat(true)}>{zh ? "返回上一对话" : "Previous chat"}</button>}</div><DialogTitle className="text-[#573E2C]">{zh ? "Kapioo 咨询与帮助" : "Kapioo chat & help"}</DialogTitle><DialogDescription className="mt-1 text-xs">{view.conversation?.humanMode ? (zh ? "等待团队回复 · 本对话的自动回复已暂停" : "Waiting for the team · Automatic replies are paused") : !aiEnabled ? (zh ? "常见问题即时解答 · 其他问题请联系团队" : "Instant answers to common questions · Team help for anything else") : (zh ? "AI 餐食助手 · 随时可联系团队" : "AI meal-plan assistant · Our team is always an option")}</DialogDescription></header>
    <nav className="flex flex-wrap gap-2 border-b px-4 py-3" aria-label={zh ? "帮助主题" : "Help topics"}>{shortcuts.map(([key, label]) => <button key={key} disabled={busy} className="rounded-full border border-[#E3D3C4] px-3 py-1.5 text-xs hover:bg-[#FBF7F2] disabled:opacity-50" onClick={() => {
      if (key === "choose") void choose(); else if (key === "orders") { const path = "/dashboard?tab=orders"; sessionStorage.setItem("kapioo.assistant.returnTo", JSON.stringify({ path, expiresAt: Date.now() + 1800000 })); onClose(); router.push(authenticated ? path : "/login"); }
      else if (key === "coverage") { setMode("choose"); void choose(); }
      else if (key === "menus") { setMode("menus"); }
      else setMode("faq");
    }}>{label}</button>)}</nav>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {mode === "faq" && <section className="space-y-3"><label className="sr-only" htmlFor="support-search">{zh ? "搜索问题" : "Search questions"}</label><input id="support-search" className={fieldClass} placeholder={zh ? "搜索常见问题…" : "Search common questions…"} value={search} onChange={e => setSearch(e.target.value)}/>{articles.filter(a => `${a[language].question} ${a[language].answer}`.toLowerCase().includes(search.toLowerCase())).map(a => <details key={a.slug} className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-medium">{a[language].question}</summary><p className="mt-3 whitespace-pre-wrap leading-relaxed">{a[language].answer}</p></details>)}</section>}
      {mode === "menus" && <section className="space-y-3"><h3 className="font-semibold">{zh ? "当前菜单和价格" : "Current menus and prices"}</h3><p className="text-sm">{zh ? "查看当前菜单与计划价格，或用选餐助手比较含配送和税费的总价。" : "View current menus and plan prices, or use the chooser to compare totals including delivery and tax."}</p><Link href="/daily-delivery" onClick={onClose} className="block rounded-xl border p-4 text-sm underline">{zh ? "每日 Bento 菜单与价格" : "Daily Bento menus & prices"}</Link><Link href="/weekly-meal" onClick={onClose} className="block rounded-xl border p-4 text-sm underline">{zh ? "周次 Meal Box 菜单与价格" : "Weekly Meal Box menus & prices"}</Link><Button onClick={() => choose()}>{zh ? "帮我选餐" : "Help me choose"}</Button></section>}
      {mode === "choose" && <section className="space-y-4"><h3 className="font-medium">{zh ? "找到适合您的餐食" : "Find your meal plan"}</h3><p className="text-sm leading-relaxed">{view.recommendation?.question}</p>
        {view.recommendation?.ask === "address" && <div className="space-y-3"><AddressAutocomplete value={street} language={language} onInputChange={v => { setStreet(v); setPlaceId(""); }} onAddressSelect={a => { setStreet(a.address.streetAddress || ""); setPlaceId(a.addressGeo.placeId || ""); }}/><Button disabled={!placeId || busy} onClick={() => choose({ address: { placeId } })}>{zh ? "确认配送范围" : "Check availability"}</Button></div>}
        {view.recommendation?.ask === "kind" && <div className="grid gap-2"><Button variant="outline" disabled={busy} onClick={() => choose({ kind: "daily" })}>{zh ? "每日新鲜午餐" : "Fresh lunches"}</Button><Button variant="outline" disabled={busy} onClick={() => choose({ kind: "weekly" })}>{zh ? "冷藏后加热享用" : "Meals to refrigerate and reheat"}</Button></div>}
        {view.recommendation?.ask === "meals" && <form onSubmit={e => { e.preventDefault(); void choose({ meals }); }} className="space-y-3"><label className="text-sm">{zh ? "每周份数" : "Meals per week"}<input className={fieldClass} type="number" min={1} max={100} value={meals} onChange={e => setMeals(Number(e.target.value))}/></label><Button disabled={busy}>{zh ? "继续" : "Continue"}</Button></form>}
        {view.recommendation?.ask === "budget" && <form onSubmit={e => { e.preventDefault(); void choose({ budget }); }} className="space-y-3"><label className="text-sm">{zh ? "每餐预算（加元）" : "Budget per meal (CAD)"}<input className={fieldClass} type="number" min={1} max={1000} value={budget} onChange={e => setBudget(Number(e.target.value))}/></label><div className="flex gap-2"><Button disabled={busy}>{zh ? "查看计划" : "See plans"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => choose({ budget: 0 })}>{zh ? "跳过" : "Skip"}</Button></div></form>}
        {cards(view.recommendation?.cards || [])}<Button variant="outline" disabled={busy} onClick={() => { setPurpose("lead"); setMode("team"); }}>{zh ? "购买前请团队帮忙" : "Get help before buying"}</Button><div className="flex gap-3 text-xs"><Link href="/daily-delivery" onClick={onClose} className="underline">{zh ? "每日菜单" : "Daily menu"}</Link><Link href="/weekly-meal" onClick={onClose} className="underline">{zh ? "周次菜单" : "Weekly menu"}</Link></div>
      </section>}
      {mode === "team" && <section className="space-y-3"><h3 className="font-medium">{zh ? "让团队帮助您" : "Let our team help"}</h3><p className="text-sm">{zh ? "可留下姓名和邮箱接收回复；不提交也能继续浏览和选餐。" : "Optionally leave your name and email for a reply. You can keep browsing and choosing plans without submitting this form."}</p>{contactSaved ? <p className="rounded-lg bg-green-50 p-3 text-sm">{zh ? "已保存。您可以在下方继续留言。" : "Saved. You can add a message below."}</p> : <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await act({ action: "lead", name, email, consent, purpose })) setContactSaved(true); }}><label className="block text-sm">{zh ? "姓名" : "Name"}<input required maxLength={100} className={fieldClass} autoComplete="name" value={name} onChange={e => setName(e.target.value)}/></label><label className="block text-sm">{zh ? "邮箱" : "Email"}<input required maxLength={254} type="email" className={fieldClass} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/></label><label className="flex gap-2 text-xs leading-relaxed"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>{zh ? "我同意 Kapioo 就本次咨询通过邮件联系我。" : "I agree that Kapioo may email me about this enquiry."}</label><Button disabled={busy || !consent}>{zh ? "请求回复" : "Request a reply"}</Button></form>}</section>}
      {mode === "chat" && !view.messages?.length && <p className="rounded-xl bg-[#FBF7F2] p-4 text-sm leading-relaxed">{zh ? "您好！想了解我们的餐食，还是需要帮您选择计划？" : "Hello! What would you like to know about our meals? I can also help you choose a plan."}</p>}
      <div className="mt-4 space-y-3" aria-live="polite">{view.messages?.map(m => <div key={m._id} className={`rounded-xl p-3 text-sm leading-relaxed ${m.role === "customer" ? "ml-7 bg-[#805638] text-white" : "mr-4 bg-[#F5F1EC] text-[#463C33]"}`}><span className="mb-1 block text-[10px] font-semibold uppercase opacity-70">{m.role === "customer" ? (zh ? "您" : "You") : m.role === "staff" ? (zh ? "Kapioo 团队" : "Kapioo team") : "Kapioo"}</span><p className="whitespace-pre-wrap break-words">{m.text}</p>{cards(m.cards || [])}</div>)}<div ref={endRef}/></div>
    </div>
    <footer className="border-t bg-white p-3"><button disabled={busy} className="mb-3 flex items-center gap-2 text-xs font-medium text-[#805638]" onClick={async () => { setPurpose("support"); setMode("team"); await act({ action: "handoff" }); }}><Headphones size={14}/>{zh ? "联系团队" : "Talk to the team"}</button><form className="flex gap-2" onSubmit={async e => { e.preventDefault(); if (!text.trim() || busy) return; setMode("chat"); const sent = await act({ action: "message", text, language, clientId: crypto.randomUUID() }); if (sent) setText(""); }}><label htmlFor="support-message" className="sr-only">{zh ? "您的问题" : "Your question"}</label><input id="support-message" value={text} onChange={e => setText(e.target.value)} maxLength={2500} className={fieldClass} placeholder={view.conversation?.humanMode ? (zh ? "给团队留言…" : "Leave a message for the team…") : (zh ? "输入您的问题…" : "Ask a question…")}/><Button type="submit" disabled={busy || !text.trim()} aria-label={zh ? "发送" : "Send"}>{busy ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}</Button></form></footer>
  </DialogContent></Dialog>;
}
