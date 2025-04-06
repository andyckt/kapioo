"use client"

import { Label } from "@/components/ui/label"
import { CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CardContent } from "@/components/ui/card"
import { CardDescription } from "@/components/ui/card"
import { CardTitle } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, LogOut, Settings, ShoppingCart, Users, Calendar, BarChart, Check, ChevronsUpDown, Search, RefreshCcw, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { AdminDashboardEnhanced } from "@/components/admin-dashboard-enhanced"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getWeeklyMeals,
  getAvailableMeals,
  updateMeal,
  assignMealToDay,
  type WeeklyMeals,
  type Meal,
  getUsers,
  updateUser,
  type User,
  setDayActiveStatus,
  getAdminWeeklyMeals
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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { OrderManagement } from "@/components/order-management"

export default function AdminDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [addCreditsOpen, setAddCreditsOpen] = useState(false)
  const [viewUserOpen, setViewUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creditAmount, setCreditAmount] = useState(10)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersPagination, setUsersPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    pages: 1
  })
  const [usersError, setUsersError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsPagination, setTransactionsPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1
  })
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [deductCreditsOpen, setDeductCreditsOpen] = useState(false)
  const [deductAmount, setDeductAmount] = useState(1)
  const [deductDescription, setDeductDescription] = useState("Admin deduction")
  const [userTransactions, setUserTransactions] = useState<any[]>([])
  const [userTransactionsLoading, setUserTransactionsLoading] = useState(false)

  useEffect(() => {
    // Check if admin is logged in - in a real app, this would verify the session
    const user = localStorage.getItem('user')
    if (!user) {
      router.push("/login")
      return
    }
    
    const userData = JSON.parse(user)
    if (userData.userID !== 'admin') {
      toast({
        title: "Access denied",
        description: "You must be an admin to view this page",
        variant: "destructive",
      })
      router.push("/dashboard")
    }
  }, [router, toast])

  // Fetch users when the tab is switched to 'users' or 'credits'
  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'credits') {
      fetchUsers(usersPagination.page, usersPagination.limit)
    }
  }, [activeTab, usersPagination.page, usersPagination.limit])

  const fetchUsers = async (page = 1, limit = 10) => {
    try {
      console.log(`Fetching users, page: ${page}, limit: ${limit}`);
      setUsersLoading(true)
      setUsersError(null)
      
      const result = await getUsers(page, limit)
      console.log(`Fetched ${result.users?.length || 0} users`);
      
      if (result.users) {
        // Fetch order counts for users
        const usersWithOrderCounts = await Promise.all(
          result.users.map(async (user) => {
            try {
              // Fetch order count from API
              const response = await fetch(`/api/users/${user._id}/order-count`);
              if (response.ok) {
                const data = await response.json();
                return { 
                  ...user, 
                  totalOrders: data.success ? data.count : 0 
                };
              }
              return user;
            } catch (e) {
              console.error(`Error fetching order count for user ${user._id}:`, e);
              return user;
            }
          })
        );
        
        setUsers(usersWithOrderCounts)
        setFilteredUsers(usersWithOrderCounts)
        setUsersPagination(result.pagination)
      } else {
        console.error('Failed to fetch users, result:', result);
        setUsersError('Failed to fetch users')
        toast({
          title: "Error",
          description: 'Failed to fetch users',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsersError('An unexpected error occurred')
      toast({
        title: "Error",
        description: 'An unexpected error occurred while fetching users',
        variant: "destructive",
      })
    } finally {
      setUsersLoading(false)
    }
  }

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
    fetchUserTransactions(user._id)
  }

  const confirmAddCredits = async () => {
    if (!selectedUser) return
    
    try {
      // Call the new add-credits API endpoint
      const response = await fetch(`/api/users/${selectedUser._id}/add-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credits: creditAmount,
          description: 'Added Credits'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local state for users array
        const updatedUsers = users.map(user => 
          user._id === selectedUser._id 
            ? { ...user, credits: result.data.credits } 
            : user
        );
        setUsers(updatedUsers);
        
        // Update filtered users as well
        setFilteredUsers(filteredUsers.map(user => 
          user._id === selectedUser._id 
            ? { ...user, credits: result.data.credits } 
            : user
        ));
        
        // Update selectedUser if it's still selected
        if (selectedUser) {
          setSelectedUser({ ...selectedUser, credits: result.data.credits });
        }
        
        // Refresh transactions if on the Credits tab
        if (activeTab === "credits") {
          fetchTransactions();
        }
        
        toast({
          title: "Credits updated",
          description: `Added ${creditAmount} credits to ${selectedUser.userID}'s account`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to update credits',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating credits:', error)
      toast({
        title: "Error",
        description: 'An unexpected error occurred while updating credits',
        variant: "destructive",
      })
    } finally {
      setAddCreditsOpen(false)
    }
  }

  // Add function to fetch transactions
  const fetchTransactions = async (page = 1) => {
    setTransactionsLoading(true);
    try {
      console.log(`Fetching transactions page ${page}, limit ${transactionsPagination.limit}`);
      const response = await fetch(`/api/transactions?page=${page}&limit=${transactionsPagination.limit}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response from server (${response.status}):`, errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Transaction data received:', data);
      
      if (data.success) {
        setTransactions(data.data.transactions || []);
        setTransactionsPagination(prev => ({
          ...prev,
          page: data.data.page,
          total: data.data.total,
          pages: Math.ceil(data.data.total / data.data.limit)
        }));
      } else {
        console.error("API returned error:", data.error);
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };
  
  // Add effect to fetch transactions when the Credits tab is active
  useEffect(() => {
    if (activeTab === "credits") {
      console.log(`Credits tab is active, users data available: ${users.length} users`);
      
      // If no users data is available yet and not currently loading, fetch users
      if (users.length === 0 && !usersLoading) {
        console.log('No users data available, fetching users for Credits tab...');
        fetchUsers(usersPagination.page, usersPagination.limit);
      }
      
      fetchTransactions();
    }
  }, [activeTab, users.length, usersLoading]);
  
  // Add function to handle pagination for transactions
  const handleTransactionPagination = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev' 
      ? Math.max(1, transactionsPagination.page - 1)
      : Math.min(transactionsPagination.pages, transactionsPagination.page + 1);
      
    if (newPage !== transactionsPagination.page) {
      fetchTransactions(newPage);
    }
  };

  // Add a handler for search
  const handleUserSearch = () => {
    if (!userSearchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }
    
    const query = userSearchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.name?.toLowerCase().includes(query) || 
      user.userID?.toLowerCase().includes(query) || 
      user.email?.toLowerCase().includes(query)
    );
    
    setFilteredUsers(filtered);
    
    if (filtered.length === 0) {
      toast({
        title: "No matches",
        description: `No users found matching "${userSearchQuery}"`,
      });
    } else {
      toast({
        title: "Search results",
        description: `Found ${filtered.length} users matching "${userSearchQuery}"`,
      });
    }
  }

  // Add a reset search function
  const resetUserSearch = () => {
    setUserSearchQuery("");
    setFilteredUsers(users);
  }

  // Handle deduct credits button click
  const handleDeductCredits = (user: User) => {
    setSelectedUser(user)
    setDeductAmount(1) // Reset to default
    setDeductDescription("Admin deduction") // Reset to default
    setDeductCreditsOpen(true)
  }

  // Confirm deduct credits
  const confirmDeductCredits = async () => {
    if (!selectedUser) return
    
    try {
      // Call the deduct-credits API endpoint
      const response = await fetch(`/api/users/${selectedUser._id}/deduct-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credits: deductAmount,
          description: deductDescription
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setUsers(users.map(user => 
          user._id === selectedUser._id 
            ? { ...user, credits: result.data.credits } 
            : user
        ));
        
        // Also update filtered users if needed
        setFilteredUsers(filteredUsers.map(user => 
          user._id === selectedUser._id 
            ? { ...user, credits: result.data.credits } 
            : user
        ));
        
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

  // Add function to fetch transactions for a specific user
  const fetchUserTransactions = async (userId: string) => {
    setUserTransactionsLoading(true)
    try {
      const response = await fetch(`/api/transactions?userId=${userId}&limit=10`)
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setUserTransactions(data.data.transactions || [])
      } else {
        console.error("API returned error:", data.error)
        setUserTransactions([])
      }
    } catch (error) {
      console.error("Error fetching user transactions:", error)
      setUserTransactions([])
    } finally {
      setUserTransactionsLoading(false)
    }
  }

  // Format date helper
  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return String(date);
    }
  };

  // Handle user pagination
  const handleUserPagination = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev' 
      ? Math.max(1, usersPagination.page - 1)
      : Math.min(usersPagination.pages, usersPagination.page + 1);
      
    if (newPage !== usersPagination.page) {
      fetchUsers(newPage, usersPagination.limit);
    }
  };

  // Export users to CSV
  const handleExportUsers = () => {
    try {
      // Create headers for CSV
      const headers = [
        'User ID',
        'Name',
        'Phone',
        'Email',
        'City',
        'Created',
        'Total Orders',
        'Credits'
      ].join(',');

      // Create rows for each user
      const rows = filteredUsers.map(user => {
        // Format data and handle commas in text to avoid breaking CSV
        const formatCSV = (text: string | undefined) => {
          if (!text) return '';
          // If contains comma, quote the text
          return text.includes(',') ? `"${text}"` : text;
        };

        // Format date properly for CSV to prevent it from being split across rows
        const formatDateForCSV = (date: Date | string | undefined) => {
          if (!date) return '';
          try {
            const dateObj = date instanceof Date ? date : new Date(date);
            // Format as YYYY-MM-DD to avoid commas and ensure it's a single cell
            return dateObj.toISOString().split('T')[0];
          } catch (e) {
            return '';
          }
        };

        return [
          formatCSV(user.userID),
          formatCSV(user.name),
          formatCSV(user.phone),
          formatCSV(user.email),
          formatCSV(user.address?.city),
          formatDateForCSV(user.joined),
          user.totalOrders || '0',
          user.credits
        ].join(',');
      });

      // Combine headers and rows
      const csvContent = [headers, ...rows].join('\n');

      // Create a Blob with the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      // Create a temporary link to download the CSV
      const link = document.createElement('a');
      const fileName = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `${rows.length} users exported to ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting users:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting users. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            <span className="font-bold text-xl">Kapioo Admin</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-100"
              onClick={() => {
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
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr] pt-6">
        <aside className="hidden w-[200px] flex-col md:flex">
          <motion.nav
            className="grid items-start gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              className="justify-start"
              onClick={() => setActiveTab("dashboard")}
            >
              <BarChart className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "ghost"}
              className="justify-start"
              onClick={() => setActiveTab("users")}
            >
              <Users className="mr-2 h-4 w-4" />
              Users
            </Button>
            <Button
              variant={activeTab === "meals" ? "default" : "ghost"}
              className="justify-start"
              onClick={() => setActiveTab("meals")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Meal Management
            </Button>
            <Button
              variant={activeTab === "orders" ? "default" : "ghost"}
              className="justify-start"
              onClick={() => setActiveTab("orders")}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Orders
            </Button>
            <Button
              variant={activeTab === "credits" ? "default" : "ghost"}
              className="justify-start"
              onClick={() => setActiveTab("credits")}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Credits
            </Button>
            <Button
              variant={activeTab === "settings" ? "default" : "ghost"}
              className="justify-start"
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
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
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUsers(usersPagination.page, usersPagination.limit)}
                      className="h-9 gap-1"
                    >
                      <RefreshCcw className={cn("h-4 w-4", usersLoading && "animate-spin")} />
                      {usersLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportUsers}
                      className="h-9 gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Export Users
                    </Button>
                  </div>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>Manage user accounts and credits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input 
                          placeholder="Search users..." 
                          className="max-w-sm" 
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUserSearch();
                            }
                          }}
                        />
                        <Button variant="outline" onClick={handleUserSearch}>Search</Button>
                        {userSearchQuery && (
                          <Button variant="ghost" size="sm" onClick={resetUserSearch}>
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-4 font-medium">User ID</th>
                              <th className="text-left p-4 font-medium">Name</th>
                              <th className="text-left p-4 font-medium">Phone</th>
                              <th className="text-left p-4 font-medium">City</th>
                              <th className="text-left p-4 font-medium">Created</th>
                              <th className="text-left p-4 font-medium">Orders</th>
                              <th className="text-left p-4 font-medium">Credits</th>
                              <th className="text-center p-4 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map((user) => (
                              <tr key={user._id} className="border-b">
                                <td className="p-4">{user.userID}</td>
                                <td className="p-4">{user.name}</td>
                                <td className="p-4">{user.phone || "-"}</td>
                                <td className="p-4">{user.address?.city || "-"}</td>
                                <td className="p-4">{user.joined ? formatDate(user.joined) : "-"}</td>
                                <td className="p-4">{user.totalOrders || 0}</td>
                                <td className="p-4">{user.credits}</td>
                                <td className="p-4">
                                  <div className="flex justify-center gap-1">
                                    <Button variant="outline" size="sm" onClick={() => handleAddCredits(user)}>
                                      Add Credits
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDeductCredits(user)} className="text-red-500 border-red-200 hover:bg-red-50">
                                      Deduct
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                                      View
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUserPagination('prev')}
                          disabled={usersPagination.page <= 1}
                        >
                          Previous
                        </Button>
                        <div className="text-sm text-muted-foreground">Page {usersPagination.page} of {usersPagination.pages}</div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUserPagination('next')}
                          disabled={usersPagination.page >= usersPagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select
                          value={usersPagination.limit.toString()}
                          onValueChange={(value) => {
                            const newLimit = parseInt(value);
                            setUsersPagination(prev => ({
                              ...prev,
                              limit: newLimit,
                              page: 1 // Reset to first page when changing limit
                            }));
                            fetchUsers(1, newLimit);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[80px]">
                            <SelectValue placeholder={usersPagination.limit.toString()} />
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

            {activeTab === "meals" && (
              <motion.div
                key="meals"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">Meal Management</h2>
                </div>
                <MealManagement />
              </motion.div>
            )}

            {activeTab === "orders" && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">Order Management</h2>
                </div>
                <OrderManagement />
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
                  <h2 className="text-3xl font-bold tracking-tight">Credit Management</h2>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Add Credits to User</CardTitle>
                    <CardDescription>Manually add credits to a user's account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
                      <div className="space-y-2">
                        <Label htmlFor="user-select">Select User</Label>
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
                                <CommandInput placeholder="Search users..." className="h-9" />
                                <CommandList>
                                  <CommandEmpty>No users found.</CommandEmpty>
                                  <CommandGroup>
                                    {users.map((user) => (
                                      <CommandItem
                                        key={user._id}
                                        value={`${user.name} ${user.userID} ${user.email}`}
                                        onSelect={() => {
                                          setSelectedUser(user);
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
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="credits-amount">Credits to Add</Label>
                        <Input 
                          id="credits-amount" 
                          type="number" 
                          min="1"
                          defaultValue="10" 
                          onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          className="w-full"
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
                                description: "Please enter a valid credit amount",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            try {
                              const response = await fetch(`/api/users/${selectedUser._id}/add-credits`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  credits: creditAmount,
                                  description: 'Added Credits'
                                })
                              });
                              
                              const result = await response.json();
                              
                              if (result.success) {
                                // Update all users list with new credit balance
                                const updatedUsers = users.map(user => 
                                  user._id === selectedUser._id 
                                    ? { ...user, credits: result.data.credits } 
                                    : user
                                );
                                setUsers(updatedUsers);
                                
                                // Update filtered users list
                                setFilteredUsers(filteredUsers.map(user => 
                                  user._id === selectedUser._id 
                                    ? { ...user, credits: result.data.credits } 
                                    : user
                                ));
                                
                                // Update selectedUser if needed
                                setSelectedUser({...selectedUser, credits: result.data.credits});
                                
                                // Refresh transactions list
                                fetchTransactions();
                                
                                toast({
                                  title: "Credits added",
                                  description: `${creditAmount} credits added to ${selectedUser.name || selectedUser.userID}'s account`,
                                });
                                
                                // Reset selection
                                setSelectedUser(null);
                              } else {
                                toast({
                                  title: "Error",
                                  description: result.error || "Failed to add credits",
                                  variant: "destructive"
                                });
                              }
                            } catch (error) {
                              console.error('Error adding credits:', error);
                              toast({
                                title: "Error",
                                description: "An unexpected error occurred while adding credits",
                                variant: "destructive"
                              });
                            }
                          }}
                          disabled={!selectedUser || creditAmount <= 0}
                        >
                          Add Credits
                        </Button>
                      </div>
                    </div>
                    {selectedUser && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="font-medium">Selected User:</p>
                        <p>{selectedUser.name} ({selectedUser.userID})</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Current Credits: {selectedUser.credits || 0}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Credit Transactions</CardTitle>
                    <CardDescription>Recent credit transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
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
                                  <td className="p-4">{transaction.type === 'credit' ? 'Add' : transaction.type === 'debit' ? 'Deduct' : transaction.type === 'refund' ? 'Refund' : transaction.type}</td>
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
                  </CardContent>
                  <CardFooter>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleTransactionPagination('prev')}
                          disabled={transactionsPagination.page === 1 || transactionsLoading}
                        >
                          Previous
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          Page {transactionsPagination.page} of {transactionsPagination.pages}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleTransactionPagination('next')}
                          disabled={transactionsPagination.page === transactionsPagination.pages || transactionsLoading}
                        >
                          Next
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select
                          value={transactionsPagination.limit.toString()}
                          onValueChange={(value) => {
                            const newLimit = parseInt(value);
                            setTransactionsPagination(prev => ({
                              ...prev,
                              limit: newLimit,
                              page: 1 // Reset to first page when changing limit
                            }));
                            fetchTransactions(1);
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

            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">Admin Settings</h2>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>System Settings</CardTitle>
                    <CardDescription>Configure system-wide settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="company-name">Company Name</Label>
                        <Input id="company-name" defaultValue="MealWeek" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="support-email">Support Email</Label>
                        <Input id="support-email" defaultValue="support@mealweek.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="credit-cost">Credit Cost ($)</Label>
                        <Input id="credit-cost" defaultValue="5.00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delivery-fee">Delivery Fee ($)</Label>
                        <Input id="delivery-fee" defaultValue="0.00" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => {
                        toast({
                          title: "Settings updated",
                          description: "System settings have been updated successfully",
                        })
                      }}
                    >
                      Save Changes
                    </Button>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Admin Account</CardTitle>
                    <CardDescription>Update your admin account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="admin-name">Name</Label>
                        <Input id="admin-name" defaultValue="Admin User" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-email">Email</Label>
                        <Input id="admin-email" defaultValue="admin@mealweek.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-password">New Password</Label>
                        <Input id="admin-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input id="confirm-password" type="password" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => {
                        toast({
                          title: "Account updated",
                          description: "Your admin account has been updated successfully",
                        })
                      }}
                    >
                      Update Account
                    </Button>
                  </CardFooter>
                </Card>
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
      <Dialog open={viewUserOpen} onOpenChange={setViewUserOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Information about {selectedUser?.name}</DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">User Details</TabsTrigger>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">User ID</Label>
                    <p className="font-medium">{selectedUser.userID}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <p className="font-medium">{selectedUser.status}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedUser.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedUser.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Joined</Label>
                    <p className="font-medium">{selectedUser.joined instanceof Date 
                      ? selectedUser.joined.toLocaleDateString() 
                      : String(selectedUser.joined)}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Address</Label>
                  {selectedUser?.address ? (
                    <div className="font-medium space-y-1 mt-1">
                      {selectedUser.address.unitNumber && (
                        <p>Unit: {selectedUser.address.unitNumber}</p>
                      )}
                      <p>{selectedUser.address.streetAddress}</p>
                      <p>
                        {selectedUser.address.city}
                        {selectedUser.address.province && `, ${selectedUser.address.province}`}
                        {selectedUser.address.postalCode && ` ${selectedUser.address.postalCode}`}
                      </p>
                      <p>{selectedUser.address.country}</p>
                      {selectedUser.address.buzzCode && (
                        <p>Buzz Code: {selectedUser.address.buzzCode}</p>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium">No address provided</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Credits</Label>
                  <p className="font-medium">{selectedUser.credits}</p>
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="font-medium">User Activity</Label>
                  <div className="space-y-2">
                    {userTransactionsLoading ? (
                      <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : userTransactions.length > 0 ? (
                      userTransactions.map((transaction) => (
                        <div key={transaction._id} className="rounded-md border p-3">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium">
                              {transaction.type === 'credit' ? 'Add' : 
                               transaction.type === 'debit' ? 'Deduct' : 
                               transaction.type === 'refund' ? 'Refund' : 
                               transaction.type} 
                              <span className={transaction.type === 'credit' || transaction.type === 'refund' ? "text-green-600" : "text-red-600"}>
                                {' '}{transaction.type === 'credit' || transaction.type === 'refund' ? '+' : '-'}{transaction.amount}
                              </span> credits
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          {transaction.description && (
                            <p className="text-xs text-muted-foreground mt-1">{transaction.description}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border p-3 text-center text-muted-foreground">
                        No transaction history found
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUserOpen(false)}>
              Close
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
    </div>
  )
}

// Update the MealManagement component to use the getAdminWeeklyMeals function instead of getWeeklyMeals, and import it.
function MealManagement() {
  const { toast } = useToast();
  const [weeklyMeals, setWeeklyMeals] = useState<WeeklyMeals>({});
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [editedMeals, setEditedMeals] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMealId, setSelectedMealId] = useState<Record<string, string>>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEditMeal, setCurrentEditMeal] = useState<Meal | null>(null);
  const [today, setToday] = useState<string>('');
  const [activeDays, setActiveDays] = useState<Record<string, boolean>>({});

  // Load meals on component mount
  useEffect(() => {
    async function loadData() {
      try {
        // Get current weekly meals - use admin version to include inactive days
        const mealsResult = await getAdminWeeklyMeals();
        setWeeklyMeals(mealsResult);
        
        // Get all available meals
        const allMeals = await getAvailableMeals();
        setAvailableMeals(allMeals);
        
        // Initialize edited meals with current names
        const initialEditState: Record<string, string> = {};
        const initialMealIdState: Record<string, string> = {};
        const initialActiveDays: Record<string, boolean> = {};
        
        Object.entries(mealsResult).forEach(([day, meal]) => {
          initialEditState[day] = meal.name;
          initialMealIdState[day] = meal._id || '';
          initialActiveDays[day] = meal.active !== false; // Default to true if not specified
        });
        
        setEditedMeals(initialEditState);
        setSelectedMealId(initialMealIdState);
        setActiveDays(initialActiveDays);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading meals:', error);
        toast({
          title: "Error",
          description: "Failed to load meals. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [toast]);

  // Handle input change
  const handleMealNameChange = (day: string, name: string) => {
    setEditedMeals({
      ...editedMeals,
      [day]: name
    });
  };

  // Handle meal selection change
  const handleMealSelect = (day: string, mealId: string) => {
    // Find the selected meal
    const selectedMeal = availableMeals.find(meal => meal._id === mealId);
    if (selectedMeal) {
      setSelectedMealId({
        ...selectedMealId,
        [day]: mealId
      });
      
      // Update the meal name in edited meals
      setEditedMeals({
        ...editedMeals,
        [day]: selectedMeal.name
      });
    }
  };

  // Update a single meal
  const updateDayMeal = async (day: string) => {
    if (!editedMeals[day]) return;
    
    try {
      setIsLoading(true);
      
      // Update the meal name
      const updatedMeal = {
        ...weeklyMeals[day],
        name: editedMeals[day]
      };
      
      // Find or use the existing meal ID
      const mealId = weeklyMeals[day]._id || '';
      
      if (mealId) {
        // Update the existing meal
        const result = await updateMeal(mealId, updatedMeal);
        
        if (result) {
          // Update local state
          setWeeklyMeals({
            ...weeklyMeals,
            [day]: {
              ...weeklyMeals[day],
              name: editedMeals[day]
            }
          });
          
          toast({
            title: "Meal updated",
            description: `Updated ${day}'s meal successfully`
          });
        } else {
          toast({
            title: "Update failed",
            description: "Failed to update meal. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error(`Error updating ${day} meal:`, error);
      toast({
        title: "Error",
        description: "An error occurred while updating the meal",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save all changes
  const saveAllChanges = async () => {
    try {
      setIsLoading(true);
      console.log("[Admin] Saving all changes and refreshing menu...");
      
      // Refresh the weekly meals data
      const updatedMeals = await getAdminWeeklyMeals();
      console.log("[Admin] Updated meals after refresh:", {
        count: Object.keys(updatedMeals).length,
        days: Object.keys(updatedMeals),
        activeDays: Object.entries(updatedMeals).filter(([day, meal]) => meal.active).map(([day]) => day)
      });
      
      setWeeklyMeals(updatedMeals);
      
      // Force browser to reload the page to ensure all data is fresh
      window.location.reload();
      
      toast({
        title: "Menu refreshed",
        description: "The weekly menu has been refreshed successfully"
      });
      
    } catch (error) {
      console.error('[Admin] Error refreshing menu:', error);
      toast({
        title: "Error",
        description: "An error occurred while refreshing the menu",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Open edit modal for a specific meal
  const openEditMeal = (day: string) => {
    if (weeklyMeals[day]) {
      setCurrentEditMeal({...weeklyMeals[day]});
      setEditModalOpen(true);
    }
  };

  // Handle saving edited meal details
  const saveEditedMeal = async () => {
    if (!currentEditMeal || !currentEditMeal._id) return;
    
    try {
      setIsLoading(true);
      
      // Save the updated meal details
      const result = await updateMeal(currentEditMeal._id, currentEditMeal);
      
      if (result) {
        // Find which day this meal belongs to
        let updatedDay = '';
        Object.entries(weeklyMeals).forEach(([day, meal]) => {
          if (meal._id === currentEditMeal._id) {
            updatedDay = day;
          }
        });
        
        if (updatedDay) {
          // Update the local state
          setWeeklyMeals({
            ...weeklyMeals,
            [updatedDay]: currentEditMeal
          });
          
          // Also update edited meals
          setEditedMeals({
            ...editedMeals,
            [updatedDay]: currentEditMeal.name
          });
        }
        
        toast({
          title: "Meal details updated",
          description: "The meal details have been updated successfully"
        });
        
        setEditModalOpen(false);
      } else {
        toast({
          title: "Update failed",
          description: "Failed to update meal details. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating meal details:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the meal details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change for the current edit meal
  const handleEditMealChange = (field: keyof Meal, value: any) => {
    if (!currentEditMeal) return;
    
    setCurrentEditMeal({
      ...currentEditMeal,
      [field]: value
    });
  };

  // Toggle day active status
  const toggleDayActive = async (day: string) => {
    try {
      setIsLoading(true);
      
      // Toggle the active status
      const newActiveStatus = !activeDays[day];
      console.log(`[Admin] Toggling ${day} to active=${newActiveStatus}`);
      
      // Update via API
      const success = await setDayActiveStatus(day, newActiveStatus);
      
      if (success) {
        console.log(`[Admin] Successfully toggled ${day} to active=${newActiveStatus}`);
        
        // Update local state
        setActiveDays({
          ...activeDays,
          [day]: newActiveStatus
        });
        
        // Update the weekly meals state
        setWeeklyMeals({
          ...weeklyMeals,
          [day]: {
            ...weeklyMeals[day],
            active: newActiveStatus
          }
        });
        
        toast({
          title: newActiveStatus ? "Day activated" : "Day deactivated",
          description: `${day.charAt(0).toUpperCase() + day.slice(1)} is now ${newActiveStatus ? 'active' : 'inactive'}`
        });
        
        // Add a small delay before refreshing the data to ensure changes are propagated
        setTimeout(async () => {
          console.log(`[Admin] Refreshing data after toggling ${day}`);
          // Refresh the weekly meals data
          const updatedMeals = await getAdminWeeklyMeals();
          console.log(`[Admin] Received updated meals after toggle:`, {
            days: Object.keys(updatedMeals),
            [day + "_active"]: updatedMeals[day]?.active
          });
          setWeeklyMeals(updatedMeals);
          setIsLoading(false);
        }, 1000);
      } else {
        console.error(`[Admin] Failed to toggle ${day} to active=${newActiveStatus}`);
        toast({
          title: "Update failed",
          description: "Failed to update day status. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error(`[Admin] Error toggling ${day} active status:`, error);
      toast({
        title: "Error",
        description: "An error occurred while updating the day status",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Weekly Menu</CardTitle>
          <CardDescription>Update the meals for each day of the week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              weeklyMeals[day] && (
                <div key={day} className="grid gap-4 md:grid-cols-[1.5fr_2fr_1fr_1fr]">
                  <div className="flex items-center">
                    <div className="min-w-[120px] p-2">
                      <div>
                        <span className="font-medium capitalize">
                          {day}
                        </span>
                        {weeklyMeals[day]?.date && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Date: {weeklyMeals[day].date}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-full px-3 py-2 rounded-md border border-input bg-muted text-sm truncate font-medium">
                      {editedMeals[day] || ''}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2">
                      <img
                        src={weeklyMeals[day]?.image || "/placeholder.svg"}
                        alt={weeklyMeals[day]?.name || ""}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditMeal(day)}
                        disabled={isLoading}
                      >
                        Edit Details
                      </Button>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`active-${day}`}
                          checked={activeDays[day] || false}
                          onCheckedChange={() => toggleDayActive(day)}
                          disabled={isLoading}
                        />
                        <Label htmlFor={`active-${day}`} className="text-sm">
                          {activeDays[day] ? "Active" : "Inactive"}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveAllChanges} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Save All Changes'}
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Meal Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Meal Details</DialogTitle>
            <DialogDescription>Update the detailed information for this meal.</DialogDescription>
          </DialogHeader>
          
          {currentEditMeal && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={currentEditMeal.name}
                  onChange={(e) => handleEditMealChange('name', e.target.value)}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-image" className="text-right">
                  Image URL
                </Label>
                <div className="col-span-3 flex space-x-2">
                  <Input
                    id="edit-image"
                    value={currentEditMeal.image}
                    onChange={(e) => handleEditMealChange('image', e.target.value)}
                    className="flex-1"
                  />
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        
                        // Create a FormData object
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        try {
                          setIsLoading(true);
                          
                          console.log('Uploading image:', file.name);
                          
                          // Upload the image
                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                          });
                          
                          console.log('Upload response status:', response.status);
                          
                          const result = await response.json();
                          console.log('Upload result:', result);
                          
                          if (result.success) {
                            // Update the image URL
                            const newImageUrl = result.data.url;
                            console.log('New image URL:', newImageUrl);
                            
                            handleEditMealChange('image', newImageUrl);
                            
                            // Force UI refresh
                            setCurrentEditMeal(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                image: newImageUrl
                              };
                            });
                            
                            toast({
                              title: "Image uploaded",
                              description: result.data.fallback 
                                ? "Used fallback image due to S3 issue" 
                                : "The image was uploaded successfully",
                            });
                          } else {
                            console.error('Upload failed:', result.error);
                            toast({
                              title: "Upload failed",
                              description: result.error || "Failed to upload image",
                              variant: "destructive"
                            });
                          }
                        } catch (error) {
                          console.error('Error uploading image:', error);
                          toast({
                            title: "Error",
                            description: "An error occurred while uploading the image",
                            variant: "destructive"
                          });
                        } finally {
                          setIsLoading(false);
                          
                          // Reset the input to allow uploading the same file again
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    Upload
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Preview
                </Label>
                <div className="col-span-3">
                  <div className="w-32 h-32 overflow-hidden rounded-md border">
                    <img
                      src={currentEditMeal.image || "/placeholder.svg"}
                      alt={currentEditMeal.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <textarea
                  id="edit-description"
                  value={currentEditMeal.description}
                  onChange={(e) => handleEditMealChange('description', e.target.value)}
                  className="col-span-3 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-calories" className="text-right">
                  Calories
                </Label>
                <Input
                  id="edit-calories"
                  type="number"
                  value={currentEditMeal.calories || ''}
                  onChange={(e) => handleEditMealChange('calories', parseInt(e.target.value) || 0)}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-time" className="text-right">
                  Time
                </Label>
                <Input
                  id="edit-time"
                  value={currentEditMeal.time || ''}
                  onChange={(e) => handleEditMealChange('time', e.target.value)}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-date" className="text-right">
                  Specific Date
                </Label>
                <Input
                  id="edit-date"
                  value={currentEditMeal.date || ''}
                  onChange={(e) => handleEditMealChange('date', e.target.value)}
                  placeholder="YYYY-MM-DD or any date format"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-tags" className="text-right">
                  Tags
                </Label>
                <Input
                  id="edit-tags"
                  value={(currentEditMeal.tags || []).join(', ')}
                  onChange={(e) => handleEditMealChange('tags', e.target.value.split(',').map(tag => tag.trim()))}
                  placeholder="Comma-separated tags"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-ingredients" className="text-right">
                  Ingredients
                </Label>
                <Input
                  id="edit-ingredients"
                  value={(currentEditMeal.ingredients || []).join(', ')}
                  onChange={(e) => handleEditMealChange('ingredients', e.target.value.split(',').map(item => item.trim()))}
                  placeholder="Comma-separated ingredients"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-allergens" className="text-right">
                  Allergens
                </Label>
                <Input
                  id="edit-allergens"
                  value={(currentEditMeal.allergens || []).join(', ')}
                  onChange={(e) => handleEditMealChange('allergens', e.target.value.split(',').map(item => item.trim()))}
                  placeholder="Comma-separated allergens"
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditedMeal} disabled={isLoading}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

