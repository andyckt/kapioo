'use client'

import dynamic from "next/dynamic"
import { Label } from "@/components/ui/label"
import { CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CardContent } from "@/components/ui/card"
import { CardDescription } from "@/components/ui/card"
import { CardTitle } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, LogOut, Settings, ShoppingCart, Users, Calendar as CalendarIcon, BarChart, Check, ChevronsUpDown, Search, RefreshCcw, Download, DollarSign, X, ExternalLink, Eye, Truck, Gift, CheckCircle2, Loader2, FileSpreadsheet, CalendarDays, Menu, Package, CheckCircle, Mail, Tag, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { performClientLogout } from "@/lib/client-logout"
import { useClientAuth } from "@/lib/client-auth"
const AdminDashboardEnhanced = dynamic(
  () => import("@/components/admin-dashboard-enhanced").then((m) => ({ default: m.AdminDashboardEnhanced })),
  { loading: () => <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> }
)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { NotificationType } from '@/lib/services/notifications';
import type { CreditRequest } from "@/lib/types/admin"
import {
  AdminUsersTab,
  DeleteUserDialog,
  useAdminUsers,
  ViewUserDialog,
} from "@/features/admin-users"
import { useAdminTransactions } from "@/features/admin-credits"
import { useAdminCreditRequests } from "@/features/admin-credit-requests"
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

function getCreditRequestUserInfo(request?: CreditRequest | null) {
  const user = request?.userId

  if (user && typeof user !== "string") {
    return {
      id: user._id || "Unknown",
      name: user.name || user.userID || "Unknown User",
      email: user.email || "",
    }
  }

  return {
    id: typeof user === "string" ? user : "Unknown",
    name: "Unknown User",
    email: "",
  }
}

function getCreditRequestAmount(request?: CreditRequest | null) {
  return Number(request?.amount ?? 0)
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
    setTransactionsPagination,
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
    fetchCreditRequests,
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
  const selectedRequestUser = getCreditRequestUserInfo(selectedRequest)
  const selectedRequestAmount = getCreditRequestAmount(selectedRequest)

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

  const handleAddCredits = (user: User) => {
    // Find the most up-to-date user data from the array
    const currentUser = users.find(u => u._id === user._id) || user;
    setSelectedUser(currentUser);
    setCreditAmount(10); // Reset to default
    setAddCreditsOpen(true);
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setViewUserOpen(true)
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

  // Handle deduct credits button click
  const handleDeductCredits = (user: User) => {
    setSelectedUser(user)
    setDeductAmount(1) // Reset to default
    setDeductDescription("Admin deduction") // Reset to default
    setDeductCreditsOpen(true)
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
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">Manual Credit Management</h2>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Manage User Balance</CardTitle>
                    <CardDescription>Manually add or deduct credits and vouchers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Step 1: Select User */}
                      <div className="space-y-2">
                        <Label htmlFor="user-select">Step 1: Select User</Label>
                        {usersLoading ? (
                          <div className="flex items-center space-x-2 h-10 px-3 rounded-md border border-input">
                            <span className="text-muted-foreground">Loading users...</span>
                            <div className="animate-pulse w-3 h-3 rounded-full bg-muted"></div>
                          </div>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {selectedUser ? (
                                  `${selectedUser.name} (${selectedUser.userID})`
                                ) : (
                                  "Search for a user..."
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-full min-w-[300px]">
                              <Command>
                                <CommandInput 
                                  placeholder="Search users..." 
                                  className="h-9" 
                                  onValueChange={(value) => {
                                    if (value.trim().length >= 2) {
                                      searchUsers(value);
                                    }
                                  }}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {searchLoading ? 'Searching...' : 'No users found.'}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {searchLoading ? (
                                      <div className="flex items-center justify-center py-6">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                      </div>
                                    ) : (
                                      (searchResults.length > 0 ? searchResults : users).map((user) => (
                                        <CommandItem
                                          key={user._id}
                                          value={`${user.name} ${user.userID} ${user.email}`}
                                          onSelect={() => {
                                            setSelectedUser(user);
                                            // Reset service and voucher type when selecting a new user
                                            setServiceType("daily");
                                            setVoucherType("twoDishVoucher");
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              selectedUser?._id === user._id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <div className="flex flex-col">
                                            <span>{user.name}</span>
                                            <span className="text-xs text-muted-foreground">{user.userID} - {user.email}</span>
                                          </div>
                                        </CommandItem>
                                      ))
                                    )}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      
                      {selectedUser && (
                        <>
                          {/* Step 2: Select Service Type */}
                          <div className="space-y-2">
                            <Label>Step 2: Select Service Type</Label>
                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                              <Button 
                                variant={serviceType === "daily" ? "default" : "outline"}
                                onClick={() => {
                                  setServiceType("daily");
                                  setVoucherType("twoDishVoucher");
                                }}
                                className="w-full h-10 text-sm"
                              >
                                Daily Delivery
                              </Button>
                              <Button 
                                variant={serviceType === "weekly" ? "default" : "outline"}
                                onClick={() => {
                                  setServiceType("weekly");
                                  setVoucherType("weeklySIXmeals");
                                }}
                                className="w-full h-10 text-sm"
                              >
                                Weekly Meal Box
                              </Button>
                            </div>
                          </div>
                          
                          {/* Step 3: Select Voucher Type (if applicable) */}
                          {serviceType === "daily" && (
                            <div className="space-y-2">
                              <Label>Step 3: Select Voucher Type</Label>
                              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                <Button 
                                  variant={voucherType === "twoDishVoucher" ? "default" : "outline"}
                                  onClick={() => setVoucherType("twoDishVoucher")}
                                  className="w-full h-10 text-sm"
                                >
                                  2-Dish Voucher
                                </Button>
                                <Button 
                                  variant={voucherType === "threeDishVoucher" ? "default" : "outline"}
                                  onClick={() => setVoucherType("threeDishVoucher")}
                                  className="w-full h-10 text-sm"
                                >
                                  3-Dish Voucher
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {serviceType === "weekly" && (
                            <div className="space-y-2">
                              <Label>Step 3: Select Meal Plan</Label>
                              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                <Button 
                                  variant={voucherType === "weeklySIXmeals" ? "default" : "outline"}
                                  onClick={() => setVoucherType("weeklySIXmeals")}
                                  className="w-full h-10 text-sm"
                                >
                                  6 Meals/Week
                                </Button>
                                <Button 
                                  variant={voucherType === "weeklyEIGHTmeals" ? "default" : "outline"}
                                  onClick={() => setVoucherType("weeklyEIGHTmeals")}
                                  className="w-full h-10 text-sm"
                                >
                                  8 Meals/Week
                                </Button>
                                <Button 
                                  variant={voucherType === "weeklyTENmeals" ? "default" : "outline"}
                                  onClick={() => setVoucherType("weeklyTENmeals")}
                                  className="w-full h-10 text-sm"
                                >
                                  10 Meals/Week
                                </Button>
                                <Button 
                                  variant={voucherType === "weeklyTWELVEmeals" ? "default" : "outline"}
                                  onClick={() => setVoucherType("weeklyTWELVEmeals")}
                                  className="w-full h-10 text-sm"
                                >
                                  12 Meals/Week
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Step 4: Enter Amount */}
                          <div className="space-y-2">
                            <Label htmlFor="amount">
                              Step 4: Enter Amount
                            </Label>
                            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-4">
                              <Input 
                                id="amount" 
                                type="number" 
                                min="1"
                                defaultValue="10" 
                                onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                                className="h-10"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  className="w-full h-10"
                                  onClick={async () => {
                                    if (!selectedUser) {
                                      toast({
                                        title: "Error",
                                        description: "Please select a user first",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    if (creditAmount <= 0) {
                                      toast({
                                        title: "Error",
                                        description: "Please enter a valid amount",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    // Prevent double submission
                                    if (isUpdatingBalance) {
                                      return;
                                    }
                                    
                                    setIsUpdatingBalance(true);
                                    
                                    try {
                                      let response;
                                      let fieldToUpdate = voucherType;
                                      let endpoint = `/api/users/${selectedUser._id}/update-balance`;
                                      
                                      response = await fetch(endpoint, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                          field: fieldToUpdate,
                                          amount: creditAmount,
                                          operation: "add",
                                          description: `Added ${creditAmount} ${fieldToUpdate}`
                                        })
                                      });
                                      
                                      const result = await response.json();
                                      
                                      if (result.success) {
                                        // Update user data
                                        const updatedUser = result.data;
                                        
                                        // Update all users list
                                        const updatedUsers = users.map(user => 
                                          user._id === selectedUser._id ? updatedUser : user
                                        );
                                        setUsers(updatedUsers);
                                        
                                        // Update filtered users list
                                        setFilteredUsers(filteredUsers.map(user => 
                                          user._id === selectedUser._id ? updatedUser : user
                                        ));
                                        
                                        // Update selectedUser
                                        setSelectedUser(updatedUser);
                                        
                                        // No need to refresh transactions as we're not handling credits
                                        
                                        toast({
                                          title: "Balance updated",
                                          description: `Added ${creditAmount} ${
                                                      fieldToUpdate === "twoDishVoucher" ? "2-Dish vouchers" : 
                                                      fieldToUpdate === "threeDishVoucher" ? "3-Dish vouchers" : 
                                                      fieldToUpdate === "weeklySIXmeals" ? "6-meal vouchers" :
                                                      fieldToUpdate === "weeklyEIGHTmeals" ? "8-meal vouchers" :
                                                      fieldToUpdate === "weeklyTENmeals" ? "10-meal vouchers" :
                                                      "12-meal vouchers"} to ${selectedUser.name}'s account`,
                                        });
                                      } else {
                                        toast({
                                          title: "Error",
                                          description: result.error || "Failed to update balance",
                                          variant: "destructive"
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error updating balance:', error);
                                      toast({
                                        title: "Error",
                                        description: "An unexpected error occurred",
                                        variant: "destructive"
                                      });
                                    } finally {
                                      setIsUpdatingBalance(false);
                                    }
                                  }}
                                  disabled={!selectedUser || creditAmount <= 0 || !voucherType || isUpdatingBalance}
                                >
                                  {isUpdatingBalance ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Adding...
                                    </>
                                  ) : (
                                    'Add'
                                  )}
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="w-full h-10"
                                  onClick={async () => {
                                    if (!selectedUser) {
                                      toast({
                                        title: "Error",
                                        description: "Please select a user first",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    if (creditAmount <= 0) {
                                      toast({
                                        title: "Error",
                                        description: "Please enter a valid amount",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    // Check if user has enough balance to deduct
                                    const fieldToCheck = voucherType;
                                    const currentBalance = selectedUser[fieldToCheck as keyof User] as number || 0;
                                    if (currentBalance < creditAmount) {
                                      toast({
                                        title: "Error",
                                        description: `User does not have enough vouchers to deduct`,
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    // Prevent double submission
                                    if (isUpdatingBalance) {
                                      return;
                                    }
                                    
                                    setIsUpdatingBalance(true);
                                    
                                    try {
                                      let response;
                                      let fieldToUpdate = voucherType;
                                      let endpoint = `/api/users/${selectedUser._id}/update-balance`;
                                      
                                      response = await fetch(endpoint, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                          field: fieldToUpdate,
                                          amount: creditAmount,
                                          operation: "deduct",
                                          description: `Deducted ${creditAmount} ${fieldToUpdate}`
                                        })
                                      });
                                      
                                      const result = await response.json();
                                      
                                      if (result.success) {
                                        // Update user data
                                        const updatedUser = result.data;
                                        
                                        // Update all users list
                                        const updatedUsers = users.map(user => 
                                          user._id === selectedUser._id ? updatedUser : user
                                        );
                                        setUsers(updatedUsers);
                                        
                                        // Update filtered users list
                                        setFilteredUsers(filteredUsers.map(user => 
                                          user._id === selectedUser._id ? updatedUser : user
                                        ));
                                        
                                        // Update selectedUser
                                        setSelectedUser(updatedUser);
                                        
                                        // No need to refresh transactions as we're not handling credits
                                        
                                        toast({
                                          title: "Balance updated",
                                          description: `Deducted ${creditAmount} ${
                                                      fieldToUpdate === "twoDishVoucher" ? "2-Dish vouchers" : 
                                                      fieldToUpdate === "threeDishVoucher" ? "3-Dish vouchers" : 
                                                      fieldToUpdate === "weeklySIXmeals" ? "6-meal vouchers" :
                                                      fieldToUpdate === "weeklyEIGHTmeals" ? "8-meal vouchers" :
                                                      fieldToUpdate === "weeklyTENmeals" ? "10-meal vouchers" :
                                                      "12-meal vouchers"} from ${selectedUser.name}'s account`,
                                        });
                                      } else {
                                        toast({
                                          title: "Error",
                                          description: result.error || "Failed to update balance",
                                          variant: "destructive"
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error updating balance:', error);
                                      toast({
                                        title: "Error",
                                        description: "An unexpected error occurred",
                                        variant: "destructive"
                                      });
                                    } finally {
                                      setIsUpdatingBalance(false);
                                    }
                                  }}
                                  disabled={!selectedUser || creditAmount <= 0 || !voucherType || isUpdatingBalance}
                                >
                                  {isUpdatingBalance ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deducting...
                                    </>
                                  ) : (
                                    'Deduct'
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* User Information */}
                      {selectedUser && (
                        <div className="mt-4 p-3 sm:p-4 bg-muted rounded-md">
                          <h3 className="font-medium text-base sm:text-lg mb-2">User Balance:</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                            <div className="p-2 bg-background rounded border">
                              <p className="text-xs sm:text-sm text-muted-foreground">2-Dish</p>
                              <p className="font-medium text-base sm:text-lg">{selectedUser.twoDishVoucher || 0}</p>
                            </div>
                            
                            <div className="p-2 bg-background rounded border">
                              <p className="text-xs sm:text-sm text-muted-foreground">3-Dish</p>
                              <p className="font-medium text-base sm:text-lg">{selectedUser.threeDishVoucher || 0}</p>
                            </div>
                            
                            <div className="p-2 bg-background rounded border">
                              <p className="text-xs sm:text-sm text-muted-foreground">6-Meal</p>
                              <p className="font-medium text-base sm:text-lg">{selectedUser.weeklySIXmeals || 0}</p>
                            </div>
                            
                            <div className="p-2 bg-background rounded border">
                              <p className="text-xs sm:text-sm text-muted-foreground">8-Meal</p>
                              <p className="font-medium text-base sm:text-lg">{(selectedUser as any).weeklyEIGHTmeals || 0}</p>
                            </div>
                            
                            <div className="p-2 bg-background rounded border">
                              <p className="text-xs sm:text-sm text-muted-foreground">10-Meal</p>
                              <p className="font-medium text-base sm:text-lg">{selectedUser.weeklyTENmeals || 0}</p>
                            </div>
                            
                            <div className="p-2 bg-background rounded border">
                              <p className="text-xs sm:text-sm text-muted-foreground">12-Meal</p>
                              <p className="font-medium text-base sm:text-lg">{(selectedUser as any).weeklyTWELVEmeals || 0}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>All Transactions</CardTitle>
                    <CardDescription>Recent transactions (credits and vouchers)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4 font-medium">Transaction ID</th>
                            <th className="text-left p-4 font-medium">User</th>
                            <th className="text-left p-4 font-medium">Type</th>
                            <th className="text-left p-4 font-medium">Amount</th>
                            <th className="text-left p-4 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactionsLoading ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              </td>
                            </tr>
                          ) : transactions.length > 0 ? (
                            transactions.map((transaction) => {
                              // Find user for this transaction
                              const userForTransaction = users.find(u => u._id === transaction.userId);
                              
                              const displayUser = usersLoading ? (
                                <div className="flex items-center">
                                  <span className="text-muted-foreground">Loading...</span>
                                  <div className="ml-2 animate-pulse w-3 h-3 rounded-full bg-muted"></div>
                                </div>
                              ) : userForTransaction ? (
                                <span>{userForTransaction.name || userForTransaction.userID}</span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {transaction.userId?.toString().substring(0, 8)}...
                                </span>
                              );
                              
                              return (
                                <tr key={transaction._id} className="border-b">
                                  <td className="p-4">{transaction.transactionId || `Legacy-${transaction._id.toString().substring(0, 6)}`}</td>
                                  <td className="p-4">{displayUser}</td>
                                  <td className="p-4">{transaction.type === 'credit' ? 'Add' : transaction.type === 'debit' ? 'Deduct' : 
                                   transaction.type === 'refund' ? 'Refund' : 
                                   transaction.type}</td>
                                  <td className="p-4">
                                    <span className={
                                      transaction.type === 'Add' || transaction.type === 'credit' || transaction.type === 'refund'
                                        ? "text-green-600" 
                                        : "text-red-600"
                                    }>
                                      {transaction.type === 'Add' || transaction.type === 'credit' || transaction.type === 'refund'
                                        ? '+' 
                                        : '-'
                                      }{transaction.amount}
                                      {transaction.description ? (
                                        // Handle different transaction description formats
                                        transaction.description.includes('2dish') ? '/2dish' :
                                        transaction.description.includes('3dish') ? '/3dish' :
                                        transaction.description.includes('6weekly') ? '/6weekly' :
                                        transaction.description.includes('8weekly') ? '/8weekly' :
                                        transaction.description.includes('10weekly') ? '/10weekly' :
                                        transaction.description.includes('12weekly') ? '/12weekly' :
                                        transaction.description.includes('twoDishVoucher') ? '/2dish' :
                                        transaction.description.includes('threeDishVoucher') ? '/3dish' :
                                        transaction.description.includes('weeklySIXmeals') ? '/6weekly' :
                                        transaction.description.includes('weeklyEIGHTmeals') ? '/8weekly' :
                                        transaction.description.includes('weeklyTENmeals') ? '/10weekly' :
                                        transaction.description.includes('weeklyTWELVEmeals') ? '/12weekly' :
                                        ''
                                      ) : ''}
                                    </span>
                                  </td>
                                  <td className="p-4">{new Date(transaction.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                No transactions found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden grid grid-cols-1 gap-3">
                      {transactionsLoading ? (
                        <Card className="p-8">
                          <div className="flex justify-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        </Card>
                      ) : transactions.length > 0 ? (
                        transactions.map((transaction) => {
                          // Find user for this transaction
                          const userForTransaction = users.find(u => u._id === transaction.userId);
                          
                          const displayUser = usersLoading ? (
                            <span className="text-muted-foreground text-xs">Loading...</span>
                          ) : userForTransaction ? (
                            <span className="text-sm font-medium">{userForTransaction.name || userForTransaction.userID}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {transaction.userId?.toString().substring(0, 8)}...
                            </span>
                          );

                          const transactionType = transaction.type === 'credit' ? 'Add' : transaction.type === 'debit' ? 'Deduct' : 
                            transaction.type === 'refund' ? 'Refund' : transaction.type;
                          
                          const isPositive = transaction.type === 'Add' || transaction.type === 'credit' || transaction.type === 'refund';
                          
                          const voucherType = transaction.description ? (
                            transaction.description.includes('2dish') || transaction.description.includes('twoDishVoucher') ? '2-Dish' :
                            transaction.description.includes('3dish') || transaction.description.includes('threeDishVoucher') ? '3-Dish' :
                            transaction.description.includes('6weekly') || transaction.description.includes('weeklySIXmeals') ? '6-Meal' :
                            transaction.description.includes('8weekly') || transaction.description.includes('weeklyEIGHTmeals') ? '8-Meal' :
                            transaction.description.includes('10weekly') || transaction.description.includes('weeklyTENmeals') ? '10-Meal' :
                            transaction.description.includes('12weekly') || transaction.description.includes('weeklyTWELVEmeals') ? '12-Meal' :
                            ''
                          ) : '';
                          
                          return (
                            <Card key={transaction._id} className={`border-l-4 ${isPositive ? 'border-green-500' : 'border-red-500'}`}>
                              <CardHeader className="pb-2 pt-3 px-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-sm font-semibold truncate">
                                      {displayUser}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {transaction.transactionId || `Legacy-${transaction._id.toString().substring(0, 6)}`}
                                    </p>
                                  </div>
                                  <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
                                    {transactionType}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-2 pb-3 px-3">
                                {/* Amount */}
                                <div className="flex items-center justify-between py-2 border-y">
                                  <span className="text-xs text-muted-foreground">Amount</span>
                                  <span className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? '+' : '-'}{transaction.amount}
                                    {voucherType && <span className="text-xs ml-1">({voucherType})</span>}
                                  </span>
                                </div>

                                {/* Date */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Date</span>
                                  <span>{new Date(transaction.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}</span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      ) : (
                        <Card className="p-8">
                          <p className="text-center text-muted-foreground">
                            No transactions found
                          </p>
                        </Card>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
                      <div className="flex items-center justify-center sm:justify-start space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleTransactionPagination('prev')}
                          disabled={transactionsPagination.page === 1 || transactionsLoading}
                          className="flex-1 sm:flex-none"
                        >
                          Previous
                        </Button>
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          Page {transactionsPagination.page} of {transactionsPagination.pages}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleTransactionPagination('next')}
                          disabled={transactionsPagination.page === transactionsPagination.pages || transactionsLoading}
                          className="flex-1 sm:flex-none"
                        >
                          Next
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-center sm:justify-end space-x-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select
                          value={transactionsPagination.limit.toString()}
                          onValueChange={(value) => {
                            changeTransactionsPageSize(parseInt(value, 10));
                          }}
                        >
                          <SelectTrigger className="h-8 w-[80px]">
                            <SelectValue placeholder={transactionsPagination.limit.toString()} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
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
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Weekly Purchase Requests</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 flex-1 sm:flex-none">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1"
                          >
                            <CalendarDays className="h-4 w-4" />
                            {creditRequestsDateRange.startDate ? (
                              creditRequestsDateRange.endDate ? (
                                <>
                                  {format(creditRequestsDateRange.startDate, 'MMM d')} - {format(creditRequestsDateRange.endDate, 'MMM d')}
                                </>
                              ) : (
                                format(creditRequestsDateRange.startDate, 'MMM d')
                              )
                            ) : (
                              "Date Range"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="range"
                            selected={{
                              from: creditRequestsDateRange.startDate,
                              to: creditRequestsDateRange.endDate,
                            }}
                            onSelect={(range?: { from?: Date; to?: Date }) => {
                              applyCreditRequestsDateRange({
                                startDate: range?.from,
                                endDate: range?.to,
                              })
                            }}
                            numberOfMonths={2}
                            className="rounded-md border"
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          clearCreditRequestsDateRange()
                        }}
                        className="h-9 flex-1 sm:flex-none"
                        disabled={!creditRequestsDateRange.startDate && !creditRequestsDateRange.endDate}
                      >
                        Clear
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void exportCreditRequestsToCSV()
                      }}
                      className="h-9 gap-1 flex-1 sm:flex-none"
                      disabled={isExportingCreditRequests || creditRequests.length === 0}
                    >
                      {isExportingCreditRequests ? (
                        <>
                          <Loader2 className="h-4 w-4 sm:mr-1 animate-spin" />
                          <span className="hidden sm:inline">Exporting...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Export to CSV</span>
                          <span className="sm:hidden">Export</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshCreditRequests}
                      className="h-9 gap-1 flex-1 sm:flex-none"
                    >
                      <RefreshCcw className={cn("h-4 w-4", creditRequestsLoading && "animate-spin")} />
                      <span className="hidden sm:inline">{creditRequestsLoading ? "Refreshing..." : "Refresh"}</span>
                    </Button>
                  </div>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Credit Purchase Requests</CardTitle>
                    <CardDescription>Review and process credit purchase requests from users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4 font-medium">Request ID</th>
                            <th className="text-left p-4 font-medium">User</th>
                            <th className="text-left p-4 font-medium">Plan</th>
                            <th className="text-left p-4 font-medium">Amount</th>
                            <th className="text-left p-4 font-medium hidden">Reference</th>
                            <th className="text-left p-4 font-medium">Date</th>
                            <th className="text-left p-4 font-medium">Status</th>
                            <th className="text-center p-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditRequestsLoading ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              </td>
                            </tr>
                          ) : creditRequests.length > 0 ? (
                            creditRequests.map((request) => {
                              const userName = getCreditRequestUserInfo(request).name;
                              
                              // Format status badge
                              let statusBadge;
                              switch(request.status) {
                                case 'pending':
                                  statusBadge = (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Pending
                                    </span>
                                  );
                                  break;
                                case 'approved':
                                  statusBadge = (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Approved
                                    </span>
                                  );
                                  break;
                                case 'declined':
                                  statusBadge = (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Declined
                                    </span>
                                  );
                                  break;
                                default:
                                  statusBadge = (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {request.status}
                                    </span>
                                  );
                              }
                              
                              return (
                                <tr key={request._id} className="border-b">
                                  <td className="p-4">{request.requestId}</td>
                                  <td className="p-4">{userName}</td>
                                  <td className="p-4">
                                    {request.planDescription ? (
                                      <div className="font-medium">{request.planDescription}</div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground">No plan details</div>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <div>${getCreditRequestAmount(request).toFixed(2)}</div>
                                    <div className="text-xs text-muted-foreground">Amount paid via e-Transfer</div>
                                    {request.promoCode && (
                                      <div className="text-xs text-green-700 font-medium mt-1">
                                        Promo: {request.promoCode} (-${(request.promoDiscountAmount || 0).toFixed(2)})
                                      </div>
                                    )}
                                    {request.referenceNumber && (
                                      <div className="text-xs text-blue-600 font-medium mt-1">
                                        INTERAC Email: {request.referenceNumber}
                                      </div>
                                    )}
                                    {request.status === 'approved' && (
                                      <div className="text-xs text-green-600 font-medium mt-1">
                                        Plan approved
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-4 hidden">
                                    {request.referenceNumber ? (
                                      <div className="font-medium">{request.referenceNumber}</div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground">No INTERAC email</div>
                                    )}
                                  </td>
                                  <td className="p-4">{new Date(request.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}</td>
                                  <td className="p-4">{statusBadge}</td>
                                  <td className="p-4">
                                    <div className="flex justify-center gap-1">
                                      <Button variant="outline" size="sm" onClick={() => handleViewRequest(request)}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      
                                      {request.status === 'pending' && (
                                        <>
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                            onClick={() => handleApproveRequest(request)}
                                          >
                                            <Check className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                            onClick={() => handleDeclineRequest(request)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                No credit purchase requests found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {creditRequestsLoading ? (
                        <div className="flex justify-center items-center py-12">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : creditRequests.length > 0 ? (
                        creditRequests.map((request) => {
                          const userInfo = getCreditRequestUserInfo(request);
                          const userName = userInfo.name;
                          const userEmail = userInfo.email;
                          
                          let statusColor = 'bg-gray-100 text-gray-800';
                          let statusBorderColor = 'border-gray-200';
                          let statusText: string = request.status;
                          
                          switch(request.status) {
                            case 'pending':
                              statusColor = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                              statusBorderColor = 'border-yellow-200';
                              statusText = 'Pending';
                              break;
                            case 'approved':
                              statusColor = 'bg-green-50 text-green-800 border-green-200';
                              statusBorderColor = 'border-green-200';
                              statusText = 'Approved';
                              break;
                            case 'declined':
                              statusColor = 'bg-red-50 text-red-800 border-red-200';
                              statusBorderColor = 'border-red-200';
                              statusText = 'Declined';
                              break;
                          }
                          
                          return (
                            <Card key={request._id} className={`overflow-hidden border-l-4 ${statusBorderColor} shadow-sm hover:shadow-md transition-shadow`}>
                              <CardHeader className="pb-3 bg-muted/30">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base font-semibold truncate">{userName}</CardTitle>
                                    {userEmail && (
                                      <p className="text-xs text-muted-foreground truncate mt-0.5">{userEmail}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                      <span className="font-medium">ID:</span> {request.requestId}
                                    </p>
                                  </div>
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                                    {statusText}
                                  </span>
                                </div>
                              </CardHeader>
                              <CardContent className="pb-3 pt-4 space-y-3">
                                {/* Amount - Most Important */}
                                <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Payment Amount</p>
                                      <p className="text-2xl font-bold text-primary">${getCreditRequestAmount(request).toFixed(2)}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">via e-Transfer</p>
                                    </div>
                                    <DollarSign className="h-8 w-8 text-primary/30" />
                                  </div>
                                </div>
                                
                                {/* Plan Details */}
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    Plan Details
                                  </p>
                                  <p className="font-medium text-sm">
                                    {request.planDescription || 'No plan details'}
                                  </p>
                                  {request.status === 'approved' && (
                                    <div className="flex items-center gap-1 mt-2">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      <span className="text-xs text-green-600 font-medium">Plan approved</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Reference & Date */}
                                <div className="space-y-2">
                                  {request.referenceNumber && (
                                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                      <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full flex-shrink-0">
                                        <span className="text-blue-600 text-xs font-bold">#</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-blue-600 font-medium truncate">{request.referenceNumber}</p>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <p className="text-xs font-medium">
                                      {new Date(request.createdAt).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                              <CardFooter className="pt-0 pb-3 flex flex-col gap-2">
                                {request.status === 'pending' ? (
                                  <>
                                    <div className="flex gap-2 w-full">
                                      <Button 
                                        variant="default" 
                                        size="sm" 
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                        onClick={() => handleApproveRequest(request)}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Approve
                                      </Button>
                                      <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        className="flex-1 shadow-sm"
                                        onClick={() => handleDeclineRequest(request)}
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Decline
                                      </Button>
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleViewRequest(request)}
                                      className="w-full"
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View Details
                                    </Button>
                                  </>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleViewRequest(request)}
                                    className="w-full"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Details
                                  </Button>
                                )}
                              </CardFooter>
                            </Card>
                          );
                        })
                      ) : (
                        <div className="flex flex-col justify-center items-center py-12 text-center">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground font-medium">No credit purchase requests found</p>
                          <p className="text-xs text-muted-foreground mt-1">Requests will appear here when submitted</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCreditRequestPagination('prev')}
                          disabled={creditRequestsPagination.page === 1 || creditRequestsLoading}
                        >
                          Previous
                        </Button>
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          Page {creditRequestsPagination.page} of {creditRequestsPagination.pages}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCreditRequestPagination('next')}
                          disabled={creditRequestsPagination.page === creditRequestsPagination.pages || creditRequestsLoading}
                        >
                          Next
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
                        <Select
                          value={creditRequestsPagination.limit.toString()}
                          onValueChange={(value) => {
                            changeCreditRequestsPageSize(parseInt(value, 10))
                          }}
                        >
                          <SelectTrigger className="h-8 w-[80px]">
                            <SelectValue placeholder={creditRequestsPagination.limit.toString()} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
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

      {/* Add Credits Dialog */}
      <Dialog open={addCreditsOpen} onOpenChange={setAddCreditsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription>Add credits to {selectedUser?.userID}'s account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current-credits" className="text-right">
                Current Credits
              </Label>
              <div className="col-span-3">
                <Input id="current-credits" value={selectedUser?.credits} disabled />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-credits" className="text-right">
                Credits to Add
              </Label>
              <div className="col-span-3">
                <Input
                  id="add-credits"
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCreditsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddCredits}>Add Credits</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <ViewUserDialog
        open={viewUserOpen}
        user={selectedUser}
        onOpenChange={setViewUserOpen}
      />

      {/* View Credit Request Dialog */}
      <Dialog open={viewRequestOpen} onOpenChange={setViewRequestOpen}>
        <DialogContent className="sm:max-w-[700px] md:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 bg-background pb-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">Credit Purchase Request</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Request ID: <span className="font-medium">{selectedRequest?.requestId}</span>
                </DialogDescription>
              </div>
              {selectedRequest && (
                <div className="flex items-center">
                  {selectedRequest.status === 'pending' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                  {selectedRequest.status === 'approved' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Approved
                    </span>
                  )}
                  {selectedRequest.status === 'declined' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Declined
                    </span>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6 py-2">
              {/* User & Date Info - Top Section */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Submitted By</Label>
                    <p className="font-medium text-base">
                      {selectedRequestUser.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequestUser.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <Label className="text-xs text-muted-foreground">Date Submitted</Label>
                    <p className="font-medium text-base">
                      {new Date(selectedRequest.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedRequest.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Plan & Payment Info */}
              <div className="bg-white border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border">
                  <h3 className="font-medium">Plan & Payment Details</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {selectedRequest.planDescription && (
                      <div className="col-span-1 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Selected Plan</Label>
                        <p className="font-medium text-base">
                          {selectedRequest.planDescription}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Method</Label>
                      <p className="font-medium text-base mt-1">
                        {selectedRequest.paymentMethod === 'wechat' ? (
                          <span className="flex items-center">
                            <img src="/wechatsmallicon.png" alt="WeChat" className="h-5 w-5 mr-2" />
                            微信转账
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <span className="h-5 w-5 mr-2 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-xs font-bold">E</span>
                            Interac e-Transfer
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">User ID</Label>
                      <p className="font-medium text-sm mt-1 text-muted-foreground truncate">
                        {selectedRequestUser.id}
                      </p>
                    </div>
                    
                    <div className="border-t pt-4 col-span-1 sm:col-span-2 mt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Subtotal</Label>
                          <p className="font-medium text-base">
                            ${Number(
                              selectedRequest.mealSubtotal ??
                              Math.max(
                                0,
                                Number(selectedRequest.originalSubtotal ?? selectedRequest.originalPrice ?? 0) -
                                  Number(selectedRequest.deliveryFeeTotal ?? 0)
                              )
                            ).toFixed(2)}
                          </p>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Promo Code</Label>
                          <p className="font-medium text-base">
                            {selectedRequest.promoCode ? (
                              <span className="text-green-700">
                                {selectedRequest.promoCode} (-${(selectedRequest.promoDiscountAmount || 0).toFixed(2)})
                              </span>
                            ) : (
                              'None'
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Promo Discount</Label>
                          <p className="font-medium text-base text-green-700">
                            -${Number(selectedRequest.promoDiscountAmount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Delivery Fee</Label>
                          <p className="font-medium text-base text-blue-700">
                            ${Number(selectedRequest.deliveryFeeTotal || 0).toFixed(2)}
                            {Number(selectedRequest.deliveryFeePerWeek || 0) > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (${Number(selectedRequest.deliveryFeePerWeek || 0).toFixed(2)} x {Number(selectedRequest.mealPlanQuantity || 1)}w)
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Tax</Label>
                          <p className="font-medium text-base text-amber-600">
                            ${Math.max(0, Number(
                              selectedRequest.taxAmount ??
                                (
                                  Number(selectedRequest.finalTotal ?? selectedRequest.amount ?? 0) -
                                  Math.max(
                                    0,
                                    Number(selectedRequest.originalSubtotal ?? selectedRequest.originalPrice ?? 0) -
                                      Number(selectedRequest.promoDiscountAmount || 0)
                                  )
                                )
                            )).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Final Amount</Label>
                          <p className="font-medium text-base">
                            <span className="text-lg">${Number(selectedRequest.finalTotal ?? selectedRequest.amount ?? 0).toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Status Information */}
              {(selectedRequest.status === 'approved' || selectedRequest.status === 'declined') && (
                <div className={`bg-white border rounded-lg overflow-hidden ${
                  selectedRequest.status === 'approved' ? 'border-green-200' : 'border-red-200'
                }`}>
                  <div className={`px-4 py-2 border-b ${
                    selectedRequest.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <h3 className="font-medium">
                      {selectedRequest.status === 'approved' ? 'Approval Details' : 'Decline Details'}
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      {selectedRequest.status === 'approved' && (
                        <>
                          <div>
                            <Label className="text-xs text-muted-foreground">Approved Plan</Label>
                            <p className="font-medium text-base">
                              {selectedRequest.planDescription || "Meal Plan"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Approved Date</Label>
                            <p className="font-medium text-base">
                              {selectedRequest.approvedAt ? new Date(selectedRequest.approvedAt).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              }) : 'N/A'}
                            </p>
                          </div>
                        </>
                      )}
                      
                      {selectedRequest.status === 'declined' && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Declined Date</Label>
                          <p className="font-medium text-base">
                            {selectedRequest.declinedAt ? new Date(selectedRequest.declinedAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : 'N/A'}
                          </p>
                        </div>
                      )}
                      
                      {selectedRequest.adminNotes && (
                        <div className={selectedRequest.status === 'declined' ? "col-span-1 sm:col-span-2" : ""}>
                          <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                          <p className="font-medium p-3 bg-muted/50 rounded-md text-sm mt-1 max-h-24 overflow-y-auto">
                            {selectedRequest.adminNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Notes & Payment Proof */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Notes */}
                <div className="col-span-1">
                  {selectedRequest.notes ? (
                    <div className="bg-white border border-border rounded-lg overflow-hidden h-full">
                      <div className="bg-muted/50 px-4 py-2 border-b border-border">
                        <h3 className="font-medium">User Notes</h3>
                      </div>
                      <div className="p-4">
                        <p className="text-sm">
                          {selectedRequest.notes}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-border rounded-lg overflow-hidden h-full flex items-center justify-center p-6">
                      <p className="text-sm text-muted-foreground">No notes provided</p>
                    </div>
                  )}
                </div>
                
                {/* Payment Proof */}
                <div className="col-span-1">
                  <div className="bg-white border border-border rounded-lg overflow-hidden h-full">
                    <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                      <h3 className="font-medium">Payment Proof</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        asChild
                        className="gap-1 h-8"
                      >
                        <a href={selectedRequest.imageProof} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="text-xs">View Full Size</span>
                        </a>
                      </Button>
                    </div>
                    <div className="p-4 flex items-center justify-center">
                      <img 
                        src={selectedRequest.imageProof} 
                        alt="Payment proof" 
                        className="object-contain max-h-[250px] max-w-full rounded-md border border-border/50"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="sticky bottom-0 pt-4 pb-1 bg-background z-10 border-t mt-6">
            <div className="flex justify-between w-full items-center">
              <Button variant="outline" onClick={() => setViewRequestOpen(false)}>
                Close
              </Button>
              
              {selectedRequest && selectedRequest.status === 'pending' && (
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      setViewRequestOpen(false);
                      handleDeclineRequest(selectedRequest);
                    }}
                    className="px-5"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                  <Button 
                    onClick={() => {
                      setViewRequestOpen(false);
                      handleApproveRequest(selectedRequest);
                    }}
                    className="bg-green-600 hover:bg-green-700 px-5"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Approve Credit Request Dialog */}
      <Dialog open={approveRequestOpen} onOpenChange={setApproveRequestOpen}>
        <DialogContent className="sm:max-w-[550px] md:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 bg-background pb-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Approve Credit Purchase</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Review and approve the credit purchase request.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6 py-2">
              {/* Request Info */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Request ID</Label>
                    <p className="font-medium">
                      {selectedRequest.requestId}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">User</Label>
                    <p className="font-medium">
                      {selectedRequestUser.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRequestUser.email}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Plan & Payment Details */}
              <div className="bg-white border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border">
                  <h3 className="font-medium">Plan & Payment Details</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {selectedRequest.planDescription && (
                      <div className="col-span-1 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Selected Plan</Label>
                        <p className="font-medium">
                          {selectedRequest.planDescription}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Method</Label>
                      <p className="font-medium flex items-center mt-1">
                        {selectedRequest.paymentMethod === 'wechat' ? (
                          <>
                            <img src="/wechatsmallicon.png" alt="WeChat" className="h-5 w-5 mr-2" />
                            微信转账
                          </>
                        ) : (
                          <>
                            <span className="h-5 w-5 mr-2 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-xs font-bold">E</span>
                            Interac e-Transfer
                          </>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Amount Paid</Label>
                      <p className="font-medium">
                        ${selectedRequestAmount.toFixed(2)}
                        {selectedRequest.paymentMethod === 'wechat' && (
                          <span className="ml-2 text-xs text-green-600">(10% discount applied)</span>
                        )}
                        {selectedRequest.paymentMethod === 'emt' && (
                          <span className="ml-2 text-xs text-amber-600">(13% tax included)</span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">INTERAC Email</Label>
                      <p className="font-medium">
                        {selectedRequest.referenceNumber || 'No INTERAC email provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Meal Plans to Add */}
              <div className="bg-white border border-border rounded-lg overflow-hidden">
                <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                  <h3 className="font-medium text-green-800">Meal Plans to Add</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="approved-six-meals" className="text-sm font-medium">
                        6 Meals/Week
                      </Label>
                      <Input
                        id="approved-six-meals"
                        type="number"
                        value={approvedSixMeals}
                        onChange={(e) => setApprovedSixMeals(parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="approved-eight-meals" className="text-sm font-medium">
                        8 Meals/Week
                      </Label>
                      <Input
                        id="approved-eight-meals"
                        type="number"
                        value={approvedEightMeals}
                        onChange={(e) => setApprovedEightMeals(parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="approved-ten-meals" className="text-sm font-medium">
                        10 Meals/Week
                      </Label>
                      <Input
                        id="approved-ten-meals"
                        type="number"
                        value={approvedTenMeals}
                        onChange={(e) => setApprovedTenMeals(parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="approved-twelve-meals" className="text-sm font-medium">
                        12 Meals/Week
                      </Label>
                      <Input
                        id="approved-twelve-meals"
                        type="number"
                        value={approvedTwelveMeals}
                        onChange={(e) => setApprovedTwelveMeals(parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="approved-sixteen-meals" className="text-sm font-medium">
                        16 Meals/Week
                      </Label>
                      <Input
                        id="approved-sixteen-meals"
                        type="number"
                        value={approvedSixteenMeals}
                        onChange={(e) => setApprovedSixteenMeals(parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                  </div>
                  
                </div>
              </div>
              
              {/* Admin Notes & Payment Proof */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="admin-notes" className="text-sm font-medium">
                    Admin Notes
                  </Label>
                  <textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm mt-1"
                    placeholder="Optional admin notes"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Payment Proof</Label>
                  <div className="mt-1 border rounded-md overflow-hidden">
                    <div className="p-3 flex items-center justify-center bg-muted/30">
                      <img 
                        src={selectedRequest.imageProof} 
                        alt="Payment proof" 
                        className="object-contain max-h-[120px]"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    </div>
                    <div className="p-2 bg-muted/50 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        asChild
                        className="gap-1 h-7"
                      >
                        <a href={selectedRequest.imageProof} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          <span className="text-xs">View Full Size</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="sticky bottom-0 pt-4 pb-1 bg-background z-10 border-t mt-6">
            <div className="flex justify-between w-full items-center">
              <Button variant="outline" onClick={() => setApproveRequestOpen(false)} disabled={processingRequest}>
                Cancel
              </Button>
              <Button 
                onClick={confirmApproveRequest} 
                disabled={processingRequest || (approvedSixMeals <= 0 && approvedEightMeals <= 0 && approvedTenMeals <= 0 && approvedTwelveMeals <= 0 && approvedSixteenMeals <= 0)}
                className="bg-green-600 hover:bg-green-700 px-6 gap-2"
              >
                {processingRequest ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm Approval
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Decline Credit Request Dialog */}
      <Dialog open={declineRequestOpen} onOpenChange={setDeclineRequestOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">Decline Credit Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this credit purchase request?
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="decline-request-id" className="text-right">
                  Request ID
                </Label>
                <Input
                  id="decline-request-id"
                  value={selectedRequest.requestId}
                  className="col-span-3"
                  disabled
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="decline-user" className="text-right">
                  User
                </Label>
                <Input
                  id="decline-user"
                  value={selectedRequestUser.name}
                  className="col-span-3"
                  disabled
                />
              </div>
              
              {selectedRequest.planDescription && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="decline-plan" className="text-right">
                    Selected Plan
                  </Label>
                  <Input
                    id="decline-plan"
                    value={selectedRequest.planDescription}
                    className="col-span-3"
                    disabled
                  />
                </div>
              )}
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="decline-notes" className="text-right pt-2">
                  Reason
                </Label>
                <textarea
                  id="decline-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="col-span-3 min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="Reason for declining (optional)"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineRequestOpen(false)} disabled={processingRequest}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeclineRequest} 
              disabled={processingRequest}
              className="gap-1"
            >
              {processingRequest && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deduct Credits Dialog */}
      <Dialog open={deductCreditsOpen} onOpenChange={setDeductCreditsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">Deduct Credits</DialogTitle>
            <DialogDescription>
              Deduct credits from {selectedUser?.userID}'s account.
              {selectedUser && (
                <div className="mt-2 font-medium">
                  Current balance: {selectedUser.credits || 0} credits
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deductAmount" className="text-right">
                Amount
              </Label>
              <Input
                id="deductAmount"
                type="number"
                min="1"
                max={selectedUser?.credits || 1}
                className="col-span-3"
                value={deductAmount}
                onChange={(e) => setDeductAmount(Math.min(parseInt(e.target.value) || 1, selectedUser?.credits || 1))}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deductReason" className="text-right">
                Reason
              </Label>
              <Input
                id="deductReason"
                className="col-span-3"
                value={deductDescription}
                onChange={(e) => setDeductDescription(e.target.value)}
                placeholder="Reason for deduction"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeductCreditsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmDeductCredits} 
              disabled={!selectedUser || deductAmount <= 0 || deductAmount > (selectedUser?.credits || 0)}
              variant="destructive"
            >
              Deduct Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

