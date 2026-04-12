"use client"

import MealVoucherPurchase from "@/components/meal-voucher-purchase"
import { VoucherPurchaseHistory } from "@/components/voucher-purchase-history"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"

import { DashboardTabPanel } from "./dashboard-tab-panel"

type DashboardMealVouchersTabProps = {
  userData: DashboardUserData | null
  voucherHistoryKey: number
  onVoucherPurchaseSuccess: () => void
}

export function DashboardMealVouchersTab({
  userData,
  voucherHistoryKey,
  onVoucherPurchaseSuccess,
}: DashboardMealVouchersTabProps) {
  return (
    <DashboardTabPanel panelKey="meal-vouchers" className="space-y-6">
      <div className="space-y-6">
        <MealVoucherPurchase onSuccess={onVoucherPurchaseSuccess} />

        {userData && userData._id && (
          <div className="mt-8">
            <VoucherPurchaseHistory
              userId={userData._id}
              refreshKey={voucherHistoryKey}
            />
          </div>
        )}
      </div>
    </DashboardTabPanel>
  )
}
