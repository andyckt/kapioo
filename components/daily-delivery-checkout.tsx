"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { CartItem, DayData, submitDailyOrder, formatAddress } from '@/lib/daily-delivery'

interface DailyDeliveryCheckoutProps {
  cart: CartItem[]
  onClose: () => void
  onSuccess: () => void
  userCredits: number
  setUserCredits: (credits: number) => void
  days: Record<string, DayData>
}

export function DailyDeliveryCheckout({
  cart,
  onClose,
  onSuccess,
  userCredits,
  setUserCredits,
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
    
    // Check if user has enough credits
    if (userCredits < totalItems) {
      toast({
        title: language === 'zh' ? '餐券不足' : 'Insufficient Credits',
        description: language === 'zh' 
          ? `您需要${totalItems}个餐券，但只有${userCredits}个餐券` 
          : `You need ${totalItems} credits, but only have ${userCredits}`,
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      // Prepare data for API
      const orderData = {
        userId: userData._id,
        items: cart,
        specialInstructions: formData.specialInstructions,
        deliveryAddress: editingAddress ? addressFormData : userData.address,
        phoneNumber: formData.phone,
        area: formData.area
      }
      
      // Submit order
      const result = await submitDailyOrder(orderData)
      
      if (result.error) {
        let errorMessage = result.error
        
        // Handle specific error cases
        if (result.requiredCredits && result.availableCredits !== undefined) {
          errorMessage = language === 'zh'
            ? `餐券不足。需要 ${result.requiredCredits} 个餐券，但只有 ${result.availableCredits} 个。`
            : `Insufficient credits. You need ${result.requiredCredits} credits, but only have ${result.availableCredits}.`
        }
        
        toast({
          title: language === 'zh' ? '订单失败' : 'Order Failed',
          description: errorMessage,
          variant: "destructive"
        })
      } else {
        // Update user credits in localStorage
        if (userData && result.remainingCredits !== undefined) {
          userData.credits = result.remainingCredits
          localStorage.setItem('user', JSON.stringify(userData))
          setUserCredits(result.remainingCredits)
        }
        
        toast({
          title: language === 'zh' ? '订单完成' : 'Order Completed',
          description: language === 'zh' ? '您的订单已成功提交' : 'Your order has been successfully placed',
        })
        
        // Call onSuccess callback to clear the cart and close the checkout
        onSuccess()
      }
    } catch (error) {
      console.error("Error during checkout:", error)
      toast({
        title: language === 'zh' ? '订单失败' : 'Order Failed',
        description: language === 'zh' ? '处理您的订单时出错' : 'Error processing your order',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
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
                          {days[dayId]?.displayName || dayId}
                        </span>
                        {days[dayId]?.date && (
                          <span className="text-[#6B5F53]/60 text-sm ml-2">
                            ({days[dayId].date})
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CheckCircle2 className="h-4 w-4 text-[#C2884E] mr-2" />
                              <div>
                                <span className="text-[#6B5F53]">{item.comboName}</span>
                                <span className="text-[#6B5F53]/60 text-xs ml-2">
                                  ({item.type === 'A' ? '2菜' : '3菜'})
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="text-[#6B5F53] font-medium">
                                {item.quantity} x 1 {language === 'zh' ? '餐券' : 'credit'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-[#C2884E]/20 pt-3 flex justify-between font-medium">
                    <span className="text-[#6B5F53]">{language === 'zh' ? '总计' : 'Total'}</span>
                    <span className="text-[#C2884E]">
                      {totalItems} {language === 'zh' ? '餐券' : 'credits'}
                    </span>
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
                  <Label>{language === 'zh' ? '配送地址' : 'Delivery Address'}</Label>
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
                      {language === 'zh' ? '编辑配送详情' : 'Edit Delivery Details'}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="unitNumber" className="text-sm">
                          {language === 'zh' ? '单元/公寓号码' : 'Unit/Apt Number'}
                        </Label>
                        <Input 
                          id="unitNumber" 
                          value={addressFormData.unitNumber} 
                          onChange={handleAddressInputChange} 
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="streetAddress" className="text-sm">
                          {language === 'zh' ? '街道地址' : 'Street Address'} <span className="text-red-500">*</span>
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
                          {language === 'zh' ? '城市' : 'City'} <span className="text-red-500">*</span>
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
                          {language === 'zh' ? '省/州' : 'Province/State'} <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="state" 
                          value={addressFormData.province} 
                          onChange={handleAddressInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip" className="text-sm">
                          {language === 'zh' ? '邮政编码' : 'Postal/ZIP Code'} <span className="text-red-500">*</span>
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
                          {language === 'zh' ? '国家' : 'Country'} <span className="text-red-500">*</span>
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
                          {language === 'zh' ? '门禁密码' : 'Buzz Code'} 
                          <span className="text-muted-foreground text-xs ml-1">
                            {language === 'zh' ? '（可选）' : '(Optional)'}
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
                            <span className="font-medium">{language === 'zh' ? '门禁密码: ' : 'Door Access Code: '}</span>
                            {userData.address.buzzCode}
                          </p>
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
                  {language === 'zh' ? '特别说明' : 'Special Instructions'}
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
          >
            {language === 'zh' ? '返回' : 'Back'}
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
