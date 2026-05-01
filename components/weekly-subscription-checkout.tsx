"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckoutAddressForm } from '@/components/checkout-address-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { WeeklyCheckoutSummary } from '@/features/weekly-checkout/weekly-checkout-summary'
import { submitWeeklyCheckout } from '@/features/weekly-checkout/submit-weekly-checkout'
import { useWeeklyCheckoutState } from '@/features/weekly-checkout/use-weekly-checkout-state'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { CartItem, DeliveryDay } from '@/lib/weekly-subscription'
import { ALL_WEEKLY_AREAS } from '@/lib/constants/areas'

// Use centralized area list
const WEEKLY_DELIVERY_REGIONS = ALL_WEEKLY_AREAS

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
  weeklySIXTEENmeals: number
  setWeeklySIXTEENmeals: (value: number) => void
  deliveryDays: DeliveryDay[]
}

export function WeeklySubscriptionCheckout({
  cart,
  onClose,
  onSuccess,
  userCredits,
  setUserCredits,
  setWeeklySIXmeals,
  setWeeklyEIGHTmeals,
  setWeeklyTENmeals,
  setWeeklyTWELVEmeals,
  setWeeklySIXTEENmeals,
  deliveryDays
}: WeeklySubscriptionCheckoutProps) {
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
    popoverOpen,
    setEditingAddress,
    setSaveAddressForFuture,
    setPopoverOpen,
    handleInputChange,
    handleAddressInputChange,
    handleAreaSelect,
    handleSaveAddress,
  } = useWeeklyCheckoutState()

  // Calculate total items and cost
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0)
  
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
      await submitWeeklyCheckout({
        addressFormData,
        cart,
        deliveryDays,
        editingAddress,
        formData,
        language,
        onSuccess,
        setIsLoading,
        setUserCredits,
        setWeeklyEIGHTmeals,
        setWeeklySIXTEENmeals,
        setWeeklySIXmeals,
        setWeeklyTENmeals,
        setWeeklyTWELVEmeals,
        toast,
        totalItems,
        userCredits,
        userData,
      })
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
          <WeeklyCheckoutSummary
            cart={cart}
            deliveryDays={deliveryDays}
            language={language}
            totalItems={totalItems}
          />

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
                <Label className="font-medium">{t('deliveryAddress')}</Label>
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
                <CheckoutAddressForm
                  addressFormData={addressFormData}
                  availableRegions={WEEKLY_DELIVERY_REGIONS}
                  language={language}
                  popoverOpen={popoverOpen}
                  saveAddressForFuture={saveAddressForFuture}
                  onPopoverOpenChange={setPopoverOpen}
                  onAddressInputChange={handleAddressInputChange}
                  onAreaSelect={handleAreaSelect}
                  onSaveAddressForFutureChange={setSaveAddressForFuture}
                  onCancel={() => setEditingAddress(false)}
                  onSave={handleSaveAddress}
                />
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
