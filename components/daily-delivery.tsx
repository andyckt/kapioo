"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { Plus, Minus, ShoppingCart, X, Utensils, Ticket } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DailyDeliveryCheckout } from './daily-delivery-checkout'
import { RegionCheckDialog } from './region-check-dialog'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Type definitions
type ComboType = 'A' | 'B'
type ComboItem = {
  id: string
  name: string
  calories: number
  tags: string[]
  typeA: {
    dishes: string[]
    voucherType: 'twoDish'
  }
  typeB: {
    dishes: string[]
    voucherType: 'threeDish'
  }
}

type DayData = {
  date: string
  displayName: string
  week: number
  combos: ComboItem[]
}

type CartItem = {
  day: string
  date: string
  comboId: string
  comboName: string
  type: ComboType
  quantity: number
  voucherType: 'twoDish' | 'threeDish'
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
  const [days, setDays] = useState<Record<string, DayData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedDay, setSelectedDay] = useState<string>('monday-w1')
  const [dayWarning, setDayWarning] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [userVouchers, setUserVouchers] = useState({
    twoDish: 0,
    threeDish: 0
  })
  const [showRegionDialog, setShowRegionDialog] = useState(false)
  const [userRegion, setUserRegion] = useState<string | undefined>(undefined)
  
  // Define the supported regions for daily delivery
  const DAILY_DELIVERY_REGIONS = [
    "Downtown",
    "Midtown", 
    "NorthYork", 
    "Markham", 
    "RichmondHill"
  ]
  
  // Check if a day is in the past or today after ordering cutoff time
  const isDayUnavailable = (day: string): { unavailable: boolean, reason: string } => {
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
      const dayData = days[day];
      if (!dayData || !dayData.date) {
        return { 
          unavailable: true, 
          reason: "Date not available for this meal" 
        };
      }
      
      const mealDate = dayData.date;
      
      // Debug logging
      console.log(`Day comparison for ${day}:`, {
        day,
        currentHour,
        mealDate
      });

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
            
            // Create tomorrow's date for comparison
            const tomorrowYMD = new Date(
              torontoDate.getFullYear(),
              torontoDate.getMonth(),
              torontoDate.getDate() + 1
            );
            
            console.log(`Date comparison:`, {
              mealSpecificDate: mealSpecificDate.toDateString(),
              todayYMD: todayYMD.toDateString(),
              tomorrowYMD: tomorrowYMD.toDateString(),
              isBeforeToday: mealSpecificDate < todayYMD,
              isTomorrow: mealSpecificDate.getTime() === tomorrowYMD.getTime(),
              isToday: mealSpecificDate.getTime() === todayYMD.getTime()
            });
            
            // If meal date is before today
            if (mealSpecificDate < todayYMD) {
              return { 
                unavailable: true, 
                reason: "This specific date has already passed" 
              };
            }
            
            // If it's for tomorrow and it's past 11:59 AM today (changed to allow orders at exactly 11:59)
            if (mealSpecificDate.getTime() === tomorrowYMD.getTime() && 
                (currentHour > 11 || (currentHour === 11 && currentMinute > 59))) {
              return { 
                unavailable: true, 
                reason: "Orders must be placed by 11:59 AM the day before delivery" 
              };
            }
            
            // If it's for today (which should not be available for ordering)
            if (mealSpecificDate.getTime() === todayYMD.getTime()) {
              return { 
                unavailable: true, 
                reason: "Orders must be placed by 11:59 AM the day before delivery"
              };
            }
            
            // If we have a valid date and it's at least 2 days in the future or tomorrow before/at 11:59 AM, it's available
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
  
  // Tag helper functions removed as icons are no longer used

  // Function to fetch user data from API
  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for daily delivery component');
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Update vouchers with the latest data from API
        setUserVouchers({
          twoDish: data.data.twoDishVoucher || 0,
          threeDish: data.data.threeDishVoucher || 0
        });
        console.log('Updated vouchers from API:', {
          twoDish: data.data.twoDishVoucher || 0,
          threeDish: data.data.threeDishVoucher || 0
        });
        
        // Check user's region
        if (data.data.address && data.data.address.province) {
          setUserRegion(data.data.address.province);
          
          // If user's region is not in the supported list, show the dialog
          if (!DAILY_DELIVERY_REGIONS.includes(data.data.address.province)) {
            setShowRegionDialog(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Load data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch active days
        const daysResponse = await fetch('/api/days?isActive=true');
        const daysData = await daysResponse.json();
        
        if (daysData.success) {
          const formattedDays: Record<string, DayData> = {};
          
          // Process each day
          for (const day of daysData.data) {
            // Fetch combos for this day
            const combosResponse = await fetch(`/api/days/${day.dayId}/combos`);
            const combosData = await combosResponse.json();
            
            if (combosData.success) {
              // Format combo data to match our component's expected structure
              const formattedCombos = combosData.data.map((combo: any) => ({
                id: combo.comboId,
                name: combo.name,
                calories: combo.calories,
                tags: combo.tags,
                typeA: combo.typeA,
                typeB: combo.typeB
              }));
              
              formattedDays[day.dayId] = {
                date: day.date,
                displayName: day.displayName,
                week: day.week,
                combos: formattedCombos
              };
            }
          }
          
          setDays(formattedDays);
          
          // Find the first available day (not unavailable)
          if (Object.keys(formattedDays).length > 0) {
            // First create a helper function to check availability
            const checkDayAvailability = (day: string): boolean => {
              try {
                // Get current date and time in Toronto timezone
                const torontoOptions = { timeZone: 'America/Toronto' };
                const now = new Date();
                
                // Format the Toronto time as a string to work with
                const torontoDateString = now.toLocaleString('en-US', torontoOptions);
                const torontoDate = new Date(torontoDateString);
                
                const dayData = formattedDays[day];
                if (!dayData || !dayData.date) return false;
                
                const mealDate = dayData.date;
                
                try {
                  const parts = mealDate.split(' ');
                  
                  if (parts.length === 2) {
                    const monthStr = parts[0];
                    const dayStr = parts[1];
                    
                    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const monthIndex = shortMonths.findIndex(m => 
                      monthStr.toLowerCase() === m.toLowerCase());
                    
                    const dayNum = parseInt(dayStr);
                    
                    if (monthIndex !== -1 && !isNaN(dayNum)) {
                      const mealSpecificDate = new Date(
                        torontoDate.getFullYear(), 
                        monthIndex, 
                        dayNum
                      );
                      
                      const todayYMD = new Date(
                        torontoDate.getFullYear(), 
                        torontoDate.getMonth(), 
                        torontoDate.getDate()
                      );
                      
                      const tomorrowYMD = new Date(
                        torontoDate.getFullYear(),
                        torontoDate.getMonth(),
                        torontoDate.getDate() + 1
                      );
                      
                      // If meal date is before today
                      if (mealSpecificDate < todayYMD) {
                        return false;
                      }
                      
                      // If it's for today
                      if (mealSpecificDate.getTime() === todayYMD.getTime()) {
                        return false;
                      }
                      
                      // If it's available, return true
                      return true;
                    }
                  }
                } catch (error) {
                  console.error('Error checking day availability:', error);
                }
                
                return false;
              } catch (error) {
                console.error('Error in checkDayAvailability:', error);
                return false;
              }
            };
            
            // Try to find the first available day
            const availableDay = Object.keys(formattedDays).find(checkDayAvailability);
            
            // If found, use it; otherwise fall back to the first day
            setSelectedDay(availableDay || Object.keys(formattedDays)[0]);
          }
        } else {
          throw new Error(daysData.error || 'Failed to fetch days');
        }
        
        // Load user data from localStorage first (for initial display)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          
          // Set initial voucher values from localStorage
          setUserVouchers({
            twoDish: user.twoDishVoucher || 0,
            threeDish: user.threeDishVoucher || 0
          });
          
          // Check user's region
          if (user.address && user.address.province) {
            setUserRegion(user.address.province);
            
            // If user's region is not in the supported list, show the dialog
            if (!DAILY_DELIVERY_REGIONS.includes(user.address.province)) {
              setShowRegionDialog(true);
            }
          }
          
          // If user has _id, fetch complete user data with vouchers from API
          if (user && user._id) {
            await fetchUserData(user._id);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Listen for the refreshUserProfile event to update voucher data
  useEffect(() => {
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
  }, []);
  
  // Add item to cart
  const addToCart = (day: string, date: string, combo: ComboItem, type: ComboType) => {
    // Check if the day is unavailable
    const { unavailable, reason } = isDayUnavailable(day);
    
    if (unavailable) {
      toast({
        title: "Cannot add to cart",
        description: reason,
        variant: "destructive"
      });
      return;
    }
    
    const existingItemIndex = cart.findIndex(
      item => item.day === day && item.comboId === combo.id && item.type === type
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
          day,
          date,
          comboId: combo.id,
          comboName: combo.name,
          type,
          quantity: 1,
          voucherType: type === 'A' ? 'twoDish' : 'threeDish'
        }
      ])
    }
    // No toast notification when adding to cart
  }
  
  // Remove item from cart
  const removeFromCart = (day: string, combo: ComboItem, type: ComboType) => {
    const existingItemIndex = cart.findIndex(
      item => item.day === day && item.comboId === combo.id && item.type === type
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
  const getQuantityInCart = (day: string, comboId: string, type: ComboType): number => {
    const item = cart.find(item => item.day === day && item.comboId === comboId && item.type === type)
    return item ? item.quantity : 0
  }
  
  // Calculate total vouchers used
  const getTotalVouchers = () => {
    const totals = {
      twoDish: 0,
      threeDish: 0
    }
    
    cart.forEach(item => {
      if (item.voucherType === 'twoDish') {
        totals.twoDish += item.quantity
      } else {
        totals.threeDish += item.quantity
      }
    })
    
    return totals
  }
  
  // Calculate total items
  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

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

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Region Check Dialog */}
      <RegionCheckDialog 
        open={showRegionDialog} 
        onClose={() => setShowRegionDialog(false)} 
        currentRegion={userRegion}
      />
      
      {/* Header section with responsive layout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">{t('dailyDelivery')}</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Voucher display with better mobile layout */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Card className="overflow-hidden border border-[#C2884E]/10 bg-gradient-to-br from-white to-[#FFF6EF] shadow-sm hover:shadow-md transition-all duration-300 group rounded-xl">
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#6B5F53] flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-[#C2884E]" />
                    2菜餐券 剩余:
                  </span>
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-[#C2884E]">{userVouchers.twoDish}</span>
                    <span className="ml-1 text-sm text-[#6B5F53]">张</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#6B5F53] flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-[#C2884E]" />
                    3菜餐券 剩余:
                  </span>
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-[#C2884E]">{userVouchers.threeDish}</span>
                    <span className="ml-1 text-sm text-[#6B5F53]">张</span>
                  </div>
                </div>
              </div>
            </Card>
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
              <span>{getTotalItems()}</span>
              <span className="ml-1 border-l border-[#C2884E]/20 pl-2">
                {language === 'zh' ? '结账' : 'Checkout'}
              </span>
            </Button>
          )}
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
        <div className="flex flex-row h-full">
          {/* Sidebar Day Tabs - Always visible on all devices */}
          <div className="w-1/5 min-w-[80px] border-r border-[#C2884E]/20 pr-2 overflow-y-auto max-h-[calc(100vh-120px)] md:max-h-none">
            <div className="space-y-1">
              
              {/* This Week Days */}
              <div className="mb-2 px-3">
                <div className="relative flex items-center">
                  <div className="h-px bg-[#C2884E]/50 flex-grow"></div>
                  <span className="px-2 text-xs font-medium text-[#C2884E] whitespace-nowrap">
                    {language === 'zh' ? '本周' : 'This Week'}
                  </span>
                  <div className="h-px bg-[#C2884E]/50 flex-grow"></div>
                </div>
              </div>
              {dayOrder.filter(day => days[day].week === 1).map((day, index) => days[day] && (
                <button
                  key={day}
                  onClick={() => {
                    // We still want to show the warning but allow selection
                    const { unavailable, reason } = isDayUnavailable(day);
                    
                    if (unavailable) {
                      toast({
                        title: "This day is unavailable",
                        description: reason,
                        variant: "destructive"
                      });
                      // Continue with selection instead of returning
                    }
                    
                    // Check if current day has at least 2 items selected
                    const currentDayItems = cart.filter(item => item.day === selectedDay);
                    const currentDayTotal = currentDayItems.reduce((total, item) => total + item.quantity, 0);
                    
                    if (currentDayTotal === 1) {
                      // Show warning if only 1 item is selected
                      // Capitalize the first letter of the day
                      const displayName = days[selectedDay].displayName;
                      const capitalizedDay = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                      setDayWarning(language === 'zh' 
                        ? `请为${getChineseDayName(displayName)}至少选择两餐` 
                        : `请至少选择两餐 for ${capitalizedDay}`);
                      setTimeout(() => setDayWarning(null), 5000); // Clear warning after 5 seconds
                    } else {
                      // Clear any existing warning and change day
                      setDayWarning(null);
                      setSelectedDay(day);
                    }
                  }}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center gap-2",
                    selectedDay === day 
                      ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md" 
                      : isDayUnavailable(day).unavailable
                        ? "opacity-50 cursor-not-allowed text-[#6B5F53]"
                        : "hover:bg-[#F5EDE4] text-[#6B5F53]"
                  )}
                >
                  <div className="w-full">
                    <p className="font-medium capitalize text-sm">
                      {language === 'zh' 
                        ? getChineseDayName(days[day].displayName)
                        : days[day].displayName.substring(0, 3)}
                    </p>
                    <p className="text-xs opacity-80">{days[day].date}</p>
                    {isDayUnavailable(day).unavailable && (
                      <p className="text-[10px] md:text-xs text-red-500 mt-1">Unavailable</p>
                    )}
                  </div>
                </button>
              ))}
              
              {/* Week Separator with Labels */}
              <div className="mt-4 mb-2 px-3">
                <div className="relative flex items-center">
                  <div className="h-px bg-[#C2884E]/50 flex-grow"></div>
                  <span className="px-2 text-xs font-medium text-[#C2884E] whitespace-nowrap">
                    {language === 'zh' ? '下周' : 'Next Week'}
                  </span>
                  <div className="h-px bg-[#C2884E]/50 flex-grow"></div>
                </div>
              </div>
              
              {/* Next Week Days */}
              {dayOrder.filter(day => days[day].week === 2).length === 0 && (
                <div className="px-3 py-2 text-center text-sm text-[#6B5F53]">
                  {language === 'zh' ? '暂无下周菜单' : 'No Next Week menu available yet'}
                </div>
              )}
              {dayOrder.filter(day => days[day].week === 2).map((day, index) => days[day] && (
                <button
                  key={day}
                  onClick={() => {
                    // We still want to show the warning but allow selection
                    const { unavailable, reason } = isDayUnavailable(day);
                    
                    if (unavailable) {
                      toast({
                        title: "This day is unavailable",
                        description: reason,
                        variant: "destructive"
                      });
                      // Continue with selection instead of returning
                    }
                    
                    // Check if current day has at least 2 items selected
                    const currentDayItems = cart.filter(item => item.day === selectedDay);
                    const currentDayTotal = currentDayItems.reduce((total, item) => total + item.quantity, 0);
                    
                    if (currentDayTotal === 1) {
                      // Show warning if only 1 item is selected
                      // Capitalize the first letter of the day
                      const displayName = days[selectedDay].displayName;
                      const capitalizedDay = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                      setDayWarning(language === 'zh' 
                        ? `请为${getChineseDayName(displayName)}至少选择两餐` 
                        : `请至少选择两餐 for ${capitalizedDay}`);
                      setTimeout(() => setDayWarning(null), 5000); // Clear warning after 5 seconds
                    } else {
                      // Clear any existing warning and change day
                      setDayWarning(null);
                      setSelectedDay(day);
                    }
                  }}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center gap-2",
                    selectedDay === day 
                      ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md" 
                      : isDayUnavailable(day).unavailable
                        ? "opacity-50 cursor-not-allowed text-[#6B5F53]"
                        : "hover:bg-[#F5EDE4] text-[#6B5F53]"
                  )}
                >
                  <div className="w-full">
                    <p className="font-medium capitalize text-sm">
                      {language === 'zh' 
                        ? getChineseDayName(days[day].displayName)
                        : days[day].displayName.substring(0, 3)}
                    </p>
                    <p className="text-xs opacity-80">{days[day].date}</p>
                    {isDayUnavailable(day).unavailable && (
                      <p className="text-[10px] md:text-xs text-red-500 mt-1">Unavailable</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area - Only show selected day */}
          <div className="w-4/5 pl-4">
            {days[selectedDay] && (
              <div className="relative transition-all duration-300 ease-out">
                {/* Day Header - Hidden on mobile */}
                <div className="hidden md:block text-center mb-6 relative">
                  <div className="inline-block">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-2xl font-medium capitalize text-[#6B5F53] mb-1 tracking-wide">
                        {language === 'zh' 
                          ? getChineseDayName(days[selectedDay].displayName)
                          : days[selectedDay].displayName}
                      </h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${days[selectedDay].week === 1 ? 'bg-[#F5EDE4] text-[#C2884E]' : 'bg-[#E4F0F5] text-[#4E88C2]'}`}>
                        {days[selectedDay].week === 1 
                          ? (language === 'zh' ? '本周' : 'This Week')
                          : (language === 'zh' ? '下周' : 'Next Week')}
                      </span>
                    </div>
                    <div className={`w-8 h-px ${accentTypes.brown1.bg} mx-auto mb-2`}></div>
                    <p className="text-xs text-[#6B5F53]/60 font-light tracking-wider">{days[selectedDay].date}</p>
                  </div>
                </div>
                
                {/* Order Notice - Visible on all devices */}
                <div className="text-left mb-6 pl-3 border-l-2 border-[#C2884E]">
                  <h4 className="text-xs font-bold text-[#C2884E] mb-1">下单须知</h4>
                  <p className="text-[10px] text-[#6B5F53]">每天至少选购两餐起送</p>
                </div>
                
                {/* Day Warning - Shows when trying to switch days with only 1 item */}
                {dayWarning && (
                  <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-600 font-medium">{dayWarning}</p>
                  </div>
                )}
                
                {/* Unavailable Day Warning */}
                {isDayUnavailable(selectedDay).unavailable && (
                  <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-600 font-medium">
                      <span className="font-bold">This day is unavailable: </span>
                      {isDayUnavailable(selectedDay).reason}
                    </p>
                  </div>
                )}

                {/* Combos for this day - Grid layout for desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {days[selectedDay].combos.map((combo, comboIndex) => (
                    <div key={combo.id}>
                      <div className={`
                        relative backdrop-blur-xl bg-gradient-to-br from-[#FBF7F2] to-[#F5EDE4]
                        rounded-2xl p-5 border border-[#C2884E]/20 shadow-md
                        transition-all duration-300 ease-out h-full
                        ${isDayUnavailable(selectedDay).unavailable ? 'opacity-60' : ''}
                      `}>
                        <div className="flex flex-wrap items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-[#6B5F53] tracking-wide">{combo.name}</h3>
                          <div className="text-sm font-medium bg-[#C2884E]/5 px-2 py-1 rounded-md text-[#C2884E]">
                            {combo.calories} KCAL
                          </div>
                        </div>
                        
                        {/* 2-Dish Voucher Option */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold tracking-wider px-2 py-0.5 rounded bg-[#C2884E]/10 text-[#C2884E]">每餐2菜</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 bg-white/80"
                                onClick={() => removeFromCart(selectedDay, combo, 'A')}
                                disabled={getQuantityInCart(selectedDay, combo.id, 'A') === 0 || isDayUnavailable(selectedDay).unavailable}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-5 text-center text-sm">
                                {getQuantityInCart(selectedDay, combo.id, 'A')}
                              </span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 bg-white/80"
                                onClick={() => addToCart(selectedDay, days[selectedDay].date, combo, 'A')}
                                disabled={isDayUnavailable(selectedDay).unavailable}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* 2-Dish Voucher Dish List */}
                          <div className="mt-3">
                            <ul className="grid grid-cols-1 gap-2">
                              {combo.typeA.dishes.map((dish, idx) => (
                                <li key={idx} className="flex items-center">
                                  <span className="text-sm font-medium tracking-wide text-[#6B5F53] bg-[#F5EDE4] px-3 py-1.5 rounded-md w-full">{dish}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        {/* Divider */}
                        <div className="my-3">
                          <div className="w-full border-t border-dashed border-[#6B5F53]/20"></div>
                        </div>
                        
                        {/* 3-Dish Voucher Option */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold tracking-wider px-2 py-0.5 rounded bg-[#C2884E]/10 text-[#C2884E]">每餐3菜</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 bg-white/80"
                                onClick={() => removeFromCart(selectedDay, combo, 'B')}
                                disabled={getQuantityInCart(selectedDay, combo.id, 'B') === 0 || isDayUnavailable(selectedDay).unavailable}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-5 text-center text-sm">
                                {getQuantityInCart(selectedDay, combo.id, 'B')}
                              </span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 bg-white/80"
                                onClick={() => addToCart(selectedDay, days[selectedDay].date, combo, 'B')}
                                disabled={isDayUnavailable(selectedDay).unavailable}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* 3-Dish Voucher Additional Dishes */}
                          <div className="mt-3">
                            <div className="text-xs font-medium mb-2 text-[#6B5F53]/80 italic">
                              包含以上的所有菜品，再加:
                            </div>
                            <ul className="grid grid-cols-1 gap-2">
                              {combo.typeB.dishes
                                .filter(dish => !combo.typeA.dishes.includes(dish))
                                .map((dish, idx) => (
                                  <li key={idx} className="flex items-center">
                                    <span className="text-sm font-medium tracking-wide text-[#6B5F53] bg-[#F5EDE4]/80 px-3 py-1.5 rounded-md w-full border-l-2 border-[#C2884E]">{dish}</span>
                                  </li>
                                ))
                              }
                            </ul>
                          </div>
                        </div>
                      
                        {/* Meal Tags */}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {combo.tags.map((tag, tagIndex) => (
                            <div
                              key={tagIndex}
                              className="transition-all duration-300"
                            >
                              <div className={`
                                px-2 py-1 rounded-full 
                                flex items-center
                                bg-gradient-to-r ${accentTypes.brown1.gradient}
                                text-white shadow-sm
                              `}>
                                <span className="text-xs font-medium">{tag}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  )
}