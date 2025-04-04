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
import { CreditCard, LogOut, Settings, ShoppingCart, Users, Calendar, BarChart } from "lucide-react"

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
  type Meal
} from "@/lib/utils"

// Add interface for user object
interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
  joined: string;
  status: string;
  address: string;
  phone: string;
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [addCreditsOpen, setAddCreditsOpen] = useState(false)
  const [viewUserOpen, setViewUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creditAmount, setCreditAmount] = useState(10)

  useEffect(() => {
    // Check if admin is logged in - in a real app, this would verify the session
    const isAdminLoggedIn = true // Simulated for demo
    if (!isAdminLoggedIn) {
      router.push("/login")
    }
  }, [router])

  const handleAddCredits = (user: User) => {
    setSelectedUser(user)
    setCreditAmount(10) // Reset to default
    setAddCreditsOpen(true)
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setViewUserOpen(true)
  }

  const confirmAddCredits = () => {
    if (!selectedUser) return;
    
    toast({
      title: "Credits updated",
      description: `Added ${creditAmount} credits to ${selectedUser.name}'s account`,
    })
    setAddCreditsOpen(false)
  }

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
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>Manage user accounts and credits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input placeholder="Search users..." className="max-w-sm" />
                        <Button variant="outline">Search</Button>
                      </div>
                      <div className="rounded-md border">
                        <div className="grid grid-cols-5 gap-4 p-4 font-medium border-b">
                          <div>User ID</div>
                          <div>Name</div>
                          <div>Email</div>
                          <div>Credits</div>
                          <div>Actions</div>
                        </div>
                        {[
                          {
                            id: "user123",
                            name: "John Doe",
                            email: "john@example.com",
                            credits: 50,
                            joined: "2023-01-15",
                            status: "Active",
                            address: "123 Main St, New York, NY",
                            phone: "+1 (555) 123-4567",
                          },
                          {
                            id: "user456",
                            name: "Jane Smith",
                            email: "jane@example.com",
                            credits: 25,
                            joined: "2023-02-20",
                            status: "Active",
                            address: "456 Oak Ave, San Francisco, CA",
                            phone: "+1 (555) 987-6543",
                          },
                          {
                            id: "user789",
                            name: "Bob Johnson",
                            email: "bob@example.com",
                            credits: 10,
                            joined: "2023-03-10",
                            status: "Inactive",
                            address: "789 Pine Rd, Chicago, IL",
                            phone: "+1 (555) 456-7890",
                          },
                          {
                            id: "user101",
                            name: "Alice Brown",
                            email: "alice@example.com",
                            credits: 35,
                            joined: "2023-04-05",
                            status: "Active",
                            address: "101 Maple Dr, Austin, TX",
                            phone: "+1 (555) 234-5678",
                          },
                          {
                            id: "user202",
                            name: "Charlie Davis",
                            email: "charlie@example.com",
                            credits: 15,
                            joined: "2023-05-12",
                            status: "Active",
                            address: "202 Cedar Ln, Seattle, WA",
                            phone: "+1 (555) 876-5432",
                          },
                        ].map((user) => (
                          <div key={user.id} className="grid grid-cols-5 gap-4 p-4 border-b items-center">
                            <div>{user.id}</div>
                            <div>{user.name}</div>
                            <div>{user.email}</div>
                            <div>{user.credits}</div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleAddCredits(user)}>
                                Add Credits
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex items-center justify-between w-full">
                      <Button variant="outline" size="sm">
                        Previous
                      </Button>
                      <div className="text-sm text-muted-foreground">Page 1 of 5</div>
                      <Button variant="outline" size="sm">
                        Next
                      </Button>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Current Week Orders</CardTitle>
                    <CardDescription>View and manage orders for the current week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input placeholder="Search orders..." className="max-w-sm" />
                        <Button variant="outline">Search</Button>
                      </div>
                      <div className="rounded-md border">
                        <div className="grid grid-cols-6 gap-4 p-4 font-medium border-b">
                          <div>Order ID</div>
                          <div>User</div>
                          <div>Days</div>
                          <div>Address</div>
                          <div>Status</div>
                          <div>Actions</div>
                        </div>
                        {[
                          {
                            id: "ORD-1001",
                            user: "John Doe",
                            days: "Mon, Wed",
                            address: "123 Main St",
                            status: "Pending",
                          },
                          {
                            id: "ORD-1002",
                            user: "Jane Smith",
                            days: "Tue, Thu, Sat",
                            address: "456 Oak Ave",
                            status: "Confirmed",
                          },
                          {
                            id: "ORD-1003",
                            user: "Bob Johnson",
                            days: "Mon, Fri",
                            address: "789 Pine Rd",
                            status: "Delivered",
                          },
                          {
                            id: "ORD-1004",
                            user: "Alice Brown",
                            days: "Wed, Sun",
                            address: "101 Maple Dr",
                            status: "Confirmed",
                          },
                          {
                            id: "ORD-1005",
                            user: "Charlie Davis",
                            days: "Mon, Thu, Fri",
                            address: "202 Cedar Ln",
                            status: "Pending",
                          },
                        ].map((order) => (
                          <div key={order.id} className="grid grid-cols-6 gap-4 p-4 border-b items-center">
                            <div>{order.id}</div>
                            <div>{order.user}</div>
                            <div>{order.days}</div>
                            <div>{order.address}</div>
                            <div>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  order.status === "Pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : order.status === "Confirmed"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: "Status updated",
                                    description: `Order ${order.id} status updated successfully`,
                                  })
                                }}
                              >
                                Update Status
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex items-center justify-between w-full">
                      <Button variant="outline" size="sm">
                        Previous
                      </Button>
                      <div className="text-sm text-muted-foreground">Page 1 of 3</div>
                      <Button variant="outline" size="sm">
                        Next
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
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
                        <Label htmlFor="user-id">User ID</Label>
                        <Input id="user-id" placeholder="Enter user ID" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="credits">Credits to Add</Label>
                        <Input id="credits" type="number" defaultValue="10" />
                      </div>
                      <div className="flex items-end">
                        <Button
                          className="w-full"
                          onClick={() => {
                            toast({
                              title: "Credits added",
                              description: "Credits have been added to the user's account",
                            })
                          }}
                        >
                          Add Credits
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Credit Transactions</CardTitle>
                    <CardDescription>Recent credit transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <div className="grid grid-cols-5 gap-4 p-4 font-medium border-b">
                        <div>Transaction ID</div>
                        <div>User</div>
                        <div>Type</div>
                        <div>Amount</div>
                        <div>Date</div>
                      </div>
                      {[
                        { id: "TRX-1001", user: "John Doe", type: "Purchase", amount: "+25", date: "2025-03-15" },
                        { id: "TRX-1002", user: "Jane Smith", type: "Order", amount: "-3", date: "2025-03-14" },
                        { id: "TRX-1003", user: "Bob Johnson", type: "Admin Add", amount: "+10", date: "2025-03-12" },
                        { id: "TRX-1004", user: "Alice Brown", type: "Purchase", amount: "+50", date: "2025-03-10" },
                        { id: "TRX-1005", user: "Charlie Davis", type: "Order", amount: "-2", date: "2025-03-08" },
                      ].map((transaction) => (
                        <div key={transaction.id} className="grid grid-cols-5 gap-4 p-4 border-b items-center">
                          <div>{transaction.id}</div>
                          <div>{transaction.user}</div>
                          <div>{transaction.type}</div>
                          <div className={transaction.amount.startsWith("+") ? "text-green-600" : "text-red-600"}>
                            {transaction.amount}
                          </div>
                          <div>{transaction.date}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex items-center justify-between w-full">
                      <Button variant="outline" size="sm">
                        Previous
                      </Button>
                      <div className="text-sm text-muted-foreground">Page 1 of 5</div>
                      <Button variant="outline" size="sm">
                        Next
                      </Button>
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
            <DialogDescription>Add credits to {selectedUser?.name}'s account.</DialogDescription>
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
                  onChange={(e) => setCreditAmount(Number.parseInt(e.target.value) || 0)}
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
            <DialogDescription>Detailed information about {selectedUser?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">User ID</Label>
                    <p className="font-medium">{selectedUser.id}</p>
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
                    <p className="font-medium">{selectedUser.joined}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Address</Label>
                  <p className="font-medium">{selectedUser.address}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Credits</Label>
                  <p className="font-medium">{selectedUser.credits}</p>
                </div>
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Recent Activity</Label>
                  <div className="mt-2 space-y-2">
                    <div className="rounded-md border p-2">
                      <p className="text-sm">Ordered meals for Mon, Wed</p>
                      <p className="text-xs text-muted-foreground">2 days ago</p>
                    </div>
                    <div className="rounded-md border p-2">
                      <p className="text-sm">Added 10 credits</p>
                      <p className="text-xs text-muted-foreground">1 week ago</p>
                    </div>
                    <div className="rounded-md border p-2">
                      <p className="text-sm">Updated delivery address</p>
                      <p className="text-xs text-muted-foreground">2 weeks ago</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUserOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Update the MealManagement component to use the MongoDB API
function MealManagement() {
  const { toast } = useToast();
  const [weeklyMeals, setWeeklyMeals] = useState<WeeklyMeals>({});
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [editedMeals, setEditedMeals] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMealId, setSelectedMealId] = useState<Record<string, string>>({});

  // Load meals on component mount
  useEffect(() => {
    async function loadData() {
      try {
        // Get current weekly meals
        const mealsResult = await getWeeklyMeals();
        setWeeklyMeals(mealsResult);
        
        // Get all available meals
        const allMeals = await getAvailableMeals();
        setAvailableMeals(allMeals);
        
        // Initialize edited meals with current names
        const initialEditState: Record<string, string> = {};
        const initialMealIdState: Record<string, string> = {};
        
        Object.entries(mealsResult).forEach(([day, meal]) => {
          initialEditState[day] = meal.name;
          initialMealIdState[day] = meal._id || '';
        });
        
        setEditedMeals(initialEditState);
        setSelectedMealId(initialMealIdState);
        
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
    if (!editedMeals[day] || !selectedMealId[day]) return;
    
    try {
      setIsLoading(true);
      
      // Assign the selected meal to the day
      const success = await assignMealToDay(day, selectedMealId[day]);
      
      if (success) {
        // Update local state
        const selectedMeal = availableMeals.find(meal => meal._id === selectedMealId[day]);
        if (selectedMeal) {
          setWeeklyMeals({
            ...weeklyMeals,
            [day]: selectedMeal
          });
        }
        
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
      
      const days = Object.keys(selectedMealId);
      let successCount = 0;
      
      // Update each day one by one
      for (const day of days) {
        if (selectedMealId[day]) {
          const success = await assignMealToDay(day, selectedMealId[day]);
          if (success) {
            successCount++;
          }
        }
      }
      
      if (successCount === days.length) {
        toast({
          title: "All meals updated",
          description: "The weekly menu has been updated successfully"
        });
        
        // Refresh the data
        const updatedMeals = await getWeeklyMeals();
        setWeeklyMeals(updatedMeals);
      } else {
        toast({
          title: "Partial update",
          description: `Updated ${successCount} out of ${days.length} meals`,
        });
      }
    } catch (error) {
      console.error('Error saving all changes:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving changes",
        variant: "destructive"
      });
    } finally {
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
    <Card>
      <CardHeader>
        <CardTitle>Weekly Menu</CardTitle>
        <CardDescription>Update the meals for each day of the week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(weeklyMeals).map(([day, meal]) => (
            <div key={day} className="grid gap-4 md:grid-cols-[1fr_2fr_1fr_1fr]">
              <div className="flex items-center">
                <span className="font-medium capitalize">{day}</span>
              </div>
              <div className="flex items-center">
                <select 
                  id={`meal-select-${day}`}
                  value={selectedMealId[day] || ''}
                  onChange={(e) => handleMealSelect(day, e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>Select a meal</option>
                  {availableMeals.map((availableMeal) => (
                    <option key={availableMeal._id} value={availableMeal._id}>
                      {availableMeal.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <div className="flex items-center gap-2">
                  <img
                    src={meal.image || "/placeholder.svg"}
                    alt={meal.name}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateDayMeal(day)}
                  disabled={isLoading}
                >
                  Update
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={saveAllChanges} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save All Changes'}
        </Button>
      </CardFooter>
    </Card>
  );
}

