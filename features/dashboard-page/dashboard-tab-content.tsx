"use client"

import dynamic from "next/dynamic"
import type { ChangeEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { CommunityRecipes } from "@/components/community-recipes"
import { OrderSectionNavigation } from "@/components/order-section-navigation"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import type { useLanguage } from "@/lib/language-context"
import type {
  DashboardAddressInfo,
  DashboardPasswordInfo,
  DashboardPersonalInfo,
} from "@/features/dashboard-settings/dashboard-settings-tab"

import {
  LazyDashboardCreditsTab,
  LazyDashboardOverviewTab,
  LazyDashboardSettingsTab,
} from "./dashboard-lazy-tabs"

const DailyDelivery = dynamic(() => import("@/components/daily-delivery"), { ssr: false })
const WeeklySubscription = dynamic(() => import("@/components/weekly-subscription"), { ssr: false })
const WeeklySubscriptionHistory = dynamic(
  () =>
    import("@/components/weekly-subscription-history").then((mod) => ({
      default: mod.WeeklySubscriptionHistory,
    })),
  { ssr: false }
)
const DailyDeliveryHistory = dynamic(
  () =>
    import("@/components/daily-delivery-history").then((mod) => ({
      default: mod.DailyDeliveryHistory,
    })),
  { ssr: false }
)
const MealVoucherPurchase = dynamic(() => import("@/components/meal-voucher-purchase"), { ssr: false })
const VoucherPurchaseHistory = dynamic(
  () =>
    import("@/components/voucher-purchase-history").then((mod) => ({
      default: mod.VoucherPurchaseHistory,
    })),
  { ssr: false }
)
const UnifiedRechargeHistory = dynamic(
  () =>
    import("@/components/unified-recharge-history").then((mod) => ({
      default: mod.UnifiedRechargeHistory,
    })),
  { ssr: false }
)

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
        <motion.div
          key="orders"
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          exit={{ y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between mt-4">
            <h2 className="text-3xl font-bold tracking-tight">{t("myOrders")}</h2>
          </div>

          <OrderSectionNavigation
            activeSection={orderActiveSection}
            onSectionChange={onOrderSectionChange}
          />

          {userData && orderActiveSection === "orders" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <WeeklySubscriptionHistory userId={userData._id} />
              <DailyDeliveryHistory userId={userData._id} />
            </motion.div>
          )}

          {userData && orderActiveSection === "recharges" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <UnifiedRechargeHistory
                userId={userData._id}
                weeklyRefreshKey={purchaseHistoryKey}
                dailyRefreshKey={voucherHistoryKey}
              />
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === "community" && (
        <motion.div
          key="community"
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          exit={{ y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between mt-4">
            <h2 className="text-3xl font-bold tracking-tight">Community</h2>
          </div>
          <CommunityRecipes />
        </motion.div>
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
        <motion.div
          key="daily-delivery"
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          exit={{ y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <DailyDelivery />
        </motion.div>
      )}

      {activeTab === "meal-vouchers" && (
        <motion.div
          key="meal-vouchers"
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          exit={{ y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="space-y-6">
            <MealVoucherPurchase onSuccess={onVoucherPurchaseSuccess} />

            {userData && userData._id && (
              <div className="mt-8">
                <VoucherPurchaseHistory userId={userData._id} refreshKey={voucherHistoryKey} />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === "weekly-subscription" && (
        <motion.div
          key="weekly-subscription"
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          exit={{ y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <WeeklySubscription
            userCredits={credits}
            weeklySIXmeals={userData?.weeklySIXmeals}
            weeklyEIGHTmeals={(userData as DashboardUserData & { weeklyEIGHTmeals?: number })?.weeklyEIGHTmeals}
            weeklyTENmeals={userData?.weeklyTENmeals}
            weeklyTWELVEmeals={(userData as DashboardUserData & { weeklyTWELVEmeals?: number })?.weeklyTWELVEmeals}
            weeklySIXTEENmeals={(userData as DashboardUserData & { weeklySIXTEENmeals?: number })?.weeklySIXTEENmeals}
            onVoucherUpdate={onWeeklyVoucherUpdate}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
