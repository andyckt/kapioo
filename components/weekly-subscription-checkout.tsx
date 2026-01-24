"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Check, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { CartItem, DeliveryDay, submitUserSubscription, validateSelectedDates, sortDeliveryDays } from '@/lib/weekly-subscription'

// Define the supported regions for weekly delivery
const WEEKLY_DELIVERY_REGIONS = [
  "Downtown Toronto", 
  "Midtown", 
  "Scarborough", 
  "North York", 
  "East York",
  "York",
  "Etobicoke",
  "Markham", 
  "Richmond Hill",
  "Aurora", 
  "Newmarket",
  "Vaughan (including Maple, Concord, King)", 
  "Mississauga", 
  "Oakville",
  "Brampton",
  "Hamilton",
  "Burlington"
]

interface WeeklySubscriptionCheckoutProps {
  cart: CartItem[]
  onClose: () => void
  onSuccess: () => void
  userCredits: number
  setUserCredits: (credits: number) => void
  weeklySIXmeals: number
  setWeeklySIXmeals: (value: number) => void
  weeklyEIGHTmeals: number
  setWeeklyEIGHTmeals: (value: number) => void
  weeklyTENmeals: number
  setWeeklyTENmeals: (value: number) => void
  weeklyTWELVEmeals: number
  setWeeklyTWELVEmeals: (value: number) => void
  deliveryDays: DeliveryDay[]
}

export function WeeklySubscriptionCheckout({
  cart,
  onClose,
  onSuccess,
  userCredits,
  setUserCredits,
  weeklySIXmeals,
  setWeeklySIXmeals,
  weeklyEIGHTmeals,
  setWeeklyEIGHTmeals,
  weeklyTENmeals,
  setWeeklyTENmeals,
  weeklyTWELVEmeals,
  setWeeklyTWELVEmeals,
  deliveryDays
}: WeeklySubscriptionCheckoutProps) {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    area: '',
    specialInstructions: ''
  })
  const [addressFormData, setAddressFormData] = useState({
    unitNumber: '',
    streetAddress: '',
    province: '',
    postalCode: '',
    country: 'Canada', // Always Canada, not shown in UI
    buzzCode: ''
  })
  const [editingAddress, setEditingAddress] = useState(false)
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true)
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Calculate total items and cost
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0)
  
  // Load user data from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setUserData(user)
      
      // Initialize formData with user's info
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        area: user.address?.province || "",
        specialInstructions: ''
      })
      
      // Initialize address form data
      if (user.address) {
        setAddressFormData({
          unitNumber: user.address.unitNumber || "",
          streetAddress: user.address.streetAddress || "",
          province: user.address.province || "",
          postalCode: user.address.postalCode || "",
          country: "Canada", // Always force to Canada regardless of stored value
          buzzCode: user.address.buzzCode || ""
        })
      }
    }
  }, [])

  // Handle input change for all form fields
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
  
  const handleAreaSelect = (area: string) => {
    setAddressFormData({
      ...addressFormData,
      province: area
    })
    setPopoverOpen(false)
  }
  
  // Handle region change from dialog
  const handleSaveAddress = async () => {
    // Always update the local userData for display in the current order
    setUserData((prev: any) => prev ? {
      ...prev,
      address: { ...addressFormData }
    } : null)
    
    if (saveAddressForFuture && userData?._id) {
      try {
        const response = await fetch(`/api/users/${userData._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: {
              ...addressFormData,
              country: 'Canada' // Always force to Canada
            }
          }),
        })
        
        const result = await response.json()
        
        if (result.success) {
          // Update localStorage
          const storedUser = localStorage.getItem('user')
          if (storedUser) {
            const userObj = JSON.parse(storedUser)
            const updatedUser = { 
              ...userObj, 
              address: { 
                ...addressFormData,
                country: 'Canada' // Always force to Canada
              } 
            }
            localStorage.setItem('user', JSON.stringify(updatedUser))
          }
          
          toast({
            title: language === 'zh' ? '地址已保存' : 'Address Saved',
            description: language === 'zh' ? '您的地址已更新' : 'Your address has been updated',
          })
        } else {
          toast({
            title: language === 'zh' ? '出错了' : 'Error Occurred',
            description: result.error || (language === 'zh' ? '保存地址时出错' : 'Error saving address'),
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error saving address:', error)
        toast({
          title: language === 'zh' ? '出错了' : 'Error Occurred',
          description: language === 'zh' ? '保存地址时出错' : 'Error saving address',
          variant: "destructive"
        })
      }
    } else {
      // Show toast that address is used only for this order
      toast({
        title: language === 'zh' ? '地址已更新' : 'Address Updated',
        description: language === 'zh' ? '此地址仅用于当前订单' : 'This address will be used only for this order',
      })
    }
    
    setEditingAddress(false)
  }

  const handleCheckout = async () => {
    console.log("handleCheckout called")
    
    // CRITICAL FIX: Prevent duplicate orders by checking and setting loading state IMMEDIATELY
    if (isLoading) {
      console.log("⚠️ Order already in progress, ignoring duplicate click");
      return;
    }
    
    // Set loading state BEFORE any validation or async operations
    setIsLoading(true);
    
    try {
      // Validate delivery information
      if (!formData.name || !formData.phone || !formData.area) {
        toast({
          title: language === 'zh' ? '出错了' : 'Error Occurred',
          description: language === 'zh' ? '请填写所有必填的配送信息' : 'Please fill in all required delivery information',
          variant: "destructive"
        })
        setIsLoading(false);
        return
      }
      
      // Directly proceed to submit without showing address dialog
      // Users can already see and edit their address in the form above
      await handleSubmit()
    } catch (error) {
      console.error("Error in handleCheckout:", error);
      toast({
        title: language === 'zh' ? '订单失败' : 'Order Failed',
        description: language === 'zh' ? '处理您的订单时出错' : 'Error processing your order',
        variant: "destructive"
      });
      setIsLoading(false);
    }
  }
  
  // The actual submission function that will be called after address confirmation
  const handleSubmit = async () => {
    if (!userData?.address && !editingAddress) {
      toast({
        title: language === 'zh' ? '出错了' : 'Error Occurred',
        description: language === 'zh' ? '请添加配送地址' : 'Please add a delivery address',
        variant: "destructive"
      })
      return
    }
    
    // Use either the form address data (if editing) or the stored user address
    // Always force country to "Canada" regardless of what's stored
    const deliveryAddress = {
      ...(editingAddress ? addressFormData : userData?.address),
      country: 'Canada' // Force country to Canada
    }
    
    if (!deliveryAddress || !deliveryAddress.streetAddress || 
        !deliveryAddress.province || !deliveryAddress.postalCode) {
      toast({
        title: language === 'zh' ? '出错了' : 'Error Occurred',
        description: language === 'zh' ? '请填写完整的地址信息' : 'Please provide a complete address',
        variant: "destructive"
      })
      setIsLoading(false);
      return
    }
    
    // Note: isLoading is now managed by handleCheckout, not here
    
    try {
      // Parse user data from localStorage
      const userDataStr = localStorage.getItem('user')
      if (!userDataStr) {
        toast({
          title: language === 'zh' ? '请先登录' : 'Please Log In',
          description: language === 'zh' ? '您需要登录才能完成订阅' : 'You need to log in to complete your subscription',
          variant: "destructive"
        })
        setIsLoading(false);
        return
      }
      
      const userData = JSON.parse(userDataStr)
      
      // CRITICAL FIX: Fetch fresh user data from database before checkout validation
      // This ensures we have the most up-to-date coupon counts, especially for newly approved users
      console.log('=== CHECKOUT DEBUG: Fetching fresh user data from database ===');
      console.log('User ID:', userData._id);
      console.log('Props before fetch - weeklySIXmeals:', weeklySIXmeals, 'weeklyEIGHTmeals:', weeklyEIGHTmeals, 'weeklyTENmeals:', weeklyTENmeals, 'weeklyTWELVEmeals:', weeklyTWELVEmeals);
      
      const freshUserResponse = await fetch(`/api/users/${userData._id}`);
      const freshUserData = await freshUserResponse.json();

      if (!freshUserData.success || !freshUserData.data) {
        console.error('Failed to fetch fresh user data:', freshUserData.error);
        throw new Error(freshUserData.error || 'Failed to fetch user data for validation');
      }
      
      const freshUser = freshUserData.data;
      console.log('Fresh user data from DB - weeklySIXmeals:', freshUser.weeklySIXmeals, 'weeklyEIGHTmeals:', freshUser.weeklyEIGHTmeals, 'weeklyTENmeals:', freshUser.weeklyTENmeals, 'weeklyTWELVEmeals:', freshUser.weeklyTWELVEmeals);
      
      // NEW: Validate consecutive dates BEFORE processing
      // Extract unique dates from cart
      const uniqueDates = Array.from(new Set(
        cart.map(item => {
          const day = deliveryDays.find(d => d.id === item.dayId && d.weekOffset === item.weekOffset);
          return day?.date;
        }).filter(Boolean)
      )) as string[];
      
      console.log('🔍 CHECKOUT VALIDATION: Unique dates in cart:', uniqueDates);
      
      // Validate consecutive dates
      const validation = validateSelectedDates(uniqueDates, deliveryDays);
      
      if (!validation.isValid) {
        console.log('❌ CHECKOUT VALIDATION: Failed -', validation.error);
        throw new Error(
          validation.error || 
          (language === 'zh' 
            ? '请选择连续的配送日期（周日+周二 或 周二+周日）' 
            : 'Please select consecutive delivery dates (Sun+Tue or Tue+Sun)')
        );
      }
      
      console.log('✅ CHECKOUT VALIDATION: Consecutive dates check passed');
      
      // Use fresh data for validation instead of stale props
      const freshSixMeals = freshUser.weeklySIXmeals || 0;
      const freshEightMeals = freshUser.weeklyEIGHTmeals || 0;
      const freshTenMeals = freshUser.weeklyTENmeals || 0;
      const freshTwelveMeals = freshUser.weeklyTWELVEmeals || 0;
      
      // CRITICAL FIX: Fetch fresh delivery days from database before checkout
      // This prevents stale dates if admin rolled forward while user was browsing
      console.log('=== CHECKOUT DEBUG: Fetching fresh delivery days from database ===');
      console.log('Delivery days prop before fetch:', deliveryDays.map(d => ({ id: d.id, date: d.date, weekOffset: d.weekOffset })));
      
      const freshDeliveryDaysResponse = await fetch('/api/weekly-subscription/user');
      const freshDeliveryDaysData = await freshDeliveryDaysResponse.json();
      
      if (!freshDeliveryDaysData.success || !freshDeliveryDaysData.data) {
        console.error('Failed to fetch fresh delivery days:', freshDeliveryDaysData.error);
        throw new Error('Failed to fetch current delivery schedule');
      }
      
      const freshDeliveryDays = freshDeliveryDaysData.data;
      console.log('Fresh delivery days from DB:', freshDeliveryDays.map((d: any) => ({ id: d.id, date: d.date, weekOffset: d.weekOffset })));
      
      // Use fresh delivery days for date mapping instead of stale props
      const currentDeliveryDays = freshDeliveryDays;
      
      // Group cart items by date using FRESH delivery days
      const cartByDate: Record<string, CartItem[]> = {};
      
      console.log('🔍 DEBUG: Starting cart grouping by date');
      console.log('🔍 DEBUG: Cart items:', cart);
      console.log('🔍 DEBUG: Using FRESH delivery days:', currentDeliveryDays.map((d: any) => ({ id: d.id, date: d.date, weekOffset: d.weekOffset })));
      
      // CRITICAL VALIDATION: Check if all cart items have matching delivery days in fresh data
      const invalidItems: CartItem[] = [];
      
      cart.forEach(item => {
        // CRITICAL FIX: Find the corresponding delivery day by BOTH dayId AND weekOffset
        // Use FRESH delivery days to prevent stale date issues
        const deliveryDay = currentDeliveryDays.find((day: any) => day.id === item.dayId && day.weekOffset === item.weekOffset);
        console.log(`🔍 DEBUG: Processing cart item - dayId: ${item.dayId}, weekOffset: ${item.weekOffset}, optionId: ${item.optionId}, quantity: ${item.quantity}`);
        console.log(`🔍 DEBUG: Found delivery day:`, deliveryDay ? { id: deliveryDay.id, date: deliveryDay.date, weekOffset: deliveryDay.weekOffset } : 'NOT FOUND');
        
        if (deliveryDay) {
          const date = deliveryDay.date;
          console.log(`🔍 DEBUG: Using FRESH date: ${date} for dayId: ${item.dayId}, weekOffset: ${item.weekOffset}`);
          if (!cartByDate[date]) {
            cartByDate[date] = [];
          }
          cartByDate[date].push(item);
        } else {
          console.error(`🚨 ERROR: Could not find delivery day for dayId: ${item.dayId}, weekOffset: ${item.weekOffset}`);
          console.error(`🚨 This might mean the delivery schedule was updated while you were browsing.`);
          invalidItems.push(item);
        }
      });
      
      // If any items couldn't be mapped to valid delivery days, show error and stop
      if (invalidItems.length > 0) {
        console.error('🚨 CHECKOUT BLOCKED: Some cart items reference outdated delivery schedule');
        console.error('Invalid items:', invalidItems);
        throw new Error(
          language === 'zh'
            ? '配送日期已更新，请刷新页面重新选择餐点'
            : 'Delivery schedule has been updated. Please refresh the page and re-select your meals.'
        );
      }
      
      console.log('🔍 DEBUG: Final cartByDate grouping:', cartByDate);
      console.log('Cart grouped by date:', Object.keys(cartByDate).map(date => `${date}: ${cartByDate[date].length} items`));
      
      // Process each date as a separate order
      const orderResults = [];
      let totalRemainingCredits = userCredits;
      let totalRemainingSixMeals = freshSixMeals; // Use fresh data
      let totalRemainingEightMeals = freshEightMeals; // Use fresh data
      let totalRemainingTenMeals = freshTenMeals; // Use fresh data
      let totalRemainingTwelveMeals = freshTwelveMeals; // Use fresh data
      
      // Determine the meal plan type based on total items across all dates
      const allCartItems = Object.values(cartByDate).flat();
      const totalItemsAcrossAllDates = allCartItems.reduce((total, item) => total + item.quantity, 0);
      
      console.log('Total items across all dates:', totalItemsAcrossAllDates);
      
      // Choose the meal plan type based on the total items in the entire cart
      // CRITICAL: Use fresh data from database, not stale props
      let selectedMealPlanType: '6aweek' | '8aweek' | '10aweek' | '12aweek' | undefined;
      if (totalItemsAcrossAllDates === 6 && freshSixMeals > 0) {
        selectedMealPlanType = '6aweek';
        console.log('Selected meal plan type: 6aweek (freshSixMeals:', freshSixMeals, ')');
      } else if (totalItemsAcrossAllDates === 8 && freshEightMeals > 0) {
        selectedMealPlanType = '8aweek';
        console.log('Selected meal plan type: 8aweek (freshEightMeals:', freshEightMeals, ')');
      } else if (totalItemsAcrossAllDates === 10 && freshTenMeals > 0) {
        selectedMealPlanType = '10aweek';
        console.log('Selected meal plan type: 10aweek (freshTenMeals:', freshTenMeals, ')');
      } else if (totalItemsAcrossAllDates === 12 && freshTwelveMeals > 0) {
        selectedMealPlanType = '12aweek';
        console.log('Selected meal plan type: 12aweek (freshTwelveMeals:', freshTwelveMeals, ')');
      } else {
        // This shouldn't happen because we validate in the previous screen,
        // but just in case, set a fallback based on what's available
        console.log('No exact match, using fallback logic');
        if (freshSixMeals > 0) {
          selectedMealPlanType = '6aweek';
          console.log('Fallback: Selected 6aweek (freshSixMeals:', freshSixMeals, ')');
        } else if (freshEightMeals > 0) {
          selectedMealPlanType = '8aweek';
          console.log('Fallback: Selected 8aweek (freshEightMeals:', freshEightMeals, ')');
        } else if (freshTenMeals > 0) {
          selectedMealPlanType = '10aweek';
          console.log('Fallback: Selected 10aweek (freshTenMeals:', freshTenMeals, ')');
        } else if (freshTwelveMeals > 0) {
          selectedMealPlanType = '12aweek';
          console.log('Fallback: Selected 12aweek (freshTwelveMeals:', freshTwelveMeals, ')');
        }
      }
      
      // Check if we have enough meal plans for the entire cart
      // CRITICAL: Use fresh data from database, not stale props
      let hasEnoughMeals = false;
      if (selectedMealPlanType === '6aweek') {
        hasEnoughMeals = freshSixMeals >= 1;
      } else if (selectedMealPlanType === '8aweek') {
        hasEnoughMeals = freshEightMeals >= 1;
      } else if (selectedMealPlanType === '10aweek') {
        hasEnoughMeals = freshTenMeals >= 1;
      } else if (selectedMealPlanType === '12aweek') {
        hasEnoughMeals = freshTwelveMeals >= 1;
      }
      
      console.log('Validation check - selectedMealPlanType:', selectedMealPlanType, 'hasEnoughMeals:', hasEnoughMeals);
      
      if (!hasEnoughMeals) {
        console.error('VALIDATION FAILED: Insufficient meal plans. Selected type:', selectedMealPlanType, 'Available:', {
          freshSixMeals,
          freshEightMeals,
          freshTenMeals,
          freshTwelveMeals
        });
        throw new Error(language === 'zh' ? '餐券不足，请先购买餐券' : 'Insufficient meal plans, please purchase more');
      }
      
      console.log('Validation PASSED. Proceeding with checkout...');
      
      // Flag to track if we've already deducted a voucher
      let voucherDeducted = false;
      
      // Get the dates in a consistent order to ensure deterministic processing
      const sortedDates = Object.keys(cartByDate).sort();
      console.log(`=== Processing ${sortedDates.length} orders for dates: ${sortedDates.join(', ')} ===`);
      
      // Process first date WITH voucher deduction
      if (sortedDates.length > 0) {
        const firstDate = sortedDates[0];
        const firstDateItems = cartByDate[firstDate];
        
        console.log(`\n--- Processing FIRST order (${firstDate}) ---`);
        console.log('Items:', firstDateItems.map(item => `${item.quantity}x ${item.optionId}`));
        console.log('🔍 DEBUG: Full items being sent to API:', firstDateItems);
        console.log('Meal plan type:', selectedMealPlanType);
        console.log('Deduct voucher: TRUE');
        
        // First order should deduct a voucher
        const firstResult = await submitUserSubscription({
          items: firstDateItems,
          userId: userData._id,
          specialInstructions: formData.specialInstructions,
          deliveryAddress: deliveryAddress,
          phoneNumber: formData.phone,
          area: formData.area,
          mealPlanType: selectedMealPlanType,
          deductVoucher: true // First order deducts voucher
        });
        
        console.log('🔍 DEBUG: First order API response:', firstResult);
        
        console.log('First order result:', firstResult.error ? `ERROR: ${firstResult.error}` : 'SUCCESS');
        
        if (firstResult.error) {
          console.error('First order failed with error:', firstResult.error);
          throw new Error(firstResult.error);
        }
        
        // Update remaining meal plans based on the first order
        if (firstResult.voucherDeducted) {
          console.log(`Voucher was deducted for date ${firstDate}, updating remaining counts`);
          
          if (firstResult.updatedUser) {
            if (firstResult.usedMealPlanType === '6aweek') {
              totalRemainingSixMeals = firstResult.updatedUser.weeklySIXmeals;
            } else if (firstResult.usedMealPlanType === '8aweek') {
              totalRemainingEightMeals = firstResult.updatedUser.weeklyEIGHTmeals;
            } else if (firstResult.usedMealPlanType === '10aweek') {
              totalRemainingTenMeals = firstResult.updatedUser.weeklyTENmeals;
            } else if (firstResult.usedMealPlanType === '12aweek') {
              totalRemainingTwelveMeals = firstResult.updatedUser.weeklyTWELVEmeals;
            } else {
              totalRemainingCredits = firstResult.updatedUser.credits;
            }
          } else if (firstResult.remainingCredits !== undefined) {
            // Legacy support for old API response format
            totalRemainingCredits = firstResult.remainingCredits;
          }
        } else {
          console.log(`Warning: No voucher was deducted for first date ${firstDate}`);
        }
        
        // Add first result to array
        orderResults.push(firstResult);
        
        // Process remaining dates WITHOUT voucher deduction
        for (let i = 1; i < sortedDates.length; i++) {
          const date = sortedDates[i];
          const dateItems = cartByDate[date];
          
          console.log(`\n--- Processing additional order ${i+1}/${sortedDates.length} (${date}) ---`);
          console.log('Items:', dateItems.map(item => `${item.quantity}x ${item.optionId}`));
          console.log('Meal plan type:', selectedMealPlanType);
          console.log('Deduct voucher: FALSE');
          
          const result = await submitUserSubscription({
            items: dateItems,
            userId: userData._id,
            specialInstructions: formData.specialInstructions,
            deliveryAddress: deliveryAddress,
            phoneNumber: formData.phone,
            area: formData.area,
            mealPlanType: selectedMealPlanType,
            deductVoucher: false // Explicitly set to false for additional orders
          });
          
          console.log(`Order ${i+1} result:`, result.error ? `ERROR: ${result.error}` : 'SUCCESS');
          
          if (result.error) {
            console.error(`Order ${i+1} failed with error:`, result.error);
            throw new Error(result.error);
          }
          
          // Add result to array
          orderResults.push(result);
        }
      }
      
      console.log(`\n=== All ${sortedDates.length} orders completed successfully ===`);
      
      // All orders were successful
      // Update user data in localStorage with the final counts
      console.log('Updating localStorage and state with final counts:', {
        totalRemainingSixMeals,
        totalRemainingEightMeals,
        totalRemainingTenMeals,
        totalRemainingTwelveMeals
      });
      
      userData.credits = totalRemainingCredits;
      userData.weeklySIXmeals = totalRemainingSixMeals;
      userData.weeklyEIGHTmeals = totalRemainingEightMeals;
      userData.weeklyTENmeals = totalRemainingTenMeals;
      userData.weeklyTWELVEmeals = totalRemainingTwelveMeals;
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state with new values
      setUserCredits(totalRemainingCredits);
      setWeeklySIXmeals(totalRemainingSixMeals);
      setWeeklyEIGHTmeals(totalRemainingEightMeals);
      setWeeklyTENmeals(totalRemainingTenMeals);
      setWeeklyTWELVEmeals(totalRemainingTwelveMeals);
      
      // ✅ NEW: Send order summary email with ALL orders
      console.log('📧 Sending order summary email...');
      console.log('📧 Order results:', orderResults);
      console.log('📧 Number of orders:', orderResults.length);
      
      try {
        // Map order results to email format with safety checks
        const orders = orderResults.map((result, index) => {
          console.log(`📧 Processing order ${index + 1}:`, result);
          
          // submitUserSubscription returns { subscription, order, remainingCredits, ... }
          // So we need to access result.order directly
          const orderData = result.order || result;
          
          console.log(`📧 Order data for order ${index + 1}:`, orderData);
          
          return {
            orderId: orderData.orderId,
            items: orderData.items,
            totalCredits: orderData.creditCost || 0,
            mealPlanType: result.usedMealPlanType,
            voucherDeducted: result.voucherDeducted
          };
        });
        
        console.log('📧 Mapped orders:', orders);
        
        const emailPayload = {
          type: 'weekly',
          userEmail: userData.email,
          userName: userData.name,
          userId: userData._id,
          orders: orders,
          deliveryAddress: deliveryAddress,
          area: formData.area,
          phoneNumber: formData.phone,
          specialInstructions: formData.specialInstructions,
          language: userData.languagePreference || 'zh'
        };
        
        console.log('📧 Email payload:', JSON.stringify(emailPayload, null, 2));
        
        const response = await fetch('/api/send-order-summary-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload)
        });
        
        console.log('📧 Response status:', response.status);
        
        const result = await response.json();
        console.log('📧 Email API response:', result);
        
        if (result.success) {
          console.log('✅ Order summary email sent successfully');
        } else {
          console.error('❌ Email API returned error:', result.error);
        }
      } catch (emailError) {
        console.error('❌ Failed to send order summary email:', emailError);
        console.error('❌ Error stack:', emailError);
        // Don't fail the checkout if email fails
      }
      
      const orderCount = Object.keys(cartByDate).length;
      toast({
        title: language === 'zh' ? '订单完成' : 'Order Completed',
        description: language === 'zh' 
          ? `您的${orderCount}天的订单已成功提交` 
          : `Your ${orderCount} orders have been successfully placed`,
      })
      
      // Call onSuccess callback to clear the cart and close the checkout
      onSuccess()
      
    } catch (error) {
      console.error("Error during checkout:", error);
      toast({
        title: language === 'zh' ? '订单失败' : 'Order Failed',
        description: language === 'zh' ? '处理您的订单时出错' : 'Error processing your order',
        variant: "destructive"
      });
      setIsLoading(false);
      throw error; // Re-throw to be caught by handleCheckout
    }
  }

  // Create a lookup map for meal options
  const mealOptions = useMemo(() => {
    const optionsMap: Record<string, Record<string, string>> = {}
    
    deliveryDays.forEach((day) => {
      optionsMap[day.id] = {}
      day.options.forEach((option) => {
        // Store the meal name by option ID
        optionsMap[day.id][option.id] = option.name
      })
    })
    
    return optionsMap
  }, [deliveryDays])
  
  // CRITICAL FIX: Group cart items by delivery day + weekOffset for display
  // Use a composite key: "dayId-weekOffset" to distinguish same day across different weeks
  const cartByDay: Record<string, CartItem[]> = {}
  
  cart.forEach(item => {
    // Create composite key to uniquely identify day across weeks
    const compositeKey = `${item.dayId}-${item.weekOffset ?? 0}`;
    if (!cartByDay[compositeKey]) {
      cartByDay[compositeKey] = []
    }
    cartByDay[compositeKey].push(item)
  })

  return (
    <motion.div
      initial={{ y: 10 }}
      animate={{ y: 0 }}
      exit={{ y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-4 flex">
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          disabled={isLoading}
          className="h-10 w-10 rounded-full border-[#C2884E]/30 bg-white shadow-sm hover:bg-[#F5EDE4]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6B5F53]">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{language === 'zh' ? '结账' : 'Checkout'}</CardTitle>
          <CardDescription>{language === 'zh' ? '确认您的订单详情' : 'Confirm your order details'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-[#6B5F53] mb-4">{language === 'zh' ? '已选餐点' : 'Selected Meals'}</h3>
            <Card className="bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] border-[#C2884E]/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {Object.entries(cartByDay).map(([compositeKey, items]) => {
                    // CRITICAL FIX: Extract dayId and weekOffset from composite key (format: "dayId-weekOffset")
                    const [dayId, weekOffsetStr] = compositeKey.split('-');
                    const weekOffset = parseInt(weekOffsetStr, 10);
                    
                    return (
                    <div key={compositeKey} className="pb-3 last:pb-0">
                      <div className="font-medium capitalize mb-2 flex items-center">
                        <span className="text-[#6B5F53]">
                          {dayId === 'sunday' ? (language === 'zh' ? '周日' : 'Sunday') : 
                           dayId === 'tuesday' ? (language === 'zh' ? '周二' : 'Tuesday') : dayId}
                        </span>
                        {(() => {
                          // Find the date using the extracted weekOffset
                          const matchingDay = deliveryDays.find(
                            day => day.id === dayId && day.weekOffset === weekOffset
                          );
                          if (matchingDay && matchingDay.date) {
                            return (
                              <span className="text-[#6B5F53]/60 text-sm ml-2">
                                ({matchingDay.date})
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="space-y-2">
                        {items.map((item, index) => {
                          // CRITICAL FIX: Find the option in matching delivery day by BOTH dayId AND weekOffset
                          let optionName = item.optionId;
                          const matchingDay = deliveryDays.find(
                            day => day.id === item.dayId && day.weekOffset === item.weekOffset
                          );
                          if (matchingDay) {
                            const option = matchingDay.options.find(opt => opt.id === item.optionId);
                            if (option) {
                              // Use English name if available and language is English
                              optionName = (language === 'en' && option.nameEn) ? option.nameEn : option.name;
                            }
                          }
                          
                          return (
                            <div key={index} className="flex justify-between text-sm">
                              <div className="flex items-center flex-1">
                                <CheckCircle2 className="h-4 w-4 text-[#C2884E] mr-2 flex-shrink-0" />
                                <span>{optionName}{item.quantity > 1 ? ` x${item.quantity}` : ''}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {Object.keys(cartByDay).length > 1 && 
                       Object.keys(cartByDay).indexOf(compositeKey) < Object.keys(cartByDay).length - 1 && (
                        <div className="border-b border-[#C2884E]/20 mt-3"></div>
                      )}
                    </div>
                    );
                  })}
                  
                  <div className="border-t border-[#C2884E]/20 pt-2 mt-2 flex justify-between font-medium">
                    <span>{language === 'zh' ? '总计' : 'Total'}</span>
                    <span>
                      {(() => {
                        if (totalItems === 6) {
                          return language === 'zh' ? '6餐一周: 1张' : '6 meals/week: 1 voucher';
                        } else if (totalItems === 8) {
                          return language === 'zh' ? '8餐一周: 1张' : '8 meals/week: 1 voucher';
                        } else if (totalItems === 10) {
                          return language === 'zh' ? '10餐一周: 1张' : '10 meals/week: 1 voucher';
                        } else if (totalItems === 12) {
                          return language === 'zh' ? '12餐一周: 1张' : '12 meals/week: 1 voucher';
                        } else {
                          return `${totalItems} ${language === 'zh' ? '餐' : 'meals'}`;
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">{language === 'zh' ? '配送信息' : 'Delivery Information'}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{language === 'zh' ? '全名' : 'Full Name'}</Label>
                <Input id="name" value={formData.name} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {language === 'zh' ? '电话号码' : 'Phone Number'} <span className="text-red-500">*</span>
                </Label>
                <Input id="phone" value={formData.phone} onChange={handleInputChange} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="area">
                  {language === 'zh' ? '区域' : 'Area'} <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.area} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, area: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'zh' ? '选择区域' : 'Select area'} />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKLY_DELIVERY_REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialInstructions">
                {language === 'zh' ? '订餐特殊备注' : 'Special Instructions'} {language === 'en' ? '(if any)' : '（可选）'}
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
                <Label className="font-medium">Delivery Address</Label>
                {!editingAddress && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setEditingAddress(true)}
                  >
                    {userData?.address ? (language === 'zh' ? '编辑地址' : 'Edit Address') : (language === 'zh' ? '添加地址' : 'Add Address')}
                  </Button>
                )}
              </div>
              
              {editingAddress ? (
                <div className="mt-2 space-y-4 p-4 rounded-md border border-primary/30 bg-primary/5 shadow-sm">
                  <div className="text-sm font-medium text-primary mb-2">
                    Edit Delivery Details
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="unitNumber" className="text-sm">
                        Unit/Apt Number
                      </Label>
                      <Input 
                        id="unitNumber" 
                        value={addressFormData.unitNumber} 
                        onChange={handleAddressInputChange} 
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="streetAddress" className="text-sm">
                        Street name <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="streetAddress" 
                        value={addressFormData.streetAddress} 
                        onChange={handleAddressInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-sm">
                        Area <span className="text-red-500">*</span>
                      </Label>
                      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {addressFormData.province || (language === 'zh' ? "选择区域..." : "Select area...")}
                            <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-content-available-width)]">
                          <Command>
                            <CommandInput placeholder={language === 'zh' ? "搜索区域..." : "Search area..."} />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              <CommandEmpty>{language === 'zh' ? "未找到匹配的区域" : "No matching areas found"}</CommandEmpty>
                              <CommandGroup>
                                {WEEKLY_DELIVERY_REGIONS.map((region) => (
                                  <CommandItem
                                    key={region}
                                    value={region}
                                    onSelect={() => handleAreaSelect(region)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        addressFormData.province === region ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {region}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip" className="text-sm">
                        ZIP Code <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="zip" 
                        value={addressFormData.postalCode} 
                        onChange={handleAddressInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buzzCode" className="text-sm">
                        Buzz Code 
                        <span className="text-muted-foreground text-xs ml-1">
                          (Optional)
                        </span>
                      </Label>
                      <Input 
                        id="buzzCode" 
                        value={addressFormData.buzzCode} 
                        onChange={handleAddressInputChange} 
                        placeholder={language === 'zh' ? '用于访问您的建筑物' : 'For accessing your building'}
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
                        {language === 'zh' ? '保存地址以便将来使用' : 'Save address for future orders'}
                    </Label>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4 pt-2 border-t border-primary/20">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingAddress(false)}
                    >
                      {language === 'zh' ? '取消' : 'Cancel'}
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSaveAddress}
                    >
                      {language === 'zh' ? '保存地址' : 'Save Address'}
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
                      {userData.address.province}
                      {userData.address.postalCode && ` ${userData.address.postalCode}`}
                    </p>
                    {userData.address.country && <p>{userData.address.country}</p>}
                    {userData.address.buzzCode && (
                      <p>Buzz Code: {userData.address.buzzCode}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-4 rounded-md border">
                  <p className="text-muted-foreground">
                    {language === 'zh' ? '尚未设置地址' : 'No address set'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            {language === 'zh' ? '返回购物车' : 'Back to Cart'}
          </Button>
          <Button 
            onClick={handleCheckout} 
            disabled={isLoading}
            className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#B67A45] hover:to-[#C29960] text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'zh' ? '处理中...' : 'Processing...'}
              </>
            ) : (
              language === 'zh' ? '完成订单' : 'Complete Order'
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
