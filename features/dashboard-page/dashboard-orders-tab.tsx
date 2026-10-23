"use client"

import { useState } from "react"

import { OrderSectionNavigation } from "@/components/order-section-navigation"
import { DailyDeliveryHistory } from "@/components/daily-delivery-history"
import { UnifiedRechargeHistory } from "@/components/unified-recharge-history"
import { WeeklySubscriptionHistory } from "@/components/weekly-subscription-history"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import type { useLanguage } from "@/lib/language-context"
import { useLanguage as usePortalLanguage } from "@/lib/language-context"

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
  const { language } = usePortalLanguage()

  return (
    <DashboardTabPanel panelKey="orders" className="kp-portal-orders">
      <div className="kp-orders-content">
        <div className="kp-orders-heading">
          <p className="kp-overline">{language === "zh" ? "我的餐食" : "YOUR KAPIOO SPACE"}</p>
          <h1>{t("myOrders")}</h1>
          <p>{language === "zh" ? "在这里查看餐食订单和餐券购买记录。" : "Keep track of your meals and voucher purchases."}</p>
        </div>

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
                className="kp-orders-kind"
                role="group"
                aria-label={t("orderHistoryTypeToggleAria")}
              >
                <button
                  type="button"
                  aria-pressed={orderKindTab === "weekly"}
                  onClick={() => setOrderKindTab("weekly")}
                  className="kp-orders-kind-button"
                >
                  {t("weeklySubscription")}
                </button>
                <button
                  type="button"
                  aria-pressed={orderKindTab === "daily"}
                  onClick={() => setOrderKindTab("daily")}
                  className="kp-orders-kind-button"
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
