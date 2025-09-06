"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { Plus, Minus, ShoppingCart, Calendar, Info, ChevronRight, ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format, addDays, addWeeks } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Type definitions
type MealOption = {
  id: string
  name: string



}

type DeliveryDay = {
  id: 'sunday' | 'tuesday'
  name: string
  date: string
  weekOffset: number // 0 for current week, 1 for next week
  options: MealOption[]
}

type CartItem = {
  dayId: string
  optionId: string
  quantity: number
}

export default function WeeklySubscription() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([])
  const [activeTab, setActiveTab] = useState('current-week')
  
  // Calculate next Sunday and Tuesday dates
  useEffect(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    
    // Calculate days until next Sunday (0) and Tuesday (2)
    const daysUntilSunday = (7 - dayOfWeek) % 7
    const daysUntilTuesday = (2 - dayOfWeek + 7) % 7
    
    // If today is Sunday or Tuesday, we want next week's date
    const nextSunday = daysUntilSunday === 0 ? addDays(today, 7) : addDays(today, daysUntilSunday)
    const nextTuesday = daysUntilTuesday === 0 ? addDays(today, 7) : addDays(today, daysUntilTuesday)
    
    // Calculate the following week's dates
    const followingSunday = addWeeks(nextSunday, 1)
    const followingTuesday = addWeeks(nextTuesday, 1)
    
    // Format dates based on language
    const formatDate = (date: Date) => {
      return language === 'zh' 
        ? format(date, 'MM月dd日', { locale: zhCN })
        : format(date, 'MMM dd')
    }
    
    // Mock meal options for current Sunday
    const sundayOptions: MealOption[] = [
      {
        id: 'sunday-option1',
        name: '鲜虾鸡翅焖煲 + 紫米饭 + 蘑菇青菜',

      },
      {
        id: 'sunday-option2',
        name: '罗勒青酱意面 + 意式香草烤鸡',

      },
      {
        id: 'sunday-option3',
        name: '桂侯萝卜慢炖牛腋 + 紫米饭 + 蔑油菜心',

      }
    ]
    
    // Mock meal options for current Tuesday
    const tuesdayOptions: MealOption[] = [
      {
        id: 'tuesday-option1',
        name: '豌豆/爆炒牛肉粒 + 玉米饭 + 时蔬',

      },
      {
        id: 'tuesday-option2',
        name: '西班牙浓郁海鲜烩饭',

      },
      {
        id: 'tuesday-option3',
        name: '泰式柠檬干煎鸡 + 清炒黄瓜条',

      }
    ]
    
    // Mock meal options for next Sunday
    const nextSundayOptions: MealOption[] = [
      {
        id: 'next-sunday-option1',
        name: '香煎三文鱼 + 藜麦饭 + 芦笋',

      },
      {
        id: 'next-sunday-option2',
        name: '日式照烧鸡腿 + 糙米饭 + 炒菠菜',

      },
      {
        id: 'next-sunday-option3',
        name: '意式肉酱面 + 帕玛森奶酪 + 烤蔬菜',

      }
    ]
    
    // Mock meal options for next Tuesday
    const nextTuesdayOptions: MealOption[] = [
      {
        id: 'next-tuesday-option1',
        name: '泰式青咖喱鸡 + 香米饭 + 炒青菜',

      },
      {
        id: 'next-tuesday-option2',
        name: '红烧牛肉面 + 清炒西兰花',

      },
      {
        id: 'next-tuesday-option3',
        name: '墨西哥牛肉卷 + 鳄梨酱 + 炸玉米片',

      }
    ]
    
    // Set delivery days with dates and options
    setDeliveryDays([
      {
        id: 'sunday',
        name: language === 'zh' ? '周日配送' : 'Sunday Delivery',
        date: formatDate(nextSunday),
        weekOffset: 0,
        options: sundayOptions
      },
      {
        id: 'tuesday',
        name: language === 'zh' ? '周二配送' : 'Tuesday Delivery',
        date: formatDate(nextTuesday),
        weekOffset: 0,
        options: tuesdayOptions
      },
      {
        id: 'sunday',
        name: language === 'zh' ? '周日配送' : 'Sunday Delivery',
        date: formatDate(followingSunday),
        weekOffset: 1,
        options: nextSundayOptions
      },
      {
        id: 'tuesday',
        name: language === 'zh' ? '周二配送' : 'Tuesday Delivery',
        date: formatDate(followingTuesday),
        weekOffset: 1,
        options: nextTuesdayOptions
      }
    ])
    
    setIsLoading(false)
  }, [language])
  
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
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: language === 'zh' ? '购物车为空' : 'Cart is Empty',
        description: language === 'zh' ? '请添加餐点到购物车' : 'Please add items to your cart',
        variant: "destructive"
      })
      return
    }
    
    // Here you would implement the actual checkout logic
    // For now, just show a toast
    toast({
      title: language === 'zh' ? '订阅成功' : 'Subscription Successful',
      description: language === 'zh' ? '您的每周订阅已成功设置' : 'Your weekly subscription has been set up successfully',
    })
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
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
