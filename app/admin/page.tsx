'use client'

import dynamic from "next/dynamic"
import { CardFooter } from "@/components/ui/card"
import { CardContent } from "@/components/ui/card"
import { CardDescription } from "@/components/ui/card"
import { CardTitle } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, LogOut, Settings, ShoppingCart, Users, Calendar as CalendarIcon, BarChart, DollarSign, Eye, Truck, Gift, Loader2, Menu, Package, Mail, Tag, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { performClientLogout } from "@/lib/client-logout"
import { useClientAuth } from "@/lib/client-auth"
const AdminDashboardEnhanced = dynamic(
  () => import("@/components/admin-dashboard-enhanced").then((m) => ({ default: m.AdminDashboardEnhanced })),
  { loading: () => <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> }
)
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
  
  // Define sidebar menu items with groups and submenus
  const sidebarMenuItems = [
    // { id: "dashboard", label: "Dashboard", icon: <BarChart className="h-4 w-4" /> },
    { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { 
      id: "food-management-group", 
      label: "Food Management", 
      icon: <CalendarIcon className="h-4 w-4" />,
      isHeading: true,
      children: [
        { id: "daily-delivery", label: "Daily Delivery", icon: <Truck className="h-4 w-4" /> },
        { id: "weekly-subscription", label: "Weekly Delivery", icon: <Gift className="h-4 w-4" /> },
        { id: "next-week-menu-email", label: "Next Week Menu Update Email", icon: <Mail className="h-4 w-4" /> }
      ]
    },
    { 
      id: "credit-request-group", 
      label: "Credit Request", 
      icon: <CreditCard className="h-4 w-4" />,
      isHeading: true,
      children: [
        { id: "credit-requests", label: "Weekly Request", icon: <DollarSign className="h-4 w-4" /> },
        { id: "promo-codes", label: "Promo Codes", icon: <Tag className="h-4 w-4" /> },
        { id: "meal-vouchers", label: "2Dish 3Dish Voucher", icon: <CreditCard className="h-4 w-4" /> },
        { id: "credits", label: "Manual +/- credit", icon: <CreditCard className="h-4 w-4" /> }
      ]
    },
    { 
      id: "orders-group", 
      label: "Orders", 
      icon: <ShoppingCart className="h-4 w-4" />,
      isHeading: true,
      children: [
        { id: "view-all-orders", label: "View Daily Delivery Orders", icon: <Eye className="h-4 w-4" /> },
        { id: "view-weekly-orders", label: "View Weekly Orders", icon: <CalendarIcon className="h-4 w-4" /> }
      ]
    },
    { 
      id: "meal-ratings-group", 
      label: "Meal Ratings", 
      icon: <Star className="h-4 w-4" />,
      isHeading: true,
      children: [
        { id: "meal-feedback", label: "Feedback", icon: <Star className="h-4 w-4" /> },
        { id: "rating-dishes", label: "Rating Setup", icon: <Package className="h-4 w-4" /> }
      ]
    },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ]
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
    setSelectedRequest,
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(320px,90vw)] flex flex-col overflow-hidden">
                <SheetHeader className="flex-shrink-0">
                  <SheetTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-6 w-6" />
                    <span>Kapioo Admin</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 [-webkit-overflow-scrolling:touch]">
                  {sidebarMenuItems.map((item) => (
                    <div key={item.id}>
                      {item.isHeading ? (
                        <div className="px-3 py-2 text-sm font-medium flex items-center gap-2 min-w-0">
                          {item.icon}
                          <span className="ml-2 min-w-0 flex-1 break-words text-left">{item.label}</span>
                        </div>
                      ) : (
                        <Button
                          variant={activeTab === item.id ? "default" : "ghost"}
                          className="justify-start w-full whitespace-normal text-left min-w-0"
                          onClick={() => {
                            setActiveTab(item.id)
                            setMobileMenuOpen(false)
                          }}
                        >
                          {item.icon}
                          <span className="ml-2 min-w-0 flex-1 break-words">{item.label}</span>
                        </Button>
                      )}
                      
                      {/* Render children if they exist */}
                      {item.children && item.children.length > 0 && (
                        <div className="pl-6 mt-1 border-l-2 border-muted ml-2 min-w-0">
                          {item.children.map((child) => (
                            <Button
                              key={child.id}
                              variant={activeTab === child.id ? "default" : "ghost"}
                              className="justify-start w-full text-sm whitespace-normal text-left min-w-0"
                              onClick={() => {
                                setActiveTab(child.id)
                                setMobileMenuOpen(false)
                              }}
                            >
                              {child.icon}
                              <span className="ml-2 min-w-0 flex-1 break-words">{child.label}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            
            <ShoppingCart className="h-6 w-6" />
            <span className="font-bold text-xl">Kapioo Admin</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-100"
              onClick={async () => {
                await performClientLogout()
                toast({
                  title: "Logged out",
                  description: "You have been logged out successfully",
                })
                router.push("/login")
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <div className="container grid flex-1 gap-12 md:grid-cols-[240px_1fr] pt-6">
        <aside className="hidden w-[240px] flex-col md:flex">
          <motion.nav
            className="grid items-start gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {sidebarMenuItems.map((item) => (
              <div key={item.id}>
                {item.isHeading ? (
                  <div className="px-3 py-2 text-xs font-medium flex items-center gap-2">
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </div>
                ) : (
                  <Button
                    variant={activeTab === item.id ? "default" : "ghost"}
                    className="justify-start w-full h-auto py-2 px-3"
                    onClick={() => setActiveTab(item.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {item.icon}
                      <span className="text-xs leading-tight text-left flex-1">{item.label}</span>
                    </div>
                  </Button>
                )}
                
                {/* Render children if they exist */}
                {item.children && item.children.length > 0 && (
                  <div className="pl-4 mt-1 border-l-2 border-muted ml-2 space-y-1">
                    {item.children.map((child) => (
                      <Button
                        key={child.id}
                        variant={activeTab === child.id ? "default" : "ghost"}
                        className="justify-start w-full h-auto py-2 px-2 text-xs"
                        onClick={() => setActiveTab(child.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {child.icon}
                          <span className="text-xs leading-tight text-left flex-1">{child.label}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </motion.nav>
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AdminDashboardEnhanced />
              </motion.div>
            )}

            {activeTab === "users" && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
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
              </motion.div>
            )}

            {activeTab === "daily-delivery" && (
              <motion.div
                key="daily-delivery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <DailyDeliveryManagement />
              </motion.div>
            )}
            
            {activeTab === "weekly-subscription" && (
              <motion.div
                key="weekly-subscription"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <WeeklySubscriptionManagement />
              </motion.div>
            )}

            {activeTab === "next-week-menu-email" && (
              <motion.div
                key="next-week-menu-email"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <NextWeekMenuEmail />
              </motion.div>
            )}

            {activeTab === "credits" && (
              <motion.div
                key="credits"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
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
              </motion.div>
            )}

            {activeTab === "meal-vouchers" && (
              <motion.div
                key="meal-vouchers"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MealVoucherManagement />
              </motion.div>
            )}

            {activeTab === "promo-codes" && (
              <motion.div
                key="promo-codes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <PromoCodeManagement />
              </motion.div>
            )}
            
            {activeTab === "view-all-orders" && (
              <motion.div
                key="view-all-orders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ViewAllOrders />
              </motion.div>
            )}
            
            {activeTab === "view-weekly-orders" && (
              <motion.div
                key="view-weekly-orders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ViewWeeklyOrders />
              </motion.div>
            )}

            {activeTab === "credit-requests" && (
              <motion.div
                key="credit-requests"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
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
              </motion.div>
            )}

            {activeTab === "meal-feedback" && (
              <motion.div
                key="meal-feedback"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MealFeedbackManagement />
              </motion.div>
            )}

            {activeTab === "rating-dishes" && (
              <motion.div
                key="rating-dishes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RatingDishManagement />
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SettingsManagement />
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

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
    </div>
  )
}

