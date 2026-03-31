"use client"

import dynamic from "next/dynamic"
import type { Dispatch, SetStateAction } from "react"
import { AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"

import { DailyDeliveryManagement } from "@/components/daily-delivery-management"
import { MealVoucherManagement } from "@/components/meal-voucher-management"
import { NextWeekMenuEmail } from "@/components/next-week-menu-email"
import { PromoCodeManagement } from "@/components/promo-code-management"
import { SettingsManagement } from "@/components/settings-management"
import { ViewAllOrders } from "@/components/view-all-orders"
import { ViewWeeklyOrders } from "@/components/view-weekly-orders"
import { WeeklySubscriptionManagement } from "@/components/weekly-subscription-management"
import type { AdminUserSearchType } from "@/features/admin-users/use-admin-users"
import { AdminTabPanel } from "@/features/admin-shell"
import type { AdminDateRange, AdminTransaction, CreditRequest } from "@/lib/types/admin"
import type { PaginationState } from "@/lib/types/pagination"
import type { User } from "@/lib/utils"

import {
  LazyAdminCreditRequestsTab,
  LazyAdminCreditsTab,
  LazyAdminUsersTab,
} from "./admin-lazy-domain-tabs"

const AdminDashboardEnhanced = dynamic(
  () =>
    import("@/components/admin-dashboard-enhanced").then((m) => ({
      default: m.AdminDashboardEnhanced,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

const MealFeedbackManagement = dynamic(
  () =>
    import("@/components/meal-feedback-management").then((m) => ({
      default: m.MealFeedbackManagement,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

const RatingDishManagement = dynamic(
  () =>
    import("@/components/rating-dish-management").then((m) => ({
      default: m.RatingDishManagement,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

export interface AdminDashboardTabContentProps {
  activeTab: string
  users: User[]
  usersLoading: boolean
  usersPagination: PaginationState
  setUsersPagination: Dispatch<SetStateAction<PaginationState>>
  usersError: string | null
  filteredUsers: User[]
  userSearchQuery: string
  setUserSearchQuery: Dispatch<SetStateAction<string>>
  userSearchType: AdminUserSearchType
  setUserSearchType: Dispatch<SetStateAction<AdminUserSearchType>>
  totalUsersCount: number
  userGrowthRate: number
  totalUsersLoading: boolean
  isExportingUsers: boolean
  fetchUsers: (
    page?: number,
    limit?: number,
    search?: string,
    searchType?: AdminUserSearchType,
    opts?: { signal?: AbortSignal }
  ) => void | Promise<void>
  fetchTotalUsersStats: (opts?: { signal?: AbortSignal }) => void | Promise<void>
  handleExportUsers: () => void | Promise<void>
  handleUserSearch: () => void
  resetUserSearch: () => void
  handleUserPagination: (direction: "prev" | "next") => void
  handleViewUser: (user: User) => void
  handleDeleteUser: (user: User) => void
  searchResults: User[]
  searchLoading: boolean
  selectedUser: User | null
  setSelectedUser: Dispatch<SetStateAction<User | null>>
  serviceType: "daily" | "weekly"
  setServiceType: Dispatch<SetStateAction<"daily" | "weekly">>
  voucherType: string
  setVoucherType: Dispatch<SetStateAction<string>>
  creditAmount: number
  setCreditAmount: Dispatch<SetStateAction<number>>
  isUpdatingBalance: boolean
  transactions: AdminTransaction[]
  transactionsLoading: boolean
  transactionsPagination: PaginationState
  searchUsers: (query: string) => void | Promise<void>
  handleVoucherBalanceUpdate: (operation: "add" | "deduct") => void | Promise<void>
  handleTransactionPagination: (direction: "prev" | "next") => void
  changeTransactionsPageSize: (limit: number) => void
  creditRequestsLoading: boolean
  creditRequests: CreditRequest[]
  creditRequestsPagination: { page: number; limit: number; pages: number }
  isExportingCreditRequests: boolean
  creditRequestsDateRange: AdminDateRange
  applyCreditRequestsDateRange: (range: AdminDateRange) => void
  clearCreditRequestsDateRange: () => void
  exportCreditRequestsToCSV: () => void | Promise<void>
  refreshCreditRequests: () => void | Promise<void>
  handleViewRequest: (request: CreditRequest) => void
  handleApproveRequest: (request: CreditRequest) => void
  handleDeclineRequest: (request: CreditRequest) => void
  handleCreditRequestPagination: (direction: "prev" | "next") => void
  changeCreditRequestsPageSize: (limit: number) => void
}

export function AdminDashboardTabContent(p: AdminDashboardTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      {p.activeTab === "dashboard" && (
        <AdminTabPanel panelKey="dashboard">
          <AdminDashboardEnhanced />
        </AdminTabPanel>
      )}

      {p.activeTab === "users" && (
        <AdminTabPanel panelKey="users" className="space-y-6">
          <LazyAdminUsersTab
            users={p.users}
            usersLoading={p.usersLoading}
            usersPagination={p.usersPagination}
            setUsersPagination={p.setUsersPagination}
            usersError={p.usersError}
            filteredUsers={p.filteredUsers}
            userSearchQuery={p.userSearchQuery}
            setUserSearchQuery={p.setUserSearchQuery}
            userSearchType={p.userSearchType}
            setUserSearchType={p.setUserSearchType}
            totalUsersCount={p.totalUsersCount}
            userGrowthRate={p.userGrowthRate}
            totalUsersLoading={p.totalUsersLoading}
            isExportingUsers={p.isExportingUsers}
            onRefresh={() => {
              void p.fetchUsers(p.usersPagination.page, p.usersPagination.limit)
              void p.fetchTotalUsersStats()
            }}
            onExportUsers={() => {
              void p.handleExportUsers()
            }}
            onSearch={p.handleUserSearch}
            onResetSearch={p.resetUserSearch}
            onPaginate={p.handleUserPagination}
            onViewUser={p.handleViewUser}
            onDeleteUser={p.handleDeleteUser}
            onChangePageSize={(newLimit) => {
              p.setUsersPagination((prev) => ({
                ...prev,
                limit: newLimit,
                page: 1,
              }))
              void p.fetchUsers(1, newLimit)
            }}
          />
        </AdminTabPanel>
      )}

      {p.activeTab === "daily-delivery" && (
        <AdminTabPanel panelKey="daily-delivery" className="space-y-6">
          <DailyDeliveryManagement />
        </AdminTabPanel>
      )}

      {p.activeTab === "weekly-subscription" && (
        <AdminTabPanel panelKey="weekly-subscription" className="space-y-6">
          <WeeklySubscriptionManagement />
        </AdminTabPanel>
      )}

      {p.activeTab === "next-week-menu-email" && (
        <AdminTabPanel panelKey="next-week-menu-email" className="space-y-6">
          <NextWeekMenuEmail />
        </AdminTabPanel>
      )}

      {p.activeTab === "credits" && (
        <AdminTabPanel panelKey="credits" className="space-y-6">
          <LazyAdminCreditsTab
            users={p.users}
            usersLoading={p.usersLoading}
            searchResults={p.searchResults}
            searchLoading={p.searchLoading}
            selectedUser={p.selectedUser}
            setSelectedUser={p.setSelectedUser}
            serviceType={p.serviceType}
            setServiceType={p.setServiceType}
            voucherType={p.voucherType}
            setVoucherType={p.setVoucherType}
            creditAmount={p.creditAmount}
            setCreditAmount={p.setCreditAmount}
            isUpdatingBalance={p.isUpdatingBalance}
            transactions={p.transactions}
            transactionsLoading={p.transactionsLoading}
            transactionsPagination={p.transactionsPagination}
            searchUsers={p.searchUsers}
            onAddBalance={() => void p.handleVoucherBalanceUpdate("add")}
            onDeductBalance={() => void p.handleVoucherBalanceUpdate("deduct")}
            onTransactionPagination={p.handleTransactionPagination}
            onChangeTransactionsPageSize={p.changeTransactionsPageSize}
          />
        </AdminTabPanel>
      )}

      {p.activeTab === "meal-vouchers" && (
        <AdminTabPanel panelKey="meal-vouchers">
          <MealVoucherManagement />
        </AdminTabPanel>
      )}

      {p.activeTab === "promo-codes" && (
        <AdminTabPanel panelKey="promo-codes" className="space-y-6">
          <PromoCodeManagement />
        </AdminTabPanel>
      )}

      {p.activeTab === "view-all-orders" && (
        <AdminTabPanel panelKey="view-all-orders">
          <ViewAllOrders />
        </AdminTabPanel>
      )}

      {p.activeTab === "view-weekly-orders" && (
        <AdminTabPanel panelKey="view-weekly-orders">
          <ViewWeeklyOrders />
        </AdminTabPanel>
      )}

      {p.activeTab === "credit-requests" && (
        <AdminTabPanel panelKey="credit-requests" className="space-y-6">
          <LazyAdminCreditRequestsTab
            creditRequestsLoading={p.creditRequestsLoading}
            creditRequests={p.creditRequests}
            creditRequestsPagination={p.creditRequestsPagination}
            isExportingCreditRequests={p.isExportingCreditRequests}
            creditRequestsDateRange={p.creditRequestsDateRange}
            onApplyDateRange={p.applyCreditRequestsDateRange}
            onClearDateRange={p.clearCreditRequestsDateRange}
            onExport={p.exportCreditRequestsToCSV}
            onRefresh={p.refreshCreditRequests}
            onViewRequest={p.handleViewRequest}
            onApproveRequest={p.handleApproveRequest}
            onDeclineRequest={p.handleDeclineRequest}
            onPaginate={p.handleCreditRequestPagination}
            onChangePageSize={p.changeCreditRequestsPageSize}
          />
        </AdminTabPanel>
      )}

      {p.activeTab === "meal-feedback" && (
        <AdminTabPanel panelKey="meal-feedback">
          <MealFeedbackManagement />
        </AdminTabPanel>
      )}

      {p.activeTab === "rating-dishes" && (
        <AdminTabPanel panelKey="rating-dishes">
          <RatingDishManagement />
        </AdminTabPanel>
      )}

      {p.activeTab === "settings" && (
        <AdminTabPanel panelKey="settings">
          <SettingsManagement />
        </AdminTabPanel>
      )}
    </AnimatePresence>
  )
}
