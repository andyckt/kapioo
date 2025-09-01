"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { Gem, CheckCircle2, Plus, Minus, ShoppingCart } from 'lucide-react'
import { motion } from 'framer-motion'

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
  
  // Helper function to get icon component for tags
  const getIconForTag = (tag: string): string => {
    const iconMap: Record<string, string> = {
      'High Protein': 'Zap',
      'Omega-3': 'Heart',
      'Gluten-Free': 'Shield',
      'Quick': 'Flame',
      'Family Favorite': 'Heart',
      'Comfort Food': 'Heart',
      'Italian': 'ChefHat',
      'Creamy': 'Sparkles',
      'Vegetarian': 'Leaf',
      'Spicy': 'Flame',
      'Indian': 'ChefHat',
      'Healthy': 'Heart',
      'Seafood': 'Shield',
      'Mexican': 'ChefHat',
      'Fresh': 'Leaf'
    }
    return iconMap[tag] || 'Sparkles'
  }
  
  // Helper function to render icon components
  const TagIcon = ({ type, className }: { type: string; className?: string }) => {
    const icons = {
      Sparkles: <span className={className}>✨</span>,
      Leaf: <span className={className}>🍃</span>,
      Shield: <span className={className}>🛡️</span>,
      Zap: <span className={className}>⚡</span>,
      Heart: <span className={className}>❤️</span>,
      Flame: <span className={className}>🔥</span>,
      Apple: <span className={className}>🍎</span>,
      ChefHat: <span className={className}>👨‍🍳</span>
    }
    return icons[type as keyof typeof icons] || <span className={className}>✨</span>
  }

  // Load mock data for now (will be replaced with API call later)
  useEffect(() => {
    const loadMockData = () => {
      setIsLoading(true)
      
      // Get current date and generate dates for the week
      const today = new Date()
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const mockDays: Record<string, DayData> = {}
      
      // Skip today and generate for next 6 days (excluding Saturday)
      for (let i = 1; i <= 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        
        // Skip Saturday (day 6)
        if (date.getDay() === 6) continue
        
        const dayName = dayNames[date.getDay()]
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        mockDays[dayName] = {
          date: formattedDate,
          combos: [
            {
              id: `${dayName}-combo1`,
              name: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} Combo 1`,
              description: [
                "Fresh ingredients prepared daily",
                "Nutritious balanced meal",
                "Eco-friendly packaging"
              ],
              calories: 650,
              tags: ["Fresh", "Healthy", i % 2 === 0 ? "Vegetarian" : "High Protein"],
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
              name: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} Combo 2`,
              description: [
                "Gourmet chef-prepared meal",
                "Premium ingredients",
                "Restaurant quality"
              ],
              calories: 850,
              tags: ["Gourmet", i % 2 === 0 ? "Seafood" : "Comfort Food"],
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
        }
      }
      
      setDays(mockDays)
      setIsLoading(false)
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
    
    const voucherTypeText = type === 'A' ? '2-Dish Voucher' : '3-Dish Voucher'
    
    toast({
      title: t('itemAddedToCart'),
      description: `${combo.name} (${voucherTypeText}) added to cart`,
    })
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
  
  return (
    <div className="space-y-6">
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
        <div className="space-y-8">
          {/* Days of the week */}
          {dayOrder.map(day => days[day] && (
            <Card key={day} className="overflow-hidden">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="capitalize">{day}</CardTitle>
                    <CardDescription>{days[day].date}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Combos for this day */}
                  {days[day].combos.map((combo, comboIndex) => (
                    <div key={combo.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{combo.name}</h3>
                        <div className="flex items-center gap-2">
                          {combo.tags.map((tag, tagIndex) => (
                            <div
                              key={tagIndex}
                              className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs flex items-center gap-1"
                            >
                              <TagIcon type={getIconForTag(tag)} className="w-3 h-3" />
                              <span>{tag}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {combo.description.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {combo.calories} KCAL
                      </div>
                      
                      {/* Combined Type A and B Card */}
                      <Card className="border border-primary/20">
                        <CardHeader className="py-3 px-4 bg-primary/5">
                          <CardTitle className="text-sm font-medium">Combo Options</CardTitle>
                        </CardHeader>
                        <CardContent className="py-3 px-4">
                          {/* Type A Section */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">Type A</span>
                                <div className="flex items-center gap-1 text-sm">
                                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">2-Dish Voucher</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => removeFromCart(day, combo, 'A')}
                                  disabled={getQuantityInCart(day, combo.id, 'A') === 0}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-6 text-center">
                                  {getQuantityInCart(day, combo.id, 'A')}
                                </span>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => addToCart(day, days[day].date, combo, 'A')}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <ul className="space-y-1 text-sm pl-2">
                              {combo.typeA.dishes.map((dish, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                                  {dish}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {/* Divider */}
                          <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-dashed border-primary/20"></div>
                            </div>
                            <div className="relative flex justify-center">
                              <span className="bg-background px-2 text-xs text-muted-foreground">UPGRADE TO</span>
                            </div>
                          </div>
                          
                          {/* Type B Section */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="bg-primary/20 text-primary text-xs font-medium px-2 py-1 rounded-full">Type B</span>
                                <div className="flex items-center gap-1 text-sm">
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">3-Dish Voucher</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => removeFromCart(day, combo, 'B')}
                                  disabled={getQuantityInCart(day, combo.id, 'B') === 0}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-6 text-center">
                                  {getQuantityInCart(day, combo.id, 'B')}
                                </span>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => addToCart(day, days[day].date, combo, 'B')}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Only show the additional dishes that Type B has over Type A */}
                            <div className="bg-primary/5 rounded-md p-3">
                              <div className="text-xs font-medium mb-2 text-primary/80">Includes all Type A dishes, plus:</div>
                              <ul className="space-y-1 text-sm pl-2">
                                {combo.typeB.dishes
                                  .filter(dish => !combo.typeA.dishes.includes(dish))
                                  .map((dish, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                      {dish}
                                    </li>
                                  ))
                                }
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Cart Summary (Mobile) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
          <Button 
            className="w-full flex items-center justify-between"
            onClick={() => {
              toast({
                title: t('checkoutNotImplemented'),
                description: t('featureComingSoon'),
              })
            }}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span>{getTotalItems()} items</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                2D: {getTotalVouchers().twoDish}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                3D: {getTotalVouchers().threeDish}
              </span>
            </div>
          </Button>
        </div>
      )}
    </div>
  )
}
