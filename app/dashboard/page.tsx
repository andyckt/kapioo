"use client"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, History, LogOut, Settings, ShoppingCart, User, Calendar, Users, Gift } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserNav } from "@/components/user-nav"
import { MainNav } from "@/components/main-nav"
import { useToast } from "@/hooks/use-toast"
import { NotificationBell } from "@/components/notification-bell"
import { MealDetail } from "@/components/meal-detail"
import { ReferralCard } from "@/components/referral-card"
import { DeliveryTracking } from "@/components/delivery-tracking"
// import { SupportChat } from "@/components/support-chat"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { MealCustomization } from "@/components/meal-customization"
import { CommunityRecipes } from "@/components/community-recipes"
import { ThisWeekMeals } from "@/components/this-week-meals"
import { getWeeklyMeals } from "@/lib/utils"

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [credits, setCredits] = useState(50)
  const [activeTab, setActiveTab] = useState("overview")
  const [customizeMeal, setCustomizeMeal] = useState(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const meals = getWeeklyMeals()

  useEffect(() => {
    // Check if user is logged in - in a real app, this would verify the session
    const isLoggedIn = true // Simulated for demo
    if (!isLoggedIn) {
      router.push("/login")
    }
  }, [router])

  const menuItems = [
    { id: "overview", label: "Overview", icon: <User className="h-4 w-4" /> },
    { id: "orders", label: "Upcoming Meal", icon: <History className="h-4 w-4" /> },
    { id: "select-meals", label: "Select Meals", icon: <ShoppingCart className="h-4 w-4" /> },
    { id: "delivery", label: "Delivery Tracking", icon: <Calendar className="h-4 w-4" /> },
    /* Commented out for now
    { id: "nutrition", label: "Nutrition", icon: <BarChart2 className="h-4 w-4" /> },
    */
    { id: "community", label: "Community", icon: <Users className="h-4 w-4" /> },
    { id: "credits", label: "Credits", icon: <CreditCard className="h-4 w-4" /> },
    { id: "refer", label: "Refer a Friend", icon: <Gift className="h-4 w-4" /> },
    /* Commented out for now
    { id: "loyalty", label: "Loyalty Program", icon: <Award className="h-4 w-4" /> },
    { id: "gift", label: "Gift Cards", icon: <Gift className="h-4 w-4" /> },
    { id: "subscription", label: "Subscription", icon: <Bell className="h-4 w-4" /> },
    */
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with mobile menu button */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden mr-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </Button>
            <MainNav />
          </div>
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <UserNav />
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden">
          <div className="fixed inset-y-0 left-0 z-50 w-3/4 max-w-xs bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            </div>
            <nav className="grid gap-2">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => {
                    setActiveTab(item.id)
                    setIsMobileMenuOpen(false)
                  }}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Button>
              ))}
              <Button
                variant="ghost"
                className="justify-start text-red-500 hover:text-red-600 hover:bg-red-100 mt-4"
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
            </nav>
          </div>
        </div>
      )}

      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr] pt-6">
        <aside className="hidden w-[200px] flex-col md:flex">
          <motion.nav
            className="grid items-start gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className="justify-start"
                onClick={() => setActiveTab(item.id)}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="justify-start text-red-500 hover:text-red-600 hover:bg-red-100"
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
          </motion.nav>
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="transform transition-all hover:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{credits}</div>
                      <p className="text-xs text-muted-foreground">Credits can be used to order meals</p>
                    </CardContent>
                  </Card>
                  <Card className="transform transition-all hover:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Upcoming Deliveries</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">2</div>
                      <p className="text-xs text-muted-foreground">Meals scheduled for this week</p>
                    </CardContent>
                  </Card>
                  <Card className="transform transition-all hover:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <History className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">12</div>
                      <p className="text-xs text-muted-foreground">Lifetime orders placed</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <ThisWeekMeals
                    meals={meals}
                    onSelectMeal={(day) => {
                      setActiveTab("select-meals")
                    }}
                  />
                </div>
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
                  <h2 className="text-3xl font-bold tracking-tight">Upcoming Meal</h2>
                </div>

                {/* Moved Upcoming Meals section from overview to here */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Upcoming Meals</CardTitle>
                    <CardDescription>Your scheduled meals for this week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full h-12 w-12 bg-primary flex items-center justify-center text-primary-foreground">
                          M
                        </div>
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium leading-none">Monday</p>
                          <p className="text-sm text-muted-foreground">Grilled Salmon with Vegetables</p>
                        </div>
                        {/* <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCustomizeMeal({
                                  name: "Grilled Salmon with Vegetables",
                                  day: "Monday",
                                })
                              }
                            >
                              Customize
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <MealCustomization meal={customizeMeal} onClose={() => setCustomizeMeal(null)} />
                          </DialogContent>
                        </Dialog> */}
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full h-12 w-12 bg-primary flex items-center justify-center text-primary-foreground">
                          W
                        </div>
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium leading-none">Wednesday</p>
                          <p className="text-sm text-muted-foreground">Chicken Alfredo Pasta</p>
                        </div>
                        {/* <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCustomizeMeal({
                                  name: "Chicken Alfredo Pasta",
                                  day: "Wednesday",
                                })
                              }
                            >
                              Customize
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <MealCustomization meal={customizeMeal} onClose={() => setCustomizeMeal(null)} />
                          </DialogContent>
                        </Dialog> */}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => setActiveTab("select-meals")}>
                      Select More Meals
                    </Button>
                  </CardFooter>
                </Card>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Past Orders</h3>
                  {[1, 2, 3].map((order) => (
                    <Card key={order} className="transform transition-all hover:scale-[1.01]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Order #{1000 + order}</CardTitle>
                          <span className="text-sm font-medium text-muted-foreground">
                            {new Date(2025, 0, order * 7).toLocaleDateString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">Monday</span>
                              <span className="text-sm text-muted-foreground">Beef Stir Fry</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">Wednesday</span>
                              <span className="text-sm text-muted-foreground">Vegetable Curry</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">Friday</span>
                              <span className="text-sm text-muted-foreground">Grilled Chicken</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">Total</span>
                              <span className="text-sm font-bold">3 Credits</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "delivery" && (
              <motion.div
                key="delivery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">Delivery Tracking</h2>
                </div>
                <DeliveryTracking />
              </motion.div>
            )}

            {/* Nutrition section commented out for now
{activeTab === "nutrition" && (
  <motion.div
    key="nutrition"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="space-y-6"
  >
    <div className="flex items-center justify-between">
      <h2 className="text-3xl font-bold tracking-tight">Nutrition Dashboard</h2>
    </div>
    <NutritionDashboard />
  </motion.div>
)}
*/}

            {activeTab === "community" && (
              <motion.div
                key="community"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">Community</h2>
                </div>
                <CommunityRecipes />
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
                  <h2 className="text-3xl font-bold tracking-tight">Credits</h2>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Credit Balance</CardTitle>
                    <CardDescription>Your current credit balance and purchase options</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-5xl font-bold">{credits}</div>
                        <p className="text-sm text-muted-foreground mt-2">Available Credits</p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="transform transition-all hover:scale-105 cursor-pointer">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Basic</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">10</div>
                          <p className="text-sm text-muted-foreground">Credits</p>
                          <div className="mt-4 text-lg font-bold">$50</div>
                        </CardContent>
                        <CardFooter>
                          <Button
                            className="w-full"
                            onClick={() => {
                              setCredits(credits + 10)
                              toast({
                                title: "Credits purchased",
                                description: "10 credits have been added to your account",
                              })
                            }}
                          >
                            Purchase
                          </Button>
                        </CardFooter>
                      </Card>
                      <Card className="transform transition-all hover:scale-105 cursor-pointer border-primary">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Standard</CardTitle>
                          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded-bl-lg">
                            Popular
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">25</div>
                          <p className="text-sm text-muted-foreground">Credits</p>
                          <div className="mt-4 text-lg font-bold">$100</div>
                        </CardContent>
                        <CardFooter>
                          <Button
                            className="w-full"
                            onClick={() => {
                              setCredits(credits + 25)
                              toast({
                                title: "Credits purchased",
                                description: "25 credits have been added to your account",
                              })
                            }}
                          >
                            Purchase
                          </Button>
                        </CardFooter>
                      </Card>
                      <Card className="transform transition-all hover:scale-105 cursor-pointer">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Premium</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">50</div>
                          <p className="text-sm text-muted-foreground">Credits</p>
                          <div className="mt-4 text-lg font-bold">$175</div>
                        </CardContent>
                        <CardFooter>
                          <Button
                            className="w-full"
                            onClick={() => {
                              setCredits(credits + 50)
                              toast({
                                title: "Credits purchased",
                                description: "50 credits have been added to your account",
                              })
                            }}
                          >
                            Purchase
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Credit History</CardTitle>
                    <CardDescription>Your credit purchase and usage history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium">Credit Purchase</p>
                          <p className="text-sm text-muted-foreground">March 15, 2025</p>
                        </div>
                        <div className="text-green-500 font-medium">+25 Credits</div>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium">Weekly Order</p>
                          <p className="text-sm text-muted-foreground">March 10, 2025</p>
                        </div>
                        <div className="text-red-500 font-medium">-3 Credits</div>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium">Credit Purchase</p>
                          <p className="text-sm text-muted-foreground">March 1, 2025</p>
                        </div>
                        <div className="text-green-500 font-medium">+10 Credits</div>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium">Weekly Order</p>
                          <p className="text-sm text-muted-foreground">February 25, 2025</p>
                        </div>
                        <div className="text-red-500 font-medium">-2 Credits</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "refer" && (
              <motion.div
                key="refer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">Refer a Friend</h2>
                </div>
                <ReferralCard />
                <Card>
                  <CardHeader>
                    <CardTitle>How Referrals Work</CardTitle>
                    <CardDescription>Learn more about our referral program</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className="rounded-full bg-primary/10 p-3">
                          <Gift className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-medium">Share Your Code</h3>
                        <p className="text-sm text-muted-foreground">
                          Send your unique referral code to friends and family
                        </p>
                      </div>
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className="rounded-full bg-primary/10 p-3">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-medium">Friend Signs Up</h3>
                        <p className="text-sm text-muted-foreground">They create an account using your referral code</p>
                      </div>
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className="rounded-full bg-primary/10 p-3">
                          <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-medium">Both Get Credits</h3>
                        <p className="text-sm text-muted-foreground">You both receive 5 credits to use on meals</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Loyalty Program section commented out for now
{activeTab === "loyalty" && (
  <motion.div
    key="loyalty"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="space-y-6"
  >
    <div className="flex items-center justify-between">
      <h2 className="text-3xl font-bold tracking-tight">Loyalty Program</h2>
    </div>
    <LoyaltyProgram credits={credits} totalOrders={12} />
  </motion.div>
)}
*/}

            {/* Gift Cards section commented out for now
{activeTab === "gift" && (
  <motion.div
    key="gift"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="space-y-6"
  >
    <div className="flex items-center justify-between">
      <h2 className="text-3xl font-bold tracking-tight">Gift Cards</h2>
    </div>
    <GiftCard />
  </motion.div>
)}
*/}

            {/* Subscription section commented out for now
{activeTab === "subscription" && (
  <motion.div
    key="subscription"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="space-y-6"
  >
    <div className="flex items-center justify-between">
      <h2 className="text-3xl font-bold tracking-tight">Subscription Management</h2>
    </div>
    <SubscriptionManagement />
  </motion.div>
)}
*/}

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
                  <h2 className="text-3xl font-bold tracking-tight">Account Settings</h2>
                </div>

                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="personal">Personal Info</TabsTrigger>
                    <TabsTrigger value="password">Password</TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Update your account details</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" defaultValue="John Doe" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="nickname">Nickname</Label>
                            <Input id="nickname" defaultValue="Johnny" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" defaultValue="john@example.com" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" defaultValue="(123) 456-7890" />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          onClick={() => {
                            toast({
                              title: "Settings updated",
                              description: "Your account information has been updated",
                            })
                          }}
                        >
                          Save Changes
                        </Button>
                      </CardFooter>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Delivery Address</CardTitle>
                        <CardDescription>Update your delivery information</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="address">Street Address</Label>
                            <Input id="address" defaultValue="123 Main St" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" defaultValue="Anytown" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Input id="state" defaultValue="CA" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="zip">ZIP Code</Label>
                            <Input id="zip" defaultValue="12345" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input id="country" defaultValue="United States" />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          onClick={() => {
                            toast({
                              title: "Address updated",
                              description: "Your delivery address has been updated",
                            })
                          }}
                        >
                          Save Changes
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>

                  <TabsContent value="password" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Password</CardTitle>
                        <CardDescription>Change your password</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input id="current-password" type="password" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input id="new-password" type="password" />
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
                              title: "Password updated",
                              description: "Your password has been changed successfully",
                            })
                          }}
                        >
                          Change Password
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}

            {activeTab === "select-meals" && (
              <motion.div
                key="select-meals"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold tracking-tight">Select Meals</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Available Credits:</span>
                    <span className="text-sm font-bold">{credits}</span>
                  </div>
                </div>

                <WeeklyMealSelector credits={credits} setCredits={setCredits} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Removed SupportChat component */}
    </div>
  )
}

// Update the WeeklyMealSelector function to use our new MealDetail component
function WeeklyMealSelector({ credits, setCredits }) {
  const [selectedMeals, setSelectedMeals] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  })
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [formData, setFormData] = useState({
    nickname: "Johnny",
    address: "123 Main St",
    phone: "(123) 456-7890",
  })
  const { toast } = useToast()
  const router = useRouter()
  const [customizeMeal, setCustomizeMeal] = useState(null)

  const meals = getWeeklyMeals()

  const toggleMeal = (day) => {
    setSelectedMeals({
      ...selectedMeals,
      [day]: !selectedMeals[day],
    })
  }

  const selectedCount = Object.values(selectedMeals).filter(Boolean).length
  const canCheckout = selectedCount > 0 && selectedCount <= credits

  const handleCheckout = () => {
    if (canCheckout) {
      setCredits(credits - selectedCount)
      toast({
        title: "Order placed successfully!",
        description: `You have ordered ${selectedCount} meals for the week.`,
      })
      setSelectedMeals({
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      })
      setCheckoutOpen(false)
    }
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData({
      ...formData,
      [id]: value,
    })
  }

  return (
    <div className="space-y-6">
      {!checkoutOpen ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>This Week's Menu</CardTitle>
              <CardDescription>Select the days you want meals delivered. Each meal costs 1 credit.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Object.entries(meals).map(([day, meal]) => (
                  <div key={day} className="relative">
                    <MealDetail meal={meal} day={day} onSelect={toggleMeal} isSelected={selectedMeals[day]} />
                    {/* {selectedMeals[day] && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 left-2 z-10"
                            onClick={() =>
                              setCustomizeMeal({
                                name: meal.name,
                                day: day,
                              })
                            }
                          >
                            Customize
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <MealCustomization meal={customizeMeal} onClose={() => setCustomizeMeal(null)} />
                        </DialogContent>
                      </Dialog>
                    )} */}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                <p className="text-sm font-medium">Selected: {selectedCount} meals</p>
              </div>
              <Button disabled={!canCheckout} onClick={() => setCheckoutOpen(true)}>
                Proceed to Checkout
              </Button>
            </CardFooter>
          </Card>

          {/* <MealCalendar selectedMeals={selectedMeals} meals={meals} /> */}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
              <CardDescription>Confirm your order details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-medium">Selected Meals</h3>
                <div className="rounded-md border p-4">
                  <ul className="space-y-2">
                    {Object.entries(selectedMeals).map(
                      ([day, selected]) =>
                        selected && (
                          <li key={day} className="flex justify-between">
                            <span className="capitalize">{day}</span>
                            <span className="text-muted-foreground">{meals[day].name}</span>
                          </li>
                        ),
                    )}
                  </ul>
                  <div className="mt-4 pt-4 border-t flex justify-between font-medium">
                    <span>Total</span>
                    <span>{selectedCount} Credits</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Delivery Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input id="nickname" value={formData.nickname} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input id="address" value={formData.address} onChange={handleInputChange} />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
                Back
              </Button>
              <Button onClick={handleCheckout}>Complete Order</Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

