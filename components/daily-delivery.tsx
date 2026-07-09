"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { Plus, Minus, ShoppingCart, X, Utensils, Ticket } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  DEFAULT_DASHBOARD_CUTOFF_TIME,
  type DashboardUserData,
  useOptionalUserProfile,
} from '@/lib/dashboard-user-profile'
import { getCutoffTime, type CutoffTime } from '@/lib/cutoff-time'
import {
  formatDailyCombo,
  type CartItem,
  type ComboType,
  type DayData,
} from '@/lib/daily-delivery'
import { getDeliveryDayAvailability } from '@/lib/orders/delivery-day-availability'
import {
  pickDefaultAvailableDay,
  resolveDailyMenuSelectedDayAfterFetch,
} from '@/lib/daily-menu-selected-day'
import { MenuUpdateBanner } from '@/components/menu-update-banner'
import { DailyComboGrid } from '@/features/daily-ordering/daily-combo-grid'
import { DailyDaySidebar } from '@/features/daily-ordering/daily-day-sidebar'
import { useDailyCart } from '@/features/daily-ordering/use-daily-cart'
import { DailyDeliveryCheckout } from './daily-delivery-checkout'
import { RegionCheckDialog } from './region-check-dialog'
import { DAILY_DELIVERY_AREA_LABELS, canDeliverDaily } from '@/lib/zones/service-areas'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type MenuDataResult = {
  currentDates: string
  formattedDays: Record<string, DayData>
}

// Helper function to convert English day names to Chinese
const getChineseDayName = (englishDayName: string): string => {
  const dayMap: Record<string, string> = {
    'monday': '周一',
    'tuesday': '周二',
    'wednesday': '周三',
    'thursday': '周四',
    'friday': '周五',
    'saturday': '周六',
    'sunday': '周日'
  };
  
  // Convert to lowercase and remove any week suffix (e.g., "-w1")
  const baseDayName = englishDayName.toLowerCase().split('-')[0];
  return dayMap[baseDayName] || englishDayName;
};

export default function DailyDelivery() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const sharedUserProfile = useOptionalUserProfile()
  const [days, setDays] = useState<Record<string, DayData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string>('monday-w1')
  const [dayWarning, setDayWarning] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [userVouchers, setUserVouchers] = useState({
    twoDish: 0,
    threeDish: 0
  })
  const [showRegionDialog, setShowRegionDialog] = useState(false)
  const [userRegion, setUserRegion] = useState<string | undefined>(undefined)
  const [dishTranslations, setDishTranslations] = useState<Record<string, string>>({}) // Map of Chinese name -> English name
  const [localCutoffTime, setLocalCutoffTime] = useState<CutoffTime>(DEFAULT_DASHBOARD_CUTOFF_TIME)
  const cutoffTime = sharedUserProfile?.cutoffTime ?? localCutoffTime
  
  // State for menu update notification
  const [menuUpdateAvailable, setMenuUpdateAvailable] = useState(false)
  const [lastFetchedDates, setLastFetchedDates] = useState<string>('')
  
  // Helper function to translate combo names
  const translateComboName = (name: string): string => {
    if (language === 'zh') return name
    // Translate common combo name patterns
    if (name.includes('套餐')) {
      return name.replace(/套餐/g, 'Combo')
    }
    return name
  }
  
  // Helper function to translate dish names
  const translateDishName = (dishName: string): string => {
    if (language === 'zh' || !dishTranslations[dishName]) {
      return dishName
    }
    return dishTranslations[dishName] || dishName
  }
  // Derived from registry — no need to update manually when coverage changes
  const DAILY_DELIVERY_REGIONS = DAILY_DELIVERY_AREA_LABELS
  
  const fetchDishTranslations = async (options?: { signal?: AbortSignal }): Promise<Record<string, string>> => {
    try {
      const response = await fetch('/api/dishes', {
        signal: options?.signal,
      });
      const result = await response.json();
      if (options?.signal?.aborted) return {}
      
      if (result.success && result.data) {
        // Create a map of Chinese name -> English name
        const translationsMap: Record<string, string> = {};
        result.data.forEach((dish: any) => {
          if (dish.nameEn) {
            translationsMap[dish.name] = dish.nameEn;
          }
        });
        return translationsMap;
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError' || options?.signal?.aborted) return {}
      console.error('Error fetching dish translations:', error);
    }

    return {}
  };
  
  // Check if a day is in the past or today after ordering cutoff time
  const isDayUnavailable = (day: string): { unavailable: boolean, reason: string } => {
    return getDeliveryDayAvailability({
      dateLabel: days[day]?.date,
      cutoffTime,
      language,
    })
  }
  
  const {
    addToCart,
    cart,
    getQuantityInCart,
    removeFromCart,
    setCart,
    totalItems,
    totalVouchers,
  } = useDailyCart({
    isDayUnavailable,
    onUnavailableDayAttempt: (reason) => {
      toast({
        title: "Cannot add to cart",
        description: reason,
        variant: "destructive",
      })
    },
  })
  
  // Tag helper functions removed as icons are no longer used

  const syncUserSnapshot = (user: Partial<DashboardUserData> | null) => {
    if (!user) {
      return
    }

    setUserVouchers({
      twoDish: user.twoDishVoucher || 0,
      threeDish: user.threeDishVoucher || 0,
    })

    const nextRegion = user.address?.province
    setUserRegion(nextRegion)
    setShowRegionDialog(Boolean(nextRegion && !canDeliverDaily(undefined, nextRegion)))
  }

  // Function to fetch user data from API
  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for daily delivery component');
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        syncUserSnapshot(data.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Function to fetch menu data (extracted for reuse)
  const fetchMenuData = async (options?: {
    signal?: AbortSignal
    cutoffTime?: CutoffTime
    updateState?: boolean
  }): Promise<MenuDataResult | undefined> => {
    const effectiveCutoffTime = options?.cutoffTime ?? cutoffTime

    try {
      // 🚀 OPTIMIZATION #1: Try the optimized single-request endpoint first
      try {
        const optimizedResponse = await fetch('/api/days/active-with-combos', {
          signal: options?.signal,
        });
        const optimizedData = await optimizedResponse.json();
        if (options?.signal?.aborted) return undefined
        
        if (optimizedData.success && optimizedData.data) {
          const formattedDays: Record<string, DayData> = {};
            
          // Process the combined data (much faster!)
          optimizedData.data.forEach((day: any) => {
            formattedDays[day.dayId] = {
              date: day.date,
              displayName: day.displayName,
              week: day.week,
              combos: Array.isArray(day.combos) ? day.combos.map(formatDailyCombo) : []
            };
          });
          
          // Store the current dates for comparison (for update detection)
          const currentDates = Object.keys(formattedDays)
            .map(dayId => `${dayId}-${formattedDays[dayId].date}`)
            .sort()
            .join(',');
          
          if (options?.updateState !== false) {
            setDays(formattedDays);
            if (Object.keys(formattedDays).length > 0) {
              setSelectedDay((prev) =>
                resolveDailyMenuSelectedDayAfterFetch(
                  prev,
                  formattedDays,
                  effectiveCutoffTime,
                  language
                )
              );
            }
          }
          
          // Success with optimized endpoint
          console.log('✅ Loaded menu using optimized endpoint');
          return { currentDates, formattedDays };
        }
      } catch (optimizedError) {
        console.log('⚠️ Optimized endpoint failed, falling back to parallel requests');
        if ((optimizedError as Error).name === 'AbortError' || options?.signal?.aborted) {
          return undefined
        }
        
        // Fallback to parallel requests if optimized endpoint fails
        const daysResponse = await fetch('/api/days?isActive=true', {
          signal: options?.signal,
        });
        const daysData = await daysResponse.json();
        if (options?.signal?.aborted) return undefined
        
        if (daysData.success) {
          const formattedDays: Record<string, DayData> = {};
          
          // 🚀 OPTIMIZATION #2: Fetch all combos in parallel
          const comboPromises = daysData.data.map(async (day: any) => {
            try {
              const combosResponse = await fetch(`/api/days/${day.dayId}/combos`, {
                signal: options?.signal,
              });
              const combosData = await combosResponse.json();
              if (options?.signal?.aborted) return null
              
              if (combosData.success) {
                const formattedCombos = combosData.data.map(formatDailyCombo);
                
                return {
                  dayId: day.dayId,
                  dayData: {
                    date: day.date,
                    displayName: day.displayName,
                    week: day.week,
                    combos: formattedCombos
                  }
                };
              }
              return null;
            } catch (error) {
              if ((error as Error).name === 'AbortError' || options?.signal?.aborted) {
                return null;
              }
              console.error(`Error fetching combos for ${day.dayId}:`, error);
              return null;
            }
          });
          
          const comboResults = await Promise.all(comboPromises);
          if (options?.signal?.aborted) return undefined
          
          comboResults.forEach((result) => {
            if (result) {
              formattedDays[result.dayId] = result.dayData;
            }
          });
          
          // Store the current dates for comparison (for update detection)
          const currentDates = Object.keys(formattedDays)
            .map(dayId => `${dayId}-${formattedDays[dayId].date}`)
            .sort()
            .join(',');
          
          if (options?.updateState !== false) {
            setDays(formattedDays);
            if (Object.keys(formattedDays).length > 0) {
              setSelectedDay((prev) =>
                resolveDailyMenuSelectedDayAfterFetch(
                  prev,
                  formattedDays,
                  effectiveCutoffTime,
                  language
                )
              );
            }
          }
          
          return { currentDates, formattedDays };
        }
      }
      return undefined;
    } catch (error) {
      if ((error as Error).name === 'AbortError' || options?.signal?.aborted) {
        return undefined;
      }
      console.error('Error in fetchMenuData:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive"
      });
      return undefined;
    }
  };
  
  // Load data from API on mount
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const cutoffPromise = sharedUserProfile?.cutoffTime
          ? Promise.resolve(sharedUserProfile.cutoffTime)
          : getCutoffTime({ signal });

        const [menuResult, translationsMap, resolvedCutoffTime] = await Promise.all([
          fetchMenuData({
            signal,
            cutoffTime,
            updateState: false,
          }),
          fetchDishTranslations({ signal }),
          cutoffPromise,
        ]);

        if (signal.aborted) return

        setDishTranslations(translationsMap);

        if (!sharedUserProfile?.cutoffTime) {
          setLocalCutoffTime(resolvedCutoffTime);
        }

        if (menuResult) {
          setDays(menuResult.formattedDays);
          if (Object.keys(menuResult.formattedDays).length > 0) {
            setSelectedDay(pickDefaultAvailableDay(menuResult.formattedDays, resolvedCutoffTime));
          }
          setLastFetchedDates(menuResult.currentDates);
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError' || signal.aborted) return
        console.error('Error in initial data load:', error);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    
    void fetchData();
    return () => controller.abort();
  }, [sharedUserProfile?.cutoffTime]);

  useEffect(() => {
    if (sharedUserProfile) {
      if (sharedUserProfile.userData) {
        syncUserSnapshot(sharedUserProfile.userData)
      }
      return
    }

    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      return
    }

    try {
      const user = JSON.parse(storedUser)
      syncUserSnapshot(user)

      if (user && user._id) {
        void fetchUserData(user._id)
      }
    } catch (error) {
      console.error('Error parsing stored user data:', error)
    }
  }, [sharedUserProfile?.userData])
  
  // Periodically check for menu updates (every 30 seconds)
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Poll for date-key changes only — do not overwrite days/selectedDay (fixes 30s snap to first day).
        const result = await fetchMenuData({ updateState: false });
        const dates = result?.currentDates;
        if (dates && lastFetchedDates && dates !== lastFetchedDates) {
          console.log('🔔 Daily menu update detected!');
          console.log('Old dates:', lastFetchedDates);
          console.log('New dates:', dates);
          setMenuUpdateAvailable(true);
        }
      } catch (error) {
        console.error('Error checking for menu updates:', error);
      }
    };
    
    // Only start checking after initial load
    if (lastFetchedDates) {
      const interval = setInterval(checkForUpdates, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [lastFetchedDates]);
  
  // Function to refresh the menu
  const handleRefreshMenu = async () => {
    setMenuUpdateAvailable(false);
    setIsLoading(true);
    
    try {
      const result = await fetchMenuData();
      if (result?.currentDates) {
        setLastFetchedDates(result.currentDates);
      }
      
      // Clear cart to prevent stale date issues
      setCart([]);
      
      toast({
        title: language === 'zh' ? '菜单已更新' : 'Menu Updated',
        description: language === 'zh' ? '已加载最新的配送日期和菜单' : 'Latest delivery dates and menu loaded',
      });
    } catch (error) {
      console.error("Error refreshing menu:", error);
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '无法刷新菜单' : 'Failed to refresh menu',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Listen for the refreshUserProfile event to update voucher data
  useEffect(() => {
    if (sharedUserProfile) {
      return
    }

    const handleRefreshUserProfile = async () => {
      console.log('Refreshing user data in daily-delivery component');
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user && user._id) {
          await fetchUserData(user._id);
        }
      }
    };
    
    // Add event listener for the custom refresh event
    window.addEventListener('refreshUserProfile', handleRefreshUserProfile);
    
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('refreshUserProfile', handleRefreshUserProfile);
    };
  }, [sharedUserProfile?.userData]);
  
  // Define the proper order of days for display
  const dayOrder = useMemo(() => {
    // Sort days by week and then by displayName
    return Object.keys(days).sort((a, b) => {
      const dayA = days[a];
      const dayB = days[b];
      
      // First sort by week
      if (dayA.week !== dayB.week) {
        return dayA.week - dayB.week;
      }
      
      // Then sort by day of week (using a helper function)
      const dayOrderMap: Record<string, number> = { 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7 };
      return (dayOrderMap[dayA.displayName] || 0) - (dayOrderMap[dayB.displayName] || 0);
    });
  }, [days])
  
  // Define the accent colors for alternating days
  const accentTypes = {
    brown1: { 
      bg: "bg-[#C2884E]/10", 
      border: "border-[#C2884E]/20", 
      text: "text-[#C2884E]", 
      dot: "bg-[#C2884E]",
      gradient: "from-[#C2884E] to-[#D1A46C]"
    },
    brown2: { 
      bg: "bg-[#D1A46C]/10", 
      border: "border-[#D1A46C]/20", 
      text: "text-[#D1A46C]", 
      dot: "bg-[#D1A46C]",
      gradient: "from-[#D1A46C] to-[#C2884E]"
    }
  };

  const handleDaySelection = (day: string) => {
    const { unavailable, reason } = isDayUnavailable(day)

    if (unavailable) {
      toast({
        title: "This day is unavailable",
        description: reason,
        variant: "destructive",
      })
    }

    const currentDayItems = cart.filter((item) => item.day === selectedDay)
    const currentDayTotal = currentDayItems.reduce((total, item) => total + item.quantity, 0)

    if (currentDayTotal === 1) {
      const displayName = days[selectedDay].displayName
      const capitalizedDay = displayName.charAt(0).toUpperCase() + displayName.slice(1)
      setDayWarning(
        language === "zh"
          ? `请为${getChineseDayName(displayName)}至少选择两餐`
          : `请至少选择两餐 for ${capitalizedDay}`
      )
      setTimeout(() => setDayWarning(null), 5000)
      return
    }

    setDayWarning(null)
    setSelectedDay(day)
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Region Check Dialog */}
      <RegionCheckDialog
        open={showRegionDialog}
        onClose={() => setShowRegionDialog(false)}
        currentRegion={userRegion}
      />
      
      {/* Menu Update Notification Banner */}
      {menuUpdateAvailable && <MenuUpdateBanner language={language} onRefresh={handleRefreshMenu} />}
      
      {/* Header section with responsive layout - Sticky on mobile */}
      <div className="sticky top-0 z-20 bg-white pb-4 -mx-6 px-6 md:relative md:mx-0 md:px-0 md:z-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">{t('dailyDelivery')}</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Voucher display with rounded badges like weekly meal box */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-[#6B5F53]">
                  {language === 'zh' ? '2菜餐券' : '2-Dish Voucher'}: 
                </span>
                <span className="text-sm font-bold text-[#C2884E]">
                  {userVouchers.twoDish}{language === 'zh' ? '张' : ''}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-[#6B5F53]">
                  {language === 'zh' ? '3菜餐券' : '3-Dish Voucher'}: 
                </span>
                <span className="text-sm font-bold text-[#C2884E]">
                  {userVouchers.threeDish}{language === 'zh' ? '张' : ''}
                </span>
              </div>
            </div>
            
            {/* Checkout button */}
            {!checkoutOpen && (
              <Button 
                variant="outline" 
                className="flex items-center gap-2 border-[#C2884E]/30 hover:bg-[#F5EDE4]/50 hover:text-[#C2884E] rounded-xl"
                onClick={() => {
                if (cart.length === 0) {
                  toast({
                    title: t('cartEmpty'),
                    description: t('addItemsToCart'),
                    variant: "destructive"
                  })
                  return
                }
                
                // Check if there are at least 2 meals per day
                const mealsPerDay: Record<string, number> = {};
                
                // Count meals for each day
                cart.forEach(item => {
                  if (!mealsPerDay[item.day]) {
                    mealsPerDay[item.day] = 0;
                  }
                  mealsPerDay[item.day] += item.quantity;
                });
                
                // Check if any day has fewer than 2 meals
                const daysWithInsufficientMeals = Object.entries(mealsPerDay)
                  .filter(([_, count]) => count < 2)
                  .map(([day, _]) => {
                    const displayName = days[day]?.displayName || day;
                    if (language === 'zh') {
                      return getChineseDayName(displayName);
                    } else {
                      // Capitalize the first letter and show full day name in English
                      const baseDayName = displayName.toLowerCase().split('-')[0];
                      return baseDayName.charAt(0).toUpperCase() + baseDayName.slice(1);
                    }
                  });
                
                if (daysWithInsufficientMeals.length > 0) {
                  const daysList = daysWithInsufficientMeals.join(', ');
                  toast({
                    title: language === 'en' ? 'Order Requirements Not Met' : '订单不满足最低要求',
                    description: language === 'en'
                      ? `Minimum 2 meals per day required. Please add more meals for: ${daysList}`
                      : `每天至少选购两餐起送。请为以下日期增加餐点: ${daysList}`,
                    variant: "destructive"
                  })
                  return
                }
                
                // If all validations pass, proceed to checkout
                setCheckoutOpen(true)
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{totalItems}</span>
              <span className="ml-1 border-l border-[#C2884E]/20 pl-2">
                {language === 'zh' ? '结账' : 'Checkout'}
              </span>
            </Button>
          )}
          </div>
        </div>
      </div>
      
      {checkoutOpen ? (
        <div className="mt-4">
          <DailyDeliveryCheckout
            cart={cart}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={() => {
              setCheckoutOpen(false)
              setCart([])
            }}
            userVouchers={userVouchers}
            setUserVouchers={setUserVouchers}
            days={days}
            dishTranslations={dishTranslations}
          />
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t('loading')}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-row h-full relative">
          <div className="sticky top-[180px] max-h-[calc(100vh-200px)] min-w-[80px] self-start overflow-y-auto border-r border-[#C2884E]/20 pr-2 md:relative md:top-0 md:max-h-[calc(100vh-200px)] w-1/5">
            <DailyDaySidebar
              cart={cart}
              dayOrder={dayOrder}
              days={days}
              isDayUnavailable={isDayUnavailable}
              language={language}
              onSelectDay={handleDaySelection}
              selectedDay={selectedDay}
              toChineseDayName={getChineseDayName}
            />
          </div>

          {/* Content Area - Scrollable, only show selected day */}
          <div className="w-4/5 pl-4 overflow-y-auto max-h-[calc(100vh-200px)] md:max-h-none">
            <DailyComboGrid
              addToCart={addToCart}
              dayWarning={dayWarning}
              days={days}
              getQuantityInCart={getQuantityInCart}
              isDayUnavailable={isDayUnavailable}
              language={language}
              removeFromCart={removeFromCart}
              selectedDay={selectedDay}
              toChineseDayName={getChineseDayName}
              translateComboName={translateComboName}
              translateDishName={translateDishName}
            />
          </div>
        </div>
      )}
      
    </div>
  )
}