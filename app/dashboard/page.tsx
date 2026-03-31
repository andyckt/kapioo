"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"

import { useToast } from "@/hooks/use-toast"
import { performClientLogout } from "@/lib/client-logout"
import { useClientAuth } from "@/lib/client-auth"
import {
  DashboardUserProfileContext,
  DEFAULT_DASHBOARD_CUTOFF_TIME,
  type DashboardUserData,
} from "@/lib/dashboard-user-profile"
import { useLanguage } from "@/lib/language-context"
import {
  DashboardTabContent,
  useDashboardDataLoading,
  useDashboardSettingsHandlers,
  useDashboardUserProfileSync,
} from "@/features/dashboard-page"
import { DashboardShell, getDashboardMenuItems } from "@/features/dashboard-shell"
import type { DashboardPasswordInfo } from "@/features/dashboard-settings/dashboard-settings-tab"

function formatDashboardHeaderDate(language: "en" | "zh"): string {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Toronto",
  }).format(new Date())
}

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language, setLanguage } = useLanguage()
  const { status: authStatus, authenticated, user: authUser } = useClientAuth()
  const [credits, setCredits] = useState(0)
  const [activeTab, setActiveTab] = useState("overview")
  const activeTabHistoryReadyRef = useRef(false)
  const [showServiceSelection, setShowServiceSelection] = useState(false)

  const handleLogout = async () => {
    await performClientLogout()
    toast({
      title: language === "en" ? "Logged out" : "已退出登录",
      description:
        language === "en" ? "You have been logged out successfully" : "您已成功退出登录",
    })
    router.push("/login")
  }

  const handleMobileLogout = () => {
    toast({
      title: "Logging out",
      description: "Please wait...",
    })

    setIsMobileMenuOpen(false)

    setTimeout(() => {
      void handleLogout()
    }, 800)
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userData, setUserData] = useState<DashboardUserData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [purchaseHistoryKey, setPurchaseHistoryKey] = useState(0)
  const [voucherHistoryKey, setVoucherHistoryKey] = useState(0)
  const [orderActiveSection, setOrderActiveSection] = useState<"orders" | "recharges">("orders")
  const [cutoffTime, setCutoffTime] = useState(DEFAULT_DASHBOARD_CUTOFF_TIME)
  const [upcomingDeliveries, setUpcomingDeliveries] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [, setOrderStatsLoading] = useState(true)
  const [dashboardHeaderDate, setDashboardHeaderDate] = useState("")

  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    nickname: "",
    email: "",
    phone: "",
    languagePreference: "zh" as "zh" | "en",
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const syncTabFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const nextTab = urlParams.get("tab") || "overview"
      setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab))
    }

    syncTabFromUrl()
    activeTabHistoryReadyRef.current = true
    window.addEventListener("popstate", syncTabFromUrl)

    return () => {
      window.removeEventListener("popstate", syncTabFromUrl)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !activeTabHistoryReadyRef.current) {
      return
    }

    const nextUrl = new URL(window.location.href)
    const currentTab = nextUrl.searchParams.get("tab") || "overview"

    if (currentTab === activeTab) {
      return
    }

    if (activeTab === "overview") {
      nextUrl.searchParams.delete("tab")
    } else {
      nextUrl.searchParams.set("tab", activeTab)
    }

    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    window.history.pushState({ tab: activeTab }, "", nextPath)
  }, [activeTab])

  useEffect(() => {
    setDashboardHeaderDate(formatDashboardHeaderDate(language))
  }, [language])

  const [addressInfo, setAddressInfo] = useState({
    unitNumber: "",
    streetAddress: "",
    province: "",
    postalCode: "",
    country: "Canada",
    buzzCode: "",
  })

  const { applyUserProfile, refreshUserProfile } = useDashboardUserProfileSync(
    setLanguage,
    setUserData,
    setCredits,
    setPersonalInfo,
    setAddressInfo,
    authUser?._id
  )

  const [passwordInfo, setPasswordInfo] = useState<DashboardPasswordInfo>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useDashboardDataLoading({
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
  })

  const refreshOrderStats = useCallback(async (userId: string, options?: { signal?: AbortSignal }) => {
    if (!userId) return

    try {
      setOrderStatsLoading(true)
      const response = await fetch(`/api/users/${userId}/orders/count`, {
        signal: options?.signal,
      })
      const data = await response.json()

      if (data.success && data.data) {
        setUpcomingDeliveries(data.data.upcomingDeliveries || 0)
        setTotalOrders(data.data.totalOrders || 0)
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      console.error("Error fetching order statistics:", error)
    } finally {
      setOrderStatsLoading(false)
    }
  }, [])

  const userProfileContextValue = useMemo(
    () => ({
      userData,
      cutoffTime,
      upcomingDeliveries,
      totalOrders,
      refreshUserProfile,
      refreshOrderStats,
    }),
    [cutoffTime, refreshOrderStats, refreshUserProfile, totalOrders, upcomingDeliveries, userData]
  )

  const menuItems = useMemo(
    () =>
      getDashboardMenuItems(language, {
        overview: t("overview"),
        myOrders: t("myOrders"),
        settings: t("settings"),
      }),
    [language, t]
  )

  const {
    handlePersonalInfoChange,
    handleAddressInfoChange,
    handlePasswordChange,
    handleSavePersonalInfo,
    handleSaveAddressInfo,
    handleSavePassword,
  } = useDashboardSettingsHandlers({
    userData,
    personalInfo,
    addressInfo,
    passwordInfo,
    applyUserProfile,
    toast,
    t,
    setPersonalInfo,
    setAddressInfo,
    setPasswordInfo,
  })

  return (
    <DashboardUserProfileContext.Provider value={userProfileContextValue}>
      <DashboardShell
        menuItems={menuItems}
        activeTab={activeTab}
        isMobileMenuOpen={isMobileMenuOpen}
        onActiveTabChange={setActiveTab}
        onMobileMenuOpenChange={setIsMobileMenuOpen}
        onLogout={handleLogout}
        onMobileLogout={handleMobileLogout}
        mobileLogoutLabel={t("logOut")}
      >
        <DashboardTabContent
          activeTab={activeTab}
          language={language}
          t={t}
          userData={userData}
          userLoading={userLoading}
          dashboardHeaderDate={dashboardHeaderDate}
          showServiceSelection={showServiceSelection}
          upcomingDeliveries={upcomingDeliveries}
          credits={credits}
          orderActiveSection={orderActiveSection}
          purchaseHistoryKey={purchaseHistoryKey}
          voucherHistoryKey={voucherHistoryKey}
          personalInfo={personalInfo}
          addressInfo={addressInfo}
          passwordInfo={passwordInfo}
          onActiveTabChange={setActiveTab}
          onShowServiceSelection={() => setShowServiceSelection(true)}
          onOrderSectionChange={setOrderActiveSection}
          onPurchaseSuccess={() => {
            void refreshUserProfile({ syncForms: false })
            setPurchaseHistoryKey((prev) => prev + 1)
          }}
          onVoucherPurchaseSuccess={() => {
            setVoucherHistoryKey((prev) => prev + 1)
          }}
          onWeeklyVoucherUpdate={() => {
            void refreshUserProfile({ syncForms: false })
          }}
          handlePersonalInfoChange={handlePersonalInfoChange}
          handleAddressInfoChange={handleAddressInfoChange}
          handlePasswordChange={handlePasswordChange}
          onLanguagePreferenceChange={(languagePreference) =>
            setPersonalInfo((prev) => ({ ...prev, languagePreference }))
          }
          onAddressProvinceChange={(province) =>
            setAddressInfo((prev) => ({
              ...prev,
              province,
            }))
          }
          handleSavePersonalInfo={handleSavePersonalInfo}
          handleSaveAddressInfo={handleSaveAddressInfo}
          handleSavePassword={handleSavePassword}
        />
      </DashboardShell>
    </DashboardUserProfileContext.Provider>
  )
}
