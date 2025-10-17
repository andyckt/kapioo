"use client"

import { useState, useEffect, useMemo } from 'react'
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
import { CartItem, DeliveryDay, submitUserSubscription } from '@/lib/weekly-subscription'

interface WeeklySubscriptionCheckoutProps {
  cart: CartItem[]
  onClose: () => void
  onSuccess: () => void
  userCredits: number
  setUserCredits: (credits: number) => void
  deliveryDays: DeliveryDay[]
}

export function WeeklySubscriptionCheckout({
  cart,
  onClose,
  onSuccess,
  userCredits,
  setUserCredits,
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
    // Validate delivery information
    if (!formData.name || !formData.phone || !formData.area) {
      toast({
        title: language === 'zh' ? '出错了' : 'Error Occurred',
        description: language === 'zh' ? '请填写所有必填的配送信息' : 'Please fill in all required delivery information',
        variant: "destructive"
      })
      return
    }
    
    if (!userData?.address && !editingAddress) {
      toast({
        title: language === 'zh' ? '出错了' : 'Error Occurred',
        description: language === 'zh' ? '请添加配送地址' : 'Please add a delivery address',
        variant: "destructive"
      })
      return
    }
    
    // Use either the form address data (if editing) or the stored user address
    const deliveryAddress = editingAddress ? addressFormData : userData?.address
    
    if (!deliveryAddress || !deliveryAddress.streetAddress || !deliveryAddress.city || 
        !deliveryAddress.province || !deliveryAddress.postalCode || !deliveryAddress.country) {
      toast({
        title: language === 'zh' ? '出错了' : 'Error Occurred',
        description: language === 'zh' ? '请填写完整的地址信息' : 'Please provide a complete address',
        variant: "destructive"
      })
      return
    }
    
    // Show loading state
    setIsLoading(true)
    
    try {
      // Parse user data from localStorage
      const userDataStr = localStorage.getItem('user')
      if (!userDataStr) {
        toast({
          title: language === 'zh' ? '请先登录' : 'Please Log In',
          description: language === 'zh' ? '您需要登录才能完成订阅' : 'You need to log in to complete your subscription',
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }
      
      const userData = JSON.parse(userDataStr)
      
      // Submit subscription to API with user ID and additional details
      const result = await submitUserSubscription({
        items: cart,
        userId: userData._id,
        specialInstructions: formData.specialInstructions,
        deliveryAddress: deliveryAddress,
        phoneNumber: formData.phone,
        area: formData.area
      })
      
      if (result.error) {
        // Handle error case
        if (result.requiredCredits && result.availableCredits) {
          toast({
            title: language === 'zh' ? '积分不足' : 'Not Enough Credits',
            description: language === 'zh' 
              ? `需要 ${result.requiredCredits} 积分，但您只有 ${result.availableCredits} 积分` 
              : `You need ${result.requiredCredits} credits, but only have ${result.availableCredits}`,
            variant: "destructive"
          })
        } else {
          toast({
            title: language === 'zh' ? '订阅失败' : 'Subscription Failed',
            description: language === 'zh' ? '处理您的订阅时出错' : 'Error processing your subscription',
            variant: "destructive"
          })
        }
      } else {
        // Success case
        // Update user credits in localStorage if returned by API
        if (result.remainingCredits !== undefined) {
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
        title: language === 'zh' ? '订阅失败' : 'Subscription Failed',
        description: language === 'zh' ? '处理您的订阅时出错' : 'Error processing your subscription',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
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
  
  // Group cart items by delivery day for display
  const cartByDay: Record<string, CartItem[]> = {}
  
  cart.forEach(item => {
    if (!cartByDay[item.dayId]) {
      cartByDay[item.dayId] = []
    }
    cartByDay[item.dayId].push(item)
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
                          {dayId === 'sunday' ? (language === 'zh' ? '周日' : 'Sunday') : 
                           dayId === 'tuesday' ? (language === 'zh' ? '周二' : 'Tuesday') : dayId}
                        </span>
                        {(() => {
                          // Find the date for this day
                          for (const day of deliveryDays) {
                            if (day.id === dayId && day.date) {
                              return (
                                <span className="text-[#6B5F53]/60 text-sm ml-2">
                                  ({day.date})
                                </span>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                      <div className="space-y-2">
                        {items.map((item, index) => {
                          // Find the option in all delivery days
                          let optionName = item.optionId;
                          for (const day of deliveryDays) {
                            if (day.id === item.dayId) {
                              const option = day.options.find(opt => opt.id === item.optionId);
                              if (option) {
                                optionName = option.name;
                                break;
                              }
                            }
                          }
                          
                          return (
                            <div key={index} className="flex justify-between text-sm">
                              <div className="flex items-center flex-1 mr-4">
                                <CheckCircle2 className="h-4 w-4 text-[#C2884E] mr-2 flex-shrink-0" />
                                <span>{optionName}</span>
                              </div>
                              <span className="font-medium flex-shrink-0">
                                {item.quantity} {language === 'zh' ? '积分' : 'credits'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {Object.keys(cartByDay).length > 1 && 
                       Object.keys(cartByDay).indexOf(dayId) < Object.keys(cartByDay).length - 1 && (
                        <div className="border-b border-[#C2884E]/20 mt-3"></div>
                      )}
                    </div>
                  ))}
                  
                  <div className="border-t border-[#C2884E]/20 pt-2 mt-2 flex justify-between font-medium">
                    <span>{language === 'zh' ? '总计' : 'Total'}</span>
                    <span>{totalItems} {language === 'zh' ? '积分' : 'credits'}</span>
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
                <Label htmlFor="phone">{language === 'zh' ? '电话号码' : 'Phone Number'}</Label>
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
                    <SelectItem value="Downtown">Downtown</SelectItem>
                    <SelectItem value="Midtown">Midtown</SelectItem>
                    <SelectItem value="NorthYork">North York</SelectItem>
                    <SelectItem value="Markham">Markham</SelectItem>
                    <SelectItem value="RichmondHill">Richmond Hill</SelectItem>
                    <SelectItem value="Vaughan">Vaughan</SelectItem>
                    <SelectItem value="Mississauga">Mississauga</SelectItem>
                    <SelectItem value="Oakville">Oakville</SelectItem>
                    <SelectItem value="Aurora">Aurora</SelectItem>
                    <SelectItem value="Newmarket">Newmarket</SelectItem>
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
                <Label className="font-medium">{language === 'zh' ? '配送地址' : 'Delivery Address'}</Label>
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
                      <p>{language === 'zh' ? '单元：' : 'Unit: '}{userData.address.unitNumber}</p>
                    )}
                    <p>{userData.address.streetAddress}</p>
                    <p>
                      {userData.address.city}
                      {userData.address.province && `, ${userData.address.province}`}
                      {userData.address.postalCode && ` ${userData.address.postalCode}`}
                    </p>
                    <p>{userData.address.country}</p>
                    {userData.address.buzzCode && (
                      <p>{language === 'zh' ? '门禁密码：' : 'Buzz Code: '}{userData.address.buzzCode}</p>
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
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {language === 'zh' ? '返回' : 'Back'}
          </Button>
          <Button onClick={handleCheckout} disabled={isLoading}>
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
