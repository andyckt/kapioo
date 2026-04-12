"use client"

import { OrderSectionNavigation } from "@/components/order-section-navigation"
import { DailyDeliveryHistory } from "@/components/daily-delivery-history"
import { UnifiedRechargeHistory } from "@/components/unified-recharge-history"
import { WeeklySubscriptionHistory } from "@/components/weekly-subscription-history"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import type { useLanguage } from "@/lib/language-context"

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
  return (
    <DashboardTabPanel panelKey="orders" className="space-y-6">
      <div className="flex items-center justify-between mt-4">
        <h2 className="text-3xl font-bold tracking-tight">{t("myOrders")}</h2>
      </div>

      <OrderSectionNavigation
        activeSection={orderActiveSection}
        onSectionChange={onOrderSectionChange}
      />

      {userData && orderActiveSection === "orders" && (
        <DashboardTabPanel panelKey="orders-history" className="space-y-6">
          <WeeklySubscriptionHistory userId={userData._id} />
          <DailyDeliveryHistory userId={userData._id} />
        </DashboardTabPanel>
      )}

      {userData && orderActiveSection === "recharges" && (
        <DashboardTabPanel panelKey="recharges-history" className="space-y-6">
          <UnifiedRechargeHistory
            userId={userData._id}
            weeklyRefreshKey={purchaseHistoryKey}
            dailyRefreshKey={voucherHistoryKey}
          />
        </DashboardTabPanel>
      )}
    </DashboardTabPanel>
  )
}
