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

export const LazyDashboardOrdersTab = dynamic(
  () =>
    import("@/features/dashboard-page/dashboard-orders-tab").then((m) => ({
      default: m.DashboardOrdersTab,
    })),
  { loading: () => <DashboardTabSkeleton /> }
)

export const LazyDashboardCommunityTab = dynamic(
  () =>
    import("@/features/dashboard-page/dashboard-community-tab").then((m) => ({
      default: m.DashboardCommunityTab,
    })),
  { loading: () => <DashboardTabSkeleton /> }
)

export const LazyDashboardDailyDeliveryTab = dynamic(
  () =>
    import("@/features/dashboard-page/dashboard-daily-delivery-tab").then((m) => ({
      default: m.DashboardDailyDeliveryTab,
    })),
  { loading: () => <DashboardTabSkeleton />, ssr: false }
)

export const LazyDashboardMealVouchersTab = dynamic(
  () =>
    import("@/features/dashboard-page/dashboard-meal-vouchers-tab").then((m) => ({
      default: m.DashboardMealVouchersTab,
    })),
  { loading: () => <DashboardTabSkeleton />, ssr: false }
)

export const LazyDashboardWeeklySubscriptionTab = dynamic(
  () =>
    import("@/features/dashboard-page/dashboard-weekly-subscription-tab").then((m) => ({
      default: m.DashboardWeeklySubscriptionTab,
    })),
  { loading: () => <DashboardTabSkeleton />, ssr: false }
)
