"use client"

import WeeklySubscription from "@/components/weekly-subscription"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"

import { DashboardTabPanel } from "./dashboard-tab-panel"

type DashboardWeeklySubscriptionTabProps = {
  credits: number
  userData: DashboardUserData | null
  onWeeklyVoucherUpdate: () => void
}

export function DashboardWeeklySubscriptionTab({
  credits,
  userData,
  onWeeklyVoucherUpdate,
}: DashboardWeeklySubscriptionTabProps) {
  return (
    <DashboardTabPanel panelKey="weekly-subscription" className="space-y-6">
      <WeeklySubscription
        userCredits={credits}
        weeklySIXmeals={userData?.weeklySIXmeals}
        weeklyEIGHTmeals={(userData as DashboardUserData & { weeklyEIGHTmeals?: number })?.weeklyEIGHTmeals}
        weeklyTENmeals={userData?.weeklyTENmeals}
        weeklyTWELVEmeals={(userData as DashboardUserData & { weeklyTWELVEmeals?: number })?.weeklyTWELVEmeals}
        weeklySIXTEENmeals={(userData as DashboardUserData & { weeklySIXTEENmeals?: number })?.weeklySIXTEENmeals}
        onVoucherUpdate={onWeeklyVoucherUpdate}
      />
    </DashboardTabPanel>
  )
}
