"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { Plus, Minus, ShoppingCart } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Type definitions
type ComboType = 'A' | 'B'
type ComboItem = {
  id: string
  name: string
  description: string[]
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

export default function DailyDelivery() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [days, setDays] = useState<Record<string, DayData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedDay, setSelectedDay] = useState<string>('monday')
  
  // Tag helper functions removed as icons are no longer used

  // Load mock data for now (will be replaced with API call later)
  useEffect(() => {
    const loadMockData = () => {
      setIsLoading(true)
      
      // Define the order of days we want to display with fixed mock dates
      const mockDaysWithDates = [
        { day: 'monday', date: 'Sep 1' },
        { day: 'tuesday', date: 'Sep 2' },
        { day: 'wednesday', date: 'Sep 3' },
        { day: 'thursday', date: 'Sep 4' },
        { day: 'friday', date: 'Sep 5' },
        { day: 'sunday', date: 'Sep 7' }
      ];
      
      const mockDays: Record<string, DayData> = {}
      
      // Generate data for each day in order
      mockDaysWithDates.forEach(({ day: dayName, date: formattedDate }, index) => {
        
        mockDays[dayName] = {
          date: formattedDate,
          combos: [
            {
              id: `${dayName}-combo1`,
              name: `套餐 1`,
              description: [
                "Fresh ingredients prepared daily",
                "Nutritious balanced meal",
                "Eco-friendly packaging"
              ],
              calories: 650,
              tags: ["Fresh", "Healthy", index % 2 === 0 ? "Vegetarian" : "High Protein"],
              typeA: {
                dishes: ["Main dish", "Side salad", "Dessert"],
                voucherType: 'twoDish'
              },
              typeB: {
                dishes: ["Main dish", "Side salad", "Dessert", "Drink", "Appetizer"],
                voucherType: 'threeDish'
              }
            },
            {
              id: `${dayName}-combo2`,
              name: `套餐 2`,
              description: [
                "Gourmet chef-prepared meal",
                "Premium ingredients",
                "Restaurant quality"
              ],
              calories: 850,
              tags: ["Gourmet", index % 2 === 0 ? "Seafood" : "Comfort Food"],
              typeA: {
                dishes: ["Premium main dish", "Gourmet side", "Premium dessert"],
                voucherType: 'twoDish'
              },
              typeB: {
                dishes: ["Premium main dish", "Gourmet side", "Premium dessert", "Wine pairing", "Chef's special appetizer"],
                voucherType: 'threeDish'
              }
            }
          ]
        };
      });
      
      setDays(mockDays);
      setIsLoading(false);
    }
    
    loadMockData()
  }, [])
  
  // Add item to cart
  const addToCart = (day: string, date: string, combo: ComboItem, type: ComboType) => {
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
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "sunday"]
  
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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t('dailyDelivery')}</h2>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => {
            if (cart.length > 0) {
              toast({
                title: t('checkoutNotImplemented'),
                description: t('featureComingSoon'),
              })
            } else {
              toast({
                title: t('cartEmpty'),
                description: t('addItemsToCart'),
                variant: "destructive"
              })
            }
          }}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{getTotalItems()}</span>
          <div className="ml-2 flex items-center gap-2">
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              2D: {getTotalVouchers().twoDish}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
              3D: {getTotalVouchers().threeDish}
            </span>
          </div>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t('loading')}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-row h-full">
          {/* Sidebar Day Tabs - Always visible on all devices */}
          <div className="w-1/5 min-w-[80px] border-r border-[#C2884E]/20 pr-2">
            <div className="sticky top-4 space-y-1">
              {dayOrder.map((day, index) => days[day] && (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center gap-2",
                    selectedDay === day 
                      ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md" 
                      : "hover:bg-[#F5EDE4] text-[#6B5F53]"
                  )}
                >
                  <div className="w-full">
                    <p className="font-medium capitalize text-sm">{day.substring(0, 3)}</p>
                    <p className="text-xs opacity-80">{days[day].date}</p>
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
                    <h3 className="text-2xl font-medium capitalize text-[#6B5F53] mb-1 tracking-wide">{selectedDay}</h3>
                    <div className={`w-8 h-px ${accentTypes.brown1.bg} mx-auto mb-2`}></div>
                    <p className="text-xs text-[#6B5F53]/60 font-light tracking-wider">{days[selectedDay].date}</p>
                  </div>
                </div>

                {/* Combos for this day - Grid layout for desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {days[selectedDay].combos.map((combo, comboIndex) => (
                    <div key={combo.id}>
                      <div className={`
                        relative backdrop-blur-xl bg-gradient-to-br from-[#FBF7F2] to-[#F5EDE4]
                        rounded-2xl p-5 border border-[#C2884E]/20 shadow-md
                        transition-all duration-300 ease-out h-full
                      `}>
                        <div className="flex flex-wrap items-center justify-between mb-3">
                          <h3 className="text-base font-medium text-[#6B5F53]">{combo.name}</h3>
                          <div className="text-sm text-[#6B5F53]/80">
                            {combo.calories} KCAL
                          </div>
                        </div>
                        
                        {/* 2-Dish Voucher Option */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">每餐2菜</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 bg-white/80"
                                onClick={() => removeFromCart(selectedDay, combo, 'A')}
                                disabled={getQuantityInCart(selectedDay, combo.id, 'A') === 0}
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
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* 2-Dish Voucher Dish List */}
                          <div className="mt-2">
                            <ul className="space-y-1">
                              {combo.typeA.dishes.map((dish, idx) => (
                                <li key={idx} className="flex items-center">
                                  <span className="text-xs text-[#6B5F53]">{dish}</span>
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
                              <span className="text-xs font-medium">每餐3菜</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 bg-white/80"
                                onClick={() => removeFromCart(selectedDay, combo, 'B')}
                                disabled={getQuantityInCart(selectedDay, combo.id, 'B') === 0}
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
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* 3-Dish Voucher Additional Dishes */}
                          <div className="mt-2">
                            <div className="text-xs font-medium mb-1 text-[#6B5F53]">
                              包含以上的所有菜品，再加:
                            </div>
                            <ul className="space-y-1">
                              {combo.typeB.dishes
                                .filter(dish => !combo.typeA.dishes.includes(dish))
                                .map((dish, idx) => (
                                  <li key={idx} className="flex items-center">
                                    <span className="text-xs text-[#6B5F53]">{dish}</span>
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
      
      {/* Cart Summary removed as requested */}
    </div>
  )
}