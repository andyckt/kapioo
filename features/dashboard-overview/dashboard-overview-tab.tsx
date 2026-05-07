"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CreditCard, Gem, History, ShoppingCart, Ticket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ServiceSelectionCards } from "@/components/service-selection-cards"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import { getWeeklyPlanBalanceRows } from "@/lib/plans/balances"
import { PRODUCT_LINE_LABELS } from "@/lib/product-lines/names"

type DashboardTabId =
  | "orders"
  | "daily-delivery"
  | "meal-vouchers"
  | "weekly-subscription"
  | "credits"

export interface DashboardOverviewTabProps {
  language: "en" | "zh"
  userData: DashboardUserData | null
  userLoading: boolean
  dashboardHeaderDate: string
  showServiceSelection: boolean
  upcomingDeliveries: number
  onShowServiceSelection: () => void
  onTabChange: (tab: DashboardTabId) => void
}

function hasNoVouchers(userData: DashboardUserData) {
  return (
    (userData.credits || 0) === 0 &&
    (userData.twoDishVoucher || 0) === 0 &&
    (userData.threeDishVoucher || 0) === 0 &&
    getWeeklyPlanBalanceRows(userData).every((plan) => plan.balance === 0)
  )
}

function getWeeklyVoucherCounts(userData: DashboardUserData) {
  return getWeeklyPlanBalanceRows(userData)
    .map((plan) => ({
      labelEn: `${plan.mealsPerWeek} meals/week`,
      labelZh: plan.labelZh,
      count: plan.balance,
    }))
    .filter((entry) => entry.count > 0)
}

export function DashboardOverviewTab({
  language,
  userData,
  userLoading,
  dashboardHeaderDate,
  showServiceSelection,
  upcomingDeliveries,
  onShowServiceSelection,
  onTabChange,
}: DashboardOverviewTabProps) {
  const weeklyVoucherCounts = userData ? getWeeklyVoucherCounts(userData) : []
  const hasDailyVouchers = Boolean((userData?.twoDishVoucher || 0) > 0 || (userData?.threeDishVoucher || 0) > 0)
  const hasWeeklyVouchers = weeklyVoucherCounts.length > 0

  return (
    <motion.div
      key="overview"
      initial={{ y: 10 }}
      animate={{ y: 0 }}
      exit={{ y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col mt-4">
        <div className="bg-gradient-to-r from-[#F8F0E5] to-[#FFF6EF] p-6 rounded-3xl shadow-sm border border-[#C2884E]/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col mb-4 md:mb-0">
              <h2 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                {language === "en"
                  ? `Welcome, ${userData?.name?.split(" ")[0] || ""}`
                  : `欢迎, ${userData?.name?.split(" ")[0] || ""}`}
              </h2>
              <p className="text-[#6B5F53] text-sm mt-1">{dashboardHeaderDate}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                className="border-[#C2884E]/20 hover:bg-[#F5EDE4] hover:text-[#C2884E] transition-all rounded-xl"
                onClick={() => onTabChange("orders")}
              >
                <History className="h-4 w-4 mr-2" />
                {language === "en" ? "My Orders" : "我的订单"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {userData && !userLoading && hasNoVouchers(userData) && (
          <AnimatePresence mode="wait">
            {!showServiceSelection ? (
              <motion.div
                key="no-credits"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="col-span-full"
              >
                <Card className="overflow-hidden border border-[#C2884E]/20 bg-gradient-to-br from-white to-[#FFF6EF] shadow-lg rounded-3xl">
                  <CardContent className="p-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="h-20 w-20 rounded-full bg-[#F5EDE4] flex items-center justify-center">
                        <Ticket className="h-10 w-10 text-[#C2884E]" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold text-[#6B5F53]">
                          {language === "en" ? "You don't have any meal credits right now" : "您目前没有任何餐券"}
                        </h3>
                        <p className="text-[#6B5F53]/70 text-base max-w-md mx-auto">
                          {language === "en" ? "Please start recharging to enjoy our delicious meals" : "请充值以享受我们美味的餐点"}
                        </p>
                      </div>

                      <Button
                        size="lg"
                        className="bg-[#C2884E] hover:bg-[#B17940] text-white rounded-xl px-8 py-6 text-base font-medium shadow-md hover:shadow-lg transition-all duration-300"
                        onClick={onShowServiceSelection}
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        {language === "en" ? "Start Recharging" : "开始充值"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="service-selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="col-span-full"
              >
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-semibold text-[#6B5F53] mb-2">
                      {language === "en" ? "Choose Your Service" : "选择您的服务"}
                    </h3>
                  </div>
                  <ServiceSelectionCards
                    onSelectDaily={() => onTabChange("meal-vouchers")}
                    onSelectWeekly={() => onTabChange("credits")}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {userData && hasDailyVouchers && (
          <div style={{ transitionDelay: "0.15s" }}>
            <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md rounded-3xl hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center text-[#6B5F53]">
                  <div className="h-8 w-8 rounded-full bg-[#F5EDE4] flex items-center justify-center mr-2">
                    <Ticket className="h-4 w-4 text-[#C2884E]" />
                  </div>
                  {language === "en"
                    ? `${PRODUCT_LINE_LABELS.daily.en} vouchers`
                    : `${PRODUCT_LINE_LABELS.daily.zh}餐券`}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                    <span className="text-sm font-medium text-[#6B5F53]">
                      {language === "en" ? "2-Dish Voucher:" : "2菜餐券 剩余："}
                    </span>
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-[#C2884E]">{userData.twoDishVoucher || 0}</span>
                      <span className="ml-1 text-sm text-[#6B5F53]">{language === "en" ? "" : "张"}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                    <span className="text-sm font-medium text-[#6B5F53]">
                      {language === "en" ? "3-Dish Voucher:" : "3菜餐券 剩余："}
                    </span>
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-[#C2884E]">{userData.threeDishVoucher || 0}</span>
                      <span className="ml-1 text-sm text-[#6B5F53]">{language === "en" ? "" : "张"}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-[#C2884E]/20">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                      onClick={() => onTabChange("daily-delivery")}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {language === "en" ? "Start Ordering" : "去订餐"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                      onClick={() => onTabChange("meal-vouchers")}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {language === "en" ? "Recharge" : "去充值"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {userData && hasWeeklyVouchers && (
          <div style={{ transitionDelay: "0.1s" }}>
            <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md rounded-3xl hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center text-[#6B5F53]">
                  <div className="h-8 w-8 rounded-full bg-[#F5EDE4] flex items-center justify-center mr-2">
                    <Gem className="h-4 w-4 text-[#C2884E]" />
                  </div>
                  {language === "en"
                    ? `${PRODUCT_LINE_LABELS.weekly.en} vouchers`
                    : `${PRODUCT_LINE_LABELS.weekly.zh} 订阅餐券`}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="space-y-2">
                    {weeklyVoucherCounts.map((entry) => (
                      <div
                        key={entry.labelEn}
                        className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10"
                      >
                        <span className="text-sm font-medium text-[#6B5F53]">
                          {language === "en" ? entry.labelEn : entry.labelZh}:
                        </span>
                        <div className="flex items-center">
                          <span className="text-xl font-bold text-[#C2884E]">{entry.count}</span>
                          <span className="ml-1 text-sm text-[#6B5F53]">{language === "en" ? "" : "张"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-[#C2884E]/20">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                      onClick={() => onTabChange("weekly-subscription")}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {language === "en" ? "Start Ordering" : "去订餐"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                      onClick={() => onTabChange("credits")}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {language === "en" ? "Recharge" : "去充值"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {userData && !hasDailyVouchers && hasWeeklyVouchers && (
          <div style={{ transitionDelay: "0.2s" }}>
            <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md rounded-3xl hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center text-[#6B5F53]">
                  <div className="h-8 w-8 rounded-full bg-[#F5EDE4] flex items-center justify-center mr-2">
                    <Ticket className="h-4 w-4 text-[#C2884E]" />
                  </div>
                  {language === "en"
                    ? `${PRODUCT_LINE_LABELS.daily.en} vouchers`
                    : `${PRODUCT_LINE_LABELS.daily.zh}餐券`}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                    <span className="text-sm font-medium text-[#6B5F53]">
                      {language === "en" ? "2-Dish Voucher:" : "2菜餐券 剩余："}
                    </span>
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-[#C2884E]">{userData.twoDishVoucher || 0}</span>
                      <span className="ml-1 text-sm text-[#6B5F53]">{language === "en" ? "" : "张"}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                    <span className="text-sm font-medium text-[#6B5F53]">
                      {language === "en" ? "3-Dish Voucher:" : "3菜餐券 剩余："}
                    </span>
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-[#C2884E]">{userData.threeDishVoucher || 0}</span>
                      <span className="ml-1 text-sm text-[#6B5F53]">{language === "en" ? "" : "张"}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-[#C2884E]/20">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                      onClick={() => onTabChange("daily-delivery")}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {language === "en" ? "Start Ordering" : "去订餐"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                      onClick={() => onTabChange("meal-vouchers")}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {language === "en" ? "Recharge" : "去充值"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {upcomingDeliveries > 0 && (
          <div style={{ transitionDelay: "0.3s" }}>
            <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md rounded-3xl hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center text-[#6B5F53]">
                    <div className="h-8 w-8 rounded-full bg-[#F5EDE4] flex items-center justify-center mr-2">
                      <ShoppingCart className="h-4 w-4 text-[#C2884E]" />
                    </div>
                    {language === "en" ? "Upcoming Orders" : "即将到来的订单"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#C2884E]/10">
                  <span className="text-sm font-medium text-[#6B5F53]">
                    {language === "en" ? "Upcoming Orders:" : "待配送订单："}
                  </span>
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-[#C2884E]">{upcomingDeliveries}</span>
                    {language === "zh" ? (
                      <span className="ml-1 text-sm text-[#6B5F53]">个</span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-[#C2884E]/20">
                  <Button
                    variant="ghost"
                    className="w-full text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl"
                    onClick={() => onTabChange("orders")}
                  >
                    <History className="h-4 w-4 mr-2" />
                    {language === "en" ? "View orders" : "查看订单"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </motion.div>
  )
}
