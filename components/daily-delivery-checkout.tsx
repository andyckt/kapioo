"use client"

import { useState, useEffect } from 'react'

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
  const baseDayName = englishDayName?.toLowerCase()?.split('-')[0];
  return dayMap[baseDayName] || englishDayName || '';
};
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
import { CartItem, DayData, submitDailyOrder, formatAddress } from '@/lib/daily-delivery'

// Define the supported regions for daily delivery
const DAILY_DELIVERY_REGIONS = [
  "Downtown",
  "Midtown", 
  "NorthYork", 
  "Markham", 
  "RichmondHill"
]

interface DailyDeliveryCheckoutProps {
  cart: CartItem[]
  onClose: () => void
  onSuccess: () => void
  userVouchers: {
    twoDish: number
    threeDish: number
  }
  setUserVouchers: (vouchers: { twoDish: number, threeDish: number }) => void
  days: Record<string, DayData>
}

export function DailyDeliveryCheckout({
  cart,
  onClose,
  onSuccess,
  userVouchers,
  setUserVouchers,
  days
}: DailyDeliveryCheckoutProps) {
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
    city: '',
    province: '',
    postalCode: '',
    country: '',
    buzzCode: ''
  })
  const [editingAddress, setEditingAddress] = useState(false)
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true)
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Calculate total vouchers needed by type
  const vouchersNeeded = cart.reduce(
    (totals, item) => {
      if (item.voucherType === 'twoDish') {
        totals.twoDish += item.quantity;
      } else if (item.voucherType === 'threeDish') {
        totals.threeDish += item.quantity;
      }
      return totals;
    },
    { twoDish: 0, threeDish: 0 }
  )
  
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
        area: user.area || "",
        specialInstructions: ''
      })
      
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
            address: addressFormData
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
              address: { ...addressFormData } 
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
    }
    
    // Close the address form
    setEditingAddress(false)
  }

  // Handle form submission
  const handleCheckout = async () => {
    // Validate form
    if (!formData.phone) {
      toast({
        title: language === 'zh' ? '请填写电话号码' : 'Phone Number Required',
        description: language === 'zh' ? '请提供您的联系电话' : 'Please provide your contact phone number',
        variant: "destructive"
      })
      return
    }
    
    if (!formData.area) {
      toast({
        title: language === 'zh' ? '请选择区域' : 'Area Required',
        description: language === 'zh' ? '请选择您的配送区域' : 'Please select your delivery area',
        variant: "destructive"
      })
      return
    }
    
    // Check if address is provided
    if (!userData?.address?.streetAddress && !addressFormData.streetAddress) {
      toast({
        title: language === 'zh' ? '请提供地址' : 'Address Required',
        description: language === 'zh' ? '请提供您的配送地址' : 'Please provide your delivery address',
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
        title: language === 'zh' ? '订单不满足最低要求' : 'Order Requirements Not Met',
        description: language === 'zh' 
          ? `每天至少选购两餐起送。请为以下日期增加餐点: ${daysList}` 
          : `Minimum 2 meals per day required. Please add more meals for: ${daysList}`,
        variant: "destructive"
      })
      return
    }
    
    // Check if user has enough vouchers
    if (userVouchers.twoDish < vouchersNeeded.twoDish || userVouchers.threeDish < vouchersNeeded.threeDish) {
      // Calculate how many vouchers are missing
      const missingTwoDish = Math.max(0, vouchersNeeded.twoDish - userVouchers.twoDish);
      const missingThreeDish = Math.max(0, vouchersNeeded.threeDish - userVouchers.threeDish);
      
      // Build the message only including voucher types that are missing
      let zhMessage = '';
      let enMessage = '';
      
      if (missingTwoDish > 0 && missingThreeDish > 0) {
        zhMessage = `还需要${missingTwoDish}张2菜餐券和${missingThreeDish}张3菜餐券`;
        enMessage = `You need ${missingTwoDish} more two-dish vouchers and ${missingThreeDish} more three-dish vouchers`;
      } else if (missingTwoDish > 0) {
        zhMessage = `还需要${missingTwoDish}张2菜餐券`;
        enMessage = `You need ${missingTwoDish} more two-dish vouchers`;
      } else if (missingThreeDish > 0) {
        zhMessage = `还需要${missingThreeDish}张3菜餐券`;
        enMessage = `You need ${missingThreeDish} more three-dish vouchers`;
      }
      
      toast({
        title: language === 'zh' ? '餐券不足' : 'Insufficient Vouchers',
        description: language === 'zh' ? zhMessage : enMessage,
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      // Group cart items by date
      const cartByDate: Record<string, CartItem[]> = {};
      
      cart.forEach(item => {
        if (!cartByDate[item.date]) {
          cartByDate[item.date] = [];
        }
        cartByDate[item.date].push(item);
      });
      
      // Process each date as a separate order
      const orderResults = [];
      let totalRemainingVouchers = {
        twoDish: userVouchers.twoDish,
        threeDish: userVouchers.threeDish
      };
      
      // Process each date as a separate order
      for (const [date, dateItems] of Object.entries(cartByDate)) {
        // Enhance cart items with dish details
        const enhancedDateItems = dateItems.map(item => {
          const dayData = days[item.day];
          const combo = dayData?.combos?.find(c => c.id === item.comboId);
          const dishes = combo ? (item.type === 'A' ? combo.typeA.dishes : combo.typeB.dishes) : [];
          
          return {
            ...item,
            dishes: dishes // Add dishes to each cart item
          };
        });
        
        // Calculate vouchers needed for this date
        const dateVouchersNeeded = enhancedDateItems.reduce(
          (totals, item) => {
            if (item.voucherType === 'twoDish') {
              totals.twoDish += item.quantity;
            } else if (item.voucherType === 'threeDish') {
              totals.threeDish += item.quantity;
            }
            return totals;
          },
          { twoDish: 0, threeDish: 0 }
        );
        
        // Check if we have enough vouchers for this date
        if (totalRemainingVouchers.twoDish < dateVouchersNeeded.twoDish || 
            totalRemainingVouchers.threeDish < dateVouchersNeeded.threeDish) {
          throw new Error('Insufficient vouchers for all orders');
        }
        
        const orderData = {
          userId: userData._id,
          items: enhancedDateItems,
          specialInstructions: formData.specialInstructions,
          deliveryAddress: editingAddress ? addressFormData : userData.address,
          phoneNumber: formData.phone,
          area: formData.area
        };
        
        // Submit order for this date
        const result = await submitDailyOrder(orderData);
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        // Update remaining vouchers
        totalRemainingVouchers = result.remainingVouchers;
        
        // Add result to array
        orderResults.push(result);
      }
      
      // All orders were successful
      // Update user vouchers in localStorage
      if (userData && totalRemainingVouchers) {
        userData.twoDishVoucher = totalRemainingVouchers.twoDish;
        userData.threeDishVoucher = totalRemainingVouchers.threeDish;
        localStorage.setItem('user', JSON.stringify(userData));
        setUserVouchers({
          twoDish: totalRemainingVouchers.twoDish,
          threeDish: totalRemainingVouchers.threeDish
        });
      }
      
      const orderCount = Object.keys(cartByDate).length;
      toast({
        title: language === 'zh' ? '订单完成' : 'Order Completed',
        description: language === 'zh' 
          ? `您的${orderCount}天的订单已成功提交` 
          : `Your ${orderCount} orders have been successfully placed`,
      });
      
      // Call onSuccess callback to clear the cart and close the checkout
      onSuccess();
      
    } catch (error) {
      console.error("Error during checkout:", error);
      toast({
        title: language === 'zh' ? '订单失败' : 'Order Failed',
        description: language === 'zh' ? '处理您的订单时出错' : 'Error processing your order',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Group cart items by delivery day for display
  const cartByDay: Record<string, CartItem[]> = {}
  
  cart.forEach(item => {
    if (!cartByDay[item.day]) {
      cartByDay[item.day] = []
    }
    cartByDay[item.day].push(item)
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
                  {Object.entries(cartByDay).map(([dayId, items]) => (
                    <div key={dayId} className="pb-3 last:pb-0">
                      <div className="font-medium capitalize mb-2 flex items-center">
                        <span className="text-[#6B5F53]">
                          {language === 'zh' 
                            ? getChineseDayName(days[dayId]?.displayName || dayId)
                            : days[dayId]?.displayName || dayId}
                        </span>
                        {days[dayId]?.date && (
                          <span className="text-[#6B5F53]/60 text-sm ml-2">
                            ({days[dayId].date})
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {items.map((item, index) => {
                          // Find the combo details to get dishes
                          const dayData = days[item.day];
                          const combo = dayData?.combos?.find(c => c.id === item.comboId);
                          const dishes = combo ? (item.type === 'A' ? combo.typeA.dishes : combo.typeB.dishes) : [];
                          
                          return (
                            <div key={index} className="bg-white rounded-lg border border-[#C2884E]/10 p-3 mb-2 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <div className="bg-[#F5EDE4] p-1.5 rounded-full mr-2">
                                    <CheckCircle2 className="h-4 w-4 text-[#C2884E]" />
                                  </div>
                                  <div>
                                    <span className="text-[#6B5F53] font-medium">{item.comboName}</span>
                                    <span className="text-[#6B5F53]/60 text-xs ml-2">
                                      ({item.type === 'A' ? '2菜' : '3菜'})
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-[#C2884E] font-medium bg-[#F5EDE4] px-2 py-0.5 rounded-full text-sm">
                                    x{item.quantity}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Display dish details */}
                              {dishes.length > 0 && (
                                <div className="pl-8 mt-1 space-y-1">
                                  {dishes.map((dish, dishIdx) => (
                                    <div key={dishIdx} className="flex items-center gap-2">
                                      <div className="w-1 h-1 rounded-full bg-[#C2884E]/40"></div>
                                      <span className="text-xs text-[#6B5F53]">{dish}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-[#C2884E]/20 pt-3 flex justify-between font-medium">
                    <span className="text-[#6B5F53]">{language === 'zh' ? '总计' : 'Total'}</span>
                    <div className="text-[#C2884E] flex gap-2">
                      {vouchersNeeded.twoDish > 0 && <span>2菜: {vouchersNeeded.twoDish}</span>}
                      {vouchersNeeded.threeDish > 0 && <span>3菜: {vouchersNeeded.threeDish}</span>}
                      {vouchersNeeded.twoDish === 0 && vouchersNeeded.threeDish === 0 && <span>0</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-[#6B5F53] mb-4">{language === 'zh' ? '配送信息' : 'Delivery Information'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{language === 'zh' ? '姓名' : 'Name'}</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    disabled={isLoading} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    {language === 'zh' ? '电话' : 'Phone'} <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={handleInputChange} 
                    disabled={isLoading} 
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="area">
                    {language === 'zh' ? '区域' : 'Area'} <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.area} 
                    onValueChange={(value) => setFormData({ ...formData, area: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'zh' ? '选择区域' : 'Select area'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="downtown">
                        Downtown
                      </SelectItem>
                      <SelectItem value="midtown">
                        Midtown
                      </SelectItem>
                      <SelectItem value="northyork">
                        North York
                      </SelectItem>
                      <SelectItem value="markham">
                        Markham
                      </SelectItem>
                      <SelectItem value="richmond">
                        Richmond Hill
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Delivery Address</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingAddress(!editingAddress)}
                    disabled={isLoading}
                  >
                    {editingAddress 
                      ? (language === 'zh' ? '取消' : 'Cancel') 
                      : (language === 'zh' ? '编辑' : 'Edit')}
                  </Button>
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
                        <Label htmlFor="city" className="text-sm">
                          City <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="city" 
                          value={addressFormData.city} 
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
                                  {DAILY_DELIVERY_REGIONS.map((region) => (
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
                          Postal/ZIP Code <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="zip" 
                          value={addressFormData.postalCode} 
                          onChange={handleAddressInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-sm">
                          Country <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="country" 
                          value={addressFormData.country} 
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
                        disabled={isLoading}
                      >
                        {language === 'zh' ? '取消' : 'Cancel'}
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSaveAddress}
                        disabled={isLoading}
                      >
                        {language === 'zh' ? '保存地址' : 'Save Address'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-md border bg-muted/20">
                    {userData?.address ? (
                      <div>
                        <p className="text-sm">{formatAddress(userData.address)}</p>
                        {userData.address.buzzCode && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">Door Access Code: </span>
                            {userData.address.buzzCode}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Please add a delivery address
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="specialInstructions">
                  {language === 'zh' ? '订餐特殊备注' : 'Special Instructions'}
                  <span className="text-muted-foreground text-xs ml-1">
                    {language === 'zh' ? '（可选）' : '(Optional)'}
                  </span>
                </Label>
                <Textarea 
                  id="specialInstructions" 
                  value={formData.specialInstructions} 
                  onChange={handleInputChange}
                  placeholder={language === 'zh' ? '配送说明、饮食限制或其他要求' : 'Delivery instructions, dietary restrictions, or other requests'}
                  className="h-20"
                  disabled={isLoading}
                />
              </div>
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
              language === 'zh' ? '完成结账' : 'Complete Checkout'
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
