"use client"

// This ensures the page only runs on the client side
// We're using the "use client" directive to ensure this page is only rendered on the client
// where window and other browser APIs are available

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, History, LogOut, Settings, ShoppingCart, User, Calendar, Users, Gift, CheckCircle2, Menu, X, Sparkles, Loader2, Gem, Leaf, Shield, Zap, Heart, Flame, Apple, ChefHat, ArrowRight, Upload, Info, Check, ChevronsUpDown, Search, ChevronDown, Ticket, CalendarCheck, UtensilsCrossed, Truck, Clock, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { UserNav } from "@/components/user-nav"
import { MainNav } from "@/components/main-nav"
import { useToast } from "@/hooks/use-toast"
import { ALL_WEEKLY_AREAS } from '@/lib/constants/areas'
// import { SupportChat } from "@/components/support-chat"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CommunityRecipes } from "@/components/community-recipes"
// These components are dynamically imported above
import { AvailableAreas } from "@/components/available-areas"
import { getUserById } from "@/lib/utils"
import { performClientLogout } from "@/lib/client-logout"
import { mergeStoredUser } from "@/lib/client-user-cache"
import { useClientAuth } from "@/lib/client-auth"
import {
  DashboardUserProfileContext,
  DEFAULT_DASHBOARD_CUTOFF_TIME,
  type DashboardUserData,
} from "@/lib/dashboard-user-profile"
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
import { ServiceSelectionCards } from "@/components/service-selection-cards"

// Valid delivery areas - using centralized constants
const VALID_DELIVERY_AREAS = ALL_WEEKLY_AREAS;

function formatDashboardHeaderDate(language: "en" | "zh"): string {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Toronto",
  }).format(new Date());
}

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language, setLanguage } = useLanguage()
  const { status: authStatus, authenticated, user: authUser } = useClientAuth()
  const [credits, setCredits] = useState(0)
  const [activeTab, setActiveTab] = useState("overview")
  const activeTabHistoryReadyRef = useRef(false)
  const [showServiceSelection, setShowServiceSelection] = useState(false)

  const handleLogout = async () => {
    await performClientLogout()
    toast({
      title: language === 'en' ? "Logged out" : "已退出登录",
      description: language === 'en' ? "You have been logged out successfully" : "您已成功退出登录",
    })
    router.push("/login")
  }
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userData, setUserData] = useState<DashboardUserData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [purchaseHistoryKey, setPurchaseHistoryKey] = useState(0)
  const [voucherHistoryKey, setVoucherHistoryKey] = useState(0)
  const [orderActiveSection, setOrderActiveSection] = useState<'orders' | 'recharges'>('orders')
  const [cutoffTime, setCutoffTime] = useState(DEFAULT_DASHBOARD_CUTOFF_TIME)
  const [upcomingDeliveries, setUpcomingDeliveries] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [orderStatsLoading, setOrderStatsLoading] = useState(true)
  const [dashboardHeaderDate, setDashboardHeaderDate] = useState("")

  // Add form state for user settings
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    languagePreference: 'zh' as 'zh' | 'en'
  })
  
  // Keep dashboard tabs in the URL/history so browser back/forward restores the exact previous tab.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const syncTabFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const nextTab = urlParams.get('tab') || 'overview'
      setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab))
    }

    syncTabFromUrl()
    activeTabHistoryReadyRef.current = true
    window.addEventListener('popstate', syncTabFromUrl)

    return () => {
      window.removeEventListener('popstate', syncTabFromUrl)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !activeTabHistoryReadyRef.current) {
      return
    }

    const nextUrl = new URL(window.location.href)
    const currentTab = nextUrl.searchParams.get('tab') || 'overview'

    if (currentTab === activeTab) {
      return
    }

    if (activeTab === 'overview') {
      nextUrl.searchParams.delete('tab')
    } else {
      nextUrl.searchParams.set('tab', activeTab)
    }

    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    window.history.pushState({ tab: activeTab }, '', nextPath)
  }, [activeTab])

  useEffect(() => {
    setDashboardHeaderDate(formatDashboardHeaderDate(language))
  }, [language])

  const [addressInfo, setAddressInfo] = useState({
    unitNumber: '',
    streetAddress: '',
    province: '', // State in UI
    postalCode: '', // ZIP code in UI
    country: 'Canada', // Always Canada, not shown in UI
    buzzCode: ''
  });

  const applyUserProfile = useCallback(
    (nextUser: Partial<DashboardUserData>, options?: { syncForms?: boolean }) => {
      if (!nextUser._id || !nextUser.name || !nextUser.email) {
        return;
      }

      const normalizedUser: DashboardUserData = {
        _id: nextUser._id,
        userID: nextUser.userID || "",
        name: nextUser.name,
        nickname: nextUser.nickname || "",
        email: nextUser.email,
        credits: nextUser.credits || 0,
        twoDishVoucher: nextUser.twoDishVoucher || 0,
        threeDishVoucher: nextUser.threeDishVoucher || 0,
        weeklySIXmeals: nextUser.weeklySIXmeals || 0,
        weeklyEIGHTmeals: nextUser.weeklyEIGHTmeals || 0,
        weeklyTENmeals: nextUser.weeklyTENmeals || 0,
        weeklyTWELVEmeals: nextUser.weeklyTWELVEmeals || 0,
        weeklySIXTEENmeals: nextUser.weeklySIXTEENmeals || 0,
        joined: nextUser.joined || nextUser.createdAt || new Date().toISOString(),
        status: nextUser.status || "Active",
        languagePreference: nextUser.languagePreference || "zh",
        address: nextUser.address
          ? {
              unitNumber: nextUser.address.unitNumber || "",
              streetAddress: nextUser.address.streetAddress || "",
              province: nextUser.address.province || "",
              postalCode: nextUser.address.postalCode || "",
              country: nextUser.address.country || "Canada",
              buzzCode: nextUser.address.buzzCode || "",
            }
          : undefined,
        phone: nextUser.phone || "",
        createdAt: nextUser.createdAt || nextUser.joined || new Date().toISOString(),
        updatedAt: nextUser.updatedAt,
        isActive: nextUser.isActive,
        totalOrders: nextUser.totalOrders,
        dailyOrdersCount: nextUser.dailyOrdersCount,
        weeklyOrdersCount: nextUser.weeklyOrdersCount,
        area: nextUser.area || nextUser.address?.province || "",
        role: nextUser.role,
        isVerified: Boolean(nextUser.isVerified),
      };

      setUserData(normalizedUser);
      setCredits(normalizedUser.credits || 0);
      mergeStoredUser({
        _id: normalizedUser._id,
        userID: normalizedUser.userID,
        name: normalizedUser.name,
        nickname: normalizedUser.nickname,
        email: normalizedUser.email,
        role: normalizedUser.role,
        languagePreference: normalizedUser.languagePreference || "zh",
        isVerified: normalizedUser.isVerified,
        phone: normalizedUser.phone || "",
        address: normalizedUser.address,
        area: normalizedUser.area || normalizedUser.address?.province || "",
        credits: normalizedUser.credits || 0,
        twoDishVoucher: normalizedUser.twoDishVoucher || 0,
        threeDishVoucher: normalizedUser.threeDishVoucher || 0,
        weeklySIXmeals: normalizedUser.weeklySIXmeals || 0,
        weeklyEIGHTmeals: normalizedUser.weeklyEIGHTmeals || 0,
        weeklyTENmeals: normalizedUser.weeklyTENmeals || 0,
        weeklyTWELVEmeals: normalizedUser.weeklyTWELVEmeals || 0,
        weeklySIXTEENmeals: normalizedUser.weeklySIXTEENmeals || 0,
      });
      localStorage.setItem('isAuthenticated', 'true');

      if (
        normalizedUser.languagePreference &&
        (normalizedUser.languagePreference === 'zh' || normalizedUser.languagePreference === 'en')
      ) {
        console.log('Dashboard: Setting language from database:', normalizedUser.languagePreference);
        setLanguage(normalizedUser.languagePreference);
        localStorage.setItem('preferredLanguage', normalizedUser.languagePreference);
      }

      if (options?.syncForms === false) {
        return;
      }

      setPersonalInfo({
        name: normalizedUser.name || '',
        nickname: normalizedUser.nickname || '',
        email: normalizedUser.email || '',
        phone: normalizedUser.phone || '',
        languagePreference: normalizedUser.languagePreference || 'zh'
      });

      setAddressInfo({
        unitNumber: normalizedUser.address?.unitNumber || '',
        streetAddress: normalizedUser.address?.streetAddress || '',
        province: normalizedUser.address?.province || '',
        postalCode: normalizedUser.address?.postalCode || '',
        country: normalizedUser.address?.country || 'Canada',
        buzzCode: normalizedUser.address?.buzzCode || ''
      });
    },
    [setLanguage]
  );

  const refreshUserProfile = useCallback(
    async (options?: { syncForms?: boolean; signal?: AbortSignal }) => {
      if (!authUser?._id) {
        return null;
      }

      try {
        const user = await getUserById(authUser._id, { signal: options?.signal });
        if (!user) {
          return null;
        }

        const nextUser = user as DashboardUserData;
        applyUserProfile(nextUser, options);
        return nextUser;
      } catch (error) {
        console.error('Error refreshing user profile:', error);
        return null;
      }
    },
    [applyUserProfile, authUser?._id]
  );

  const applyRef = useRef(applyUserProfile);
  const refreshRef = useRef(refreshUserProfile);
  const routerRef = useRef(router);
  const toastRef = useRef(toast);
  applyRef.current = applyUserProfile;
  refreshRef.current = refreshUserProfile;
  routerRef.current = router;
  toastRef.current = toast;

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

  useEffect(() => {
    const controller = new AbortController();
    async function loadCutoffTime() {
      try {
        const response = await fetch('/api/settings?key=cutoffTime', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();

        if (data.success && data.data?.value) {
          setCutoffTime({
            hour: data.data.value.hour || DEFAULT_DASHBOARD_CUTOFF_TIME.hour,
            minute: data.data.value.minute || DEFAULT_DASHBOARD_CUTOFF_TIME.minute,
          });
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.warn('Failed to fetch cutoff time, using default 11:59 AM', error);
      }
    }

    void loadCutoffTime();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadUserData() {
      try {
        if (authStatus !== "ready") {
          return;
        }

        if (!authenticated || !authUser?._id) {
          routerRef.current.replace("/login");
          return;
        }

        setUserLoading(true);
        const initialUser = authUser as DashboardUserData;
        
        // Check if auth user has _id before proceeding
        if (!initialUser || !initialUser._id) {
          console.error('User data is missing _id:', initialUser);
          toastRef.current({
            title: "Error",
            description: "User data is incomplete. Please log out and log in again.",
            variant: "destructive"
          });
          setUserLoading(false);
          return;
        }

        applyRef.current(initialUser, { syncForms: true });
        setOrderStatsLoading(true);
        console.log('[Dashboard] Loading user profile and order stats in parallel...');
        const [refreshedUser, orderStatsResponse] = await Promise.all([
          refreshRef.current({ syncForms: true, signal: controller.signal }),
          fetch(`/api/users/${authUser._id}/orders/count`, {
            signal: controller.signal,
          }),
        ]);
        if (controller.signal.aborted) {
          return;
        }

        const orderStatsData = await orderStatsResponse.json();
        if (controller.signal.aborted) {
          return;
        }

        if (orderStatsData.success && orderStatsData.data) {
          setUpcomingDeliveries(orderStatsData.data.upcomingDeliveries || 0);
          setTotalOrders(orderStatsData.data.totalOrders || 0);
        }

        if (!refreshedUser) {
          if (controller.signal.aborted) return;
          console.error('Failed to fetch user data from API');
          toastRef.current({
            title: "Error",
            description: "Failed to load user data from server",
            variant: "destructive"
          });
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Error loading user data:', error);
        toastRef.current({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive"
        });
      } finally {
        setUserLoading(false);
        setOrderStatsLoading(false);
      }
    }
    
    loadUserData();
    return () => controller.abort();
  }, [authStatus, authenticated, authUser?._id]);

  // Function to fetch order statistics
  const refreshOrderStats = useCallback(async (userId: string, options?: { signal?: AbortSignal }) => {
    if (!userId) return;
    
    try {
      setOrderStatsLoading(true);
      const response = await fetch(`/api/users/${userId}/orders/count`, {
        signal: options?.signal,
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        setUpcomingDeliveries(data.data.upcomingDeliveries || 0);
        setTotalOrders(data.data.totalOrders || 0);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Error fetching order statistics:', error);
    } finally {
      setOrderStatsLoading(false);
    }
  }, []);
  
  const userProfileContextValue = useMemo(() => ({
    userData,
    cutoffTime,
    upcomingDeliveries,
    totalOrders,
    refreshUserProfile,
    refreshOrderStats,
  }), [cutoffTime, refreshOrderStats, refreshUserProfile, totalOrders, upcomingDeliveries, userData]);

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
          phone: personalInfo.phone,
          languagePreference: personalInfo.languagePreference
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        applyUserProfile(result.data as DashboardUserData, { syncForms: true });
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
            province: addressInfo.province,
            postalCode: addressInfo.postalCode,
            country: addressInfo.country,
            buzzCode: addressInfo.buzzCode
          }
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        applyUserProfile(result.data as DashboardUserData, { syncForms: true });
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

  return (
    <DashboardUserProfileContext.Provider value={userProfileContextValue}>
      <div className="flex flex-col h-screen overflow-hidden">
        <header className="bg-background sticky top-0 z-50 w-full border-b flex-shrink-0">
        <div className="container flex h-16 items-center justify-between px-4">
          <MainNav />
          
          <div className="flex items-center gap-2">
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
            className="fixed inset-0 z-40 bg-background/90 backdrop-blur-md md:hidden overflow-hidden"
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
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
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
                          <div 
                            className="absolute bottom-0 left-0 h-0.5 bg-white/30 w-full transition-opacity duration-200"
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
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
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
                                <div 
                                  className="absolute bottom-0 left-0 h-0.5 bg-white/30 w-full transition-opacity duration-200"
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
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
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
                        void handleLogout();
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

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
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
        
        <main className="flex-1 pt-2 md:pt-6 px-4 pb-12 overflow-y-auto overflow-x-hidden">
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
                            {dashboardHeaderDate}
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
                    {/* Two-Step Flow: No Credits Message OR Service Selection Cards */}
                    {/* Only show after user data has fully loaded to avoid flicker (auth user may have 0s before API refresh) */}
                    {userData && !userLoading &&
                      (userData?.credits || 0) === 0 &&
                      (userData?.twoDishVoucher || 0) === 0 && 
                      (userData?.threeDishVoucher || 0) === 0 && 
                      (userData?.weeklySIXmeals || 0) === 0 && 
                      ((userData as any)?.weeklyEIGHTmeals || 0) === 0 && 
                      (userData?.weeklyTENmeals || 0) === 0 && 
                      ((userData as any)?.weeklyTWELVEmeals || 0) === 0 && 
                      ((userData as any)?.weeklySIXTEENmeals || 0) === 0 && (
                      <AnimatePresence mode="wait">
                        {!showServiceSelection ? (
                          // Step 1: No Credits Message
                          <motion.div
                            key="no-credits"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                            className="col-span-full"
                          >
                            <Card className="overflow-hidden border border-[#C2884E]/20 bg-gradient-to-br from-white to-[#FFF6EF] shadow-lg rounded-3xl">
                              <CardContent className="p-8 text-center">
                                <div className="flex flex-col items-center justify-center space-y-6">
                                  {/* Icon */}
                                  <div className="h-20 w-20 rounded-full bg-[#F5EDE4] flex items-center justify-center">
                                    <Ticket className="h-10 w-10 text-[#C2884E]" />
                                  </div>
                                  
                                  {/* Message */}
                                  <div className="space-y-2">
                                    <h3 className="text-2xl font-semibold text-[#6B5F53]">
                                      {language === 'en' 
                                        ? "You don't have any meal credits right now" 
                                        : '您目前没有任何餐券'}
                                    </h3>
                                    <p className="text-[#6B5F53]/70 text-base max-w-md mx-auto">
                                      {language === 'en'
                                        ? 'Please start recharging to enjoy our delicious meals'
                                        : '请充值以享受我们美味的餐点'}
                                    </p>
                                  </div>
                                  
                                  {/* CTA Button */}
                                  <Button 
                                    size="lg"
                                    className="bg-[#C2884E] hover:bg-[#B17940] text-white rounded-xl px-8 py-6 text-base font-medium shadow-md hover:shadow-lg transition-all duration-300"
                                    onClick={() => setShowServiceSelection(true)}
                                  >
                                    <CreditCard className="h-5 w-5 mr-2" />
                                    {language === 'en' ? 'Start Recharging' : '开始充值'}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ) : (
                          // Step 2: Service Selection Cards
                          <motion.div
                            key="service-selection"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="col-span-full"
                          >
                            <div className="space-y-6">
                              {/* Title */}
                              <div className="text-center">
                                <h3 className="text-2xl font-semibold text-[#6B5F53] mb-2">
                                  {language === 'en' ? 'Choose Your Service' : '选择您的服务'}
                                </h3>
                              </div>
                              
                              {/* Service Cards */}
                              <ServiceSelectionCards 
                                onSelectDaily={() => setActiveTab("meal-vouchers")}
                                onSelectWeekly={() => setActiveTab("credits")}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                    
                    {/* Show Daily first if user has both daily and weekly vouchers, otherwise show weekly first if only weekly */}
                    {/* Daily Delivery Vouchers Card - Show first if user has daily vouchers */}
                    {userData && ((userData?.twoDishVoucher || 0) > 0 || (userData?.threeDishVoucher || 0) > 0) && (
                      <div
                        className=""
                        style={{ transitionDelay: '0.15s' } as React.CSSProperties}
                      >
                        <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md rounded-3xl hover:shadow-lg transition-shadow duration-300">
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
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                                  onClick={() => setActiveTab("daily-delivery")}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Start Ordering' : '去订餐'}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                                  onClick={() => setActiveTab("meal-vouchers")}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Recharge' : '去充值'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    {/* Weekly Delivery Vouchers Card - Show only if user has vouchers > 0 */}
                    {userData && (userData?.weeklySIXmeals > 0 || (userData as any)?.weeklyEIGHTmeals > 0 || 
                      userData?.weeklyTENmeals > 0 || (userData as any)?.weeklyTWELVEmeals > 0 || 
                      (userData as any)?.weeklySIXTEENmeals > 0) && (
                      <div
                        className=""
                        style={{ transitionDelay: '0.1s' } as React.CSSProperties}
                      >
                        <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md rounded-3xl hover:shadow-lg transition-shadow duration-300">
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
                                
                                {(userData as any)?.weeklySIXTEENmeals > 0 && (
                                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#C2884E]/10">
                                    <span className="text-sm font-medium text-[#6B5F53]">{language === 'en' ? '16 meals/week' : '16餐一周'}:</span>
                                    <div className="flex items-center">
                                      <span className="text-xl font-bold text-[#C2884E]">{(userData as any)?.weeklySIXTEENmeals}</span>
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
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                                  onClick={() => setActiveTab("weekly-subscription")}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Start Ordering' : '去订餐'}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                                  onClick={() => setActiveTab("credits")}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Recharge' : '去充值'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    {/* Daily Delivery Vouchers Card - Show after weekly if user has 0 daily vouchers but has weekly vouchers */}
                    {userData && 
                      ((userData?.twoDishVoucher || 0) === 0 && (userData?.threeDishVoucher || 0) === 0) &&
                      ((userData?.weeklySIXmeals || 0) > 0 || ((userData as any)?.weeklyEIGHTmeals || 0) > 0 || 
                       (userData?.weeklyTENmeals || 0) > 0 || ((userData as any)?.weeklyTWELVEmeals || 0) > 0 || 
                       ((userData as any)?.weeklySIXTEENmeals || 0) > 0) && (
                      <div
                        className=""
                        style={{ transitionDelay: '0.2s' } as React.CSSProperties}
                      >
                        <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md rounded-3xl hover:shadow-lg transition-shadow duration-300">
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
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                                  onClick={() => setActiveTab("daily-delivery")}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Start Ordering' : '去订餐'}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="text-[#C2884E] hover:bg-[#F5EDE4] hover:text-[#C2884E] rounded-xl transition-colors duration-200"
                                  onClick={() => setActiveTab("meal-vouchers")}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  {language === 'en' ? 'Recharge' : '去充值'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    {/* Upcoming Orders Card - Only show if upcomingDeliveries > 0 */}
                    {upcomingDeliveries > 0 && (
                      <div
                        className=""
                        style={{ transitionDelay: '0.3s' } as React.CSSProperties}
                      >
                        <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-md rounded-3xl hover:shadow-lg transition-shadow duration-300">
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
                      </div>
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

                </motion.div>
              )}

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
                  {/* New Header Design matching Weekly Meal Page */}
                  <div className="bg-gradient-to-br from-[#FFF6EF] to-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#C2884E]/10 mt-4">
                    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                      {/* Left column - Title and description */}
                      <div className="md:w-1/2">
                        <div className="inline-flex items-center mb-4">
                          <div className="px-4 py-1 bg-[#C2884E]/5 rounded-full">
                            <span className="text-sm font-medium text-[#C2884E]">
                              {language === 'zh' ? '周次餐盒订阅' : 'Weekly Meal Subscription'}
                            </span>
                          </div>
                        </div>
                        
                        <h2 className="text-2xl md:text-4xl font-bold mb-4 text-[#6B5F53]">
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                            {language === 'zh' ? '周次MealBox' : 'Weekly MealBox'}
                          </span>
                          <span className="block mt-1">
                            {language === 'zh' ? '餐盒订阅' : 'Meal Subscription'}
                          </span>
                        </h2>
                        
                        <p className="text-base md:text-lg text-[#6B5F53]/80 mb-6">
                          {language === 'zh' 
                            ? '适合把餐食储存于冰箱，随取随享，注重极度便利的你' 
                            : 'Perfect for those who prefer to store meals in the refrigerator and enjoy maximum convenience'}
                        </p>
                        
                        {/* Available Meal Plans Display */}
                        {userData && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-[#6B5F53]/70 mb-2">
                              {language === 'zh' ? '当前可用餐券：' : 'Available Coupons:'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {userData.weeklySIXmeals !== undefined && userData.weeklySIXmeals > 0 && (
                                <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full border border-[#C2884E]/20">
                                  <span className="text-sm font-medium text-[#6B5F53]">
                                    {language === 'zh' ? '6餐一周' : '6 Meals/Week'}: 
                                  </span>
                                  <span className="text-sm font-bold text-[#C2884E]">
                                    {userData.weeklySIXmeals}{language === 'zh' ? '张' : ''}
                                  </span>
                                </div>
                              )}
                              
                              {(userData as any).weeklyEIGHTmeals !== undefined && (userData as any).weeklyEIGHTmeals > 0 && (
                                <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full border border-[#C2884E]/20">
                                  <span className="text-sm font-medium text-[#6B5F53]">
                                    {language === 'zh' ? '8餐一周' : '8 Meals/Week'}: 
                                  </span>
                                  <span className="text-sm font-bold text-[#C2884E]">
                                    {(userData as any).weeklyEIGHTmeals}{language === 'zh' ? '张' : ''}
                                  </span>
                                </div>
                              )}
                              
                              {userData.weeklyTENmeals !== undefined && userData.weeklyTENmeals > 0 && (
                                <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full border border-[#C2884E]/20">
                                  <span className="text-sm font-medium text-[#6B5F53]">
                                    {language === 'zh' ? '10餐一周' : '10 Meals/Week'}: 
                                  </span>
                                  <span className="text-sm font-bold text-[#C2884E]">
                                    {userData.weeklyTENmeals}{language === 'zh' ? '张' : ''}
                                  </span>
                                </div>
                              )}
                              
                              {(userData as any).weeklyTWELVEmeals !== undefined && (userData as any).weeklyTWELVEmeals > 0 && (
                                <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full border border-[#C2884E]/20">
                                  <span className="text-sm font-medium text-[#6B5F53]">
                                    {language === 'zh' ? '12餐一周' : '12 Meals/Week'}: 
                                  </span>
                                  <span className="text-sm font-bold text-[#C2884E]">
                                    {(userData as any).weeklyTWELVEmeals}{language === 'zh' ? '张' : ''}
                                  </span>
                                </div>
                              )}
                              
                              {(userData as any).weeklySIXTEENmeals !== undefined && (userData as any).weeklySIXTEENmeals > 0 && (
                                <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full border border-[#C2884E]/20">
                                  <span className="text-sm font-medium text-[#6B5F53]">
                                    {language === 'zh' ? '16餐一周' : '16 Meals/Week'}: 
                                  </span>
                                  <span className="text-sm font-bold text-[#C2884E]">
                                    {(userData as any).weeklySIXTEENmeals}{language === 'zh' ? '张' : ''}
                                  </span>
                                </div>
                              )}
                              
                              {/* Show message if no coupons */}
                              {(!userData.weeklySIXmeals || userData.weeklySIXmeals === 0) && 
                               (!(userData as any).weeklyEIGHTmeals || (userData as any).weeklyEIGHTmeals === 0) &&
                               (!userData.weeklyTENmeals || userData.weeklyTENmeals === 0) &&
                               (!(userData as any).weeklyTWELVEmeals || (userData as any).weeklyTWELVEmeals === 0) &&
                               (!(userData as any).weeklySIXTEENmeals || (userData as any).weeklySIXTEENmeals === 0) && (
                                <div className="text-sm text-[#6B5F53]/60 italic">
                                  {language === 'zh' ? '暂无可用餐券' : 'No coupons available'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-3">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline"
                                size="sm"
                                className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/5 transition-all duration-300"
                              >
                                {language === 'zh' ? '了解更多' : 'Learn More'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] w-[95vw] p-0 rounded-xl sm:rounded-[24px] overflow-hidden border-0 sm:border-[#C2884E]/10 max-h-[85vh] shadow-xl">
                              <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6 text-white h-[90px] flex flex-col justify-center">
                                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                                  {language === 'zh' ? '了解更多' : 'Learn More'}
                                </DialogTitle>
                                <DialogDescription className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base font-light">
                                  {language === 'zh' ? '了解我们的周次餐盒订阅服务' : 'Learn about our weekly meal subscription service'}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="p-6 overflow-y-auto max-h-[70vh] scrollbar-brand">
                                <div className="space-y-8">
                                  <h3 className="text-xl font-semibold text-[#6B5F53] mb-4">{language === 'zh' ? '订阅方式' : 'Subscription Process'}</h3>
                                  
                                  {/* Step 1 */}
                                  <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                                      <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-[#C2884E]" />
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">1</span>
                                        {language === 'zh' ? '选择适合你的周卡' : 'Choose Your Weekly Plan'}
                                      </h3>
                                      <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                        {language === 'zh' ? '根据您的用餐需求选择合适的周卡套餐，灵活安排每周用餐计划。' : 'Select a weekly plan that suits your meal needs and flexibly arrange your weekly meal schedule.'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Step 2 */}
                                  <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                                      <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-[#C2884E]" />
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">2</span>
                                        {language === 'zh' ? '完成在线付款' : 'Complete Online Payment'}
                                      </h3>
                                      <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                        {language === 'zh' ? '通过线上支付方式完成周卡购买，系统自动记录您的周卡余额。' : 'Complete your weekly plan purchase through online payment. The system automatically records your plan balance.'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Step 3 */}
                                  <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                                      <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                        <CalendarCheck className="w-5 h-5 text-[#C2884E]" />
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">3</span>
                                        {language === 'zh' ? '使用周卡下单订餐' : 'Order Meals with Your Plan'}
                                      </h3>
                                      <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                        {language === 'zh' ? '登录账户，使用周卡下单订餐，无需重复支付。' : 'Log into your account and use your weekly plan to order meals without repeated payments.'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Step 4 */}
                                  <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                                      <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                        <UtensilsCrossed className="w-5 h-5 text-[#C2884E]" />
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">4</span>
                                        {language === 'zh' ? '每周更新菜单，自由挑选餐食' : 'Weekly Menu Updates, Choose Freely'}
                                      </h3>
                                      <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                        {language === 'zh' ? '我们每周更新菜单，您可以提前选择喜欢的菜品和配送日期。' : 'We update our menu weekly. You can select your favorite dishes and delivery dates in advance.'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Step 5 */}
                                  <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                                      <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                        <Truck className="w-5 h-5 text-[#C2884E]" />
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">5</span>
                                        {language === 'zh' ? '晚间送达 → 冷藏保存 → 按最佳日期享用' : 'Evening Delivery → Refrigerate → Enjoy by Best-By Date'}
                                      </h3>
                                      <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                        {language === 'zh' ? '我们会在晚间将餐食送达您指定的地址，您可以将餐食冷藏保存，按照标注的最佳食用日期享用。' : 'We deliver meals to your specified address in the evening. You can refrigerate the meals and enjoy them by the labeled best-by date.'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {/* Purchase Button - Mobile Only */}
                          <Button 
                            variant="default"
                            size="sm"
                            className="md:hidden bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white transition-all duration-300"
                            onClick={() => {
                              const element = document.getElementById('weekly-service-area-section');
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                          >
                            {language === 'zh' ? '购买餐券' : 'Purchase Coupons'}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Right column - Feature tags */}
                      <div className="md:w-1/2 flex flex-col justify-center">
                        <div className="space-y-4">
                          {/* Feature 1 */}
                          <div className="group flex items-center gap-4 p-1">
                            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center shadow-sm border border-[#C2884E]/10 group-hover:border-[#C2884E]/30 transition-all duration-300">
                              <div className="transform group-hover:scale-110 transition-transform duration-300 text-[#C2884E]">
                                <Calendar className="h-6 w-6" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors duration-300">
                                {language === 'zh' ? '周次MealBox' : 'Weekly MealBox'}
                              </p>
                              <p className="text-sm text-[#6B5F53]/80">
                                {language === 'zh' ? '每周配送2次 (周日 & 周二)，轻松覆盖整周' : '2 deliveries per week (Sun & Tue), covering the entire week'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Feature 2 */}
                          <div className="group flex items-center gap-4 p-1">
                            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center shadow-sm border border-[#C2884E]/10 group-hover:border-[#C2884E]/30 transition-all duration-300">
                              <div className="transform group-hover:scale-110 transition-transform duration-300 text-[#C2884E]">
                                <Clock className="h-6 w-6" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors duration-300">
                                {language === 'zh' ? '晚间配送' : 'Evening Delivery'}
                              </p>
                              <p className="text-sm text-[#6B5F53]/80">
                                {language === 'zh' ? '6PM-10PM送达，方便省心' : 'Delivered 6PM-10PM, convenient and worry-free'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Feature 3 */}
                          <div className="group flex items-center gap-4 p-1">
                            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center shadow-sm border border-[#C2884E]/10 group-hover:border-[#C2884E]/30 transition-all duration-300">
                              <div className="transform group-hover:scale-110 transition-transform duration-300 text-[#C2884E]">
                                <Star className="h-6 w-6" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors duration-300">
                                {language === 'zh' ? '冷藏保存' : 'Refrigerate & Enjoy'}
                              </p>
                              <p className="text-sm text-[#6B5F53]/80">
                                {language === 'zh' ? '储存于冰箱，随取随享' : 'Store in refrigerator, enjoy anytime'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Available Areas Section */}
                  <div id="weekly-service-area-section" className="mb-6">
                    <AvailableAreas />
                  </div>
                  
                  {/* Credit Purchase Plans */}
                  {userData && userData._id && (
                    <div id="weekly-meal-plans-section" className="mb-6">
                      <CreditPurchasePlans 
                        userId={userData._id} 
                        onSuccess={() => {
                          void refreshUserProfile({ syncForms: false });

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
                  
                </motion.div>
              )}

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
                          
                          <div className="space-y-2 mt-4">
                            <Label htmlFor="languagePreference">{t('preferredLanguage')}</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setPersonalInfo((prev) => ({ ...prev, languagePreference: 'zh' }))}
                                className={cn(
                                  "h-11 px-4 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
                                  personalInfo.languagePreference === 'zh'
                                    ? "border-[#C2884E] bg-[#FFF6EF] text-[#C2884E] font-medium"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                )}
                              >
                                <span className="text-sm">中文</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPersonalInfo((prev) => ({ ...prev, languagePreference: 'en' }))}
                                className={cn(
                                  "h-11 px-4 rounded-md border-2 transition-all duration-200 flex items-center justify-center gap-2",
                                  personalInfo.languagePreference === 'en'
                                    ? "border-[#C2884E] bg-[#FFF6EF] text-[#C2884E] font-medium"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                )}
                              >
                                <span className="text-xl">🇨🇦</span>
                                <span className="text-sm">English</span>
                              </button>
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
                              <div className="flex items-center gap-2">
                                <Label htmlFor="state">{t('state')}</Label>
                                {addressInfo.province && !VALID_DELIVERY_AREAS.includes(addressInfo.province) && (
                                  <span className="text-red-500 text-xs">
                                    ({language === 'zh' ? '请选择有效的配送区域' : 'Please select a valid delivery area'})
                                  </span>
                                )}
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between",
                                      addressInfo.province && !VALID_DELIVERY_AREAS.includes(addressInfo.province) && "border-red-500"
                                    )}
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
                                        {VALID_DELIVERY_AREAS.map((area) => (
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
                    weeklySIXTEENmeals={(userData as any)?.weeklySIXTEENmeals}
                    onVoucherUpdate={() => {
                      void refreshUserProfile({ syncForms: false });
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
    </DashboardUserProfileContext.Provider>
  )
}

