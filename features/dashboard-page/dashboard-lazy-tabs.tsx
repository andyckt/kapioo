"use client"

import dynamic from "next/dynamic"

import { DashboardTabSkeleton } from "@/features/dashboard-shell"

export const LazyDashboardOverviewTab = dynamic(
  () =>
    import("@/features/dashboard-overview/dashboard-overview-tab").then((m) => ({
      default: m.DashboardOverviewTab,
    })),
  { loading: () => <DashboardTabSkeleton /> }
)

export const LazyDashboardCreditsTab = dynamic(
  () =>
    import("@/features/dashboard-credits/dashboard-credits-tab").then((m) => ({
      default: m.DashboardCreditsTab,
    })),
  { loading: () => <DashboardTabSkeleton /> }
)

export const LazyDashboardSettingsTab = dynamic(
  () =>
    import("@/features/dashboard-settings/dashboard-settings-tab").then((m) => ({
      default: m.DashboardSettingsTab,
    })),
  { loading: () => <DashboardTabSkeleton /> }
)
