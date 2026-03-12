"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { User as UserType } from "@/lib/utils"

export type DashboardUserData = UserType & {
  area?: string;
  role?: string;
  isVerified?: boolean;
  weeklySIXTEENmeals?: number;
}

export type DashboardCutoffTime = {
  hour: number;
  minute: number;
}

export const DEFAULT_DASHBOARD_CUTOFF_TIME: DashboardCutoffTime = {
  hour: 11,
  minute: 59,
}

type RefreshUserProfileOptions = {
  syncForms?: boolean;
}

type DashboardUserProfileValue = {
  userData: DashboardUserData | null;
  cutoffTime: DashboardCutoffTime;
  upcomingDeliveries: number;
  totalOrders: number;
  refreshUserProfile: (options?: RefreshUserProfileOptions) => Promise<DashboardUserData | null>;
  refreshOrderStats: (userId: string) => Promise<void>;
}

export const DashboardUserProfileContext = createContext<DashboardUserProfileValue | null>(null)

export function DashboardUserProfileProvider({
  value,
  children,
}: {
  value: DashboardUserProfileValue;
  children: ReactNode;
}) {
  return (
    <DashboardUserProfileContext.Provider value={value}>
      {children}
    </DashboardUserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const context = useContext(DashboardUserProfileContext)

  if (!context) {
    throw new Error("useUserProfile must be used within DashboardUserProfileProvider")
  }

  return context
}

export function useOptionalUserProfile() {
  return useContext(DashboardUserProfileContext)
}
