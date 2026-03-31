"use client"

// This ensures the page only runs on the client side
// We're using the "use client" directive to ensure this page is only rendered on the client
// where window and other browser APIs are available

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { History, ShoppingCart, Users, Gift, CheckCircle2, Sparkles, Loader2, Gem, Leaf, Shield, Zap, Heart, Flame, Apple, ChefHat, ArrowRight, Upload, Info, Search, ChevronDown, Ticket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
// import { SupportChat } from "@/components/support-chat"
import { CommunityRecipes } from "@/components/community-recipes"
// These components are dynamically imported above
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
import { DashboardShell, getDashboardMenuItems } from "@/features/dashboard-shell"
import { DashboardCreditsTab } from "@/features/dashboard-credits"
import { DashboardOverviewTab } from "@/features/dashboard-overview"
import { DashboardSettingsTab } from "@/features/dashboard-settings"
// Dynamically import components that might use client-side libraries like heic2any
const DailyDelivery = dynamic(() => import("@/components/daily-delivery"), { ssr: false })
const WeeklySubscription = dynamic(() => import("@/components/weekly-subscription"), { ssr: false })
const WeeklySubscriptionHistory = dynamic(() => import("@/components/weekly-subscription-history").then(mod => ({ default: mod.WeeklySubscriptionHistory })), { ssr: false })
const DailyDeliveryHistory = dynamic(() => import("@/components/daily-delivery-history").then(mod => ({ default: mod.DailyDeliveryHistory })), { ssr: false })
const MealVoucherPurchase = dynamic(() => import("@/components/meal-voucher-purchase"), { ssr: false })
const VoucherPurchaseHistory = dynamic(() => import("@/components/voucher-purchase-history").then(mod => ({ default: mod.VoucherPurchaseHistory })), { ssr: false })
const UnifiedRechargeHistory = dynamic(() => import("@/components/unified-recharge-history").then(mod => ({ default: mod.UnifiedRechargeHistory })), { ssr: false })
import { OrderSectionNavigation } from "@/components/order-section-navigation"

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

  const handleMobileLogout = () => {
    toast({
      title: "Logging out",
      description: "Please wait...",
    })

    setIsMobileMenuOpen(false)

    setTimeout(() => {
      void handleLogout()
    }, 800)
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

  const menuItems = useMemo(
    () =>
      getDashboardMenuItems(language, {
        overview: t('overview'),
        myOrders: t('myOrders'),
        settings: t('settings'),
      }),
    [language, t]
  )

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
      <DashboardShell
        menuItems={menuItems}
        activeTab={activeTab}
        isMobileMenuOpen={isMobileMenuOpen}
        onActiveTabChange={setActiveTab}
        onMobileMenuOpenChange={setIsMobileMenuOpen}
        onLogout={handleLogout}
        onMobileLogout={handleMobileLogout}
        mobileLogoutLabel={t('logOut')}
      >
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <DashboardOverviewTab
                  language={language}
                  userData={userData}
                  userLoading={userLoading}
                  dashboardHeaderDate={dashboardHeaderDate}
                  showServiceSelection={showServiceSelection}
                  upcomingDeliveries={upcomingDeliveries}
                  onShowServiceSelection={() => setShowServiceSelection(true)}
                  onTabChange={(tab) => setActiveTab(tab)}
                />
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
                <DashboardCreditsTab
                  language={language}
                  userData={userData}
                  purchaseHistoryKey={purchaseHistoryKey}
                  onPurchaseSuccess={() => {
                    void refreshUserProfile({ syncForms: false })
                    setPurchaseHistoryKey((prev) => prev + 1)
                  }}
                />
              )}

              {activeTab === "settings" && (
                <DashboardSettingsTab
                  language={language}
                  t={t}
                  userStatus={userData?.status}
                  userId={userData?.userID}
                  personalInfo={personalInfo}
                  addressInfo={addressInfo}
                  passwordInfo={passwordInfo}
                  onPersonalInfoChange={handlePersonalInfoChange}
                  onAddressInfoChange={handleAddressInfoChange}
                  onPasswordChange={handlePasswordChange}
                  onLanguagePreferenceChange={(languagePreference) =>
                    setPersonalInfo((prev) => ({ ...prev, languagePreference }))
                  }
                  onAddressProvinceChange={(province) =>
                    setAddressInfo((prev) => ({
                      ...prev,
                      province,
                    }))
                  }
                  onSavePersonalInfo={handleSavePersonalInfo}
                  onSaveAddressInfo={handleSaveAddressInfo}
                  onSavePassword={handleSavePassword}
                />
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
      </DashboardShell>
    </DashboardUserProfileContext.Provider>
  )
}

