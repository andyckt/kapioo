"use client"

import { useState } from "react"

import { OrderSectionNavigation } from "@/components/order-section-navigation"
import { DailyDeliveryHistory } from "@/components/daily-delivery-history"
import { UnifiedRechargeHistory } from "@/components/unified-recharge-history"
import { WeeklySubscriptionHistory } from "@/components/weekly-subscription-history"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import type { useLanguage } from "@/lib/language-context"
import { cn } from "@/lib/utils"

import { DashboardTabPanel } from "./dashboard-tab-panel"

type TFn = ReturnType<typeof useLanguage>["t"]

type DashboardOrdersTabProps = {
  t: TFn
  userData: DashboardUserData | null
  orderActiveSection: "orders" | "recharges"
  purchaseHistoryKey: number
  voucherHistoryKey: number
  onOrderSectionChange: (section: "orders" | "recharges") => void
}

export function DashboardOrdersTab({
  t,
  userData,
  orderActiveSection,
  purchaseHistoryKey,
  voucherHistoryKey,
  onOrderSectionChange,
}: DashboardOrdersTabProps) {
  const [orderKindTab, setOrderKindTab] = useState<"weekly" | "daily">("weekly")

  return (
    <DashboardTabPanel panelKey="orders" className="space-y-0">
      <div className="mx-auto w-full max-w-xl lg:max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-[#C2884E] sm:text-3xl">
          {t("myOrders")}
        </h2>

        <div className="mt-3">
          <OrderSectionNavigation
            variant="pill-row"
            activeSection={orderActiveSection}
            onSectionChange={onOrderSectionChange}
          />
        </div>

        <div className="min-w-0">
          {userData && orderActiveSection === "orders" && (
            <>
              <div
                className="mt-3 flex flex-wrap gap-2"
                role="group"
                aria-label={t("orderHistoryTypeToggleAria")}
              >
                <button
                  type="button"
                  aria-pressed={orderKindTab === "weekly"}
                  onClick={() => setOrderKindTab("weekly")}
                  className={cn(
                    "min-h-10 rounded-xl border px-4 py-2 text-[13px] font-medium outline-none transition-colors duration-200",
                    "[-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[#C2884E]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    orderKindTab === "weekly"
                      ? "border-[#C2884E]/35 bg-[#fff6ef] font-semibold text-[#3D342C] shadow-sm"
                      : "border-[#C2884E]/15 bg-white/90 text-[#6B5F53] hover:border-[#C2884E]/25 hover:bg-[#FFFCF9] hover:text-[#3D342C]"
                  )}
                >
                  {t("weeklySubscription")}
                </button>
                <button
                  type="button"
                  aria-pressed={orderKindTab === "daily"}
                  onClick={() => setOrderKindTab("daily")}
                  className={cn(
                    "min-h-10 rounded-xl border px-4 py-2 text-[13px] font-medium outline-none transition-colors duration-200",
                    "[-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[#C2884E]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    orderKindTab === "daily"
                      ? "border-[#C2884E]/35 bg-[#fff6ef] font-semibold text-[#3D342C] shadow-sm"
                      : "border-[#C2884E]/15 bg-white/90 text-[#6B5F53] hover:border-[#C2884E]/25 hover:bg-[#FFFCF9] hover:text-[#3D342C]"
                  )}
                >
                  {t("dailyDelivery")}
                </button>
              </div>

              <DashboardTabPanel
                panelKey={orderKindTab === "weekly" ? "orders-weekly" : "orders-daily"}
                className="mt-4 space-y-3"
              >
                {orderKindTab === "weekly" ? (
                  <WeeklySubscriptionHistory userId={userData._id} />
                ) : (
                  <DailyDeliveryHistory userId={userData._id} />
                )}
              </DashboardTabPanel>
            </>
          )}

          {userData && orderActiveSection === "recharges" && (
            <DashboardTabPanel panelKey="recharges-history" className="mt-4 space-y-3">
              <UnifiedRechargeHistory
                userId={userData._id}
                weeklyRefreshKey={purchaseHistoryKey}
                dailyRefreshKey={voucherHistoryKey}
              />
            </DashboardTabPanel>
          )}
        </div>
      </div>
    </DashboardTabPanel>
  )
}
