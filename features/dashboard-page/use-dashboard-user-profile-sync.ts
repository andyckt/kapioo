"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"

import { mergeStoredUser } from "@/lib/client-user-cache"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import { getUserById } from "@/lib/utils"
import type {
  DashboardAddressInfo,
  DashboardPersonalInfo,
} from "@/features/dashboard-settings/dashboard-settings-tab"

export function useDashboardUserProfileSync(
  setLanguage: (lang: "en" | "zh") => void,
  setUserData: Dispatch<SetStateAction<DashboardUserData | null>>,
  setCredits: Dispatch<SetStateAction<number>>,
  setPersonalInfo: Dispatch<SetStateAction<DashboardPersonalInfo>>,
  setAddressInfo: Dispatch<SetStateAction<DashboardAddressInfo>>,
  authUserId: string | undefined
) {
  const applyUserProfile = useCallback(
    (nextUser: Partial<DashboardUserData>, options?: { syncForms?: boolean }) => {
      if (!nextUser._id || !nextUser.name || !nextUser.email) {
        return
      }

      const normalizedUser: DashboardUserData = {
        _id: nextUser._id,
        userID: nextUser.userID || "",
        name: nextUser.name,
        nickname: nextUser.nickname || "",
        email: nextUser.email,
        credits: nextUser.credits || 0,
        twoDishVoucher: nextUser.twoDishVoucher || 0,
        threeDishVoucher: nextUser.threeDishVoucher || 0,
        weeklySIXmeals: nextUser.weeklySIXmeals || 0,
        weeklyEIGHTmeals: nextUser.weeklyEIGHTmeals || 0,
        weeklyTENmeals: nextUser.weeklyTENmeals || 0,
        weeklyTWELVEmeals: nextUser.weeklyTWELVEmeals || 0,
        weeklySIXTEENmeals: nextUser.weeklySIXTEENmeals || 0,
        joined: nextUser.joined || nextUser.createdAt || new Date().toISOString(),
        status: nextUser.status || "Active",
        languagePreference: nextUser.languagePreference || "zh",
        address: nextUser.address
          ? {
              unitNumber: nextUser.address.unitNumber || "",
              streetAddress: nextUser.address.streetAddress || "",
              province: nextUser.address.province || "",
              postalCode: nextUser.address.postalCode || "",
              country: nextUser.address.country || "Canada",
              buzzCode: nextUser.address.buzzCode || "",
            }
          : undefined,
        phone: nextUser.phone || "",
        createdAt: nextUser.createdAt || nextUser.joined || new Date().toISOString(),
        updatedAt: nextUser.updatedAt,
        isActive: nextUser.isActive,
        totalOrders: nextUser.totalOrders,
        dailyOrdersCount: nextUser.dailyOrdersCount,
        weeklyOrdersCount: nextUser.weeklyOrdersCount,
        area: nextUser.area || nextUser.address?.province || "",
        role: nextUser.role || "user",
        isVerified: Boolean(nextUser.isVerified),
      }

      setUserData(normalizedUser)
      setCredits(normalizedUser.credits || 0)
      mergeStoredUser({
        _id: normalizedUser._id,
        userID: normalizedUser.userID,
        name: normalizedUser.name,
        nickname: normalizedUser.nickname,
        email: normalizedUser.email,
        role: normalizedUser.role,
        languagePreference: normalizedUser.languagePreference || "zh",
        isVerified: normalizedUser.isVerified,
        phone: normalizedUser.phone || "",
        address: normalizedUser.address,
        area: normalizedUser.area || normalizedUser.address?.province || "",
        credits: normalizedUser.credits || 0,
        twoDishVoucher: normalizedUser.twoDishVoucher || 0,
        threeDishVoucher: normalizedUser.threeDishVoucher || 0,
        weeklySIXmeals: normalizedUser.weeklySIXmeals || 0,
        weeklyEIGHTmeals: normalizedUser.weeklyEIGHTmeals || 0,
        weeklyTENmeals: normalizedUser.weeklyTENmeals || 0,
        weeklyTWELVEmeals: normalizedUser.weeklyTWELVEmeals || 0,
        weeklySIXTEENmeals: normalizedUser.weeklySIXTEENmeals || 0,
      })
      localStorage.setItem("isAuthenticated", "true")

      if (
        normalizedUser.languagePreference &&
        (normalizedUser.languagePreference === "zh" || normalizedUser.languagePreference === "en")
      ) {
        console.log("Dashboard: Setting language from database:", normalizedUser.languagePreference)
        setLanguage(normalizedUser.languagePreference)
        localStorage.setItem("preferredLanguage", normalizedUser.languagePreference)
      }

      if (options?.syncForms === false) {
        return
      }

      setPersonalInfo({
        name: normalizedUser.name || "",
        nickname: normalizedUser.nickname || "",
        email: normalizedUser.email || "",
        phone: normalizedUser.phone || "",
        languagePreference: normalizedUser.languagePreference || "zh",
      })

      setAddressInfo({
        unitNumber: normalizedUser.address?.unitNumber || "",
        streetAddress: normalizedUser.address?.streetAddress || "",
        province: normalizedUser.address?.province || "",
        postalCode: normalizedUser.address?.postalCode || "",
        country: normalizedUser.address?.country || "Canada",
        buzzCode: normalizedUser.address?.buzzCode || "",
      })
    },
    [setAddressInfo, setCredits, setLanguage, setPersonalInfo, setUserData]
  )

  const refreshUserProfile = useCallback(
    async (options?: { syncForms?: boolean; signal?: AbortSignal }) => {
      if (!authUserId) {
        return null
      }

      try {
        const user = await getUserById(authUserId, { signal: options?.signal })
        if (!user) {
          return null
        }

        const nextUser = user as DashboardUserData
        applyUserProfile(nextUser, options)
        return nextUser
      } catch (error) {
        console.error("Error refreshing user profile:", error)
        return null
      }
    },
    [applyUserProfile, authUserId]
  )

  return { applyUserProfile, refreshUserProfile }
}
