"use client"

import { CommunityRecipes } from "@/components/community-recipes"

import { DashboardTabPanel } from "./dashboard-tab-panel"

export function DashboardCommunityTab() {
  return (
    <DashboardTabPanel panelKey="community" className="space-y-6">
      <div className="flex items-center justify-between mt-4">
        <h2 className="text-3xl font-bold tracking-tight">Community</h2>
      </div>
      <CommunityRecipes />
    </DashboardTabPanel>
  )
}
