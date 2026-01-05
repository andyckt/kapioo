"use client"

// This ensures the page only runs on the client side
// We're using the "use client" directive to ensure this page is only rendered on the client
// where window and other browser APIs are available

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { Label } from "@/components/ui/label"

import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, History, LogOut, Settings, ShoppingCart, User, Calendar, Users, Gift, CheckCircle2, Menu, X, Sparkles, Loader2, Gem, Leaf, Shield, Zap, Heart, Flame, Apple, ChefHat, ArrowRight, Upload, Info, Check, ChevronsUpDown, Search, ChevronDown, Ticket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
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
// These components are dynamically imported above
import { AvailableAreas } from "@/components/available-areas"
import { getWeeklyMeals, type WeeklyMeals, getUserById, type User as UserType } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { OrderHistory } from "@/components/order-history"
import { useLanguage } from "@/lib/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import Image from "next/image"
// Dynamically import components that might use client-side libraries like heic2any
const DailyDelivery = dynamic(() => import("@/components/daily-delivery"), { ssr: false })
const WeeklySubscription = dynamic(() => import("@/components/weekly-subscription"), { ssr: false })
const WeeklySubscriptionHistory = dynamic(() => import("@/components/weekly-subscription-history").then(mod => ({ default: mod.WeeklySubscriptionHistory })), { ssr: false })
const DailyDeliveryHistory = dynamic(() => import("@/components/daily-delivery-history").then(mod => ({ default: mod.DailyDeliveryHistory })), { ssr: false })
const MealVoucherPurchase = dynamic(() => import("@/components/meal-voucher-purchase"), { ssr: false })
const VoucherPurchaseHistory = dynamic(() => import("@/components/voucher-purchase-history").then(mod => ({ default: mod.VoucherPurchaseHistory })), { ssr: false })
const UnifiedRechargeHistory = dynamic(() => import("@/components/unified-recharge-history").then(mod => ({ default: mod.UnifiedRechargeHistory })), { ssr: false })
const CreditPurchasePlans = dynamic(() => import("@/components/credit-purchase-plans").then(mod => ({ default: mod.CreditPurchasePlans })), { ssr: false })
const CreditPurchaseHistory = dynamic(() => import("@/components/credit-purchase-history").then(mod => ({ default: mod.CreditPurchaseHistory })), { ssr: false })
import { OrderSectionNavigation } from "@/components/order-section-navigation"

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language } = useLanguage()
  const [credits, setCredits] = useState(0)
  const [activeTab, setActiveTab] = useState("overview")
  const [customizeMeal, setCustomizeMeal] = useState(null)
  
  // Daily delivery regions
  const DAILY_DELIVERY_REGIONS = ['Downtown Toronto', 'Midtown', 'NorthYork', 'Markham', 'RichmondHill']
  
  // Function to check if user's area has daily delivery service
  const hasAreaDailyDelivery = (userAddress?: any): boolean => {
    if (!userAddress || !userAddress.province) return false
    return DAILY_DELIVERY_REGIONS.includes(userAddress.province)
  }
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [meals, setMeals] = useState<WeeklyMeals>({})
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<UserType | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [purchaseHistoryKey, setPurchaseHistoryKey] = useState(0)
  const [voucherHistoryKey, setVoucherHistoryKey] = useState(0)
  const [orderActiveSection, setOrderActiveSection] = useState<'orders' | 'recharges'>('orders')
  const [transactionsPagination, setTransactionsPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 1
  })
  const [upcomingDeliveries, setUpcomingDeliveries] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [orderStatsLoading, setOrderStatsLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState("Downtown")
  
  // Define location types
  type Location = 
    | "Downtown" 
    | "Downtown Toronto"
    | "Midtown" 
    | "NorthYork" 
    | "Markham" 
    | "RichmondHill"
    | "Vaughan" 
    | "Mississauga" 
    | "Oakville" 
    | "Aurora" 
    | "Newmarket"
    | "Hamilton"
    | "Burlington"
  
  // Group locations by service availability
  const FULL_SERVICE_LOCATIONS: Location[] = ["Downtown Toronto", "Midtown", "NorthYork", "Markham", "RichmondHill"]
  const WEEKLY_ONLY_LOCATIONS: Location[] = ["Vaughan", "Mississauga", "Oakville", "Aurora", "Newmarket", "Hamilton", "Burlington"]
  
  // All locations
  const allLocations: Location[] = [...FULL_SERVICE_LOCATIONS, ...WEEKLY_ONLY_LOCATIONS]
  
  // Location display names
  const getLocationDisplayName = (location: Location): string => {
    return location
  }
  
  // Get available plans based on location
  const getAvailablePlans = () => {
    if (FULL_SERVICE_LOCATIONS.includes(selectedLocation as Location)) {
      return [
        {
          id: "weekly",
          title: language === 'en' ? t('weeklySubscriptionTitle') : t('weeklySubscriptionTitle'),
          description: language === 'en' ? t('weeklySubscriptionDesc') : t('weeklySubscriptionDesc'),
          imagePath: "/food-gallery/westernfood.JPG",
          tabId: "weekly-subscription"
        },
        {
          id: "daily",
          title: language === 'en' ? t('dailyDeliveryTitle') : t('dailyDeliveryTitle'),
          description: language === 'en' ? t('dailyDeliveryDesc') : t('dailyDeliveryDesc'),
          imagePath: "/food-gallery/_MG_4897.jpg",
          tabId: "daily-delivery"
        }
      ]
    } else {
      return [
        {
          id: "weekly",
          title: language === 'en' ? t('weeklySubscriptionTitle') : t('weeklySubscriptionTitle'),
          description: language === 'en' ? t('weeklySubscriptionDesc') : t('weeklySubscriptionDesc'),
          imagePath: "/food-gallery/westernfood.JPG",
          tabId: "weekly-subscription"
        }
      ]
    }
  }
  
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
  })
  
  // Initialize activeTab from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      if (tabParam) {
        setActiveTab(tabParam)
      }
    }
  }, []);

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
    
    // Load meals on initial render when on overview tab
    if (activeTab === "overview") {
      console.log(`[Dashboard] Loading meals for tab: ${activeTab}`);
      loadMeals()
      
      // Refresh user data when overview tab is selected
      if (userData?._id) {
        const refreshUserData = async () => {
          try {
            const user = await getUserById(userData._id);
            if (user) {
              setUserData(user);
              setCredits(user.credits || 0);
            }
          } catch (error) {
            console.error('Error refreshing user data:', error);
          }
        };
        
        refreshUserData();
        
        // Also refresh order statistics
        fetchOrderStats(userData._id);
      }
    }
  }, [toast, activeTab, userData?._id])

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

  // Function to fetch order statistics
  const fetchOrderStats = async (userId: string) => {
    if (!userId) return;
    
    try {
      setOrderStatsLoading(true);
      const response = await fetch(`/api/users/${userId}/orders/count`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setUpcomingDeliveries(data.data.upcomingDeliveries || 0);
        setTotalOrders(data.data.totalOrders || 0);
      }
    } catch (error) {
      console.error('Error fetching order statistics:', error);
    } finally {
      setOrderStatsLoading(false);
    }
  };
  
  // Effect to fetch total orders and upcoming deliveries when userData is loaded
  useEffect(() => {
    if (userData?._id) {
      // Fetch order stats for the user
      fetchOrderStats(userData._id);
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
    { 
      id: "weekly-subscription-group", 
      label: language === 'zh' ? "周次Meal Box" : "Weekly Meal Box", 
      icon: <Gift className="h-4 w-4" />,
      isHeading: true,
      children: [
        { id: "weekly-subscription", label: language === 'zh' ? "订餐" : "Start Ordering", icon: <ShoppingCart className="h-4 w-4" /> },
        { id: "credits", label: language === 'zh' ? "充值" : "Recharge", icon: <CreditCard className="h-4 w-4" /> }
      ]
    },
    { 
      id: "daily-delivery-group", 
      label: language === 'zh' ? "每日直送" : "Daily Delivery", 
      icon: <Calendar className="h-4 w-4" />,
      isHeading: true,
      children: [
        { id: "daily-delivery", label: language === 'zh' ? "订餐" : "Start Ordering", icon: <ShoppingCart className="h-4 w-4" /> },
        { id: "meal-vouchers", label: language === 'zh' ? "充值" : "Recharge", icon: <CreditCard className="h-4 w-4" /> }
      ]
    },
    /* Commented out for now
    { id: "nutrition", label: "Nutrition", icon: <BarChart2 className="h-4 w-4" /> },
    */
    /* Commented out Community tab 
    { id: "community", label: "Community", icon: <Users className="h-4 w-4" /> },
    */
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
    // Switch to the overview tab
    setActiveTab("overview");
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
                    {item.isHeading ? (
                      <div className="px-3 py-2 text-sm font-medium flex items-center gap-2">
                        <motion.span
                          initial={{ scale: 1 }}
                        >
                          {item.icon}
                        </motion.span>
                        {item.label}
                      </div>
                    ) : (
                      <Button
                        variant={activeTab === item.id ? "default" : "ghost"}
                        className={`justify-start gap-2 text-base w-full ${
                          activeTab === item.id 
                            ? "relative overflow-hidden group bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] text-white"
                            : ""
                        }`}
                        onClick={() => {
                          setActiveTab(item.id);
                          // Don't close menu if item has children
                          if (!item.children || item.children.length === 0) {
                            // Add a slight delay before closing to show the selection animation
                            setTimeout(() => setIsMobileMenuOpen(false), 150);
                          }
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
                            className="absolute bottom-0 left-0 h-0.5 bg-white/30 w-full"
                            layoutId="activeTabIndicator"
                          />
                        )}
                      </Button>
                    )}
                    
                    {/* Render children if they exist */}
                    {item.children && item.children.length > 0 && (
                      <div className="pl-6 mt-2 border-l-2 border-muted/50 ml-3">
                        {item.children.map((child, childIndex) => (
                          <motion.div
                            key={child.id}
                            initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                            transition={{ 
                              duration: 0.25, 
                              delay: 0.05 + (index + 1) * 0.05 + childIndex * 0.05, 
                              ease: [0.25, 1, 0.5, 1]
                            }}
                          >
                            <Button
                              variant={activeTab === child.id ? "default" : "ghost"}
                              className={`justify-start gap-2 text-sm w-full mt-1 ${
                                activeTab === child.id 
                                  ? "relative overflow-hidden group bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] text-white"
                                  : ""
                              }`}
                              onClick={() => {
                                setActiveTab(child.id);
                                // Add a slight delay before closing to show the selection animation
                                setTimeout(() => setIsMobileMenuOpen(false), 150);
                              }}
                            >
                              <motion.span
                                initial={{ scale: 1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {child.icon}
                              </motion.span>
                              {child.label}
                              {activeTab === child.id && (
                                <motion.div 
                                  className="absolute bottom-0 left-0 h-0.5 bg-white/30 w-full"
                                  layoutId="activeChildTabIndicator"
                                />
                              )}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}
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
        {/* Brand icon background elements */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Large semi-transparent brand icon in bottom right */}
          <div className="absolute -bottom-10 -right-10 w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] md:w-[550px] md:h-[550px] opacity-[0.025]">
            <Image 
              src="/未命名設計.png" 
              alt="Kapioo Logo Background" 
              fill
              className="object-contain"
              priority={false}
            />
          </div>
          
          {/* Smaller brand icon in top left */}
          <div className="absolute -top-5 -left-5 w-[230px] h-[230px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] opacity-[0.02] rotate-12">
            <Image 
              src="/未命名設計.png" 
              alt="Kapioo Logo Background" 
              fill
              className="object-contain"
              priority={false}
            />
          </div>
          
          {/* Subtle pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.01] sm:opacity-[0.015]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #C2884E 1px, transparent 0)`,
              backgroundSize: "16px 16px",
            }}
          ></div>
        </div>
        
        <aside className="w-full md:w-64 border-r bg-background p-4 hidden md:block">
          <nav className="grid gap-2">
            {menuItems.map((item) => (
              <div key={item.id}>
                {item.isHeading ? (
                  <div className="px-3 py-2 text-sm font-medium flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </div>
                ) : (
                  <Button
                    variant={activeTab === item.id ? "default" : "ghost"}
                    className={`justify-start gap-2 w-full ${
                      activeTab === item.id ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] text-white" : ""
                    }`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                )}
                
                {/* Render children if they exist */}
                {item.children && item.children.length > 0 && (
                  <div className="pl-6 mt-1 border-l-2 border-muted ml-2">
                    {item.children.map((child) => (
                      <Button
                        key={child.id}
                        variant={activeTab === child.id ? "default" : "ghost"}
                        className={`justify-start gap-2 w-full text-sm ${
                          activeTab === child.id ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] text-white" : ""
                        }`}
                        onClick={() => setActiveTab(child.id)}
                      >
                        {child.icon}
                        {child.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
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
                  <div className="flex flex-col mt-4">
                    <div className="bg-gradient-to-r from-[#F8F0E5] to-[#FFF6EF] p-6 rounded-3xl shadow-sm border border-[#C2884E]/10">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col mb-4 md:mb-0">
                          <h2 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                            {language === 'en' ? `Welcome, ${userData?.name?.split(' ')[0] || ''}` : `欢迎, ${userData?.name?.split(' ')[0] || ''}`}
                          </h2>
                          <p className="text-[#6B5F53] text-sm mt-1">
                            {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Button 
                            variant="outline"
                            className="border-[#C2884E]/20 hover:bg-[#F5EDE4] hover:text-[#C2884E] transition-all rounded-xl"
                            onClick={() => setActiveTab("orders")}
                          >
                            <History className="h-4 w-4 mr-2" />
                            {language === 'en' ? 'My Orders' : '我的订单'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* User Summary Cards - Premium Design */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {/* Show Daily first if user has both daily and weekly vouchers, otherwise show weekly first if only weekly */}
                    {/* Daily Delivery Vouchers Card - Show first if user has daily vouchers */}
                    {userData && ((userData?.twoDishVoucher || 0) > 0 || (userData?.threeDishVoucher || 0) > 0) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                      >
                        <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md hover:shadow-lg transition-all duration-300 group rounded-3xl">
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] transform origin-left group-hover:scale-x-100 scale-x-0 transition-transform duration-500"></div>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center text-[#6B5F53]">
                              <div className="h-8 w-8 rounded-full bg-[#F5EDE4] flex items-center justify-center mr-2">
                                <Ticket className="h-4 w-4 text-[#C2884E]" />
                              </div>
                              {language === 'en' ? 'Daily Delivery Vouchers' : '每日直送系列'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                                <span className="text-sm font-medium text-[#6B5F53]">{language === 'en' ? '2-Dish Voucher:' : '2菜餐券 剩余：'}</span>
                                <div className="flex items-center">
                                  <span className="text-xl font-bold text-[#C2884E]">{userData?.twoDishVoucher || 0}</span>
                                  <span className="ml-1 text-sm text-[#6B5F53]">{language === 'en' ? '' : '张'}</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                                <span className="text-sm font-medium text-[#6B5F53]">{language === 'en' ? '3-Dish Voucher:' : '3菜餐券 剩余：'}</span>
                                <div className="flex items-center">
                                  <span className="text-xl font-bold text-[#C2884E]">{userData?.threeDishVoucher || 0}</span>
                                  <span className="ml-1 text-sm text-[#6B5F53]">{language === 'en' ? '' : '张'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-dashed border-[#C2884E]/20">
                              <div className="grid grid-cols-2 gap-2">
                                <Button 
                                  variant="ghost" 
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl"
                                  onClick={() => setActiveTab("daily-delivery")}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Start Ordering' : '去订餐'}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl"
                                  onClick={() => setActiveTab("meal-vouchers")}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Recharge' : '去充值'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                    
                    {/* Weekly Delivery Vouchers Card - Show only if user has vouchers > 0 */}
                    {userData && (userData?.weeklySIXmeals > 0 || (userData as any)?.weeklyEIGHTmeals > 0 || 
                      userData?.weeklyTENmeals > 0 || (userData as any)?.weeklyTWELVEmeals > 0) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                      >
                        <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md hover:shadow-lg transition-all duration-300 group rounded-3xl">
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] transform origin-left group-hover:scale-x-100 scale-x-0 transition-transform duration-500"></div>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center text-[#6B5F53]">
                              <div className="h-8 w-8 rounded-full bg-[#F5EDE4] flex items-center justify-center mr-2">
                                <Gem className="h-4 w-4 text-[#C2884E]" />
                              </div>
                              {language === 'en' ? 'Weekly Delivery Vouchers' : '周次Meal Box订阅系列'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              {/* Display individual meal plan counts - Only show vouchers > 0 */}
                              <div className="space-y-2">
                                {userData?.weeklySIXmeals > 0 && (
                                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                                    <span className="text-sm font-medium text-[#6B5F53]">{language === 'en' ? '6 meals/week' : '6餐一周'}:</span>
                                    <div className="flex items-center">
                                      <span className="text-xl font-bold text-[#C2884E]">{userData?.weeklySIXmeals}</span>
                                      <span className="ml-1 text-sm text-[#6B5F53]">{language === 'en' ? '' : '张'}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {(userData as any)?.weeklyEIGHTmeals > 0 && (
                                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                                    <span className="text-sm font-medium text-[#6B5F53]">{language === 'en' ? '8 meals/week' : '8餐一周'}:</span>
                                    <div className="flex items-center">
                                      <span className="text-xl font-bold text-[#C2884E]">{(userData as any)?.weeklyEIGHTmeals}</span>
                                      <span className="ml-1 text-sm text-[#6B5F53]">{language === 'en' ? '' : '张'}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {userData?.weeklyTENmeals > 0 && (
                                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                                    <span className="text-sm font-medium text-[#6B5F53]">{language === 'en' ? '10 meals/week' : '10餐一周'}:</span>
                                    <div className="flex items-center">
                                      <span className="text-xl font-bold text-[#C2884E]">{userData?.weeklyTENmeals}</span>
                                      <span className="ml-1 text-sm text-[#6B5F53]">{language === 'en' ? '' : '张'}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {(userData as any)?.weeklyTWELVEmeals > 0 && (
                                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                                    <span className="text-sm font-medium text-[#6B5F53]">{language === 'en' ? '12 meals/week' : '12餐一周'}:</span>
                                    <div className="flex items-center">
                                      <span className="text-xl font-bold text-[#C2884E]">{(userData as any)?.weeklyTWELVEmeals}</span>
                                      <span className="ml-1 text-sm text-[#6B5F53]">{language === 'en' ? '' : '张'}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-dashed border-[#C2884E]/20">
                              <div className="grid grid-cols-2 gap-2">
                                <Button 
                                  variant="ghost" 
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl"
                                  onClick={() => setActiveTab("weekly-subscription")}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Start Ordering' : '去订餐'}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl"
                                  onClick={() => setActiveTab("credits")}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Recharge' : '去充值'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                    
                    {/* Daily Delivery Vouchers Card - Show after weekly if user has 0 daily vouchers */}
                    {userData && ((userData?.twoDishVoucher || 0) === 0 && (userData?.threeDishVoucher || 0) === 0) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                      >
                        <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md hover:shadow-lg transition-all duration-300 group rounded-3xl">
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] transform origin-left group-hover:scale-x-100 scale-x-0 transition-transform duration-500"></div>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center text-[#6B5F53]">
                              <div className="h-8 w-8 rounded-full bg-[#F5EDE4] flex items-center justify-center mr-2">
                                <Ticket className="h-4 w-4 text-[#C2884E]" />
                              </div>
                              {language === 'en' ? 'Daily Delivery Vouchers' : '每日直送系列'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                                <span className="text-sm font-medium text-[#6B5F53]">{language === 'en' ? '2-Dish Voucher:' : '2菜餐券 剩余：'}</span>
                                <div className="flex items-center">
                                  <span className="text-xl font-bold text-[#C2884E]">{userData?.twoDishVoucher || 0}</span>
                                  <span className="ml-1 text-sm text-[#6B5F53]">{language === 'en' ? '' : '张'}</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                                <span className="text-sm font-medium text-[#6B5F53]">{language === 'en' ? '3-Dish Voucher:' : '3菜餐券 剩余：'}</span>
                                <div className="flex items-center">
                                  <span className="text-xl font-bold text-[#C2884E]">{userData?.threeDishVoucher || 0}</span>
                                  <span className="ml-1 text-sm text-[#6B5F53]">{language === 'en' ? '' : '张'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-dashed border-[#C2884E]/20">
                              <div className="grid grid-cols-2 gap-2">
                                <Button 
                                  variant="ghost" 
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl"
                                  onClick={() => setActiveTab("daily-delivery")}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Start Ordering' : '去订餐'}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl"
                                  onClick={() => setActiveTab("meal-vouchers")}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Recharge' : '去充值'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                    
                    {/* Upcoming Orders Card - Only show if upcomingDeliveries > 0 */}
                    {upcomingDeliveries > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                      >
                        <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md hover:shadow-lg transition-all duration-300 group rounded-3xl">
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] transform origin-left group-hover:scale-x-100 scale-x-0 transition-transform duration-500"></div>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center text-[#6B5F53]">
                                <div className="h-8 w-8 rounded-full bg-[#F5EDE4] flex items-center justify-center mr-2">
                                  <ShoppingCart className="h-4 w-4 text-[#C2884E]" />
                                </div>
                                {language === 'en' ? 'Upcoming Orders' : '即将到来的订单'}
                              </CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#C2884E]/10">
                              <span className="text-sm font-medium text-[#6B5F53]">待配送订单：</span>
                              <div className="flex items-center">
                                <span className="text-xl font-bold text-[#C2884E]">{upcomingDeliveries}</span>
                                <span className="ml-1 text-sm text-[#6B5F53]">个</span>
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-dashed border-[#C2884E]/20">
                              <Button 
                                variant="ghost" 
                                className="w-full text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl"
                                onClick={() => setActiveTab("orders")}
                              >
                                <History className="h-4 w-4 mr-2" />
                                查看订单
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
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
                  
                  {/* Section Navigation */}
                  <OrderSectionNavigation 
                    activeSection={orderActiveSection} 
                    onSectionChange={setOrderActiveSection} 
                  />

                  {/* Order History Section */}
                  {userData && orderActiveSection === 'orders' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Weekly Meal Box Orders */}
                      <WeeklySubscriptionHistory userId={userData._id} />
                      
                      {/* Daily Delivery Orders */}
                      <DailyDeliveryHistory userId={userData._id} />
                    </motion.div>
                  )}
                  
                  {/* Recharge History Section */}
                  {userData && orderActiveSection === 'recharges' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Unified Recharge History */}
                      <UnifiedRechargeHistory 
                        userId={userData._id} 
                        weeklyRefreshKey={purchaseHistoryKey}
                        dailyRefreshKey={voucherHistoryKey}
                      />
                    </motion.div>
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
                        onClick={() => setActiveTab("overview")}
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
                    <h2 className="text-3xl font-bold tracking-tight">
                      {language === 'zh' ? '周次Meal Box' : 'Weekly Meal Box'}
                    </h2>
                    
                    <div className="flex items-center gap-2">
                      {/* Available Meal Plans Display */}
                      {userData && (
                        <div className="flex flex-wrap gap-2">
                          {userData.weeklySIXmeals !== undefined && userData.weeklySIXmeals > 0 && (
                            <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                              <span className="text-sm font-medium text-[#6B5F53]">
                                {language === 'zh' ? '6餐一周' : '6 Meals/Week'}: 
                              </span>
                              <span className="text-sm font-bold text-[#C2884E]">
                                {userData.weeklySIXmeals}{language === 'zh' ? '张' : ''}
                              </span>
                            </div>
                          )}
                          
                          {(userData as any).weeklyEIGHTmeals !== undefined && (userData as any).weeklyEIGHTmeals > 0 && (
                            <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                              <span className="text-sm font-medium text-[#6B5F53]">
                                {language === 'zh' ? '8餐一周' : '8 Meals/Week'}: 
                              </span>
                              <span className="text-sm font-bold text-[#C2884E]">
                                {(userData as any).weeklyEIGHTmeals}{language === 'zh' ? '张' : ''}
                              </span>
                            </div>
                          )}
                          
                          {userData.weeklyTENmeals !== undefined && userData.weeklyTENmeals > 0 && (
                            <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                              <span className="text-sm font-medium text-[#6B5F53]">
                                {language === 'zh' ? '10餐一周' : '10 Meals/Week'}: 
                              </span>
                              <span className="text-sm font-bold text-[#C2884E]">
                                {userData.weeklyTENmeals}{language === 'zh' ? '张' : ''}
                              </span>
                            </div>
                          )}
                          
                          {(userData as any).weeklyTWELVEmeals !== undefined && (userData as any).weeklyTWELVEmeals > 0 && (
                            <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                              <span className="text-sm font-medium text-[#6B5F53]">
                                {language === 'zh' ? '12餐一周' : '12 Meals/Week'}: 
                              </span>
                              <span className="text-sm font-bold text-[#C2884E]">
                                {(userData as any).weeklyTWELVEmeals}{language === 'zh' ? '张' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <button 
                        className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5EDE4] hover:bg-[#F0E5D9] text-[#C2884E] transition-all duration-300 hover:scale-110"
                        onClick={() => {
                          // Find the CreditPurchasePlans component and trigger its info dialog
                          const event = new CustomEvent('openInfoDialog');
                          document.dispatchEvent(event);
                        }}
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Available Areas Section - First section right below heading */}
                  <div className="mb-6 mt-4">
                    <AvailableAreas />
                  </div>
                  
                  {/* Credit Purchase Plans */}
                  {userData && userData._id && (
                    <div className="mb-6">
                      <CreditPurchasePlans 
                        userId={userData._id} 
                        onSuccess={() => {
                          // Refresh user data to get updated credits
                          if (userData?._id) {
                            getUserById(userData._id).then(user => {
                              if (user) {
                                setUserData(user);
                                setCredits(user.credits || 0);
                              }
                            });
                          }
                          
                          // Refresh transaction history
                          fetchTransactions();
                          
                          // Force refresh of credit purchase history component
                          setPurchaseHistoryKey(prev => prev + 1);
                        }} 
                      />
                    </div>
                  )}
                  
                  {/* Credit Purchase History */}
                  {userData && userData._id && (
                    <div className="mb-6">
                      <CreditPurchaseHistory 
                        key={purchaseHistoryKey} 
                        userId={userData._id} 
                      />
                    </div>
                  )}
                  
                  {/* Transaction History section commented out as it's redundant with the Recharge Requests section
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
                  */}
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
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                  >
                                    {addressInfo.province || "Select an area..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-full">
                                  <Command>
                                    <CommandInput placeholder="Search area..." />
                                    <CommandList className="max-h-[200px] overflow-y-auto">
                                      <CommandEmpty>No area found.</CommandEmpty>
                                      <CommandGroup>
                                        {["Downtown Toronto", "Midtown", "Scarborough", "North York", "East York", "York", "Etobicoke", "Markham", "Richmond Hill", "Aurora", "Newmarket", "Vaughan (including Maple, Concord, King)", "Mississauga", "Oakville", "Brampton", "Hamilton", "Burlington"].map((area) => (
                                          <CommandItem
                                            key={area}
                                            value={area}
                                            onSelect={() => {
                                              setAddressInfo(prev => ({
                                                ...prev,
                                                province: area
                                              }));
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                addressInfo.province === area ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {area}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
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
                    <MealVoucherPurchase 
                      onSuccess={() => {
                        // Increment the voucher history key to trigger a refresh
                        setVoucherHistoryKey(prev => prev + 1);
                      }}
                    />
                    
                    {/* Voucher Purchase History */}
                    {userData && userData._id && (
                      <div className="mt-8">
                        <VoucherPurchaseHistory 
                          userId={userData._id} 
                          refreshKey={voucherHistoryKey}
                        />
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
                    weeklyEIGHTmeals={(userData as any)?.weeklyEIGHTmeals}
                    weeklyTENmeals={userData?.weeklyTENmeals}
                    weeklyTWELVEmeals={(userData as any)?.weeklyTWELVEmeals}
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

