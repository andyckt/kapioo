"use client"

import dynamic from "next/dynamic"
import { ArrowDown, CalendarDays, Clock3, Refrigerator } from "lucide-react"

import { AvailableAreas } from "@/components/available-areas"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import { getWeeklyPlanBalanceRows } from "@/lib/plans/balances"

const CreditPurchasePlans = dynamic(
  () => import("@/components/credit-purchase-plans").then((mod) => ({ default: mod.CreditPurchasePlans })),
  { ssr: false }
)
const CreditPurchaseHistory = dynamic(
  () => import("@/components/credit-purchase-history").then((mod) => ({ default: mod.CreditPurchaseHistory })),
  { ssr: false }
)

export interface DashboardCreditsTabProps {
  language: "en" | "zh"
  userData: DashboardUserData | null
  purchaseHistoryKey: number
  onPurchaseSuccess: () => void
}

export function DashboardCreditsTab({
  language,
  userData,
  purchaseHistoryKey,
  onPurchaseSuccess,
}: DashboardCreditsTabProps) {
  const zh = language === "zh"
  const balances = userData ? getWeeklyPlanBalanceRows(userData).filter((plan) => plan.balance > 0) : []

  return (
    <div className="kp-credits">
      <div className="kp-credits-intro">
        <div className="kp-credits-copy">
          <p className="kp-overline">{zh ? "每周餐盒 · 餐券方案" : "WEEKLY MEAL BOX · VOUCHERS"}</p>
          <h1>{zh ? <>轻松安排<em>一整周。</em></> : <>Make room for <em>a better week.</em></>}</h1>
          <p>{zh ? "先购买周餐券，再选择想要配送的那一周。每周配送两次，冰箱随时有好餐。" : "Buy weeks now, then choose when to redeem them. Two deliveries each week keep your fridge ready for whatever comes next."}</p>
          <button type="button" className="kp-pill-button" onClick={() => document.getElementById("weekly-meal-plans-section")?.scrollIntoView({ behavior: "smooth" })}>
            {zh ? "查看餐券方案" : "Explore voucher plans"} <ArrowDown size={17} />
          </button>
        </div>
        <div className="kp-credits-note">
          <div><CalendarDays size={22} /><span>{zh ? "每周配送两次" : "Twice-weekly delivery"}</span></div>
          <div><Refrigerator size={22} /><span>{zh ? "冷藏保存，随时享用" : "Stock the fridge, eat on your time"}</span></div>
          <div><Clock3 size={22} /><span>{zh ? "6 个月内自由兑换" : "Redeem within 6 months"}</span></div>
          {balances.length > 0 && (
            <div className="kp-credits-balance">
              <small>{zh ? "你的可用周餐券" : "YOUR AVAILABLE WEEKS"}</small>
              <strong>{balances.reduce((sum, plan) => sum + plan.balance, 0)}</strong>
              <p>{balances.map((plan) => zh ? plan.labelZh : `${plan.mealsPerWeek} meals/week`).join(" · ")}</p>
            </div>
          )}
        </div>
      </div>
      <div className="kp-credits-area"><AvailableAreas /></div>
      {userData?._id && (
        <>
          <div id="weekly-meal-plans-section" className="kp-credits-plans"><CreditPurchasePlans userId={userData._id} onSuccess={onPurchaseSuccess} /></div>
          <div className="kp-credits-history"><CreditPurchaseHistory key={purchaseHistoryKey} userId={userData._id} /></div>
        </>
      )}
    </div>
  )
}
