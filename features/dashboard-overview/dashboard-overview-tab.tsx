"use client"

import Image from "next/image"
import { ArrowUpRight, CalendarDays, ShoppingBag, Ticket } from "lucide-react"

import { getUserDailyEligibility } from "@/lib/address/daily-eligibility"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import { getWeeklyPlanBalanceRows } from "@/lib/plans/balances"

type DashboardTabId =
  | "orders"
  | "daily-delivery"
  | "meal-vouchers"
  | "weekly-subscription"
  | "credits"
  | "settings"

export interface DashboardOverviewTabProps {
  language: "en" | "zh"
  userData: DashboardUserData | null
  userLoading: boolean
  dashboardHeaderDate: string
  upcomingDeliveries: number
  onTabChange: (tab: DashboardTabId) => void
}

export function DashboardOverviewTab({
  language,
  userData,
  userLoading,
  dashboardHeaderDate,
  upcomingDeliveries,
  onTabChange,
}: DashboardOverviewTabProps) {
  const zh = language === "zh"
  const firstName = userData?.name?.trim().split(/\s+/)[0]
  const dailyTwo = userData?.twoDishVoucher || 0
  const dailyThree = userData?.threeDishVoucher || 0
  const weeklyPlans = userData ? getWeeklyPlanBalanceRows(userData).filter((plan) => plan.balance > 0) : []
  const weeklyBalance = weeklyPlans.reduce((sum, plan) => sum + plan.balance, 0)
  const dailyBalance = dailyTwo + dailyThree
  const eligibility = userData ? getUserDailyEligibility(userData) : null
  const firstStep: DashboardTabId = !eligibility?.isServed
    ? "settings"
    : dailyBalance > 0
      ? "daily-delivery"
      : weeklyBalance > 0
        ? "weekly-subscription"
        : eligibility.canDaily
          ? "meal-vouchers"
          : "credits"

  return (
    <div className="kp-overview">
      <div className="kp-overview-head">
        <div>
          <p className="kp-overline">{zh ? "我的餐食" : "YOUR KAPIOO SPACE"}</p>
          <h1>{zh ? `欢迎回来${firstName ? `，${firstName}` : ""}。` : `Welcome back${firstName ? `, ${firstName}` : ""}.`}</h1>
          <p className="kp-overview-date">{dashboardHeaderDate}</p>
        </div>
        <button type="button" className="kp-overview-orders" onClick={() => onTabChange("orders")}>
          {zh ? "查看订单" : "View orders"} <ArrowUpRight size={17} />
        </button>
      </div>

      <section className="kp-overview-feature" aria-label={zh ? "开始点餐" : "Start a meal"}>
        <div className="kp-overview-feature-copy">
          <p className="kp-overline">{zh ? "好好吃饭，从这里开始" : "A LITTLE MORE ROOM FOR LIFE"}</p>
          <h2>{zh ? <>今天吃什么，<em>交给我们。</em></> : <>Good food for <em>whatever’s next.</em></>}</h2>
          <p>{zh ? "选好想吃的餐食，我们会为你做好并送达。" : "Pick your meals when it suits you. We’ll take care of the cooking and delivery."}</p>
          <button type="button" className="kp-pill-button" disabled={userLoading} onClick={() => onTabChange(firstStep)}>
            {!eligibility?.isServed ? (zh ? "更新配送地址" : "Update delivery address") : dailyBalance + weeklyBalance > 0 ? (zh ? "选择餐食" : "Choose your meals") : (zh ? "查看餐券方案" : "Explore meal plans")} <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="kp-overview-feature-photo">
          <Image src="/marketing/hero-after-work-1280.webp" alt={zh ? "享用 Kapioo 餐食" : "Enjoying a Kapioo meal after work"} fill sizes="(max-width: 760px) 100vw, 38vw" priority />
        </div>
      </section>

      <div className="kp-overview-section-heading">
        <div>
          <p className="kp-overline">{zh ? "一目了然" : "AT A GLANCE"}</p>
          <h2>{zh ? "你的餐食，按你的节奏。" : "Your meals, your rhythm."}</h2>
        </div>
        {upcomingDeliveries > 0 && (
          <button type="button" className="kp-upcoming-link" onClick={() => onTabChange("orders")}>
            <span className="kp-upcoming-dot" />
            {zh ? `${upcomingDeliveries} 笔待配送订单` : `${upcomingDeliveries} upcoming ${upcomingDeliveries === 1 ? "delivery" : "deliveries"}`}
            <ArrowUpRight size={16} />
          </button>
        )}
      </div>

      {userLoading ? (
        <div className="kp-overview-loading" role="status" aria-live="polite">{zh ? "正在加载你的账户…" : "Loading your account…"}</div>
      ) : (
        <>
          {!eligibility?.isServed && (
            <div className="kp-overview-address">
              <span>{zh ? "请确认配送地址，以查看目前可用的餐食方案。" : "Confirm your delivery address to see which meals are available to you."}</span>
              <button type="button" onClick={() => onTabChange("settings")}>{zh ? "更新地址" : "Update address"} <ArrowUpRight size={16} /></button>
            </div>
          )}
          <div className="kp-overview-grid">
            {(eligibility?.canDaily || dailyTwo + dailyThree > 0) && (
              <article className="kp-overview-card">
                <div className="kp-overview-card-top"><span className="kp-overview-card-icon"><ShoppingBag size={21} /></span><span>01 / {zh ? "每日便当" : "DAILY BENTO"}</span></div>
                <h3>{zh ? "新鲜午餐，按需点选。" : "Fresh lunch, on your time."}</h3>
                <p>{zh ? "每日新鲜制作，送到你的门前。" : "Freshly cooked lunches, delivered."}</p>
                <div className="kp-voucher-row">
                  <span>{zh ? "双拼餐券" : "2-dish vouchers"} <strong>{dailyTwo}</strong></span>
                  <span>{zh ? "三拼餐券" : "3-dish vouchers"} <strong>{dailyThree}</strong></span>
                </div>
                <div className="kp-overview-card-actions">
                  <button type="button" onClick={() => onTabChange(dailyBalance > 0 ? "daily-delivery" : "meal-vouchers")}>{dailyBalance > 0 ? (zh ? "选择午餐" : "Choose lunches") : (zh ? "购买餐券" : "Buy vouchers")} <ArrowUpRight size={16} /></button>
                  <button type="button" onClick={() => onTabChange(dailyBalance > 0 ? "meal-vouchers" : "daily-delivery")}>{dailyBalance > 0 ? (zh ? "购买餐券" : "Buy vouchers") : (zh ? "浏览菜单" : "Browse menu")}</button>
                </div>
              </article>
            )}
            {(eligibility?.canWeekly || weeklyBalance > 0) && (
              <article className="kp-overview-card">
                <div className="kp-overview-card-top"><span className="kp-overview-card-icon"><CalendarDays size={21} /></span><span>02 / {zh ? "每周餐盒" : "WEEKLY MEAL BOX"}</span></div>
                <h3>{zh ? "一次安排，轻松一周。" : "The week, taken care of."}</h3>
                <p>{zh ? "冰箱备好餐食，想吃的时候加热享用。" : "Stock the fridge. Heat and enjoy."}</p>
                <div className="kp-voucher-row">
                  <span>{zh ? "可用周餐券" : "Available weeks"} <strong>{weeklyBalance}</strong></span>
                  {weeklyPlans.length > 0 && <small>{weeklyPlans.map((plan) => zh ? plan.labelZh : `${plan.mealsPerWeek} meals/week`).join(" · ")}</small>}
                </div>
                <div className="kp-overview-card-actions">
                  <button type="button" onClick={() => onTabChange(weeklyBalance > 0 ? "weekly-subscription" : "credits")}>{weeklyBalance > 0 ? (zh ? "选择餐食" : "Choose meals") : (zh ? "购买餐券" : "Buy vouchers")} <ArrowUpRight size={16} /></button>
                  <button type="button" onClick={() => onTabChange(weeklyBalance > 0 ? "credits" : "weekly-subscription")}>{weeklyBalance > 0 ? (zh ? "购买餐券" : "Buy vouchers") : (zh ? "浏览菜单" : "Browse menu")}</button>
                </div>
              </article>
            )}
          </div>
          {eligibility?.isServed && dailyTwo + dailyThree + weeklyBalance === 0 && (
            <p className="kp-overview-footnote"><Ticket size={16} />{zh ? "先购买餐券，再按自己的时间兑换。无订阅压力。" : "Buy vouchers first, then redeem on the days you choose. No subscription pressure."}</p>
          )}
        </>
      )}
    </div>
  )
}
