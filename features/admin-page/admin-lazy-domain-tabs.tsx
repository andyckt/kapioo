"use client"

import dynamic from "next/dynamic"

import { AdminTabSkeleton } from "@/features/admin-shell"

export const LazyAdminUsersTab = dynamic(
  () =>
    import("@/features/admin-users/admin-users-tab").then((m) => ({ default: m.AdminUsersTab })),
  { loading: () => <AdminTabSkeleton /> }
)

export const LazyAdminCreditsTab = dynamic(
  () =>
    import("@/features/admin-credits/admin-credits-tab").then((m) => ({ default: m.AdminCreditsTab })),
  { loading: () => <AdminTabSkeleton /> }
)

export const LazyAdminCreditRequestsTab = dynamic(
  () =>
    import("@/features/admin-credit-requests/admin-credit-requests-tab").then((m) => ({
      default: m.AdminCreditRequestsTab,
    })),
  { loading: () => <AdminTabSkeleton /> }
)
