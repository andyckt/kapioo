"use client"

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react"

import type { useToast } from "@/hooks/use-toast"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import { DEFAULT_DASHBOARD_CUTOFF_TIME } from "@/lib/dashboard-user-profile"

type ToastFn = ReturnType<typeof useToast>["toast"]

interface DashboardRouter {
  replace: (href: string) => void
}

interface UseDashboardDataLoadingParams {
  authStatus: "loading" | "ready"
  authenticated: boolean
  authUser: { _id?: string } | null
  applyUserProfile: (
    user: Partial<DashboardUserData>,
    options?: { syncForms?: boolean }
  ) => void
  refreshUserProfile: (options?: {
    syncForms?: boolean
    signal?: AbortSignal
  }) => Promise<DashboardUserData | null>
  setUserLoading: (loading: boolean) => void
  setOrderStatsLoading: (loading: boolean) => void
  setUpcomingDeliveries: (n: number) => void
  setTotalOrders: (n: number) => void
  setCutoffTime: Dispatch<SetStateAction<{ hour: number; minute: number }>>
  router: DashboardRouter
  toast: ToastFn
}

export function useDashboardDataLoading({
  authStatus,
  authenticated,
  authUser,
  applyUserProfile,
  refreshUserProfile,
  setUserLoading,
  setOrderStatsLoading,
  setUpcomingDeliveries,
  setTotalOrders,
  setCutoffTime,
  router,
  toast,
}: UseDashboardDataLoadingParams) {
  const applyRef = useRef(applyUserProfile)
  const refreshRef = useRef(refreshUserProfile)
  const routerRef = useRef(router)
  const toastRef = useRef(toast)
  applyRef.current = applyUserProfile
  refreshRef.current = refreshUserProfile
  routerRef.current = router
  toastRef.current = toast

  useEffect(() => {
    const controller = new AbortController()
    async function loadCutoffTime() {
      try {
        const response = await fetch("/api/settings?key=cutoffTime", {
          cache: "no-store",
          signal: controller.signal,
        })
        const data = await response.json()

        if (data.success && data.data?.value) {
          setCutoffTime({
            hour: data.data.value.hour || DEFAULT_DASHBOARD_CUTOFF_TIME.hour,
            minute: data.data.value.minute || DEFAULT_DASHBOARD_CUTOFF_TIME.minute,
          })
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.warn("Failed to fetch cutoff time, using default 11:59 AM", error)
      }
    }

    void loadCutoffTime()
    return () => controller.abort()
  }, [setCutoffTime])

  useEffect(() => {
    const controller = new AbortController()
    async function loadUserData() {
      try {
        if (authStatus !== "ready") {
          return
        }

        if (!authenticated || !authUser?._id) {
          routerRef.current.replace("/login")
          return
        }

        setUserLoading(true)
        const initialUser = authUser as DashboardUserData

        if (!initialUser || !initialUser._id) {
          console.error("User data is missing _id:", initialUser)
          toastRef.current({
            title: "Error",
            description: "User data is incomplete. Please log out and log in again.",
            variant: "destructive",
          })
          setUserLoading(false)
          return
        }

        applyRef.current(initialUser, { syncForms: true })
        setOrderStatsLoading(true)
        console.log("[Dashboard] Loading user profile and order stats in parallel...")
        const [refreshedUser, orderStatsResponse] = await Promise.all([
          refreshRef.current({ syncForms: true, signal: controller.signal }),
          fetch(`/api/users/${authUser._id}/orders/count`, {
            signal: controller.signal,
          }),
        ])
        if (controller.signal.aborted) {
          return
        }

        const orderStatsData = await orderStatsResponse.json()
        if (controller.signal.aborted) {
          return
        }

        if (orderStatsData.success && orderStatsData.data) {
          setUpcomingDeliveries(orderStatsData.data.upcomingDeliveries || 0)
          setTotalOrders(orderStatsData.data.totalOrders || 0)
        }

        if (!refreshedUser) {
          if (controller.signal.aborted) return
          console.error("Failed to fetch user data from API")
          toastRef.current({
            title: "Error",
            description: "Failed to load user data from server",
            variant: "destructive",
          })
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.error("Error loading user data:", error)
        toastRef.current({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        })
      } finally {
        setUserLoading(false)
        setOrderStatsLoading(false)
      }
    }

    void loadUserData()
    return () => controller.abort()
  }, [authStatus, authenticated, authUser?._id])
}
