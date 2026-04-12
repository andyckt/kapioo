"use client"

import type { ChangeEvent } from "react"
import { AnimatePresence } from "framer-motion"

import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import type { useLanguage } from "@/lib/language-context"
import type {
  DashboardAddressInfo,
  DashboardPasswordInfo,
  DashboardPersonalInfo,
} from "@/features/dashboard-settings/dashboard-settings-tab"

import {
  LazyDashboardCommunityTab,
  LazyDashboardCreditsTab,
  LazyDashboardDailyDeliveryTab,
  LazyDashboardMealVouchersTab,
  LazyDashboardOverviewTab,
  LazyDashboardOrdersTab,
  LazyDashboardSettingsTab,
  LazyDashboardWeeklySubscriptionTab,
} from "./dashboard-lazy-tabs"

type TFn = ReturnType<typeof useLanguage>["t"]

export interface DashboardTabContentProps {
  activeTab: string
  language: "en" | "zh"
  t: TFn
  userData: DashboardUserData | null
  userLoading: boolean
  dashboardHeaderDate: string
  showServiceSelection: boolean
  upcomingDeliveries: number
  credits: number
  orderActiveSection: "orders" | "recharges"
  purchaseHistoryKey: number
  voucherHistoryKey: number
  personalInfo: DashboardPersonalInfo
  addressInfo: DashboardAddressInfo
  passwordInfo: DashboardPasswordInfo
  onActiveTabChange: (tab: string) => void
  onShowServiceSelection: () => void
  onOrderSectionChange: (section: "orders" | "recharges") => void
  onPurchaseSuccess: () => void
  onVoucherPurchaseSuccess: () => void
  onWeeklyVoucherUpdate: () => void
  handlePersonalInfoChange: (e: ChangeEvent<HTMLInputElement>) => void
  handleAddressInfoChange: (e: ChangeEvent<HTMLInputElement>) => void
  handlePasswordChange: (e: ChangeEvent<HTMLInputElement>) => void
  onLanguagePreferenceChange: (languagePreference: "zh" | "en") => void
  onAddressProvinceChange: (province: string) => void
  handleSavePersonalInfo: () => void | Promise<void>
  handleSaveAddressInfo: () => void | Promise<void>
  handleSavePassword: () => void | Promise<void>
}

export function DashboardTabContent({
  activeTab,
  language,
  t,
  userData,
  userLoading,
  dashboardHeaderDate,
  showServiceSelection,
  upcomingDeliveries,
  credits,
  orderActiveSection,
  purchaseHistoryKey,
  voucherHistoryKey,
  personalInfo,
  addressInfo,
  passwordInfo,
  onActiveTabChange,
  onShowServiceSelection,
  onOrderSectionChange,
  onPurchaseSuccess,
  onVoucherPurchaseSuccess,
  onWeeklyVoucherUpdate,
  handlePersonalInfoChange,
  handleAddressInfoChange,
  handlePasswordChange,
  onLanguagePreferenceChange,
  onAddressProvinceChange,
  handleSavePersonalInfo,
  handleSaveAddressInfo,
  handleSavePassword,
}: DashboardTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      {activeTab === "overview" && (
        <LazyDashboardOverviewTab
          language={language}
          userData={userData}
          userLoading={userLoading}
          dashboardHeaderDate={dashboardHeaderDate}
          showServiceSelection={showServiceSelection}
          upcomingDeliveries={upcomingDeliveries}
          onShowServiceSelection={onShowServiceSelection}
          onTabChange={(tab) => onActiveTabChange(tab)}
        />
      )}

      {activeTab === "orders" && (
        <LazyDashboardOrdersTab
          t={t}
          userData={userData}
          orderActiveSection={orderActiveSection}
          purchaseHistoryKey={purchaseHistoryKey}
          voucherHistoryKey={voucherHistoryKey}
          onOrderSectionChange={onOrderSectionChange}
        />
      )}

      {activeTab === "community" && (
        <LazyDashboardCommunityTab />
      )}

      {activeTab === "credits" && (
        <LazyDashboardCreditsTab
          language={language}
          userData={userData}
          purchaseHistoryKey={purchaseHistoryKey}
          onPurchaseSuccess={onPurchaseSuccess}
        />
      )}

      {activeTab === "settings" && (
        <LazyDashboardSettingsTab
          language={language}
          t={t}
          userStatus={userData?.status}
          userId={userData?.userID}
          personalInfo={personalInfo}
          addressInfo={addressInfo}
          passwordInfo={passwordInfo}
          onPersonalInfoChange={handlePersonalInfoChange}
          onAddressInfoChange={handleAddressInfoChange}
          onPasswordChange={handlePasswordChange}
          onLanguagePreferenceChange={onLanguagePreferenceChange}
          onAddressProvinceChange={onAddressProvinceChange}
          onSavePersonalInfo={handleSavePersonalInfo}
          onSaveAddressInfo={handleSaveAddressInfo}
          onSavePassword={handleSavePassword}
        />
      )}

      {activeTab === "daily-delivery" && (
        <LazyDashboardDailyDeliveryTab />
      )}

      {activeTab === "meal-vouchers" && (
        <LazyDashboardMealVouchersTab
          userData={userData}
          voucherHistoryKey={voucherHistoryKey}
          onVoucherPurchaseSuccess={onVoucherPurchaseSuccess}
        />
      )}

      {activeTab === "weekly-subscription" && (
        <LazyDashboardWeeklySubscriptionTab
          credits={credits}
          userData={userData}
          onWeeklyVoucherUpdate={onWeeklyVoucherUpdate}
        />
      )}
    </AnimatePresence>
  )
}
