"use client"

import dynamic from "next/dynamic"

import { motion } from "framer-motion"
import {
  Calendar,
  CalendarCheck,
  Clock,
  CreditCard,
  Star,
  Truck,
  UtensilsCrossed,
} from "lucide-react"

import { AvailableAreas } from "@/components/available-areas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import { PRODUCT_LINE_LABELS } from "@/lib/product-lines/names"

const CreditPurchasePlans = dynamic(
  () => import("@/components/credit-purchase-plans").then((mod) => ({ default: mod.CreditPurchasePlans })),
  { ssr: false }
)
const CreditPurchaseHistory = dynamic(
  () => import("@/components/credit-purchase-history").then((mod) => ({ default: mod.CreditPurchaseHistory })),
  { ssr: false }
)

type WeeklyPlanEntry = {
  key: string
  labelZh: string
  labelEn: string
  count: number
}

export interface DashboardCreditsTabProps {
  language: "en" | "zh"
  userData: DashboardUserData | null
  purchaseHistoryKey: number
  onPurchaseSuccess: () => void
}

const WEEKLY_PLAN_STEPS = [
  {
    key: "1",
    icon: Calendar,
    titleZh: "选择适合你的周卡",
    titleEn: "Choose Your Weekly Plan",
    descriptionZh: "根据您的用餐需求选择合适的周卡套餐，灵活安排每周用餐计划。",
    descriptionEn: "Select a weekly plan that suits your meal needs and flexibly arrange your weekly meal schedule.",
  },
  {
    key: "2",
    icon: CreditCard,
    titleZh: "完成在线付款",
    titleEn: "Complete Online Payment",
    descriptionZh: "通过线上支付方式完成周卡购买，系统自动记录您的周卡余额。",
    descriptionEn: "Complete your weekly plan purchase through online payment. The system automatically records your plan balance.",
  },
  {
    key: "3",
    icon: CalendarCheck,
    titleZh: "使用周卡下单订餐",
    titleEn: "Order Meals with Your Plan",
    descriptionZh: "登录账户，使用周卡下单订餐，无需重复支付。",
    descriptionEn: "Log into your account and use your weekly plan to order meals without repeated payments.",
  },
  {
    key: "4",
    icon: UtensilsCrossed,
    titleZh: "每周更新菜单，自由挑选餐食",
    titleEn: "Weekly Menu Updates, Choose Freely",
    descriptionZh: "我们每周更新菜单，您可以提前选择喜欢的菜品和配送日期。",
    descriptionEn: "We update our menu weekly. You can select your favorite dishes and delivery dates in advance.",
  },
  {
    key: "5",
    icon: Truck,
    titleZh: "晚间送达 → 冷藏保存 → 按最佳日期享用",
    titleEn: "Evening Delivery → Refrigerate → Enjoy by Best-By Date",
    descriptionZh: "我们会在晚间将餐食送达您指定的地址，您可以将餐食冷藏保存，按照标注的最佳食用日期享用。",
    descriptionEn: "We deliver meals to your specified address in the evening. You can refrigerate the meals and enjoy them by the labeled best-by date.",
  },
]

const WEEKLY_PLAN_FEATURES = [
  {
    key: "delivery-days",
    icon: Calendar,
    titleZh: PRODUCT_LINE_LABELS.weekly.zh,
    titleEn: PRODUCT_LINE_LABELS.weekly.en,
    descriptionZh: "每周配送2次 (周日 & 周二)，轻松覆盖整周",
    descriptionEn: "2 deliveries per week (Sun & Tue), covering the entire week",
  },
  {
    key: "delivery-time",
    icon: Clock,
    titleZh: "晚间配送",
    titleEn: "Evening Delivery",
    descriptionZh: "6PM-10PM送达，方便省心",
    descriptionEn: "Delivered 6PM-10PM, convenient and worry-free",
  },
  {
    key: "storage",
    icon: Star,
    titleZh: "冷藏保存",
    titleEn: "Refrigerate & Enjoy",
    descriptionZh: "储存于冰箱，随取随享",
    descriptionEn: "Store in refrigerator, enjoy anytime",
  },
]

function getWeeklyPlanEntries(userData: DashboardUserData): WeeklyPlanEntry[] {
  return [
    { key: "six", labelZh: "6餐一周", labelEn: "6 Meals/Week", count: userData.weeklySIXmeals ?? 0 },
    { key: "eight", labelZh: "8餐一周", labelEn: "8 Meals/Week", count: userData.weeklyEIGHTmeals ?? 0 },
    { key: "ten", labelZh: "10餐一周", labelEn: "10 Meals/Week", count: userData.weeklyTENmeals ?? 0 },
    { key: "twelve", labelZh: "12餐一周", labelEn: "12 Meals/Week", count: userData.weeklyTWELVEmeals ?? 0 },
    { key: "sixteen", labelZh: "16餐一周", labelEn: "16 Meals/Week", count: userData.weeklySIXTEENmeals ?? 0 },
  ].filter((entry) => entry.count > 0)
}

export function DashboardCreditsTab({
  language,
  userData,
  purchaseHistoryKey,
  onPurchaseSuccess,
}: DashboardCreditsTabProps) {
  const weeklyPlanEntries = userData ? getWeeklyPlanEntries(userData) : []

  const handleScrollToPlans = () => {
    const element = document.getElementById("weekly-service-area-section")
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <motion.div
      key="credits"
      initial={{ y: 10 }}
      animate={{ y: 0 }}
      exit={{ y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="bg-gradient-to-br from-[#FFF6EF] to-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#C2884E]/10 mt-4">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="md:w-1/2">
            <div className="inline-flex items-center mb-4">
              <div className="px-4 py-1 bg-[#C2884E]/5 rounded-full">
                <span className="text-sm font-medium text-[#C2884E]">
                  {language === "zh" ? `${PRODUCT_LINE_LABELS.weekly.zh} 订阅` : "Weekly Meal Subscription"}
                </span>
              </div>
            </div>

            <h2 className="text-2xl md:text-4xl font-bold mb-4 text-[#6B5F53]">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                {language === "zh" ? PRODUCT_LINE_LABELS.weekly.zh : PRODUCT_LINE_LABELS.weekly.en}
              </span>
              <span className="block mt-1">{language === "zh" ? "餐盒订阅" : "Meal Subscription"}</span>
            </h2>

            <p className="text-base md:text-lg text-[#6B5F53]/80 mb-6">
              {language === "zh"
                ? "适合把餐食储存于冰箱，随取随享，注重极度便利的你"
                : "Perfect for those who prefer to store meals in the refrigerator and enjoy maximum convenience"}
            </p>

            {userData && (
              <div className="mb-4">
                <p className="text-xs font-medium text-[#6B5F53]/70 mb-2">
                  {language === "zh" ? "当前可用餐券：" : "Available Coupons:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {weeklyPlanEntries.length > 0 ? (
                    weeklyPlanEntries.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full border border-[#C2884E]/20"
                      >
                        <span className="text-sm font-medium text-[#6B5F53]">
                          {language === "zh" ? entry.labelZh : entry.labelEn}:
                        </span>
                        <span className="text-sm font-bold text-[#C2884E]">
                          {entry.count}
                          {language === "zh" ? "张" : ""}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-[#6B5F53]/60 italic">
                      {language === "zh" ? "暂无可用餐券" : "No coupons available"}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/5 transition-all duration-300"
                  >
                    {language === "zh" ? "了解更多" : "Learn More"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] w-[95vw] p-0 rounded-xl sm:rounded-[24px] overflow-hidden border-0 sm:border-[#C2884E]/10 max-h-[85vh] shadow-xl">
                  <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6 text-white h-[90px] flex flex-col justify-center">
                    <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                      {language === "zh" ? "了解更多" : "Learn More"}
                    </DialogTitle>
                    <DialogDescription className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base font-light">
                      {language === "zh"
                        ? `了解我们的${PRODUCT_LINE_LABELS.weekly.zh} 订阅服务`
                        : "Learn about our weekly meal subscription service"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="p-6 overflow-y-auto max-h-[70vh] scrollbar-brand">
                    <div className="space-y-8">
                      <h3 className="text-xl font-semibold text-[#6B5F53] mb-4">
                        {language === "zh" ? "订阅方式" : "Subscription Process"}
                      </h3>

                      {WEEKLY_PLAN_STEPS.map((step) => {
                        const Icon = step.icon
                        return (
                          <div
                            key={step.key}
                            className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm"
                          >
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                <Icon className="w-5 h-5 text-[#C2884E]" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">
                                  {step.key}
                                </span>
                                {language === "zh" ? step.titleZh : step.titleEn}
                              </h3>
                              <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                {language === "zh" ? step.descriptionZh : step.descriptionEn}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="default"
                size="sm"
                className="md:hidden bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white transition-all duration-300"
                onClick={handleScrollToPlans}
              >
                {language === "zh" ? "购买餐券" : "Purchase Coupons"}
              </Button>
            </div>
          </div>

          <div className="md:w-1/2 flex flex-col justify-center">
            <div className="space-y-4">
              {WEEKLY_PLAN_FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.key} className="group flex items-center gap-4 p-1">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center shadow-sm border border-[#C2884E]/10 group-hover:border-[#C2884E]/30 transition-all duration-300">
                      <div className="transform group-hover:scale-110 transition-transform duration-300 text-[#C2884E]">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors duration-300">
                        {language === "zh" ? feature.titleZh : feature.titleEn}
                      </p>
                      <p className="text-sm text-[#6B5F53]/80">
                        {language === "zh" ? feature.descriptionZh : feature.descriptionEn}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div id="weekly-service-area-section" className="mb-6">
        <AvailableAreas />
      </div>

      {userData && userData._id && (
        <div id="weekly-meal-plans-section" className="mb-6">
          <CreditPurchasePlans userId={userData._id} onSuccess={onPurchaseSuccess} />
        </div>
      )}

      {userData && userData._id && (
        <div className="mb-6">
          <CreditPurchaseHistory key={purchaseHistoryKey} userId={userData._id} />
        </div>
      )}
    </motion.div>
  )
}
