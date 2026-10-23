"use client"

import Image from "next/image"
import { ArrowUpRight, CalendarDays, Check, Clock3 } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type DailyVoucherIntroProps = {
  language: "en" | "zh"
  twoDishBalance: number
  threeDishBalance: number
  detailsOpen: boolean
  onDetailsOpenChange: (open: boolean) => void
}

export function DailyVoucherIntro({
  language,
  twoDishBalance,
  threeDishBalance,
  detailsOpen,
  onDetailsOpenChange,
}: DailyVoucherIntroProps) {
  const zh = language === "zh"
  const highlights = zh
    ? ["新鲜现做，午间配送", "先买餐券，想吃时再兑换", "每次配送至少 2 份餐食"]
    : ["Freshly cooked for lunchtime", "Buy vouchers, redeem on your days", "At least 2 meals per delivery"]
  const steps = zh
    ? [
        { title: "选购餐券", body: "选择 2 菜或 3 菜餐券套餐，完成付款后，餐券会记入你的账户。" },
        { title: "按需兑换", body: "查看轮换菜单，选择想吃的餐食与可配送日期。餐券不会自动生成订单。" },
        { title: "等待午餐", body: "我们在配送当天现做餐食，并于上午 11 点至下午 1 点配送。每次至少订购 2 份。" },
      ]
    : [
        { title: "Choose your vouchers", body: "Pick a 2-dish or 3-dish pack. Your vouchers are added to your account after payment is confirmed." },
        { title: "Redeem when you want", body: "Explore the rotating menu and select meals for an available delivery day. Vouchers never create automatic orders." },
        { title: "Enjoy a fresh lunch", body: "We cook for your delivery day and deliver between 11 a.m. and 1 p.m. Order at least two meals per delivery." },
      ]

  return <>
    <section className="kp-purchase-hero" aria-labelledby="daily-vouchers-title">
      <div className="kp-purchase-hero-copy">
        <p className="kp-overline">{zh ? "每日 BENTO · 餐券计划" : "DAILY BENTO · MEAL VOUCHERS"}</p>
        <h1 id="daily-vouchers-title">{zh ? <>想吃的午餐，<em>由你安排。</em></> : <>A fresh lunch, <em>on your time.</em></>}</h1>
        <p className="kp-purchase-lead">{zh ? "先购买餐券，按想吃的日子兑换。新鲜现做的亚洲风味午餐，送到你的身边。" : "Buy vouchers now. Redeem them on the lunch days you choose. Fresh Asian fusion meals, delivered to you."}</p>
        <div className="kp-purchase-balances" aria-label={zh ? "现有餐券" : "Your voucher balances"}>
          <span><strong>{twoDishBalance}</strong>{zh ? "张 2 菜餐券" : "2-dish vouchers"}</span>
          <span><strong>{threeDishBalance}</strong>{zh ? "张 3 菜餐券" : "3-dish vouchers"}</span>
        </div>
        <button type="button" className="kp-purchase-text-link" onClick={() => onDetailsOpenChange(true)}>{zh ? "了解每日 Bento" : "How Daily Bento works"}<ArrowUpRight size={17} aria-hidden="true" /></button>
      </div>
      <div className="kp-purchase-hero-photo">
        <Image src="/marketing/chinese-1280.webp" alt={zh ? "Kapioo 每日 Bento 餐食" : "A Kapioo Daily Bento meal"} fill sizes="(max-width: 760px) 100vw, 34vw" priority={false} />
        <span>{zh ? "新鲜现做 · 按需兑换" : "Freshly made · Yours to redeem"}</span>
      </div>
    </section>

    <Dialog open={detailsOpen} onOpenChange={onDetailsOpenChange}>
      <DialogContent className="kp-purchase-dialog">
        <DialogHeader>
          <p className="kp-overline">{zh ? "每日 BENTO" : "DAILY BENTO"}</p>
          <DialogTitle>{zh ? "午餐，就按你的节奏。" : "Lunch on your schedule."}</DialogTitle>
          <DialogDescription>{zh ? "从购买餐券到新鲜送达，简单三步。" : "Three simple steps from vouchers to a fresh delivery."}</DialogDescription>
        </DialogHeader>
        <div className="kp-purchase-dialog-scroll">
          <ol className="kp-purchase-steps">
            {steps.map((step, index) => <li key={step.title}><span>0{index + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}
          </ol>
          <div className="kp-purchase-facts">
            <p><CalendarDays size={18} aria-hidden="true" />{zh ? "餐券有效期 6 个月，可转让" : "Vouchers last 6 months and are transferable"}</p>
            <p><Clock3 size={18} aria-hidden="true" />{zh ? "购买后 7 天内，未用部分可退款" : "Unused portion refundable within 7 days of purchase"}</p>
          </div>
        </div>
        <div className="kp-purchase-dialog-action"><button type="button" className="kp-purchase-primary" onClick={() => onDetailsOpenChange(false)}><Check size={17} aria-hidden="true" />{zh ? "继续选择餐券" : "Explore voucher packs"}</button></div>
      </DialogContent>
    </Dialog>
  </>
}
