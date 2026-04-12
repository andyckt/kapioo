"use client"

import DailyDelivery from "@/components/daily-delivery"

import { DashboardTabPanel } from "./dashboard-tab-panel"

export function DashboardDailyDeliveryTab() {
  return (
    <DashboardTabPanel panelKey="daily-delivery" className="space-y-6">
      <DailyDelivery />
    </DashboardTabPanel>
  )
}
