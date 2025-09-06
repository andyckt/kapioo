"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { Plus, Minus, ShoppingCart, Calendar, Info, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getUserWeeklySubscription, submitUserSubscription } from '@/lib/weekly-subscription'
import { DeliveryDay, MealOption, CartItem } from '@/lib/weekly-subscription'

export default function WeeklySubscription() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([])
  const [activeTab, setActiveTab] = useState('current-week')
  
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
          toast({
            title: language === 'zh' ? '加载失败' : 'Failed to load data',
            description: language === 'zh' ? '请稍后再试' : 'Please try again later',
            variant: "destructive"
          });
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
  
  // Handle checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: language === 'zh' ? '购物车为空' : 'Cart is Empty',
        description: language === 'zh' ? '请添加餐点到购物车' : 'Please add items to your cart',
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true);
    
    try {
      // Submit subscription to API
      const result = await submitUserSubscription(cart);
      
      if (result.error) {
        // Handle error case
        if (result.requiredCredits && result.availableCredits) {
          toast({
            title: language === 'zh' ? '积分不足' : 'Not Enough Credits',
            description: language === 'zh' 
              ? `需要 ${result.requiredCredits} 积分，但您只有 ${result.availableCredits} 积分` 
              : `You need ${result.requiredCredits} credits, but only have ${result.availableCredits}`,
            variant: "destructive"
          });
        } else {
          toast({
            title: language === 'zh' ? '订阅失败' : 'Subscription Failed',
            description: language === 'zh' ? '处理您的订阅时出错' : 'Error processing your subscription',
            variant: "destructive"
          });
        }
      } else {
        // Success case
    toast({
      title: language === 'zh' ? '订阅成功' : 'Subscription Successful',
      description: language === 'zh' ? '您的每周订阅已成功设置' : 'Your weekly subscription has been set up successfully',
        });
        
        // Clear the cart after successful checkout
        setCart([]);
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      toast({
        title: language === 'zh' ? '订阅失败' : 'Subscription Failed',
        description: language === 'zh' ? '处理您的订阅时出错' : 'Error processing your subscription',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#C2884E] to-[#D1A46C] bg-clip-text text-transparent">{language === 'zh' ? '每周订阅' : 'Weekly Subscription'}</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] rounded-full mt-1"></div>
        </div>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 border-[#C2884E]/30 hover:bg-[#F5EDE4]/50 hover:text-[#C2884E]"
          onClick={handleCheckout}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{getTotalItems()}</span>
        </Button>
      </div>
      
      {isLoading ? (
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
          </div>
          
          {/* Week Selection Tabs */}
          <Tabs defaultValue="current-week" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6 bg-[#F5EDE4]/30">
              <TabsTrigger 
                value="current-week" 
                className="data-[state=active]:bg-[#F5EDE4] data-[state=active]:text-[#C2884E] font-medium"
              >
                {language === 'zh' ? '本周' : 'Current Week'}
              </TabsTrigger>
              <TabsTrigger 
                value="next-week" 
                className="data-[state=active]:bg-[#F5EDE4] data-[state=active]:text-[#C2884E] font-medium"
              >
                {language === 'zh' ? '下周' : 'Next Week'}
              </TabsTrigger>
            </TabsList>
            
            {/* Current Week Content */}
            <TabsContent value="current-week" className="mt-0">
              <div className="grid gap-8 md:grid-cols-2">
                {deliveryDays
                  .filter(day => day.weekOffset === 0)
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
            </TabsContent>
            
            {/* Next Week Content */}
            <TabsContent value="next-week" className="mt-0">
          <div className="grid gap-8 md:grid-cols-2">
                {deliveryDays
                  .filter(day => day.weekOffset === 1)
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
            </TabsContent>
          </Tabs>
          
          {/* Subscription Summary - Commented out for now */}
          {/* {getTotalItems() > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8"
            >
              <Card className="bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] border-[#C2884E]/20">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-[#6B5F53] mb-4">
                    {language === 'zh' ? '订阅摘要' : 'Subscription Summary'}
                  </h3>
                  
                  <div className="space-y-2">
                    {cart.map((item, index) => {
                      const day = deliveryDays.find(d => d.id === item.dayId)
                      const option = day?.options.find(o => o.id === item.optionId)
                      
                      return option && (
                        <div key={index} className="flex justify-between text-sm">
                          <span>
                            {day?.name} - {option.name} x{item.quantity}
                          </span>
                          <span className="font-medium">
                            {item.quantity} {language === 'zh' ? '餐券' : 'credits'}
                          </span>
                        </div>
                      )
                    })}
                    
                    <div className="border-t border-[#C2884E]/20 pt-2 mt-2 flex justify-between font-medium">
                      <span>{language === 'zh' ? '总计' : 'Total'}</span>
                      <span>{getTotalCredits()} {language === 'zh' ? '餐券' : 'credits'}</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C]"
                    onClick={handleCheckout}
                  >
                    {language === 'zh' ? '确认订阅' : 'Confirm Subscription'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )} */}
        </div>
      )}
    </div>
  )
}
