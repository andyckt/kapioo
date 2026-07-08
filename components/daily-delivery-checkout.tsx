"use client"

import { useState } from 'react'

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
import { CheckoutAddressForm } from '@/components/checkout-address-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DailyCheckoutSummary } from '@/features/daily-checkout/daily-checkout-summary'
import { submitDailyCheckout } from '@/features/daily-checkout/submit-daily-checkout'
import { useDailyCheckoutState } from '@/features/daily-checkout/use-daily-checkout-state'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { PRODUCT_LINE_LABELS } from '@/lib/product-lines/names'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { CartItem, DayData, formatAddress } from '@/lib/daily-delivery'

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
  dishTranslations: Record<string, string>
}

export function DailyDeliveryCheckout({
  cart,
  onClose,
  onSuccess,
  userVouchers,
  setUserVouchers,
  days,
  dishTranslations
}: DailyDeliveryCheckoutProps) {
  const { language, t } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const {
    userData,
    formData,
    setFormData,
    addressFormData,
    editingAddress,
    saveAddressForFuture,
    isValidDeliveryArea,
    setEditingAddress,
    setSaveAddressForFuture,
    handleInputChange,
    handleAddressInputChange,
    handleAddressSelect,
    handleSaveAddress,
  } = useDailyCheckoutState({
    deliveryRegions: [],
  })

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
    
    await submitDailyCheckout({
      addressFormData,
      cart,
      days,
      editingAddress,
      formData,
      language,
      onSuccess,
      setIsLoading,
      setUserVouchers,
      toast,
      userData,
      userVouchers,
    })
  }

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
          <DailyCheckoutSummary
            cart={cart}
            days={days}
            dishTranslations={dishTranslations}
            language={language}
            vouchersNeeded={vouchersNeeded}
          />
          
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
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>{t('deliveryAddress')}</Label>
                    {!isValidDeliveryArea && (
                      <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded border border-red-200">
                        {language === 'zh' ? '不在服务范围内' : 'Not in service area'}
                      </span>
                    )}
                  </div>
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
                  <CheckoutAddressForm
                    addressFormData={addressFormData}
                    language={language}
                    saveAddressForFuture={saveAddressForFuture}
                    disabled={isLoading}
                    onAddressInputChange={handleAddressInputChange}
                    onAddressSelect={handleAddressSelect}
                    onSaveAddressForFutureChange={setSaveAddressForFuture}
                    onCancel={() => setEditingAddress(false)}
                    onSave={handleSaveAddress}
                  />
                ) : (
                  <div className={`p-3 rounded-md border ${!isValidDeliveryArea ? 'bg-red-50 border-red-200' : 'bg-muted/20'}`}>
                    {userData?.address ? (
                      <div>
                        <p className="text-sm">{formatAddress(userData.address)}</p>
                        {userData.address.buzzCode && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">Door Access Code: </span>
                            {userData.address.buzzCode}
                          </p>
                        )}
                        {!isValidDeliveryArea && (
                          <div className="mt-2 pt-2 border-t border-red-200">
                            <p className="text-xs text-red-600 font-medium">
                              {language === 'zh' 
                                ? `⚠️ 此地址不在${PRODUCT_LINE_LABELS.daily.zh}服务范围内。请点击"编辑"更新地址。` 
                                : `⚠️ This address is not in the ${PRODUCT_LINE_LABELS.daily.en} service area. Please click "Edit" to update your address.`}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {language === 'zh' ? '请添加配送地址' : 'Please add a delivery address'}
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
            disabled={isLoading || !isValidDeliveryArea}
            className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#B67A45] hover:to-[#C29960] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'zh' ? '处理中...' : 'Processing...'}
              </>
            ) : !isValidDeliveryArea ? (
              language === 'zh' ? '请更新配送地址' : 'Please update your delivery address'
            ) : (
              language === 'zh' ? '完成结账' : 'Complete Checkout'
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
