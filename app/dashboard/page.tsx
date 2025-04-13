"use client"

import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { Label } from "@/components/ui/label"

import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, History, LogOut, Settings, ShoppingCart, User, Calendar, Users, Gift, CheckCircle2, Menu, X, Sparkles, Loader2 } from "lucide-react"

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
import { getWeeklyMeals, type WeeklyMeals, getUserById, type User as UserType } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { OrderHistory } from "@/components/order-history"
import { useLanguage } from "@/lib/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language } = useLanguage()
  const [credits, setCredits] = useState(0)
  const [activeTab, setActiveTab] = useState("overview")
  const [customizeMeal, setCustomizeMeal] = useState(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [meals, setMeals] = useState<WeeklyMeals>({})
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<UserType | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsPagination, setTransactionsPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 1
  })
  const [upcomingDeliveries, setUpcomingDeliveries] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [orderStatsLoading, setOrderStatsLoading] = useState(true)
  
  // Add state for meal selection and checkout
  const [selectedMeals, setSelectedMeals] = useState({
    monday: { selected: false, date: '' },
    tuesday: { selected: false, date: '' },
    wednesday: { selected: false, date: '' },
    thursday: { selected: false, date: '' },
    friday: { selected: false, date: '' },
    saturday: { selected: false, date: '' },
    sunday: { selected: false, date: '' },
  })
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  // Add form state for user settings
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    nickname: '',
    email: '',
    phone: ''
  });

  const [addressInfo, setAddressInfo] = useState({
    unitNumber: '',
    streetAddress: '',
    city: '',
    province: '', // State in UI
    postalCode: '', // ZIP code in UI
    country: '',
    buzzCode: ''
  });

  // Add state for password fields
  const [passwordInfo, setPasswordInfo] = useState<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Add form state for checkout
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    specialInstructions: ''
  });

  // Effect to load meal selections from localStorage
  useEffect(() => {
    try {
      const savedSelections = localStorage.getItem('selectedMeals');
      if (savedSelections) {
        const parsed = JSON.parse(savedSelections);
        
        // Handle both old and new structure
        if (typeof parsed.monday === 'boolean') {
          // Convert old structure to new structure
          setSelectedMeals({
            monday: { selected: parsed.monday || false, date: '' },
            tuesday: { selected: parsed.tuesday || false, date: '' },
            wednesday: { selected: parsed.wednesday || false, date: '' },
            thursday: { selected: parsed.thursday || false, date: '' },
            friday: { selected: parsed.friday || false, date: '' },
            saturday: { selected: parsed.saturday || false, date: '' },
            sunday: { selected: parsed.sunday || false, date: '' },
          });
        } else {
          // New structure with dates
          setSelectedMeals({
            monday: parsed.monday || { selected: false, date: '' },
            tuesday: parsed.tuesday || { selected: false, date: '' },
            wednesday: parsed.wednesday || { selected: false, date: '' },
            thursday: parsed.thursday || { selected: false, date: '' },
            friday: parsed.friday || { selected: false, date: '' },
            saturday: parsed.saturday || { selected: false, date: '' },
            sunday: parsed.sunday || { selected: false, date: '' },
          });
        }
      }
    } catch (error) {
      console.error('Error loading saved meal selections:', error);
    }
  }, []);

  useEffect(() => {
    async function loadMeals() {
      try {
        setIsLoading(true)
        console.log('[Dashboard] Fetching weekly meals...');
        const weeklyMeals = await getWeeklyMeals()
        
        console.log('[Dashboard] Meals received:', {
          count: Object.keys(weeklyMeals).length,
          days: Object.keys(weeklyMeals),
          meals: weeklyMeals
        });
        
        setMeals(weeklyMeals)
      } catch (error) {
        console.error('[Dashboard] Error loading meals:', error)
        toast({
          title: "Error",
          description: "Failed to load this week's meals",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    // Load meals on initial render and whenever the user switches to overview or select-meals tab
    if (activeTab === "overview" || activeTab === "select-meals") {
      console.log(`[Dashboard] Loading meals for tab: ${activeTab}`);
      loadMeals()
    }
  }, [toast, activeTab])

  useEffect(() => {
    // Check if user is logged in - get user from localStorage
    const userDataStr = localStorage.getItem('user');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    if (!userDataStr && !isAuthenticated) {
      router.push("/login");
      return;
    }

    // Load user data
    async function loadUserData() {
      try {
        setUserLoading(true);
        const userData = JSON.parse(userDataStr!);
        
        // Check if userData has _id before proceeding
        if (!userData || !userData._id) {
          console.error('User data is missing _id:', userData);
          toast({
            title: "Error",
            description: "User data is incomplete. Please log out and log in again.",
            variant: "destructive"
          });
          setUserLoading(false);
          return;
        }
        
        // Use the getUserById function to get full user data
        const user = await getUserById(userData._id);
        
        if (user) {
          // If there's no createdAt but there is joined, use joined for createdAt
          if (!user.createdAt && user.joined) {
            user.createdAt = user.joined;
          }
          
          setUserData(user);
          setCredits(user.credits || 0);
          
          // Set form data for checkout
          setFormData({
            name: user.name || '',
            phone: user.phone || '',
            specialInstructions: ''
          });
          
          // Set form data
          setPersonalInfo({
            name: user.name || '',
            nickname: user.nickname || '',
            email: user.email || '',
            phone: user.phone || ''
          });
          
          // Set address data if available
          if (user.address) {
            setAddressInfo({
              unitNumber: user.address.unitNumber || '',
              streetAddress: user.address.streetAddress || '',
              city: user.address.city || '',
              province: user.address.province || '', // State in UI
              postalCode: user.address.postalCode || '', // ZIP code in UI
              country: user.address.country || '',
              buzzCode: user.address.buzzCode || ''
            });
          }
        } else {
          // Handle the case when user data couldn't be fetched
          console.error('Failed to fetch user data from API');
          toast({
            title: "Error",
            description: "Failed to load user data from server",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive"
        });
      } finally {
        setUserLoading(false);
      }
    }
    
    loadUserData();
  }, [router, toast]);

  useEffect(() => {
    if (activeTab === "credits" && userData) {
      console.log("Credits tab is active and userData is available, fetching transactions...");
      fetchTransactions();
    }
  }, [activeTab, userData]);

  // Effect to reload address info when switching to settings tab
  useEffect(() => {
    if (activeTab === "settings" && userData?._id) {
      // Load fresh user data to ensure we have the latest address
      const fetchUserData = async () => {
        try {
          const user = await getUserById(userData._id);
          if (user && user.address) {
            // Update address info from the fresh data
            setAddressInfo({
              unitNumber: user.address.unitNumber || '',
              streetAddress: user.address.streetAddress || '',
              city: user.address.city || '',
              province: user.address.province || '',
              postalCode: user.address.postalCode || '',
              country: user.address.country || '',
              buzzCode: user.address.buzzCode || ''
            });
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      };
      
      fetchUserData();
    }
  }, [activeTab, userData?._id]);

  // Effect to fetch total orders and upcoming deliveries when userData is loaded
  useEffect(() => {
    if (userData?._id) {
      // Fetch order stats for the user
      const fetchOrderStats = async () => {
        setOrderStatsLoading(true);
        try {
          const response = await fetch(`/api/users/${userData._id}/orders/count`);
          const data = await response.json();
          
          if (data.success && data.data) {
            setTotalOrders(data.data.totalOrders);
            setUpcomingDeliveries(data.data.upcomingDeliveries);
          }
        } catch (error) {
          console.error('Error fetching order statistics:', error);
        } finally {
          setOrderStatsLoading(false);
        }
      };
      
      fetchOrderStats();
    }
  }, [userData?._id]);

  const fetchTransactions = async (page = 1) => {
    if (!userData) return;
    
    console.log("userData in fetchTransactions:", {
      _id: userData._id,
      userID: userData.userID,
      name: userData.name,
      email: userData.email
    });
    
    setTransactionsLoading(true);
    try {
      console.log(`Fetching transactions for user: ${userData._id}, page: ${page}`);
      const response = await fetch(`/api/transactions?userId=${userData._id}&page=${page}&limit=${transactionsPagination.limit}`);
      const data = await response.json();
      console.log("Transaction API response:", data);
      
      if (data.success) {
        setTransactions(data.data.transactions || []);
        setTransactionsPagination({
          page: data.data.page,
          limit: data.data.limit,
          total: data.data.total,
          pages: Math.ceil(data.data.total / data.data.limit)
        });
      } else {
        console.error("API returned error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };
  
  const handleTransactionPagination = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev' 
      ? Math.max(1, transactionsPagination.page - 1)
      : Math.min(transactionsPagination.pages, transactionsPagination.page + 1);
      
    if (newPage !== transactionsPagination.page) {
      fetchTransactions(newPage);
    }
  };

  const menuItems = [
    { id: "overview", label: t('overview'), icon: <User className="h-4 w-4" /> },
    { id: "orders", label: t('myOrders'), icon: <History className="h-4 w-4" /> },
    { id: "select-meals", label: t('selectMeals'), icon: <ShoppingCart className="h-4 w-4" /> },
    /* Commented out Delivery Tracking tab
    { id: "delivery", label: "Delivery Tracking", icon: <Calendar className="h-4 w-4" /> },
    */
    /* Commented out for now
    { id: "nutrition", label: "Nutrition", icon: <BarChart2 className="h-4 w-4" /> },
    */
    /* Commented out Community tab 
    { id: "community", label: "Community", icon: <Users className="h-4 w-4" /> },
    */
    { id: "credits", label: t('credits'), icon: <CreditCard className="h-4 w-4" /> },
    /* Commented out Referral tab
    { id: "refer", label: "Refer a Friend", icon: <Gift className="h-4 w-4" /> },
    */
    /* Commented out for now
    { id: "loyalty", label: "Loyalty Program", icon: <Award className="h-4 w-4" /> },
    { id: "gift", label: "Gift Cards", icon: <Gift className="h-4 w-4" /> },
    { id: "subscription", label: "Subscription", icon: <Bell className="h-4 w-4" /> },
    */
    { id: "settings", label: t('settings'), icon: <Settings className="h-4 w-4" /> },
  ]

  // Handle personal info form changes
  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPersonalInfo((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle address form changes
  const handleAddressInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setAddressInfo((prev) => ({
      ...prev,
      [id === 'state' ? 'province' : id === 'zip' ? 'postalCode' : id]: value
    }));
  };

  // Handle saving personal information
  const handleSavePersonalInfo = async () => {
    if (!userData?._id) return;
    
    try {
      const response = await fetch(`/api/users/${userData._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: personalInfo.name,
          nickname: personalInfo.nickname,
          email: personalInfo.email,
          phone: personalInfo.phone
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local state with new data
        setUserData((prev: UserType | null) => prev ? { ...prev, ...personalInfo } : null);
        
        // Update localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          const updatedUser = { ...userObj, ...personalInfo };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        toast({
          title: t('changesSaved'),
          description: t('personalInfoSaved'),
        });
      } else {
        toast({
          title: t('errorOccurred'),
          description: result.error || t('personalInfoError'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating personal info:', error);
      toast({
        title: t('errorOccurred'),
        description: t('personalInfoError'),
        variant: "destructive"
      });
    }
  };

  // Handle saving address information
  const handleSaveAddressInfo = async () => {
    if (!userData?._id) return;
    
    try {
      const response = await fetch(`/api/users/${userData._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: {
            unitNumber: addressInfo.unitNumber,
            streetAddress: addressInfo.streetAddress,
            city: addressInfo.city,
            province: addressInfo.province,
            postalCode: addressInfo.postalCode,
            country: addressInfo.country,
            buzzCode: addressInfo.buzzCode
          }
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local state with new data
        setUserData((prev: UserType | null) => prev ? { 
          ...prev, 
          address: {
            ...addressInfo
          } 
        } : null);
        
        // Update localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          const updatedUser = { 
            ...userObj, 
            address: {
              ...addressInfo
            } 
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        toast({
          title: t('changesSaved'),
          description: t('addressSaved'),
        });
      } else {
        toast({
          title: t('errorOccurred'),
          description: result.error || t('addressError'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating address:', error);
      toast({
        title: t('errorOccurred'),
        description: t('addressError'),
        variant: "destructive"
      });
    }
  };

  // Handle password form changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPasswordInfo((prev) => ({
      ...prev,
      [id === 'current-password' ? 'currentPassword' : 
       id === 'new-password' ? 'newPassword' : 
       id === 'confirm-password' ? 'confirmPassword' : id]: value
    }));
  };

  // Handle saving password
  const handleSavePassword = async () => {
    if (!userData?._id) return;
    
    // Validate passwords
    if (!passwordInfo.currentPassword) {
      toast({
        title: t('errorOccurred'),
        description: t('passwordRequired'),
        variant: "destructive"
      });
      return;
    }
    
    if (!passwordInfo.newPassword) {
      toast({
        title: t('errorOccurred'),
        description: t('newPasswordRequired'),
        variant: "destructive"
      });
      return;
    }
    
    if (passwordInfo.newPassword !== passwordInfo.confirmPassword) {
      toast({
        title: t('errorOccurred'),
        description: t('passwordMismatch'),
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${userData._id}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordInfo.currentPassword,
          newPassword: passwordInfo.newPassword
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Clear password fields
        setPasswordInfo({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        toast({
          title: t('changesSaved'),
          description: t('passwordChanged'),
        });
      } else {
        toast({
          title: t('errorOccurred'),
          description: result.error || t('passwordError'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: t('errorOccurred'),
        description: t('passwordError'),
        variant: "destructive"
      });
    }
  };

  // Function to handle checkout from ThisWeekMeals
  const handleThisWeekCheckout = (selections: Record<string, { selected: boolean, date: string }>) => {
    // Save to localStorage
    localStorage.setItem('selectedMeals', JSON.stringify(selections));
    
    // Set the selected meals with type casting to ensure compatibility
    setSelectedMeals(selections as {
      monday: { selected: boolean; date: string };
      tuesday: { selected: boolean; date: string };
      wednesday: { selected: boolean; date: string };
      thursday: { selected: boolean; date: string };
      friday: { selected: boolean; date: string };
      saturday: { selected: boolean; date: string };
      sunday: { selected: boolean; date: string };
    });
    
    // Open the checkout
    setCheckoutOpen(true);
    // Switch to the weekly meal tab
    setActiveTab("select-meals");
  };

  // Handle input change for all form fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData({
      ...formData,
      [id]: value,
    })
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-background sticky top-0 z-30 w-full border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <MainNav />
          
          <div className="flex items-center gap-2">
            {/* NotificationBell component temporarily disabled */}
            {/* <NotificationBell /> */}
            <LanguageSwitcher />
            <UserNav setActiveTab={setActiveTab} />
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Mobile menu overlay with enhanced transitions and visual indicators */}
      <AnimatePresence mode="wait">
        {isMobileMenuOpen && (
          <motion.div 
            className="fixed inset-0 z-30 bg-background/90 backdrop-blur-md md:hidden overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <motion.div 
              className="absolute top-0 right-0 left-0 h-1 bg-primary"
              initial={{ scaleX: 0, transformOrigin: "left" }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            />
            
            {/* Close button */}
            <motion.button
              className="absolute top-4 right-4 p-2 rounded-full bg-muted/80 backdrop-blur-sm text-foreground hover:bg-muted/90 focus:outline-none focus:ring-2 focus:ring-primary"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </motion.button>
            
            <motion.div 
              className="container p-6 pt-20"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <nav className="flex flex-col gap-4">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20, filter: "blur(8px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    transition={{ 
                      duration: 0.35, 
                      delay: 0.05 + index * 0.05, 
                      ease: [0.25, 1, 0.5, 1]
                    }}
                  >
                    <Button
                      variant={activeTab === item.id ? "default" : "ghost"}
                      className={`justify-start gap-2 text-base w-full ${
                        activeTab === item.id 
                          ? "relative overflow-hidden group"
                          : ""
                      }`}
                      onClick={() => {
                        setActiveTab(item.id);
                        // Add a slight delay before closing to show the selection animation
                        setTimeout(() => setIsMobileMenuOpen(false), 150);
                      }}
                    >
                      <motion.span
                        initial={{ scale: 1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {item.icon}
                      </motion.span>
                      {item.label}
                      {activeTab === item.id && (
                        <motion.div 
                          className="absolute bottom-0 left-0 h-0.5 bg-primary/70 w-full"
                          layoutId="activeTabIndicator"
                        />
                      )}
                    </Button>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: -20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  transition={{ 
                    duration: 0.35, 
                    delay: 0.05 + menuItems.length * 0.05, 
                    ease: [0.25, 1, 0.5, 1]
                  }}
                >
                  <Button
                    variant="ghost"
                    className="justify-start gap-2 text-base text-destructive w-full"
                    onClick={() => {
                      // Create a simple loading animation before logging out
                      toast({
                        title: "Logging out",
                        description: "Please wait...",
                      });
                      
                      // Close menu first with animation
                      setIsMobileMenuOpen(false);
                      
                      // Then proceed with logout after a short delay
                      setTimeout(() => {
                        localStorage.removeItem('user');
                        toast({
                          title: language === 'en' ? "Logged out" : "已退出登录",
                          description: language === 'en' ? "You have been logged out successfully" : "您已成功退出登录",
                        });
                        router.push("/login");
                      }, 800);
                    }}
                  >
                    <motion.span
                      initial={{ scale: 1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <LogOut className="h-4 w-4" />
                    </motion.span>
                    {t('logOut')}
                  </Button>
                </motion.div>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="w-full md:w-64 border-r bg-background p-4 hidden md:block">
          <nav className="grid gap-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className="justify-start gap-2"
                onClick={() => setActiveTab(item.id)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>
        
        <main className="flex-1 pt-2 md:pt-6 px-4 pb-12 overflow-y-auto">
          <div className="mx-auto max-w-5xl space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ y: 10 }}
                  animate={{ y: 0 }}
                  exit={{ y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mt-4">
                    <h2 className="text-3xl font-bold tracking-tight">{language === 'en' ? `Welcome, ${userData?.name?.split(' ')[0] || ''}` : `欢迎, ${userData?.name?.split(' ')[0] || ''}`}</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="transform transition-all hover:scale-105">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('creditsAvailable')}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {userLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {language === 'en' ? 'Loading...' : '加载中...'}
                            </span>
                          ) : (
                            credits
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{language === 'en' ? 'Credits can be used to order meals' : '餐券可用于订购餐点'}</p>
                      </CardContent>
                    </Card>
                    <Card className="transform transition-all hover:scale-105">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('upcomingDeliveries')}</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {orderStatsLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {language === 'en' ? 'Loading...' : '加载中...'}
                            </span>
                          ) : (
                            upcomingDeliveries
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{language === 'en' ? 'Pending or confirmed orders' : '待处理或已确认的订单'}</p>
                      </CardContent>
                    </Card>
                    <Card className="transform transition-all hover:scale-105">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalOrders')}</CardTitle>
                        <History className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {orderStatsLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {language === 'en' ? 'Loading...' : '加载中...'}
                            </span>
                          ) : (
                            totalOrders
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{language === 'en' ? 'Lifetime orders placed' : '已下单的总订单数'}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <ThisWeekMeals
                      meals={meals}
                      onSelectMeal={() => setActiveTab("select-meals")}
                      onCheckout={handleThisWeekCheckout}
                      isLoading={isLoading}
                    />
                  </div>
                </motion.div>
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
                    <h2 className="text-3xl font-bold tracking-tight">{t('myOrders')}</h2>
                  </div>

                  {/* Order History */}
                  {userData && (
                    <OrderHistory userId={userData._id} />
                  )}

                  {/* Commented out Upcoming Meals section
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
                            <div className="flex items-center">
                              <p className="text-sm font-medium leading-none">Monday</p>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({(() => {
                                  try {
                                    const now = new Date();
                                    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
                                    const daysToAdd = 1 - dayOfWeek; // Monday is day 1
                                    const monday = new Date(now);
                                    monday.setDate(now.getDate() + (daysToAdd <= 0 ? daysToAdd + 7 : daysToAdd));
                                    
                                    const monthFormatter = new Intl.DateTimeFormat('en-CA', {
                                      month: 'short',
                                      timeZone: 'America/Toronto'
                                    });
                                    
                                    const dayFormatter = new Intl.DateTimeFormat('en-CA', {
                                      day: 'numeric',
                                      timeZone: 'America/Toronto'
                                    });
                                    
                                    return `${monthFormatter.format(monday)} ${dayFormatter.format(monday)}`;
                                  } catch (error) {
                                    console.error("Error formatting date:", error);
                                    return "";
                                  }
                                })()})
                              </span>
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs">Confirmed</span>
                              <span className="ml-2">Pasta Primavera</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="rounded-full h-12 w-12 bg-primary flex items-center justify-center text-primary-foreground">
                            W
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center">
                              <p className="text-sm font-medium leading-none">Wednesday</p>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({(() => {
                                  try {
                                    const now = new Date();
                                    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, 3 is Wednesday
                                    const daysToAdd = 3 - dayOfWeek; // Wednesday is day 3
                                    const wednesday = new Date(now);
                                    wednesday.setDate(now.getDate() + (daysToAdd <= 0 ? daysToAdd + 7 : daysToAdd));
                                    
                                    const monthFormatter = new Intl.DateTimeFormat('en-CA', {
                                      month: 'short',
                                      timeZone: 'America/Toronto'
                                    });
                                    
                                    const dayFormatter = new Intl.DateTimeFormat('en-CA', {
                                      day: 'numeric',
                                      timeZone: 'America/Toronto'
                                    });
                                    
                                    return `${monthFormatter.format(wednesday)} ${dayFormatter.format(wednesday)}`;
                                  } catch (error) {
                                    console.error("Error formatting date:", error);
                                    return "";
                                  }
                                })()})
                              </span>
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs">Confirmed</span>
                              <span className="ml-2">Chicken Teriyaki Bowl</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => setActiveTab("select-meals")}
                      >
                        Select More Meals
                      </Button>
                    </CardFooter>
                  </Card>
                  */}
                </motion.div>
              )}

              {/* Comment out Delivery Tracking tab content */}
              {/* 
              {activeTab === "delivery" && (
                <motion.div
                  key="delivery"
                  initial={{ y: 10 }}
                  animate={{ y: 0 }}
                  exit={{ y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mt-4">
                    <h2 className="text-3xl font-bold tracking-tight">Delivery Tracking</h2>
                  </div>
                  <DeliveryTracking />
                </motion.div>
              )}
              */}

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
                <motion.div
                  key="credits"
                  initial={{ y: 10 }}
                  animate={{ y: 0 }}
                  exit={{ y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mt-4">
                    <h2 className="text-3xl font-bold tracking-tight">{t('credits')}</h2>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('creditsAvailable')}</CardTitle>
                      <CardDescription>{t('currentAvailableCredits')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center p-6 rounded-lg">
                        <div className="text-4xl font-bold mb-2">{userData?.credits || 0}</div>
                        <div className="text-muted-foreground text-center">{t('creditsAvailable')}</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('transactionHistory')}</CardTitle>
                      <CardDescription>{t('creditsUsageHistory')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {transactionsLoading ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-2">{language === 'en' ? 'Loading...' : '加载中...'}</span>
                          </div>
                        ) : transactions && transactions.length > 0 ? (
                          <>
                            {transactions.map((transaction) => (
                              <div key={transaction._id} className="flex justify-between items-center border-b pb-3 pt-1">
                                <div>
                                  <p className="font-medium">{transaction.description}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(transaction.createdAt).toLocaleDateString(
                                      language === 'en' ? 'en-US' : 'zh-CN', { 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}
                                  </p>
                                </div>
                                <div className={
                                  transaction.type === 'Add' || transaction.type === 'credit' || transaction.type === 'refund'
                                    ? "text-green-500 font-medium" 
                                    : "text-red-500 font-medium"
                                }>
                                  {transaction.type === 'Add' || transaction.type === 'credit' || transaction.type === 'refund'
                                    ? '+' 
                                    : '-'
                                  }{transaction.amount} {t('credits')}
                                </div>
                              </div>
                            ))}
                            
                            {transactionsPagination.pages > 1 && (
                              <div className="flex items-center justify-between pt-4">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleTransactionPagination('prev')}
                                  disabled={transactionsPagination.page === 1}
                                >
                                  {t('previous')}
                                </Button>
                                <div className="text-sm text-muted-foreground">
                                  {t('pageOf').replace('X', transactionsPagination.page.toString()).replace('Y', transactionsPagination.pages.toString())}
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleTransactionPagination('next')}
                                  disabled={transactionsPagination.page === transactionsPagination.pages}
                                >
                                  {t('next')}
                                </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            {t('noTransactionHistory')}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Commented out Referral tab */}
              {/* 
              {activeTab === "refer" && (
                <motion.div
                  key="refer"
                  initial={{ y: 10 }}
                  animate={{ y: 0 }}
                  exit={{ y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mt-4">
                    <h2 className="text-3xl font-bold tracking-tight">Refer a Friend</h2>
                  </div>
                  <ReferralCard />
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl sm:text-2xl">How Referrals Work</CardTitle>
                      <CardDescription className="text-sm sm:text-base">Our referral program is simple and rewarding</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-6 md:grid-cols-3">
                        <motion.div 
                          className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-colors"
                          whileHover={{ y: -5 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                          <div className="rounded-full bg-primary/10 p-4 relative">
                            <Gift className="h-7 w-7 text-primary" />
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
                          </div>
                          <h3 className="font-medium text-base sm:text-lg">Share Your Code</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Send your unique referral code to friends and family through text, email, or social media
                          </p>
                        </motion.div>
                        
                        <motion.div 
                          className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-colors"
                          whileHover={{ y: -5 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                          <div className="rounded-full bg-primary/10 p-4 relative">
                            <User className="h-7 w-7 text-primary" />
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</span>
                          </div>
                          <h3 className="font-medium text-base sm:text-lg">Friend Signs Up</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            They create an account using your referral code during registration or checkout
                          </p>
                        </motion.div>
                        
                        <motion.div 
                          className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-colors"
                          whileHover={{ y: -5 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                          <div className="rounded-full bg-primary/10 p-4 relative">
                            <CreditCard className="h-7 w-7 text-primary" />
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">3</span>
                          </div>
                          <h3 className="font-medium text-base sm:text-lg">Both Get Credits</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            You automatically receive 5 credits, and your friend gets 5 credits to use on their first order
                          </p>
                        </motion.div>
                      </div>
                      
                      <div className="mt-6 rounded-lg border p-4 bg-muted/50">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="shrink-0 rounded-full bg-primary/20 p-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium mb-1">No Limit on Referrals</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Refer as many friends as you want! There's no cap on how many credits you can earn through referrals. 
                              The more friends you refer, the more free meals you get.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              */}

              {/* Commented out Loyalty Program section */}
              {/* 
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

              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ y: 10 }}
                  animate={{ y: 0 }}
                  exit={{ y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mt-4">
                    <h2 className="text-3xl font-bold tracking-tight">{t('accountSettings')}</h2>
                  </div>

                  <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="personal">{t('personalInfoTab')}</TabsTrigger>
                      <TabsTrigger value="password">{t('passwordTab')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-4 mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>{t('personalInformation')}</CardTitle>
                          <CardDescription>{t('updateAccountDetails')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between items-center mb-4 p-3 bg-muted rounded-md">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{t('accountStatus')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`h-3 w-3 rounded-full ${userData?.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <span className="text-sm font-medium">{userData?.status || 'Unknown'}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="userId">{t('userId')}</Label>
                              <Input id="userId" value={userData?.userID || ''} readOnly className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="name">{t('name')}</Label>
                              <Input id="name" value={personalInfo.name} onChange={handlePersonalInfoChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="nickname">{t('nickname')}</Label>
                              <Input id="nickname" value={personalInfo.nickname} onChange={handlePersonalInfoChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email">{t('email')}</Label>
                              <Input id="email" type="email" value={personalInfo.email} onChange={handlePersonalInfoChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phone">{t('phone')}</Label>
                              <Input id="phone" value={personalInfo.phone} onChange={handlePersonalInfoChange} />
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button onClick={handleSavePersonalInfo}>{t('saveChanges')}</Button>
                        </CardFooter>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>{t('deliveryAddressTitle')}</CardTitle>
                          <CardDescription>{t('updateDeliveryInfo')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="unitNumber">{t('unitAptNumber')}</Label>
                              <Input id="unitNumber" value={addressInfo.unitNumber} onChange={handleAddressInfoChange} />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="streetAddress">{t('streetAddress')}</Label>
                              <Input id="streetAddress" value={addressInfo.streetAddress} onChange={handleAddressInfoChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="city">{t('city')}</Label>
                              <Input id="city" value={addressInfo.city} onChange={handleAddressInfoChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="state">{t('state')}</Label>
                              <Input id="state" value={addressInfo.province} onChange={handleAddressInfoChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="zip">{t('zipCode')}</Label>
                              <Input id="zip" value={addressInfo.postalCode} onChange={handleAddressInfoChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="country">{t('country')}</Label>
                              <Input id="country" value={addressInfo.country} onChange={handleAddressInfoChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="buzzCode" className="text-sm">{t('buzzCodeLabel')} <span className="text-muted-foreground text-xs">{t('buzzCodeOptional')}</span></Label>
                              <Input 
                                id="buzzCode" 
                                value={addressInfo.buzzCode} 
                                onChange={handleAddressInfoChange}
                                placeholder={t('buzzCodePlaceholder')} 
                              />
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button onClick={handleSaveAddressInfo}>{t('saveChanges')}</Button>
                        </CardFooter>
                      </Card>
                    </TabsContent>

                    <TabsContent value="password" className="space-y-4 mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>{t('passwordTab')}</CardTitle>
                          <CardDescription>{t('changePassword')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="current-password">{t('currentPasswordLabel')}</Label>
                              <Input 
                                id="current-password" 
                                type="password" 
                                value={passwordInfo.currentPassword}
                                onChange={handlePasswordChange}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-password">{t('newPasswordLabel')}</Label>
                              <Input 
                                id="new-password" 
                                type="password"
                                value={passwordInfo.newPassword}
                                onChange={handlePasswordChange}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm-password">{t('confirmPasswordLabel')}</Label>
                              <Input 
                                id="confirm-password" 
                                type="password"
                                value={passwordInfo.confirmPassword}
                                onChange={handlePasswordChange}
                              />
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button onClick={handleSavePassword}>
                            {t('changePasswordBtn')}
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
                  initial={{ y: 10 }}
                  animate={{ y: 0 }}
                  exit={{ y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mt-4">
                    <h2 className="text-3xl font-bold tracking-tight">{t('selectMeals')}</h2>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{t('creditsAvailable')}:</span>
                      <span className="text-sm font-bold">{credits}</span>
                    </div>
                  </div>

                  <WeeklyMealSelector 
                    credits={credits} 
                    setCredits={setCredits} 
                    setActiveTab={setActiveTab}
                    updateParentAddress={setAddressInfo}
                    initialSelectedMeals={selectedMeals}
                    initialCheckoutOpen={checkoutOpen}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}

// Update the WeeklyMealSelector function to use the actual user data for the delivery information in the checkout section
function WeeklyMealSelector({ 
  credits, 
  setCredits, 
  setActiveTab,
  updateParentAddress,
  initialSelectedMeals = {
    monday: { selected: false, date: '' },
    tuesday: { selected: false, date: '' },
    wednesday: { selected: false, date: '' },
    thursday: { selected: false, date: '' },
    friday: { selected: false, date: '' },
    saturday: { selected: false, date: '' },
    sunday: { selected: false, date: '' },
  },
  initialCheckoutOpen = false
}: { 
  credits: number; 
  setCredits: (credits: number) => void;
  setActiveTab: (tab: string) => void;
  updateParentAddress: (address: any) => void;
  initialSelectedMeals?: Record<string, { selected: boolean; date: string }>;
  initialCheckoutOpen?: boolean;
}) {
  // Try to load saved selections from localStorage first, then fall back to initialSelectedMeals
  const { t, language } = useLanguage();
  const getSavedSelections = () => {
    try {
      const savedSelections = localStorage.getItem('selectedMeals');
      if (savedSelections) {
        const parsed = JSON.parse(savedSelections);
        // Handle both old and new structure
        if (typeof parsed.monday === 'boolean') {
          // Convert old structure to new structure
          return {
            monday: { selected: parsed.monday || false, date: '' },
            tuesday: { selected: parsed.tuesday || false, date: '' },
            wednesday: { selected: parsed.wednesday || false, date: '' },
            thursday: { selected: parsed.thursday || false, date: '' },
            friday: { selected: parsed.friday || false, date: '' },
            saturday: { selected: parsed.saturday || false, date: '' },
            sunday: { selected: parsed.sunday || false, date: '' },
          };
        } else {
          // New structure with dates
          return {
            monday: parsed.monday || { selected: false, date: '' },
            tuesday: parsed.tuesday || { selected: false, date: '' },
            wednesday: parsed.wednesday || { selected: false, date: '' },
            thursday: parsed.thursday || { selected: false, date: '' },
            friday: parsed.friday || { selected: false, date: '' },
            saturday: parsed.saturday || { selected: false, date: '' },
            sunday: parsed.sunday || { selected: false, date: '' },
          };
        }
      }
    } catch (error) {
      console.error('Error loading saved selections:', error);
    }
    return initialSelectedMeals;
  };

  const [selectedMeals, setSelectedMeals] = useState(getSavedSelections())
  const [checkoutOpen, setCheckoutOpen] = useState(initialCheckoutOpen)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    specialInstructions: ''
  })
  const [editingAddress, setEditingAddress] = useState(false)
  const [addressFormData, setAddressFormData] = useState({
    unitNumber: "",
    streetAddress: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
    buzzCode: ""
  })
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(false)
  const [meals, setMeals] = useState<WeeklyMeals>({})
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const [customizeMeal, setCustomizeMeal] = useState(null)
  const [userData, setUserData] = useState<UserType | null>(null)
  const [today, setToday] = useState<string>("")

  // Define the proper order of days
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  
  // Check if a day is in the past or today after ordering cutoff time
  const isDayUnavailable = (day: string): { unavailable: boolean, reason: string } => {
    try {
      // Get current date and time in Toronto timezone
      const torontoOptions = { timeZone: 'America/Toronto' };
      const now = new Date();
      
      // Format the Toronto time as a string to work with
      const torontoDateString = now.toLocaleString('en-US', torontoOptions);
      const torontoDate = new Date(torontoDateString);
      
      // Get the current hour in Toronto
      const currentHour = torontoDate.getHours();
      
      // Check if we have a date for this meal
      const mealDate = meals[day]?.date;

      // If no specific date is provided, mark as unavailable
      if (!mealDate) {
        return { 
          unavailable: true, 
          reason: "Date not available for this meal" 
        };
      }
      
      // Debug logging for day and date info
      console.log(`Day comparison for ${day}:`, {
        day,
        currentHour,
        mealDate
      });

      // Parse the date (expected format like "April 1" or "April 10")
      try {
        const parts = mealDate.split(' ');
        
        // Handle formats like "April 1" or "April 10"
        if (parts.length === 2) {
          const monthStr = parts[0];
          const dayStr = parts[1];
          
          // Get month index (0-11)
          const months = ["January", "February", "March", "April", "May", "June", 
                           "July", "August", "September", "October", "November", "December"];
          const monthIndex = months.findIndex(m => 
            monthStr.toLowerCase() === m.toLowerCase());
          
          // Parse day number (remove dot or comma if present)
          const dayNum = parseInt(dayStr.replace(',', '').replace('.', ''));
          
          console.log(`Date parsing for ${mealDate}:`, {
            monthStr,
            monthIndex,
            dayStr,
            dayNum
          });
          
          if (monthIndex !== -1 && !isNaN(dayNum)) {
            // Create a date for the meal's specific date (use current year)
            const mealSpecificDate = new Date(
              torontoDate.getFullYear(), 
              monthIndex, 
              dayNum
            );
            
            // Compare with today's date
            const todayYMD = new Date(
              torontoDate.getFullYear(), 
              torontoDate.getMonth(), 
              torontoDate.getDate()
            );
            
            console.log(`Date comparison:`, {
              mealSpecificDate: mealSpecificDate.toDateString(),
              todayYMD: todayYMD.toDateString(),
              isBeforeToday: mealSpecificDate < todayYMD,
              isToday: mealSpecificDate.getTime() === todayYMD.getTime()
            });
            
            // If meal date is before today
            if (mealSpecificDate < todayYMD) {
              return { 
                unavailable: true, 
                reason: "This specific date has already passed" 
              };
            }
            
            // If it's today and after 10am
            if (mealSpecificDate.getTime() === todayYMD.getTime() && currentHour >= 10) {
              return { 
                unavailable: true, 
                reason: t('orderBeforeCutoff')
              };
            }
            
            // If we have a valid date and it's in the future or today before 10am, it's available
            return { unavailable: false, reason: "" };
          }
        }
        
        // If we couldn't parse the date properly
        return { 
          unavailable: true, 
          reason: "Invalid date format" 
        };
      } catch (error) {
        console.error('Error parsing meal date:', error);
        return { 
          unavailable: true, 
          reason: "Error parsing date" 
        };
      }
    } catch (error) {
      console.error('Error in isDayUnavailable:', error);
      return { unavailable: false, reason: "" }; // Default to available on error
    }
  };

  useEffect(() => {
    // Get the current day name for highlighting
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto',
        weekday: 'long'
      });
      const currentDay = formatter.format(now).toLowerCase();
      setToday(currentDay);
    } catch (error) {
      console.error("Error getting current day:", error);
    }
    
    // Load user data from localStorage on component mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);
      
      // Initialize formData with user's info
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        specialInstructions: ''
      });
      
      // Initialize address form data
      if (user.address) {
        setAddressFormData({
          unitNumber: user.address.unitNumber || "",
          streetAddress: user.address.streetAddress || "",
          city: user.address.city || "",
          province: user.address.province || "",
          postalCode: user.address.postalCode || "",
          country: user.address.country || "",
          buzzCode: user.address.buzzCode || ""
        });
      }
    }
    
    async function loadMeals() {
      try {
        setIsLoading(true)
        const weeklyMeals = await getWeeklyMeals()
        setMeals(weeklyMeals)
      } catch (error) {
        console.error('Error loading meals:', error)
        toast({
          title: "Error",
          description: "Failed to load this week's meals",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadMeals()
  }, [toast])
  
  // Helper function to format address
  const formatAddress = (address: any) => {
    if (!address) return "";
    
    let formattedAddress = '';
    
    if (address.unitNumber) {
      formattedAddress += `Unit ${address.unitNumber}, `;
    }
    
    formattedAddress += address.streetAddress || '';
    
    if (address.city || address.province || address.postalCode) {
      formattedAddress += `, ${address.city || ''} ${address.province || ''} ${address.postalCode || ''}`;
    }
    
    if (address.country) {
      formattedAddress += `, ${address.country}`;
    }
    
    return formattedAddress;
  };

  const toggleMeal = (day: string) => {
    // Check if the day is unavailable before toggling
    const { unavailable, reason } = isDayUnavailable(day);
    
    if (unavailable) {
      toast({
        title: "Cannot select this day",
        description: reason,
        variant: "destructive"
      });
      return;
    }
    
    // Get date information from the meals object
    const dateValue = meals[day as keyof typeof meals]?.date || '';
    
    const updatedSelections = {
      ...selectedMeals,
      [day]: { 
        selected: !selectedMeals[day as keyof typeof selectedMeals].selected,
        date: dateValue
      },
    };
    
    // Save to localStorage
    localStorage.setItem('selectedMeals', JSON.stringify(updatedSelections));
    
    // Update state
    setSelectedMeals(updatedSelections);
  }

  const selectedCount = Object.values(selectedMeals).filter(value => value.selected).length
  const totalCost = selectedCount * 1 // Changed from 20 to 1 credit per meal
  const canCheckout = selectedCount > 0 && totalCost <= credits

  const handleCheckout = async () => {
    if (canCheckout) {
      try {
        // Validate delivery information
        if (!formData.name || !formData.phone) {
          toast({
            title: t('errorOccurred'),
            description: t('deliveryInfo'),
            variant: "destructive"
          });
          return;
        }
        
        if (!userData?.address && !editingAddress) {
          toast({
            title: t('errorOccurred'),
            description: t('deliveryAddress'),
            variant: "destructive"
          });
          return;
        }
        
        // Use either the form address data (if editing) or the stored user address
        const deliveryAddress = editingAddress ? addressFormData : userData?.address;
        
        if (!deliveryAddress || !deliveryAddress.streetAddress || !deliveryAddress.city || 
            !deliveryAddress.province || !deliveryAddress.postalCode || !deliveryAddress.country) {
          toast({
            title: t('errorOccurred'),
            description: t('addressError'),
            variant: "destructive"
          });
          return;
        }
        
        // Show loading state
        toast({
          title: t('processingOrder'),
          description: t('processingOrder'),
        });
        
        // Create order via API
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userData?._id,
            selectedMeals,
            creditCost: totalCost,
            specialInstructions: formData.specialInstructions || '',
            phoneNumber: formData.phone || '',
            deliveryAddress
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Update local credit balance
          setCredits(result.data.remainingCredits);
          
          // Update localStorage credit information
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userObj = JSON.parse(storedUser);
            const updatedUser = { 
              ...userObj, 
              credits: result.data.remainingCredits 
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
          
          // Clear selected meals after successful checkout
          const clearedSelections = {
            monday: { selected: false, date: '' },
            tuesday: { selected: false, date: '' },
            wednesday: { selected: false, date: '' },
            thursday: { selected: false, date: '' },
            friday: { selected: false, date: '' },
            saturday: { selected: false, date: '' },
            sunday: { selected: false, date: '' },
          };
          
          // Update localStorage
          localStorage.setItem('selectedMeals', JSON.stringify(clearedSelections));
          
          // Update state
          setSelectedMeals(clearedSelections);
          setCheckoutOpen(false);
          
          // Show success toast
          toast({
            title: t('orderPlacedSuccess'),
            description: `${t('orderTitle')} (${result.data.order.orderId}) ${t('orderPlaced')}`,
          });
          
          // Optionally, navigate to orders tab to see the new order
          setActiveTab("orders");
        } else {
          // Handle error
          toast({
            title: t('errorPlacingOrder'),
            description: result.error || t('unexpectedError'),
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error placing order:', error);
        toast({
          title: t('errorOccurred'),
          description: t('unexpectedError'),
          variant: "destructive"
        });
      }
    } else if (selectedCount === 0) {
      toast({
        title: t('errorOccurred'),
        description: t('noMealsSelected'),
        variant: "destructive"
      });
    } else {
      toast({
        title: t('insufficientCredits'),
        description: `${t('insufficientCredits')} ${totalCost} ${t('credits')}. ${t('creditsAvailable')}: ${credits} ${t('credits')}.`,
        variant: "destructive"
      });
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData({
      ...formData,
      [id]: value,
    })
  }
  
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setAddressFormData({
      ...addressFormData,
      [id === 'state' ? 'province' : id === 'zip' ? 'postalCode' : id]: value
    })
  }
  
  const handleSaveAddress = async () => {
    // Always update the local userData for display in the current order
    setUserData(prev => prev ? {
      ...prev,
      address: { ...addressFormData }
    } : null);
    
    if (saveAddressForFuture && userData?._id) {
      try {
        const response = await fetch(`/api/users/${userData._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: addressFormData
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Update localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userObj = JSON.parse(storedUser);
            const updatedUser = { 
              ...userObj, 
              address: { ...addressFormData } 
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
          
          // Update parent component's address state
          updateParentAddress(addressFormData);
          
          toast({
            title: t('addressSaved'),
            description: t('addressUpdated'),
          });
        } else {
          toast({
            title: t('errorOccurred'),
            description: result.error || t('addressError'),
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error saving address:', error);
        toast({
          title: t('errorOccurred'),
          description: t('addressError'),
          variant: "destructive"
        });
      }
    } else {
      // Show toast that address is used only for this order
      toast({
        title: t('addressUpdated'),
        description: t('addressForThisOrder'),
      });
    }
    
    setEditingAddress(false);
  }

  return (
    <div className="space-y-6">
      {!checkoutOpen ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('weeklyMenu')}</CardTitle>
              <CardDescription>{t('selectDaysDelivery')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {isLoading ? (
                  <div className="col-span-full flex justify-center items-center h-[300px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p>{t('loadingMeals')}</p>
                    </div>
                  </div>
                ) : (
                  // Sort the entries by the day order before rendering
                  Object.entries(meals)
                    .sort(([dayA], [dayB]) => {
                      return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB)
                    })
                    .map(([day, meal]) => (
                      <div key={day} className="relative">
                        <MealDetail 
                          meal={meal} 
                          day={day} 
                          dayDate={meal.date}
                          isToday={false}
                          onSelect={toggleMeal} 
                          isSelected={selectedMeals[day as keyof typeof selectedMeals].selected}
                          isUnavailable={isDayUnavailable(day).unavailable}
                          unavailableReason={isDayUnavailable(day).reason}
                        />
                      </div>
                    ))
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                <p className="text-sm font-medium">{t('selectedCount')}: {selectedCount} meals ({selectedCount * 1} {t('credits')})</p>
              </div>
              <Button disabled={!canCheckout} onClick={() => setCheckoutOpen(true)}>
                {t('proceedToCheckout')}
              </Button>
            </CardFooter>
          </Card>

          {/* <MealCalendar selectedMeals={selectedMeals} meals={meals} /> */}
        </>
      ) : (
        <motion.div
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          exit={{ y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('checkoutTitle')}</CardTitle>
              <CardDescription>{t('confirmOrderDetails')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-medium">{t('selectedMeals')}</h3>
                <div className="rounded-md border p-4">
                  <ul className="space-y-3">
                    {Object.entries(selectedMeals)
                      .sort(([dayA], [dayB]) => {
                        return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB)
                      })
                      .map(
                        ([day, selected]) =>
                          selected.selected && meals[day as keyof typeof meals] && (
                            <li key={day} className="flex justify-between items-start">
                              <span className="capitalize font-medium mr-2">
                                {day}
                                {meals[day as keyof typeof meals]?.date && (
                                  <span className="text-sm ml-1 font-normal">({meals[day as keyof typeof meals]?.date})</span>
                                )}
                              </span>
                              
                              <div className="flex flex-wrap justify-end gap-3 flex-1">
                                {meals[day as keyof typeof meals]?.description ? (
                                  meals[day as keyof typeof meals]?.description?.split('. ')
                                    .filter(Boolean)
                                    .map((sentence: string, index: number) => (
                                      <div key={index} className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                        <span className="text-sm md:text-base">{sentence.replace(/\.$/, '').trim()}</span>
                                      </div>
                                    ))
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                      <span className="text-sm md:text-base">{t('freshIngredients')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                      <span className="text-sm md:text-base">{t('ecoPackaging')}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </li>
                          ),
                      )}
                  </ul>
                  <div className="mt-4 pt-4 border-t flex justify-between font-medium">
                    <span className="text-sm">{t('total')}</span>
                    <span className="text-sm">{selectedCount * 1} {t('credits')}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">{t('deliveryInfo')}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('fullName')}</Label>
                    <Input id="name" value={formData.name} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('phoneNumber')}</Label>
                    <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="specialInstructions">
                    {t('specialInstructions')} {language === 'en' ? '(if any)' : '（可选）'}
                  </Label>
                  <Textarea 
                    id="specialInstructions" 
                    placeholder=""
                    value={formData.specialInstructions}
                    onChange={handleInputChange}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="pt-4">
                  <div className="flex justify-between items-center">
                    <Label className="font-medium">{t('deliveryAddress')}</Label>
                    {!editingAddress && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => setEditingAddress(true)}
                      >
                        {userData?.address ? t('editAddress') : t('addAddress')}
                      </Button>
                    )}
                  </div>
                  
                  {editingAddress ? (
                    <div className="mt-2 space-y-4 p-4 rounded-md border border-primary/30 bg-primary/5 shadow-sm">
                      <div className="text-sm font-medium text-primary mb-2">{t('editDeliveryDetails')}</div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="unitNumber" className="text-sm">{t('unitAptNumber')}</Label>
                          <Input 
                            id="unitNumber" 
                            value={addressFormData.unitNumber} 
                            onChange={handleAddressInputChange} 
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="streetAddress" className="text-sm">{t('streetAddress')}</Label>
                          <Input 
                            id="streetAddress" 
                            value={addressFormData.streetAddress} 
                            onChange={handleAddressInputChange} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-sm">{t('city')}</Label>
                          <Input 
                            id="city" 
                            value={addressFormData.city} 
                            onChange={handleAddressInputChange} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state" className="text-sm">{t('state')}</Label>
                          <Input 
                            id="state" 
                            value={addressFormData.province} 
                            onChange={handleAddressInputChange} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zip" className="text-sm">{t('zipCode')}</Label>
                          <Input 
                            id="zip" 
                            value={addressFormData.postalCode} 
                            onChange={handleAddressInputChange} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country" className="text-sm">{t('country')}</Label>
                          <Input 
                            id="country" 
                            value={addressFormData.country} 
                            onChange={handleAddressInputChange} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="buzzCode" className="text-sm">{t('buzzCodeLabel')} <span className="text-muted-foreground text-xs">{t('buzzCodeOptional')}</span></Label>
                          <Input 
                            id="buzzCode" 
                            value={addressFormData.buzzCode} 
                            onChange={handleAddressInputChange} 
                            placeholder={t('buzzCodePlaceholder')}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 bg-background p-2 rounded-md">
                        <Checkbox 
                          id="saveAddress" 
                          checked={saveAddressForFuture}
                          onCheckedChange={(checked) => setSaveAddressForFuture(checked === true)}
                        />
                        <Label htmlFor="saveAddress" className="text-sm font-normal">
                          {t('saveAddressFuture')}
                        </Label>
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4 pt-2 border-t border-primary/20">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingAddress(false)}
                        >
                          {t('cancelBtn')}
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSaveAddress}
                        >
                          {t('saveAddress')}
                        </Button>
                      </div>
                    </div>
                  ) : userData?.address ? (
                    <div className="mt-2 p-4 rounded-md border">
                      <div className="space-y-1">
                        {userData.address.unitNumber && (
                          <p>Unit: {userData.address.unitNumber}</p>
                        )}
                        <p>{userData.address.streetAddress}</p>
                        <p>
                          {userData.address.city}
                          {userData.address.province && `, ${userData.address.province}`}
                          {userData.address.postalCode && ` ${userData.address.postalCode}`}
                        </p>
                        <p>{userData.address.country}</p>
                        {userData.address.buzzCode && (
                          <p>Buzz Code: {userData.address.buzzCode}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-4 rounded-md border">
                      <p className="text-muted-foreground">{t('noAddressSet')}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
                {t('back')}
              </Button>
              <Button onClick={handleCheckout}>{t('completeOrder')}</Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

