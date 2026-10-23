"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useLanguage } from "@/lib/language-context";
import { useOptionalUserProfile } from "@/lib/dashboard-user-profile";
import { useClientAuth } from "@/lib/client-auth";
import type { ParsedGoogleAddress } from "@/lib/address/types";
import type { OrderActionAvailability, OrderChangePreview, OrderReference } from "@/lib/contracts/customer-self-service";
import { isBeforeChangeDeadline } from "@/lib/self-service/deadline";

type SelectableOrder = OrderReference & { dates: string[]; eligible: boolean; reason: string };
export function openOrderSupport(order?: OrderReference) {
  const query = order ? `?order=${encodeURIComponent(`${order.kind}:${order.orderId}`)}` : "";
  window.location.assign(`/support${query}`);
}
export function CustomerOrderActions({ kind, orderId, status, availability, onChanged, adminCustomerId }: OrderReference & { status?: string; availability?: OrderActionAvailability; onChanged: () => void | Promise<void>; adminCustomerId?: string }) {
  const { language } = useLanguage(); const zh = language === "zh";
  const profile = useOptionalUserProfile(); const { user } = useClientAuth();
  const [action, setAction] = useState<"cancel" | "address" | null>(null);
  const [preview, setPreview] = useState<OrderChangePreview | null>(null);
  const [orders, setOrders] = useState<SelectableOrder[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [address, setAddress] = useState<ParsedGoogleAddress | null>(null);
  const [street, setStreet] = useState(""); const [unit, setUnit] = useState(""); const [buzz, setBuzz] = useState("");
  const [save, setSave] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [reviewInvalid, setReviewInvalid] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!availability?.addressUntil && !availability?.cancelUntil) return;
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [availability?.addressUntil, availability?.cancelUntil]);
  // Admin support links have no order payload; their preview still checks the server.
  const canAddress = availability ? isBeforeChangeDeadline(availability.addressUntil, now) : Boolean(adminCustomerId);
  const canCancel = availability ? isBeforeChangeDeadline(availability.cancelUntil, now) : Boolean(adminCustomerId);
  if (process.env.NEXT_PUBLIC_SELF_SERVICE_ENABLED !== "true" && user?.role !== "admin") return null;
  if (status === "cancelled" || status === "refunded") return null;
  if (!canAddress && !canCancel && !action) return null;
  async function api(path: string, body?: unknown) {
    const url = adminCustomerId ? `/api/admin/support/order-changes?customerId=${encodeURIComponent(adminCustomerId)}` : `/api/self-service/${path}`;
    const payload = adminCustomerId && body ? { step: path, customerId: adminCustomerId, ...(path === "preview" ? { input: body } : body) } : body;
    const res = await fetch(url, payload ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : { cache: "no-store" });
    const data = await res.json(); if (!res.ok || !data.success) throw Object.assign(new Error(data.error || "Please try again."), { code: data.errorCode }); return data.data;
  }
  async function start(next: "cancel" | "address") {
    setAction(next); setPreview(null); setError(""); setReviewInvalid(false); setDone(false); setSave(false); setAddress(null); setStreet(""); setUnit(""); setBuzz(""); setBusy(true);
    try {
      if (next === "cancel") setPreview(await api("preview", { action: "cancel", order: { kind, orderId } }));
      else { setOrders(await api("orders")); setSelected([`${kind}:${orderId}`]); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function previewAddress() {
    setBusy(true); setError(""); setPreview(null); setReviewInvalid(false);
    try {
      if (!address?.addressGeo.placeId) throw new Error(zh ? "请从建议中选择地址。" : "Select an address from the suggestions.");
      setPreview(await api("preview", { action: "address", orders: orders.filter(o => selected.includes(`${o.kind}:${o.orderId}`)).map(({ kind, orderId }) => ({ kind, orderId })), address: { placeId: address.addressGeo.placeId, unitNumber: unit, buzzCode: buzz }, saveForFuture: save }));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true); setError("");
    try { await api("confirm", { operationId: preview?.operationId }); setDone(true); await onChanged(); if (profile) { await profile.refreshUserProfile(); if (profile.userData?._id) await profile.refreshOrderStats(profile.userData._id); } }
    catch (e) {
      const stale = ["REVIEW_CHANGED", "REVIEW_EXPIRED"].includes((e as Error & { code?: string }).code || "");
      setReviewInvalid(stale);
      setError(stale ? (zh ? "此确认内容已过期或订单信息有更新。未应用任何修改。请点击「查看最新详情」重新核对后确认。" : "This review expired or the order details changed. No changes were applied. Select Review latest details, then confirm again.") : (e as Error).message);
    } finally { setBusy(false); }
  }
  const refundLabel = (field: string) => ({ twoDishVoucher: zh ? "两菜餐券" : "two-dish vouchers", threeDishVoucher: zh ? "三菜餐券" : "three-dish vouchers", credits: zh ? "积分" : "credits", weeklySIXmeals: zh ? "6餐周券" : "6-meal weekly vouchers", weeklyEIGHTmeals: zh ? "8餐周券" : "8-meal weekly vouchers", weeklyTENmeals: zh ? "10餐周券" : "10-meal weekly vouchers", weeklyTWELVEmeals: zh ? "12餐周券" : "12-meal weekly vouchers", weeklySIXTEENmeals: zh ? "16餐周券" : "16-meal weekly vouchers" }[field] || field);
  return <div className="mt-3 flex flex-wrap gap-2">
    {canAddress && <Button size="sm" variant="outline" onClick={() => start("address")}>{zh ? "修改地址" : "Change address"}</Button>}
    {canCancel && <Button size="sm" variant="outline" onClick={() => start("cancel")}>{kind === "weekly" ? (zh ? "取消整组" : "Cancel entire group") : (zh ? "取消订单" : "Cancel order")}</Button>}
    <Dialog open={Boolean(action)} onOpenChange={open => { if (!open && !busy) setAction(null); }}><DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
      <DialogTitle>{done ? (zh ? "修改已完成" : "Your change is complete") : action === "cancel" ? (zh ? "确认取消" : "Review cancellation") : (zh ? "修改配送地址" : "Change delivery address")}</DialogTitle>
      <DialogDescription>{zh ? "请核对所有受影响的配送。截止时间按多伦多时间计算。" : "Review every affected delivery. Deadlines use Toronto time."}</DialogDescription>
      {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><p>{error}</p>{reviewInvalid && <Button variant="outline" className="mt-2" disabled={busy} onClick={() => action === "cancel" ? start("cancel") : previewAddress()}>{zh ? "查看最新详情" : "Review latest details"}</Button>}<Button variant="link" onClick={() => { setAction(null); openOrderSupport({ kind, orderId }); }}>{zh ? "联系团队" : "Contact support"}</Button></div>}
      {busy && <p role="status" className="text-sm">{zh ? "处理中…" : "Working…"}</p>}
      {!preview && action === "address" && !done && <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{zh ? "新地址必须符合每个所选订单的配送范围。每日 Bento 按配送地图核对；周次 Meal Box 按指定邮区核对。若同时选择两种配送，地址必须同时符合两者。" : "The new address must be covered by every selected delivery. Daily Bento uses our delivery map; Weekly Meal Box uses our approved postal areas. Selecting both requires coverage by both."}</p>
        <fieldset className="space-y-2"><legend className="mb-2 font-medium">{zh ? "选择配送" : "Select deliveries"}</legend>{orders.map(o => <label key={`${o.kind}:${o.orderId}`} className="flex gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" disabled={!o.eligible || busy} checked={selected.includes(`${o.kind}:${o.orderId}`)} onChange={e => setSelected(s => e.target.checked ? [...s, `${o.kind}:${o.orderId}`] : s.filter(id => id !== `${o.kind}:${o.orderId}`))}/><span>{o.orderId} · {o.dates.join(", ")}{!o.eligible && <span className="block text-muted-foreground">{o.reason}</span>}</span></label>)}</fieldset>
        {!adminCustomerId && user?.address && user?.addressGeo?.placeId && <Button variant="outline" disabled={busy} onClick={() => { setAddress({ address: user.address!, addressGeo: user.addressGeo! }); setStreet(user.address?.streetAddress || ""); setUnit(user.address?.unitNumber || ""); setBuzz(user.address?.buzzCode || ""); }}>{zh ? "使用已保存的地址" : "Use my saved address"}</Button>}
        <AddressAutocomplete value={street} language={language} onInputChange={v => { setStreet(v); setAddress(null); }} onAddressSelect={a => { setAddress(a); setStreet(a.address.streetAddress || ""); }}/>
        <label className="block text-sm">{zh ? "单元号" : "Unit"}<input className="mt-1 w-full rounded-md border p-2" value={unit} maxLength={80} onChange={e => setUnit(e.target.value)}/></label>
        <label className="block text-sm">{zh ? "门铃号码" : "Buzzer"}<input className="mt-1 w-full rounded-md border p-2" value={buzz} maxLength={80} onChange={e => setBuzz(e.target.value)}/></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={save} onChange={e => setSave(e.target.checked)}/>{zh ? "同时保存用于以后下单" : "Also save for future orders"}</label>
        <Button disabled={busy || !address || !selected.length} onClick={previewAddress}>{zh ? "查看修改" : "Review changes"}</Button>
      </div>}
      {preview && <div className="space-y-3 text-sm">
        {preview.groupId && <div className="space-y-2 rounded-lg bg-amber-50 p-3"><p className="font-medium">{zh ? "将取消以下整组配送，不可单独取消其中一单。" : "This cancels the entire group below. Individual deliveries cannot be cancelled separately."}</p><p><strong>{zh ? "整组取消截止时间：" : "Group cancellation deadline: "}</strong>{preview.groupCutoff || preview.orders.map(o => o.cutoff).sort()[0]}</p><p>{zh ? "截止时间以最早一次配送为准。一旦超过，即使订单状态未更新，也无法在线取消或退回整组餐券或积分。" : "The earliest delivery sets this deadline. Once it passes, the group cannot be cancelled or refunded online, even if the order status has not been updated."}</p></div>}
        {preview.orders.map(o => <div key={`${o.kind}:${o.orderId}`} className="rounded-lg border p-3"><strong>{o.orderId}</strong><p>{o.dates.join(", ")}</p><p className="text-muted-foreground">{o.address}</p>{!preview.groupId && <p>{zh ? "截止：" : "Deadline: "}{o.cutoff}</p>}</div>)}
        {preview.refunds.map(r => <p key={r.field}>{zh ? "退回：" : "Returned: "}<strong>{r.amount} {refundLabel(r.field)}</strong></p>)}
        {preview.newAddress && <p><strong>{zh ? "新地址：" : "New address: "}</strong>{Object.values(preview.newAddress).filter(Boolean).join(", ")}<br/>{preview.saveForFuture ? (zh ? "同时保存用于以后下单。" : "Also saved for future orders.") : (zh ? "仅修改所选订单。" : "Only the selected orders change.")}</p>}
        {!done && <Button disabled={busy || reviewInvalid || (action === "cancel" ? !canCancel : !canAddress)} variant={action === "cancel" ? "destructive" : "default"} onClick={confirm}>{zh ? "确认" : "Confirm change"}</Button>}
      </div>}
      {done && <Button onClick={() => setAction(null)}>{zh ? "完成" : "Done"}</Button>}
    </DialogContent></Dialog>
  </div>;
}
