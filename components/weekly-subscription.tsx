"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { Plus, Minus, ShoppingCart, Calendar, Info, ChevronRight, ChevronLeft, Loader2, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
// Removed tabs imports as we're now using a single interface
import { getUserWeeklySubscription } from '@/lib/weekly-subscription'
import { DeliveryDay, MealOption, CartItem } from '@/lib/weekly-subscription'
import { WeeklySubscriptionCheckout } from '@/components/weekly-subscription-checkout'
import { RegionCheckDialogRecharge } from '@/components/region-check-dialog-recharge'

interface WeeklySubscriptionProps {
  userCredits?: number;
  weeklySIXmeals?: number;
  weeklyEIGHTmeals?: number;
  weeklyTENmeals?: number;
  weeklyTWELVEmeals?: number;
}

export default function WeeklySubscription({ 
  userCredits: propCredits,
  weeklySIXmeals: propSixMeals,
  weeklyEIGHTmeals: propEightMeals,
  weeklyTENmeals: propTenMeals,
  weeklyTWELVEmeals: propTwelveMeals
}: WeeklySubscriptionProps) {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([])
  
  // State for all meal plan types
  const [userCredits, setUserCredits] = useState<number>(propCredits || 0)
  const [weeklySIXmeals, setWeeklySIXmeals] = useState<number>(propSixMeals || 0)
  const [weeklyEIGHTmeals, setWeeklyEIGHTmeals] = useState<number>(propEightMeals || 0)
  const [weeklyTENmeals, setWeeklyTENmeals] = useState<number>(propTenMeals || 0)
  const [weeklyTWELVEmeals, setWeeklyTWELVEmeals] = useState<number>(propTwelveMeals || 0)
  // No longer need activeTab state
  
  // Address confirmation dialog state
  const [showAddressDialog, setShowAddressDialog] = useState(false)
  const [userRegion, setUserRegion] = useState<string>("")
  
  // Function to check if a day is unavailable for ordering
  // Updated to match Daily Delivery cutoff time: 11:59 AM the day before delivery
  const isDayUnavailable = (day: DeliveryDay): { unavailable: boolean, reason: string } => {
    try {
      // Get current date and time in Toronto timezone
      const torontoOptions = { timeZone: 'America/Toronto' };
      const now = new Date();
      
      // Format the Toronto time as a string to work with
      const torontoDateString = now.toLocaleString('en-US', torontoOptions);
      const torontoDate = new Date(torontoDateString);
      
      // Get the current hour and minute in Toronto
      const currentHour = torontoDate.getHours();
      const currentMinute = torontoDate.getMinutes();
      
      // Check if we have a date for this meal
      if (!day || !day.date) {
        return { 
          unavailable: true, 
          reason: language === 'zh' ? "此餐点无可用日期" : "Date not available for this meal" 
        };
      }
      
      const mealDate = day.date;
      
      // Parse the date (expected format like "Jan 01" or "Oct 10")
      try {
        const parts = mealDate.split(' ');
        
        // Handle formats like "Jan 01" or "Oct 10"
        if (parts.length === 2) {
          const monthStr = parts[0];
          const dayStr = parts[1];
          
          // Get month index (0-11) using short month names
          const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthIndex = shortMonths.findIndex(m => 
            monthStr.toLowerCase() === m.toLowerCase());
          
          // Parse day number
          const dayNum = parseInt(dayStr);
          
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
            
            // Create tomorrow's date for comparison
            const tomorrowYMD = new Date(
              torontoDate.getFullYear(),
              torontoDate.getMonth(),
              torontoDate.getDate() + 1
            );
            
            // If meal date is before today
            if (mealSpecificDate < todayYMD) {
              return { 
                unavailable: true, 
                reason: language === 'zh' ? "此日期已过" : "This specific date has already passed" 
              };
            }
            
            // If it's for tomorrow and it's past 11:59 AM today
            if (mealSpecificDate.getTime() === tomorrowYMD.getTime() && 
                (currentHour > 11 || (currentHour === 11 && currentMinute > 59))) {
              return { 
                unavailable: true, 
                reason: language === 'zh' ? "订单必须在配送前一天的上午11:59前下单" : "Orders must be placed by 11:59 AM the day before delivery" 
              };
            }
            
            // If it's for today (same-day ordering not allowed)
            if (mealSpecificDate.getTime() === todayYMD.getTime()) {
              return { 
                unavailable: true, 
                reason: language === 'zh' ? "订单必须在配送前一天的上午11:59前下单" : "Orders must be placed by 11:59 AM the day before delivery"
              };
            }
            
            // If we have a valid date and it's at least 2 days in the future or tomorrow before/at 11:59 AM, it's available
            return { unavailable: false, reason: "" };
          }
        }
        
        // If we couldn't parse the date properly
        return { 
          unavailable: true, 
          reason: language === 'zh' ? "日期格式无效" : "Invalid date format" 
        };
      } catch (error) {
        console.error('Error parsing meal date:', error);
        return { 
          unavailable: true, 
          reason: language === 'zh' ? "解析日期时出错" : "Error parsing date" 
        };
      }
    } catch (error) {
      console.error('Error in isDayUnavailable:', error);
      return { unavailable: false, reason: "" }; // Default to available on error
    }
  };
  
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
  }, [propCredits, propSixMeals, propEightMeals, propTenMeals, propTwelveMeals]);

  // Fetch delivery days and meal options from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getUserWeeklySubscription();
        if (data && data.length > 0) {
          // Format dates based on language
          const formattedData = data.map(day => ({
            ...day,
            name: language === 'zh' 
              ? (day.id === 'sunday' ? '周日配送' : '周二配送')
              : day.name
          }));
          
          setDeliveryDays(formattedData);
        } else {
          // Don't show error toast, we'll display a friendly message in the UI
          console.log('No active delivery days found');
          // Set empty delivery days array
          setDeliveryDays([]);
        }
      } catch (error) {
        console.error("Error fetching weekly subscription data:", error);
        toast({
          title: language === 'zh' ? '错误' : 'Error',
          description: language === 'zh' ? '无法加载订阅数据' : 'Failed to load subscription data',
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [language, toast])
  
  // Add item to cart
  const addToCart = (dayId: string, optionId: string) => {
    // Find the day to check availability
    const day = deliveryDays.find(d => d.id === dayId);
    
    if (day) {
      // Check if the day is unavailable
      const { unavailable, reason } = isDayUnavailable(day);
      
      /* Commented out the red warning
      if (unavailable) {
        // Show warning toast but still allow adding to cart
        toast({
          title: language === 'zh' ? "此日期不可用" : "This day is unavailable",
          description: reason,
          variant: "destructive"
        });
      }
      */
    }
    
    const existingItemIndex = cart.findIndex(
      item => item.dayId === dayId && item.optionId === optionId
    )
    
    if (existingItemIndex >= 0) {
      // Item exists, update quantity
      const updatedCart = [...cart]
      updatedCart[existingItemIndex].quantity += 1
      setCart(updatedCart)
    } else {
      // Add new item
      setCart([
        ...cart,
        {
          dayId,
          optionId,
          quantity: 1
        }
      ])
    }
  }
  
  // Remove item from cart
  const removeFromCart = (dayId: string, optionId: string) => {
    const existingItemIndex = cart.findIndex(
      item => item.dayId === dayId && item.optionId === optionId
    )
    
    if (existingItemIndex >= 0) {
      const updatedCart = [...cart]
      if (updatedCart[existingItemIndex].quantity > 1) {
        // Reduce quantity if more than 1
        updatedCart[existingItemIndex].quantity -= 1
        setCart(updatedCart)
      } else {
        // Remove item if quantity would be 0
        setCart(cart.filter((_, index) => index !== existingItemIndex))
      }
    }
  }
  
  // Get quantity of specific item in cart
  const getQuantityInCart = (dayId: string, optionId: string): number => {
    const item = cart.find(item => item.dayId === dayId && item.optionId === optionId)
    return item ? item.quantity : 0
  }
  
  // Calculate total items
  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }
  
  // Calculate total credits needed
  const getTotalCredits = () => {
    // Simply return the number of items in the cart
    return getTotalItems()
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
    const totalItems = getTotalItems();
    
    // Create an array of available meal plan sizes
    const availableMealPlans = [];
    if (weeklySIXmeals > 0) availableMealPlans.push(6);
    if (weeklyEIGHTmeals > 0) availableMealPlans.push(8);
    if (weeklyTENmeals > 0) availableMealPlans.push(10);
    if (weeklyTWELVEmeals > 0) availableMealPlans.push(12);
    
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
    } else if (!availableMealPlans.includes(totalItems)) {
      toast({
        title: language === 'zh' ? '订单数量无效' : 'Invalid Order Quantity',
        description: language === 'zh' 
          ? `订单必须为${availableMealPlans.join('份或')}份餐点，当前数量：${totalItems}` 
          : `Orders must be for ${availableMealPlans.join(' or ')} meals. Current quantity: ${totalItems}`,
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
  
  // Handle region change from dialog
  const handleRegionChange = async (region: string, addressData?: any): Promise<void> => {
    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('user')
      if (!userData) {
        throw new Error('User not logged in')
      }
      
      const user = JSON.parse(userData)
      
      // Update user's address with the new region and optional address data
      let updatedAddress = {
        ...user.address,
        province: region
      }
      
      // If additional address data is provided, merge it with the updated address
      if (addressData) {
        updatedAddress = {
          ...updatedAddress,
          unitNumber: addressData.unitNumber !== undefined ? addressData.unitNumber : updatedAddress.unitNumber,
          streetAddress: addressData.streetAddress !== undefined ? addressData.streetAddress : updatedAddress.streetAddress,
          city: addressData.city !== undefined ? addressData.city : updatedAddress.city,
          postalCode: addressData.postalCode !== undefined ? addressData.postalCode : updatedAddress.postalCode,
          country: addressData.country !== undefined ? addressData.country : 'Canada',
          buzzCode: addressData.buzzCode !== undefined ? addressData.buzzCode : updatedAddress.buzzCode
        }
      }
      
      // Update user data in the database
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: updatedAddress
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update localStorage
        user.address = updatedAddress
        localStorage.setItem('user', JSON.stringify(user))
        
        // Update state
        setUserRegion(region)
        
        const toastMessage = addressData 
          ? (language === 'zh' ? "地址已更新" : "Address Updated") 
          : (language === 'zh' ? "区域已更新" : "Region Updated")
          
        const toastDescription = addressData
          ? (language === 'zh' ? "您的配送地址已成功更新" : "Your delivery address has been successfully updated")
          : (language === 'zh' ? "您的区域已成功更新" : "Your region has been successfully updated")
        
        toast({
          title: toastMessage,
          description: toastDescription
        })
      } else {
        throw new Error(result.error || 'Failed to update region')
      }
    } catch (error) {
      console.error('Error updating region:', error)
      toast({
        title: language === 'zh' ? "更新失败" : "Update Failed",
        description: error instanceof Error ? error.message : 
          (language === 'zh' ? "更新地址时出现错误" : "An error occurred while updating your address"),
        variant: "destructive"
      })
      throw error
    }
  }
  
  // Handle checkout success
  const handleCheckoutSuccess = () => {
    setCart([]);
    setCheckoutOpen(false);
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
          isValidRegion={["Downtown Toronto", "Midtown", "Scarborough", "North York", "East York", "York", "Etobicoke", "Markham", "Richmond Hill", "Aurora", "Newmarket", "Vaughan (including Maple, Concord, King)", "Mississauga", "Oakville", "Brampton", "Hamilton", "Burlington"].includes(userRegion || '')}
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
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#C2884E] to-[#D1A46C] bg-clip-text text-transparent">{language === 'zh' ? '周次Meal Box' : 'Weekly Subscription'}</h2>
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
          </div>
          
          {/* Checkout button */}
          {!checkoutOpen && (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-[#C2884E]/30 hover:bg-[#F5EDE4]/50 hover:text-[#C2884E] rounded-xl"
              onClick={handleCheckout}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{getTotalItems()}</span>
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
                ? '订单截止时间：配送前一天上午11:59前下单。' 
                : 'Order cutoff: 11:59 AM the day before delivery.'}
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
              <div className="grid gap-8 md:grid-cols-2">
                {deliveryDays
                  .filter(day => !isDayUnavailable(day).unavailable)
                  .slice(0, 2) // Only show the first two available days
                  .map((day) => (
                <motion.div 
                  key={`${day.id}-${day.weekOffset}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-[#C2884E]" />
                    <h3 className="text-xl font-semibold text-[#6B5F53]">{day.name}</h3>
                    <span className="text-sm text-[#6B5F53]/70">{day.date}</span>
                  </div>
                  
                  <div className="space-y-4">
                    {day.options.map((option) => (
                      <Card 
                        key={option.id}
                        className="overflow-hidden transition-all duration-300 hover:shadow-md border-[#C2884E]/10 hover:border-[#C2884E]/30 bg-white rounded-lg hover:rounded-xl"
                      >
                        <CardContent className="p-0">
                          <div className="p-4">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-medium text-[#6B5F53]">{option.name}</h4>
                                </div>
                                
                                {/* Display tags if available */}
                                {option.tags && option.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {option.tags.map((tag, tagIndex) => (
                                      <span 
                                        key={tagIndex}
                                        className="px-2 py-0.5 bg-[#F5EDE4]/70 text-[#6B5F53] rounded-full text-[10px] font-medium"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-end mt-4">
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-7 w-7 bg-white/80"
                                    onClick={() => removeFromCart(day.id, option.id)}
                                    disabled={getQuantityInCart(day.id, option.id) === 0}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-5 text-center text-sm">
                                    {getQuantityInCart(day.id, option.id)}
                                  </span>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-7 w-7 bg-white/80"
                                    onClick={() => addToCart(day.id, option.id)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
            )}
          </div>
          
          {/* Cart Summary removed as requested */}
        </div>
      )}
    </div>
  )
}