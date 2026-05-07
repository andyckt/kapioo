"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { PRODUCT_LINE_LABELS } from '@/lib/product-lines/names'
import { Plus, Minus, ShoppingCart, Calendar, Info, ChevronRight, ChevronLeft, Loader2, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
// Removed tabs imports as we're now using a single interface
import { getUserWeeklySubscription, sortDeliveryDays, getAdjacentDates, validateSelectedDates } from '@/lib/weekly-subscription'
import { DeliveryDay, MealOption, CartItem } from '@/lib/weekly-subscription'
import { WeeklySubscriptionCheckout } from '@/components/weekly-subscription-checkout'
import { MenuUpdateBanner } from '@/components/menu-update-banner'
import { RegionCheckDialogRecharge } from '@/components/region-check-dialog-recharge'
import { WeeklyDeliveryDaysGrid } from '@/features/weekly-ordering/weekly-delivery-days-grid'
import { useWeeklyCart } from '@/features/weekly-ordering/use-weekly-cart'
import { useRegionAddressUpdate } from '@/hooks/use-region-address-update'
import { DEFAULT_DASHBOARD_CUTOFF_TIME, useOptionalUserProfile } from '@/lib/dashboard-user-profile'
import { ALL_WEEKLY_AREAS } from '@/lib/constants/areas'
import { getDeliveryDayAvailability } from '@/lib/orders/delivery-day-availability'

interface WeeklySubscriptionProps {
  userCredits?: number;
  weeklySIXmeals?: number;
  weeklyEIGHTmeals?: number;
  weeklyTENmeals?: number;
  weeklyTWELVEmeals?: number;
  weeklySIXTEENmeals?: number;
  onVoucherUpdate?: () => void;
}

export default function WeeklySubscription({ 
  userCredits: propCredits,
  weeklySIXmeals: propSixMeals,
  weeklyEIGHTmeals: propEightMeals,
  weeklyTENmeals: propTenMeals,
  weeklyTWELVEmeals: propTwelveMeals,
  weeklySIXTEENmeals: propSixteenMeals,
  onVoucherUpdate
}: WeeklySubscriptionProps) {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([])
  
  // NEW: State for consecutive date validation
  const [visibleDeliveryDays, setVisibleDeliveryDays] = useState<DeliveryDay[]>([]) // Limited to 3 available days
  const [selectedDates, setSelectedDates] = useState<string[]>([]) // Track selected delivery dates
  const [disabledDates, setDisabledDates] = useState<Set<string>>(new Set()) // Track disabled dates for consecutive rule
  
  // State for all meal plan types
  const [userCredits, setUserCredits] = useState<number>(propCredits || 0)
  const [weeklySIXmeals, setWeeklySIXmeals] = useState<number>(propSixMeals || 0)
  const [weeklyEIGHTmeals, setWeeklyEIGHTmeals] = useState<number>(propEightMeals || 0)
  const [weeklyTENmeals, setWeeklyTENmeals] = useState<number>(propTenMeals || 0)
  const [weeklyTWELVEmeals, setWeeklyTWELVEmeals] = useState<number>(propTwelveMeals || 0)
  const [weeklySIXTEENmeals, setWeeklySIXTEENmeals] = useState<number>(propSixteenMeals || 0)
  // No longer need activeTab state
  
  // Address confirmation dialog state
  const [showAddressDialog, setShowAddressDialog] = useState(false)
  const [userRegion, setUserRegion] = useState<string>("")
  const sharedUserProfile = useOptionalUserProfile()
  const cutoffTime = sharedUserProfile?.cutoffTime ?? DEFAULT_DASHBOARD_CUTOFF_TIME
  
  // State for menu update notification
  const [menuUpdateAvailable, setMenuUpdateAvailable] = useState(false)
  const [lastFetchedDates, setLastFetchedDates] = useState<string>('')
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { handleRegionChange } = useRegionAddressUpdate({
    onSuccess: setUserRegion,
  })
  // Function to check if a day is unavailable for ordering
  // Updated to use dynamic cutoff time from settings
  const isDayUnavailable = (day: DeliveryDay): { unavailable: boolean, reason: string } => {
    return getDeliveryDayAvailability({
      dateLabel: day?.date,
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
    totalCredits,
    totalItems,
  } = useWeeklyCart({
    deliveryDays,
    isDayUnavailable,
  })
  
  // Update meal plan values when props change
  useEffect(() => {
    if (propCredits !== undefined) {
      setUserCredits(propCredits);
    }
    if (propSixMeals !== undefined) {
      setWeeklySIXmeals(propSixMeals);
    }
    if (propEightMeals !== undefined) {
      setWeeklyEIGHTmeals(propEightMeals);
    }
    if (propTenMeals !== undefined) {
      setWeeklyTENmeals(propTenMeals);
    }
    if (propTwelveMeals !== undefined) {
      setWeeklyTWELVEmeals(propTwelveMeals);
    }
    if (propSixteenMeals !== undefined) {
      setWeeklySIXTEENmeals(propSixteenMeals);
    }
  }, [propCredits, propSixMeals, propEightMeals, propTenMeals, propTwelveMeals, propSixteenMeals]);

  // Fetch delivery days and meal options from API
  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getUserWeeklySubscription({ signal: controller.signal });
        if (controller.signal.aborted) return;
        console.log('🔍 FRONTEND DEBUG: Received delivery days from API:', data);
        
        if (data && data.length > 0) {
          // Format dates based on language
          const formattedData = data.map(day => ({
            ...day,
            name: language === 'zh' 
              ? (day.id === 'sunday' ? '周日配送' : '周二配送')
              : day.name
          }));
          
          console.log('🔍 FRONTEND DEBUG: Formatted delivery days:', formattedData.map(d => ({ 
            id: d.id, 
            date: d.date, 
            weekOffset: d.weekOffset,
            optionsCount: d.options.length 
          })));
          
          setDeliveryDays(formattedData);
          
          // NEW: Filter to next 3 available days (Update A)
          const availableDays = formattedData.filter(day => {
            const { unavailable } = isDayUnavailable(day);
            return !unavailable;
          }).slice(0, 3); // Take first 3 available days
          
          console.log('📅 FRONTEND DEBUG: Visible delivery days (max 3):', availableDays.map(d => ({ 
            id: d.id, 
            date: d.date, 
            weekOffset: d.weekOffset 
          })));
          
          setVisibleDeliveryDays(availableDays);
          
          // Store the current dates for comparison
          const currentDates = formattedData.map(d => `${d.id}-${d.date}`).sort().join(',');
          setLastFetchedDates(currentDates);
        } else {
          // Don't show error toast, we'll display a friendly message in the UI
          console.log('No active delivery days found');
          // Set empty delivery days array
          setDeliveryDays([]);
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError' || controller.signal.aborted) return;
        console.error("Error fetching weekly subscription data:", error);
        toastRef.current({
          title: language === 'zh' ? '错误' : 'Error',
          description: language === 'zh' ? '无法加载订阅数据' : 'Failed to load subscription data',
          variant: "destructive"
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();
    return () => controller.abort();
  }, [language])
  
  // NEW: Track selected dates from cart (Update B & C)
  useEffect(() => {
    // Extract unique dates from cart items
    const uniqueDates = Array.from(new Set(
      cart.map(item => {
        const day = deliveryDays.find(d => d.id === item.dayId && d.weekOffset === item.weekOffset);
        return day?.date;
      }).filter(Boolean)
    )) as string[];
    
    console.log('🎯 Selected dates from cart:', uniqueDates);
    setSelectedDates(uniqueDates);
  }, [cart, deliveryDays]);
  
  // NEW: Calculate disabled dates based on consecutive rule (Update C)
  useEffect(() => {
    const newDisabledDates = new Set<string>();
    
    if (selectedDates.length === 0) {
      // Rule: No selection - all dates enabled
      console.log('✅ No dates selected - all enabled');
      setDisabledDates(newDisabledDates);
    } else if (selectedDates.length === 1) {
      // Rule: 1 date selected - only adjacent dates enabled
      const adjacentDates = getAdjacentDates(selectedDates[0], visibleDeliveryDays);
      console.log(`✅ One date selected (${selectedDates[0]}) - adjacent dates:`, adjacentDates);
      
      visibleDeliveryDays.forEach(day => {
        if (day.date !== selectedDates[0] && !adjacentDates.includes(day.date)) {
          newDisabledDates.add(day.date);
        }
      });
      
      console.log('🚫 Disabled dates:', Array.from(newDisabledDates));
      setDisabledDates(newDisabledDates);
    } else if (selectedDates.length === 2) {
      // Rule: 2 dates selected - only selected dates enabled (so user can remove)
      console.log(`✅ Two dates selected (${selectedDates.join(', ')}) - disabling others`);
      
      visibleDeliveryDays.forEach(day => {
        if (!selectedDates.includes(day.date)) {
          newDisabledDates.add(day.date);
        }
      });
      
      console.log('🚫 Disabled dates:', Array.from(newDisabledDates));
      setDisabledDates(newDisabledDates);
    } else if (selectedDates.length > 2) {
      // Should not happen, but disable all to prevent further selection
      console.log('⚠️ More than 2 dates selected - this should not happen!');
      visibleDeliveryDays.forEach(day => {
        newDisabledDates.add(day.date);
      });
      setDisabledDates(newDisabledDates);
    }
  }, [selectedDates, visibleDeliveryDays]);
  
  // Periodically check for menu updates (every 30 seconds)
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const data = await getUserWeeklySubscription();
        if (data && data.length > 0) {
          const newDates = data.map(d => `${d.id}-${d.date}`).sort().join(',');
          
          // If dates have changed and we have previously fetched data
          if (lastFetchedDates && newDates !== lastFetchedDates) {
            console.log('🔔 Menu update detected!');
            console.log('Old dates:', lastFetchedDates);
            console.log('New dates:', newDates);
            setMenuUpdateAvailable(true);
          }
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
  }, [lastFetchedDates])
  
  // Function to refresh the menu
  const handleRefreshMenu = async () => {
    setMenuUpdateAvailable(false);
    setIsLoading(true);
    
    try {
      const data = await getUserWeeklySubscription();
      console.log('🔄 Refreshing menu data:', data);
      
      if (data && data.length > 0) {
        // Format dates based on language
        const formattedData = data.map(day => ({
          ...day,
          name: language === 'zh' 
            ? (day.id === 'sunday' ? '周日配送' : '周二配送')
            : day.name
        }));
        
        setDeliveryDays(formattedData);
        
        // NEW: Update visible delivery days (max 3 available)
        const availableDays = formattedData.filter(day => {
          const { unavailable } = isDayUnavailable(day);
          return !unavailable;
        }).slice(0, 3);
        setVisibleDeliveryDays(availableDays);
        
        // Update the stored dates
        const currentDates = formattedData.map(d => `${d.id}-${d.date}`).sort().join(',');
        setLastFetchedDates(currentDates);
        
        // Clear cart if items reference old dates (this will also clear selectedDates via effect)
        setCart([]);
        
        toast({
          title: language === 'zh' ? '菜单已更新' : 'Menu Updated',
          description: language === 'zh' ? '已加载最新的配送日期和菜单' : 'Latest delivery dates and menu loaded',
        });
      }
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
  }
  
  // State for checkout
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  
  // Handle checkout button click
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: language === 'zh' ? '购物车为空' : 'Cart is Empty',
        description: language === 'zh' ? '请添加餐点到购物车' : 'Please add items to your cart',
        variant: "destructive"
      })
      return
    }
    
    // Check if total items matches one of the user's available meal plans
    const currentTotalItems = totalItems;
    
    // Create an array of available meal plan sizes
    const availableMealPlans = [];
    if (weeklySIXmeals > 0) availableMealPlans.push(6);
    if (weeklyEIGHTmeals > 0) availableMealPlans.push(8);
    if (weeklyTENmeals > 0) availableMealPlans.push(10);
    if (weeklyTWELVEmeals > 0) availableMealPlans.push(12);
    if (weeklySIXTEENmeals > 0) availableMealPlans.push(16);
    
    // Check if the total items matches any available meal plan
    if (availableMealPlans.length === 0) {
      toast({
        title: language === 'zh' ? '没有可用餐券' : 'No Available Meal Plans',
        description: language === 'zh' 
          ? '您需要先购买餐券才能订餐' 
          : 'You need to purchase meal plans before ordering',
        variant: "destructive"
      })
      return
    } else if (!availableMealPlans.includes(currentTotalItems)) {
      toast({
        title: language === 'zh' ? '订单数量无效' : 'Invalid Order Quantity',
        description: language === 'zh' 
          ? `订单必须为${availableMealPlans.join('份或')}份餐点，当前数量：${currentTotalItems}` 
          : `Orders must be for ${availableMealPlans.join(' or ')} meals. Current quantity: ${currentTotalItems}`,
        variant: "destructive"
      })
      return
    }
    
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userDataStr = localStorage.getItem('user');
    
    if (!isAuthenticated || !userDataStr) {
      toast({
        title: language === 'zh' ? '请先登录' : 'Please Log In',
        description: language === 'zh' ? '您需要登录才能完成订阅' : 'You need to log in to complete your subscription',
        variant: "destructive"
      });
      return;
    }
    
    // Get user data and region
    const userData = JSON.parse(userDataStr);
    if (userData.address && userData.address.province) {
      setUserRegion(userData.address.province);
    }
    
    // Proceed directly to checkout without showing address dialog
    setCheckoutOpen(true);
  }
  
  // Proceed to checkout after address confirmation
  const proceedToCheckout = () => {
    // Open checkout form
    setShowAddressDialog(false);
    setCheckoutOpen(true);
  }
  
  // Handle checkout success
  const handleCheckoutSuccess = () => {
    setCart([]);
    setCheckoutOpen(false);
    
    // Trigger parent component to refresh user data
    if (onVoucherUpdate) {
      onVoucherUpdate();
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Address Confirmation Dialog */}
      {showAddressDialog && (
        <RegionCheckDialogRecharge
          open={showAddressDialog}
          onClose={() => setShowAddressDialog(false)}
          currentRegion={userRegion}
          onRegionChange={handleRegionChange}
          onProceed={proceedToCheckout}
          isValidRegion={ALL_WEEKLY_AREAS.includes(userRegion as any)}
          existingAddress={(() => {
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
              const user = JSON.parse(storedUser)
              return user.address
            }
            return undefined
          })()}
        />
      )}
      
      {/* Header section with responsive layout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#C2884E] to-[#D1A46C] bg-clip-text text-transparent">{language === 'zh' ? PRODUCT_LINE_LABELS.weekly.zh : PRODUCT_LINE_LABELS.weekly.en}</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] rounded-full mt-1"></div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Voucher display with better mobile layout */}
          <div className="flex flex-wrap gap-2">
            {weeklySIXmeals > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-[#6B5F53]">
                  {language === 'zh' ? '6餐一周' : '6 Meals/Week'}: 
                </span>
                <span className="text-sm font-bold text-[#C2884E]">
                  {weeklySIXmeals}{language === 'zh' ? '张' : ''}
                </span>
              </div>
            )}
            
            {weeklyEIGHTmeals > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-[#6B5F53]">
                  {language === 'zh' ? '8餐一周' : '8 Meals/Week'}: 
                </span>
                <span className="text-sm font-bold text-[#C2884E]">
                  {weeklyEIGHTmeals}{language === 'zh' ? '张' : ''}
                </span>
              </div>
            )}
            
            {weeklyTENmeals > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-[#6B5F53]">
                  {language === 'zh' ? '10餐一周' : '10 Meals/Week'}: 
                </span>
                <span className="text-sm font-bold text-[#C2884E]">
                  {weeklyTENmeals}{language === 'zh' ? '张' : ''}
                </span>
              </div>
            )}
            
            {weeklyTWELVEmeals > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-[#6B5F53]">
                  {language === 'zh' ? '12餐一周' : '12 Meals/Week'}: 
                </span>
                <span className="text-sm font-bold text-[#C2884E]">
                  {weeklyTWELVEmeals}{language === 'zh' ? '张' : ''}
                </span>
              </div>
            )}
            
            {weeklySIXTEENmeals > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-[#6B5F53]">
                  {language === 'zh' ? '16餐一周' : '16 Meals/Week'}: 
                </span>
                <span className="text-sm font-bold text-[#C2884E]">
                  {weeklySIXTEENmeals}{language === 'zh' ? '张' : ''}
                </span>
              </div>
            )}
          </div>
          
          {/* Checkout button */}
          {!checkoutOpen && (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-[#C2884E]/30 hover:bg-[#F5EDE4]/50 hover:text-[#C2884E] rounded-xl"
              onClick={handleCheckout}
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
      
      {checkoutOpen ? (
        <WeeklySubscriptionCheckout 
          cart={cart}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={handleCheckoutSuccess}
          userCredits={userCredits}
          setUserCredits={setUserCredits}
          weeklySIXmeals={weeklySIXmeals}
          setWeeklySIXmeals={setWeeklySIXmeals}
          weeklyEIGHTmeals={weeklyEIGHTmeals}
          setWeeklyEIGHTmeals={setWeeklyEIGHTmeals}
          weeklyTENmeals={weeklyTENmeals}
          setWeeklyTENmeals={setWeeklyTENmeals}
          weeklyTWELVEmeals={weeklyTWELVEmeals}
          setWeeklyTWELVEmeals={setWeeklyTWELVEmeals}
          weeklySIXTEENmeals={weeklySIXTEENmeals}
          setWeeklySIXTEENmeals={setWeeklySIXTEENmeals}
          deliveryDays={deliveryDays}
        />
      ) : isLoading ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p>{language === 'zh' ? '加载中...' : 'Loading...'}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Menu Update Notification Banner */}
          {menuUpdateAvailable && <MenuUpdateBanner language={language} onRefresh={handleRefreshMenu} />}
          
          {/* Order Notice - Visible on all devices */}
          <div className="text-left mb-6 pl-3 border-l-2 border-[#C2884E]">
            <h4 className="text-xs font-bold text-[#C2884E] mb-1">
              {language === 'zh' ? '订阅须知' : 'Subscription Notice'}
            </h4>
            <p className="text-[10px] text-[#6B5F53]">
              {language === 'zh' 
                ? '每周有两天配送选项：周日和周二。您可以选择一天或两天都配送。' 
                : 'We offer two delivery days per week: Sunday and Tuesday. You can choose either or both days.'}
            </p>
            <p className="text-[10px] text-[#6B5F53] mt-1">
              {language === 'zh' 
                ? `订单截止时间：配送前一天${cutoffTime.hour >= 12 ? '下午' : '上午'}${cutoffTime.hour === 0 ? 12 : cutoffTime.hour > 12 ? cutoffTime.hour - 12 : cutoffTime.hour}:${cutoffTime.minute.toString().padStart(2, '0')}前下单。`
                : `Order cutoff: ${cutoffTime.hour === 0 ? 12 : cutoffTime.hour > 12 ? cutoffTime.hour - 12 : cutoffTime.hour}:${cutoffTime.minute.toString().padStart(2, '0')} ${cutoffTime.hour >= 12 ? 'PM' : 'AM'} the day before delivery.`}
            </p>
          </div>
          
          {/* Service Area Information */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-[#C2884E]" />
              <p className="text-sm font-medium text-[#6B5F53]">
                {language === 'zh' ? '配送区域' : 'Available Areas'}
              </p>
            </div>
            <div className="px-3 py-1.5 text-sm font-medium text-[#6B5F53]">
              {language === 'zh' ? '大多伦多地区全覆盖' : 'Greater Toronto Area Coverage'}
            </div>
          </div>
          
          {/* All Available Days */}
          <div>
            {deliveryDays.length === 0 ? (
              <div className="bg-[#F5EDE4]/30 rounded-xl p-8 text-center border border-[#F5EDE4]">
                <div className="w-16 h-16 bg-[#F5EDE4] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-[#C2884E]" />
                </div>
                <h3 className="text-xl font-medium text-[#6B5F53] mb-2">
                  {language === 'zh' ? '暂无可用配送日' : 'No Delivery Days Available'}
                </h3>
                <p className="text-[#6B5F53]/80 max-w-md mx-auto">
                  {language === 'zh' 
                    ? '本周暂无可用的配送日。请稍后再试或联系客服了解更多信息。' 
                    : 'There are currently no available delivery days. Please check back later or contact customer service for more information.'}
                </p>
              </div>
            ) : (
              <WeeklyDeliveryDaysGrid
                addToCart={addToCart}
                disabledDates={disabledDates}
                getQuantityInCart={getQuantityInCart}
                isDayUnavailable={isDayUnavailable}
                language={language}
                removeFromCart={removeFromCart}
                visibleDeliveryDays={visibleDeliveryDays}
              />
            )}
          </div>
          
          {/* Cart Summary removed as requested */}
        </div>
      )}
    </div>
  )
}