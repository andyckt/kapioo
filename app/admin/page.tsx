'use client'

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

import { useToast } from "@/hooks/use-toast"
import { performClientLogout } from "@/lib/client-logout"
import { useClientAuth } from "@/lib/client-auth"
import { type User } from "@/lib/utils"
import { useAdminCreditRequests } from "@/features/admin-credit-requests/use-admin-credit-requests"
import { useAdminDashboardBalance } from "@/features/admin-credits/use-admin-dashboard-balance"
import { useAdminTransactions } from "@/features/admin-credits/use-admin-transactions"
import { useAdminUsers } from "@/features/admin-users/use-admin-users"
import { AdminDashboardDialogs, AdminDashboardTabContent } from "@/features/admin-page"
import { AdminShell, adminSidebarMenuItems } from "@/features/admin-shell"

export default function AdminDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { status: authStatus, authenticated, user, requiresAdminMfa } = useClientAuth()
  const hasVerifiedAdminSession =
    authStatus === "ready" && authenticated && user?.role === "admin" && !requiresAdminMfa
  const [activeTab, setActiveTab] = useState("users")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [addCreditsOpen, setAddCreditsOpen] = useState(false)
  const [viewUserOpen, setViewUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creditAmount, setCreditAmount] = useState(10)
  const [serviceType, setServiceType] = useState<"daily" | "weekly">("daily")
  const [voucherType, setVoucherType] = useState<string>("twoDishVoucher")
  const [deductCreditsOpen, setDeductCreditsOpen] = useState(false)
  const [deductAmount, setDeductAmount] = useState(1)
  const [deleteUserOpen, setDeleteUserOpen] = useState(false)
  const [deductDescription, setDeductDescription] = useState("Admin deduction")
  const {
    users,
    setUsers,
    filteredUsers,
    setFilteredUsers,
    usersLoading,
    usersPagination,
    setUsersPagination,
    usersError,
    userSearchQuery,
    setUserSearchQuery,
    userSearchType,
    setUserSearchType,
    searchResults,
    searchLoading,
    totalUsersCount,
    userGrowthRate,
    totalUsersLoading,
    isExportingUsers,
    isDeletingUser,
    fetchUsers,
    fetchTotalUsersStats,
    searchUsers,
    handleUserSearch,
    resetUserSearch,
    handleUserPagination,
    handleExportUsers,
    handleDeleteUser: deleteUserById,
  } = useAdminUsers({ hasVerifiedAdminSession, activeTab })

  const ensureUsersLoaded = useCallback(() => {
    void fetchUsers(usersPagination.page, usersPagination.limit)
  }, [fetchUsers, usersPagination.page, usersPagination.limit])

  const {
    transactions,
    transactionsLoading,
    transactionsPagination,
    fetchTransactions,
    handleTransactionPagination,
    changeTransactionsPageSize,
  } = useAdminTransactions({
    activeTab,
    hasVerifiedAdminSession,
    usersCount: users.length,
    usersLoading,
    ensureUsersLoaded,
  })
  const {
    isUpdatingBalance,
    handleVoucherBalanceUpdate,
    confirmAddCredits,
    confirmDeductCredits,
  } = useAdminDashboardBalance({
    toast,
    users,
    setUsers,
    filteredUsers,
    setFilteredUsers,
    selectedUser,
    setSelectedUser,
    activeTab,
    fetchTransactions,
    creditAmount,
    voucherType,
    deductAmount,
    deductDescription,
    setAddCreditsOpen,
    setDeductCreditsOpen,
  })
  const {
    creditRequestsLoading,
    creditRequests,
    creditRequestsPagination,
    isExportingCreditRequests,
    creditRequestsDateRange,
    viewRequestOpen,
    setViewRequestOpen,
    selectedRequest,
    approveRequestOpen,
    setApproveRequestOpen,
    declineRequestOpen,
    setDeclineRequestOpen,
    approvedSixMeals,
    setApprovedSixMeals,
    approvedEightMeals,
    setApprovedEightMeals,
    approvedTenMeals,
    setApprovedTenMeals,
    approvedTwelveMeals,
    setApprovedTwelveMeals,
    approvedSixteenMeals,
    setApprovedSixteenMeals,
    adminNotes,
    setAdminNotes,
    processingRequest,
    handleCreditRequestPagination,
    applyCreditRequestsDateRange,
    clearCreditRequestsDateRange,
    changeCreditRequestsPageSize,
    refreshCreditRequests,
    handleViewRequest,
    handleApproveRequest,
    handleDeclineRequest,
    confirmApproveRequest,
    confirmDeclineRequest,
    exportCreditRequestsToCSV,
  } = useAdminCreditRequests({
    activeTab,
    hasVerifiedAdminSession,
  })
  useEffect(() => {
    if (authStatus !== "ready") {
      return
    }

    if (!authenticated) {
      router.replace("/login")
      return
    }

    if (user?.role !== "admin") {
      toast({
        title: "Access denied",
        description: "You must be an admin to view this page",
        variant: "destructive",
      })
      router.replace("/dashboard")
      return
    }

    if (requiresAdminMfa) {
      router.replace("/admin/mfa")
    }
  }, [authStatus, authenticated, requiresAdminMfa, router, toast, user?.role])

  const handleViewUser = (u: User) => {
    setSelectedUser(u)
    setViewUserOpen(true)
  }

  const handleDeleteUser = (u: User) => {
    setSelectedUser(u)
    setDeleteUserOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const success = await deleteUserById(selectedUser._id)

      if (success) {
        toast({
          title: "User deleted",
          description: `${selectedUser.name}'s account has been successfully deleted.`,
        })

        setDeleteUserOpen(false)
        fetchUsers(usersPagination.page, usersPagination.limit)
      } else {
        toast({
          title: "Error",
          description: "Failed to delete user. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    await performClientLogout()
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })
    router.push("/login")
  }

  return (
    <AdminShell
      sidebarMenuItems={adminSidebarMenuItems}
      activeTab={activeTab}
      mobileMenuOpen={mobileMenuOpen}
      onMobileMenuOpenChange={setMobileMenuOpen}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
    >
      <AdminDashboardTabContent
        activeTab={activeTab}
        users={users}
        usersLoading={usersLoading}
        usersPagination={usersPagination}
        setUsersPagination={setUsersPagination}
        usersError={usersError}
        filteredUsers={filteredUsers}
        userSearchQuery={userSearchQuery}
        setUserSearchQuery={setUserSearchQuery}
        userSearchType={userSearchType}
        setUserSearchType={setUserSearchType}
        totalUsersCount={totalUsersCount}
        userGrowthRate={userGrowthRate}
        totalUsersLoading={totalUsersLoading}
        isExportingUsers={isExportingUsers}
        fetchUsers={fetchUsers}
        fetchTotalUsersStats={fetchTotalUsersStats}
        handleExportUsers={handleExportUsers}
        handleUserSearch={handleUserSearch}
        resetUserSearch={resetUserSearch}
        handleUserPagination={handleUserPagination}
        handleViewUser={handleViewUser}
        handleDeleteUser={handleDeleteUser}
        searchResults={searchResults}
        searchLoading={searchLoading}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        serviceType={serviceType}
        setServiceType={setServiceType}
        voucherType={voucherType}
        setVoucherType={setVoucherType}
        creditAmount={creditAmount}
        setCreditAmount={setCreditAmount}
        isUpdatingBalance={isUpdatingBalance}
        transactions={transactions}
        transactionsLoading={transactionsLoading}
        transactionsPagination={transactionsPagination}
        searchUsers={searchUsers}
        handleVoucherBalanceUpdate={handleVoucherBalanceUpdate}
        handleTransactionPagination={handleTransactionPagination}
        changeTransactionsPageSize={changeTransactionsPageSize}
        creditRequestsLoading={creditRequestsLoading}
        creditRequests={creditRequests}
        creditRequestsPagination={creditRequestsPagination}
        isExportingCreditRequests={isExportingCreditRequests}
        creditRequestsDateRange={creditRequestsDateRange}
        applyCreditRequestsDateRange={applyCreditRequestsDateRange}
        clearCreditRequestsDateRange={clearCreditRequestsDateRange}
        exportCreditRequestsToCSV={exportCreditRequestsToCSV}
        refreshCreditRequests={refreshCreditRequests}
        handleViewRequest={handleViewRequest}
        handleApproveRequest={handleApproveRequest}
        handleDeclineRequest={handleDeclineRequest}
        handleCreditRequestPagination={handleCreditRequestPagination}
        changeCreditRequestsPageSize={changeCreditRequestsPageSize}
      />

      <AdminDashboardDialogs
        addCreditsOpen={addCreditsOpen}
        setAddCreditsOpen={setAddCreditsOpen}
        selectedUser={selectedUser}
        creditAmount={creditAmount}
        setCreditAmount={setCreditAmount}
        confirmAddCredits={confirmAddCredits}
        viewUserOpen={viewUserOpen}
        setViewUserOpen={setViewUserOpen}
        viewRequestOpen={viewRequestOpen}
        setViewRequestOpen={setViewRequestOpen}
        approveRequestOpen={approveRequestOpen}
        setApproveRequestOpen={setApproveRequestOpen}
        declineRequestOpen={declineRequestOpen}
        setDeclineRequestOpen={setDeclineRequestOpen}
        selectedRequest={selectedRequest}
        approvedSixMeals={approvedSixMeals}
        setApprovedSixMeals={setApprovedSixMeals}
        approvedEightMeals={approvedEightMeals}
        setApprovedEightMeals={setApprovedEightMeals}
        approvedTenMeals={approvedTenMeals}
        setApprovedTenMeals={setApprovedTenMeals}
        approvedTwelveMeals={approvedTwelveMeals}
        setApprovedTwelveMeals={setApprovedTwelveMeals}
        approvedSixteenMeals={approvedSixteenMeals}
        setApprovedSixteenMeals={setApprovedSixteenMeals}
        adminNotes={adminNotes}
        setAdminNotes={setAdminNotes}
        processingRequest={processingRequest}
        handleApproveRequest={handleApproveRequest}
        handleDeclineRequest={handleDeclineRequest}
        confirmApproveRequest={confirmApproveRequest}
        confirmDeclineRequest={confirmDeclineRequest}
        deductCreditsOpen={deductCreditsOpen}
        setDeductCreditsOpen={setDeductCreditsOpen}
        deductAmount={deductAmount}
        setDeductAmount={setDeductAmount}
        deductDescription={deductDescription}
        setDeductDescription={setDeductDescription}
        confirmDeductCredits={confirmDeductCredits}
        deleteUserOpen={deleteUserOpen}
        setDeleteUserOpen={setDeleteUserOpen}
        isDeletingUser={isDeletingUser}
        confirmDeleteUser={confirmDeleteUser}
      />
    </AdminShell>
  )
}
