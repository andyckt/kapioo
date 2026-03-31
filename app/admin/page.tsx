'use client'

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { performClientLogout } from "@/lib/client-logout"
import { useClientAuth } from "@/lib/client-auth"
const AdminDashboardEnhanced = dynamic(
  () => import("@/components/admin-dashboard-enhanced").then((m) => ({ default: m.AdminDashboardEnhanced })),
  { loading: () => <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> }
)
import {
  type User,
} from "@/lib/utils"
import { NotificationType } from '@/lib/services/notifications';
import {
  AdminUsersTab,
  DeleteUserDialog,
  useAdminUsers,
  ViewUserDialog,
} from "@/features/admin-users"
import {
  AddCreditsDialog,
  AdminCreditsTab,
  DeductCreditsDialog,
  useAdminTransactions,
} from "@/features/admin-credits"
import {
  AdminCreditRequestsTab,
  CreditRequestDialogs,
  useAdminCreditRequests,
} from "@/features/admin-credit-requests"
import { AdminShell, AdminTabPanel, adminSidebarMenuItems } from "@/features/admin-shell"
import { WeeklySubscriptionManagement } from "@/components/weekly-subscription-management"
import { DailyDeliveryManagement } from "@/components/daily-delivery-management"
import { NextWeekMenuEmail } from "@/components/next-week-menu-email"
import { MealVoucherManagement } from "@/components/meal-voucher-management"
import { ViewAllOrders } from "@/components/view-all-orders"
import { ViewWeeklyOrders } from "@/components/view-weekly-orders"
import { SettingsManagement } from "@/components/settings-management"
import { PromoCodeManagement } from "@/components/promo-code-management"
const MealFeedbackManagement = dynamic(
  () => import("@/components/meal-feedback-management").then((m) => ({ default: m.MealFeedbackManagement })),
  { loading: () => <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> }
)
const RatingDishManagement = dynamic(
  () => import("@/components/rating-dish-management").then((m) => ({ default: m.RatingDishManagement })),
  { loading: () => <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> }
)

function getVoucherTypeLabel(field: string) {
  if (field === "twoDishVoucher") return "2-Dish vouchers"
  if (field === "threeDishVoucher") return "3-Dish vouchers"
  if (field === "weeklySIXmeals") return "6-meal vouchers"
  if (field === "weeklyEIGHTmeals") return "8-meal vouchers"
  if (field === "weeklyTENmeals") return "10-meal vouchers"
  return "12-meal vouchers"
}

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
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false)
  const [deductCreditsOpen, setDeductCreditsOpen] = useState(false)
  const [deductAmount, setDeductAmount] = useState(1)
  const [deleteUserOpen, setDeleteUserOpen] = useState(false)
  const [deductDescription, setDeductDescription] = useState("Admin deduction")
  const [isLoading, setIsLoading] = useState(false)
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
    ensureUsersLoaded: () => fetchUsers(usersPagination.page, usersPagination.limit),
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
      router.replace('/login')
      return
    }

    if (user?.role !== 'admin') {
      toast({
        title: "Access denied",
        description: "You must be an admin to view this page",
        variant: "destructive",
      })
      router.replace('/dashboard')
      return
    }

    if (requiresAdminMfa) {
      router.replace('/admin/mfa')
    }
  }, [authStatus, authenticated, requiresAdminMfa, router, toast, user?.role])

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setViewUserOpen(true)
  }

  const syncUpdatedUserState = (updatedUser: User) => {
    setUsers(users.map((user) => (user._id === updatedUser._id ? updatedUser : user)))
    setFilteredUsers(filteredUsers.map((user) => (user._id === updatedUser._id ? updatedUser : user)))
    setSelectedUser(updatedUser)
  }

  const handleVoucherBalanceUpdate = async (operation: "add" | "deduct") => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user first",
        variant: "destructive",
      })
      return
    }

    if (creditAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    if (operation === "deduct") {
      const currentBalance = (selectedUser[voucherType as keyof User] as number) || 0
      if (currentBalance < creditAmount) {
        toast({
          title: "Error",
          description: "User does not have enough vouchers to deduct",
          variant: "destructive",
        })
        return
      }
    }

    if (isUpdatingBalance) {
      return
    }

    setIsUpdatingBalance(true)

    try {
      const response = await fetch(`/api/users/${selectedUser._id}/update-balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field: voucherType,
          amount: creditAmount,
          operation,
          description: `${operation === "add" ? "Added" : "Deducted"} ${creditAmount} ${voucherType}`,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const updatedUser = result.data
        syncUpdatedUserState(updatedUser)

        toast({
          title: "Balance updated",
          description: `${operation === "add" ? "Added" : "Deducted"} ${creditAmount} ${getVoucherTypeLabel(voucherType)} ${operation === "add" ? "to" : "from"} ${selectedUser.name}'s account`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update balance",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating balance:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingBalance(false)
    }
  }

  const confirmAddCredits = async () => {
    if (!selectedUser) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/users/${selectedUser._id}/update-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          field: 'credits',
          amount: creditAmount,
          operation: 'add',
          description: `Admin added ${creditAmount} credits`
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        const updatedUser = data.data
        toast({
          title: "Credits added",
          description: `Added ${creditAmount} credits to ${selectedUser.name}`,
        })
        
        const updatedUsers = users.map(user =>
          user._id === selectedUser._id ? updatedUser : user
        )
        
        setUsers(updatedUsers)
        setFilteredUsers(filteredUsers.map(user =>
          user._id === selectedUser._id ? updatedUser : user
        ))
        setSelectedUser(updatedUser)

        if (activeTab === "credits") {
          fetchTransactions()
        }
        
        // Send notification to user about added credits
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notificationType: NotificationType.CREDITS_ADDED,
              userId: selectedUser._id,
              transactionId: data.meta?.transaction?.transactionId,
              amount: creditAmount
            }),
          });
        } catch (notificationError) {
          console.error('Error sending credit notification:', notificationError);
          // Continue even if notification fails
        }
        
        setAddCreditsOpen(false)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add credits",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error adding credits:', error)
      toast({
        title: "Error",
        description: "An error occurred while adding credits",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle delete user button click
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setDeleteUserOpen(true)
  }
  
  // Confirm delete user
  const confirmDeleteUser = async () => {
    if (!selectedUser) return
    
    try {
      const success = await deleteUserById(selectedUser._id)
      
      if (success) {
        toast({
          title: "User deleted",
          description: `${selectedUser.name}'s account has been successfully deleted.`,
        })
        
        // Close the dialog
        setDeleteUserOpen(false)
        
        // Refresh the users list
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
    } finally {
    }
  }

  // Confirm deduct credits
  const confirmDeductCredits = async () => {
    if (!selectedUser) return
    
    try {
      const response = await fetch(`/api/users/${selectedUser._id}/update-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          field: 'credits',
          amount: deductAmount,
          operation: 'deduct',
          description: deductDescription
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const updatedUser = result.data
        // Update local state
        setUsers(users.map(user => 
          user._id === selectedUser._id 
            ? updatedUser
            : user
        ));
        
        // Also update filtered users if needed
        setFilteredUsers(filteredUsers.map(user => 
          user._id === selectedUser._id 
            ? updatedUser
            : user
        ));
        setSelectedUser(updatedUser)
        
        // Refresh transactions list if in Credits tab
        if (activeTab === "credits") {
          fetchTransactions();
        }
        
        toast({
          title: "Credits deducted",
          description: `Deducted ${deductAmount} credits from ${selectedUser.userID}'s account`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to deduct credits',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast({
        title: "Error",
        description: 'An unexpected error occurred while deducting credits',
        variant: "destructive",
      });
    } finally {
      setDeductCreditsOpen(false);
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
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <AdminTabPanel panelKey="dashboard">
                <AdminDashboardEnhanced />
              </AdminTabPanel>
            )}

            {activeTab === "users" && (
              <AdminTabPanel panelKey="users" className="space-y-6">
                <AdminUsersTab
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
                  onRefresh={() => {
                    void fetchUsers(usersPagination.page, usersPagination.limit)
                    void fetchTotalUsersStats()
                  }}
                  onExportUsers={() => {
                    void handleExportUsers()
                  }}
                  onSearch={handleUserSearch}
                  onResetSearch={resetUserSearch}
                  onPaginate={handleUserPagination}
                  onViewUser={handleViewUser}
                  onDeleteUser={handleDeleteUser}
                  onChangePageSize={(newLimit) => {
                    setUsersPagination((prev) => ({
                      ...prev,
                      limit: newLimit,
                      page: 1,
                    }))
                    void fetchUsers(1, newLimit)
                  }}
                />
              </AdminTabPanel>
            )}

            {activeTab === "daily-delivery" && (
              <AdminTabPanel panelKey="daily-delivery" className="space-y-6">
                <DailyDeliveryManagement />
              </AdminTabPanel>
            )}

            {activeTab === "weekly-subscription" && (
              <AdminTabPanel panelKey="weekly-subscription" className="space-y-6">
                <WeeklySubscriptionManagement />
              </AdminTabPanel>
            )}

            {activeTab === "next-week-menu-email" && (
              <AdminTabPanel panelKey="next-week-menu-email" className="space-y-6">
                <NextWeekMenuEmail />
              </AdminTabPanel>
            )}

            {activeTab === "credits" && (
              <AdminTabPanel panelKey="credits" className="space-y-6">
                <AdminCreditsTab
                  users={users}
                  usersLoading={usersLoading}
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
                  onAddBalance={() => handleVoucherBalanceUpdate("add")}
                  onDeductBalance={() => handleVoucherBalanceUpdate("deduct")}
                  onTransactionPagination={handleTransactionPagination}
                  onChangeTransactionsPageSize={changeTransactionsPageSize}
                />
              </AdminTabPanel>
            )}

            {activeTab === "meal-vouchers" && (
              <AdminTabPanel panelKey="meal-vouchers">
                <MealVoucherManagement />
              </AdminTabPanel>
            )}

            {activeTab === "promo-codes" && (
              <AdminTabPanel panelKey="promo-codes" className="space-y-6">
                <PromoCodeManagement />
              </AdminTabPanel>
            )}

            {activeTab === "view-all-orders" && (
              <AdminTabPanel panelKey="view-all-orders">
                <ViewAllOrders />
              </AdminTabPanel>
            )}

            {activeTab === "view-weekly-orders" && (
              <AdminTabPanel panelKey="view-weekly-orders">
                <ViewWeeklyOrders />
              </AdminTabPanel>
            )}

            {activeTab === "credit-requests" && (
              <AdminTabPanel panelKey="credit-requests" className="space-y-6">
                <AdminCreditRequestsTab
                  creditRequestsLoading={creditRequestsLoading}
                  creditRequests={creditRequests}
                  creditRequestsPagination={creditRequestsPagination}
                  isExportingCreditRequests={isExportingCreditRequests}
                  creditRequestsDateRange={creditRequestsDateRange}
                  onApplyDateRange={applyCreditRequestsDateRange}
                  onClearDateRange={clearCreditRequestsDateRange}
                  onExport={exportCreditRequestsToCSV}
                  onRefresh={refreshCreditRequests}
                  onViewRequest={handleViewRequest}
                  onApproveRequest={handleApproveRequest}
                  onDeclineRequest={handleDeclineRequest}
                  onPaginate={handleCreditRequestPagination}
                  onChangePageSize={changeCreditRequestsPageSize}
                />
              </AdminTabPanel>
            )}

            {activeTab === "meal-feedback" && (
              <AdminTabPanel panelKey="meal-feedback">
                <MealFeedbackManagement />
              </AdminTabPanel>
            )}

            {activeTab === "rating-dishes" && (
              <AdminTabPanel panelKey="rating-dishes">
                <RatingDishManagement />
              </AdminTabPanel>
            )}

            {activeTab === "settings" && (
              <AdminTabPanel panelKey="settings">
                <SettingsManagement />
              </AdminTabPanel>
            )}
          </AnimatePresence>
      

      <AddCreditsDialog
        open={addCreditsOpen}
        user={selectedUser}
        creditAmount={creditAmount}
        onOpenChange={setAddCreditsOpen}
        onCreditAmountChange={setCreditAmount}
        onConfirm={confirmAddCredits}
      />

      {/* View User Dialog */}
      <ViewUserDialog
        open={viewUserOpen}
        user={selectedUser}
        onOpenChange={setViewUserOpen}
      />

      <CreditRequestDialogs
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
        onHandleApproveRequest={handleApproveRequest}
        onHandleDeclineRequest={handleDeclineRequest}
        onConfirmApproveRequest={confirmApproveRequest}
        onConfirmDeclineRequest={confirmDeclineRequest}
      />

      <DeductCreditsDialog
        open={deductCreditsOpen}
        user={selectedUser}
        deductAmount={deductAmount}
        deductDescription={deductDescription}
        onOpenChange={setDeductCreditsOpen}
        onDeductAmountChange={setDeductAmount}
        onDeductDescriptionChange={setDeductDescription}
        onConfirm={confirmDeductCredits}
      />

      {/* Delete User Dialog */}
      <DeleteUserDialog
        open={deleteUserOpen}
        user={selectedUser}
        isDeleting={isDeletingUser}
        onOpenChange={setDeleteUserOpen}
        onConfirm={confirmDeleteUser}
      />
    </AdminShell>
  )
}

