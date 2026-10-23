"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { OrderReference } from "@/lib/contracts/customer-self-service";

const SupportWidget = dynamic(() => import("./support-widget"), { ssr: false });
export function SupportLauncher() {
  const pathname = usePathname(); const { language } = useLanguage(); const zh = language === "zh";
  const [aiEnabled, setAiEnabled] = useState(false);
  const [enabled, setEnabled] = useState(false), [open, setOpen] = useState(false), [hint, setHint] = useState(false);
  const [request, setRequest] = useState<{ order?: OrderReference; team?: boolean } | undefined>();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/support/conversations", { signal: controller.signal }).then(r => r.json()).then(d => { setEnabled(Boolean(d.data?.enabled)); setAiEnabled(Boolean(d.data?.aiEnabled)); }).catch(() => {});
    return () => controller.abort();
  }, [pathname]);
  useEffect(() => {
    if (!enabled) return;
    try { if (!sessionStorage.getItem("kapioo.support.invited")) { setHint(true); sessionStorage.setItem("kapioo.support.invited", "1"); } } catch {}
    const handler = (e: Event) => { setRequest((e as CustomEvent).detail); setOpen(true); setHint(false); };
    window.addEventListener("kapioo-support-open", handler);
    if (pathname === "/support") setOpen(true);
    return () => window.removeEventListener("kapioo-support-open", handler);
  }, [enabled, pathname]);
  if (!enabled || pathname?.startsWith("/admin")) return null;
  return <>
    {!open && <div className="fixed bottom-5 right-4 z-[55] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:right-6">
      {hint && <div className="flex items-center gap-1 rounded-xl border border-[#E8DDD4] bg-white p-2 shadow-lg"><button className="px-2 py-1 text-sm text-[#5C4635]" onClick={() => { setOpen(true); setHint(false); }}>{zh ? "需要帮您选择餐食计划吗？" : "Need help choosing a plan?"}</button><button aria-label={zh ? "关闭提示" : "Dismiss invitation"} className="rounded p-2 hover:bg-stone-100" onClick={() => setHint(false)}><X size={16}/></button></div>}
      <button onClick={() => { setOpen(true); setHint(false); }} className="flex min-h-12 items-center gap-2 rounded-full bg-[#805638] px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#68442D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={zh ? "打开 Kapioo 帮助" : "Open Kapioo help"}><MessageCircle size={20}/>{zh ? "咨询与帮助" : "Chat & help"}</button>
    </div>}
    {open && <SupportWidget aiEnabled={aiEnabled} open={open} onClose={() => { setOpen(false); setRequest(undefined); }} initialRequest={request}/>}
  </>;
}
