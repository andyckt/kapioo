"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  ArrowRight, 
  Clock, 
  Check, 
  Info, 
  Tag, 
  Utensils,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Menu,
  Sparkles,
  Ticket
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/lib/language-context'
import { useSmartBack } from '@/hooks/use-smart-back'
import {
  formatDailyCombo,
  getDailyComboAllergens,
  getDailyComboDescription,
  getDailyComboDishName,
  getDailyComboTags,
  type DayData,
} from '@/lib/daily-delivery'
import { getDailyDeliveryState, setDailyDeliveryState } from '@/lib/plan-flow-state'
import { listDailyPlans } from '@/lib/plans/service'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  MenuPreviewCardButton,
  MenuPreviewCarouselSkeleton,
  MenuPreviewCarouselViewport,
  menuPreviewCarouselRowInsetClassName,
} from "@/components/landing/menu-preview-carousel"
import {
  DailyComboMetadata,
  DailyComboMealOptionDivider,
  DailyComboThreeDishExtraDishes,
  DailyComboTwoDishDishList,
} from "@/features/daily-ordering/daily-combo-meal-lists"

// Define types for voucher plans
interface VoucherPlan {
  id: string;
  type: 'twoDish' | 'threeDish';
  quantity: number;
  price: number;
  isPopular?: boolean;
  pricePerMeal: number;
  savings?: string;
  displayQuantity?: string;
  originalQuantity?: string;
  displayPricePerMeal?: string;
  originalPricePerMeal?: string;
}

export default function DailyDeliveryPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const handleBack = useSmartBack()
  const [activeTab, setActiveTab] = useState('description')
  const [pricingTab, setPricingTab] = useState<'twoDish' | 'threeDish'>(() => {
    const saved = getDailyDeliveryState()
    return saved ? saved.pricingTab : 'twoDish'
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [menuDialogOpen, setMenuDialogOpen] = useState(false)
  const [weeklyMenu, setWeeklyMenu] = useState<Record<string, DayData>>({})
  /** Start true so menu preview shows skeleton on first paint until active-with-combos returns. */
  const [isMenuLoading, setIsMenuLoading] = useState(true)
  const [activeWeek, setActiveWeek] = useState<number>(1)
  const [selectedMenuDay, setSelectedMenuDay] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [dishTranslations, setDishTranslations] = useState<Record<string, string>>({}) // Map of Chinese name -> English name
  
  // Helper function to translate combo names
  const translateComboName = (name: string): string => {
    if (language === 'zh') return name
    // Translate common combo name patterns
    if (name.includes('套餐')) {
      return name.replace(/套餐/g, 'Combo')
    }
    return name
  }
  
  // Helper function to translate dish names
  const translateDishName = (dishName: string): string => {
    if (language === 'zh' || !dishTranslations[dishName]) {
      return dishName
    }
    return dishTranslations[dishName] || dishName
  }
  
  // Persist pricing tab so returning from signup shows same options
  useEffect(() => {
    setDailyDeliveryState({ pricingTab })
  }, [pricingTab])

  // Check if user is authenticated on component mount
  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated')
    const userData = localStorage.getItem('user')
    setIsAuthenticated(authStatus === 'true' && !!userData)
  }, [])
  
  // Fetch dish translations on component mount
  useEffect(() => {
    const fetchDishTranslations = async () => {
      try {
        const response = await fetch('/api/dishes');
        const result = await response.json();
        
        if (result.success && result.data) {
          // Create a map of Chinese name -> English name
          const translationsMap: Record<string, string> = {};
          result.data.forEach((dish: any) => {
            if (dish.nameEn) {
              translationsMap[dish.name] = dish.nameEn;
            }
          });
          setDishTranslations(translationsMap);
        }
      } catch (error) {
        console.error('Error fetching dish translations:', error);
      }
    };
    
    fetchDishTranslations();
  }, [])
  
  const allDailyPlans: VoucherPlan[] = listDailyPlans().map((plan) => {
    const isTwentyPack = plan.credits === 22
    const isFortyPack = plan.credits === 46
    const displayQuantity = isTwentyPack ? '20' : isFortyPack ? '40' : undefined
    const originalQuantity = isTwentyPack || isFortyPack ? String(plan.credits) : undefined
    const displayPricePerMeal =
      plan.dishType === 'twoDish'
        ? isTwentyPack || isFortyPack
          ? '17.8'
          : undefined
        : isTwentyPack
          ? '20.85'
          : isFortyPack
            ? '20.45'
            : undefined

    return {
      id: plan.id,
      type: plan.dishType,
      quantity: plan.credits,
      price: plan.basePrice,
      pricePerMeal: plan.pricePerMeal,
      isPopular: Boolean(plan.tags),
      savings: language === 'zh' ? plan.tags?.zh : plan.tags?.en,
      displayQuantity,
      originalQuantity,
      displayPricePerMeal,
      originalPricePerMeal: isTwentyPack || isFortyPack ? plan.pricePerMeal.toFixed(2) : undefined
    }
  })

  const twoDishPlans: VoucherPlan[] = allDailyPlans.filter((plan) => plan.type === 'twoDish')
  const threeDishPlans: VoucherPlan[] = allDailyPlans.filter((plan) => plan.type === 'threeDish')

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }
  
  // Handle plan selection and redirection
  const handlePlanSelect = (plan: VoucherPlan) => {
    // Create a plan identifier
    const planIdentifier = `plan=${plan.id}`
    
    // Store the selected plan in localStorage
    localStorage.setItem('selectedMealPlan', JSON.stringify({
      id: plan.id,
      type: plan.type,
      quantity: plan.quantity,
      price: plan.price,
      pricePerMeal: plan.pricePerMeal,
      isPopular: plan.isPopular || false,
      savings: plan.savings || null
    }))
    
    // Check if user is authenticated by directly checking localStorage
    const authStatus = localStorage.getItem('isAuthenticated')
    const userData = localStorage.getItem('user')
    
    if (authStatus === 'true' && userData) {
      // If authenticated and user data exists, redirect to dashboard meal-vouchers tab with plan selection
      router.push(`/dashboard?tab=meal-vouchers&selectPlan=true&${planIdentifier}`)
    } else {
      // If not authenticated or no user data, redirect to signup with plan identifier
      router.push(`/signup?from=daily-delivery&${planIdentifier}`)
    }
  }

  // Function to fetch weekly menu data - OPTIMIZED
  const fetchWeeklyMenu = async () => {
    setIsMenuLoading(true)
    try {
      // 🚀 OPTIMIZATION #1: Try the optimized single-request endpoint first
      try {
        const optimizedResponse = await fetch('/api/days/active-with-combos')
        const optimizedData = await optimizedResponse.json()
        
        if (optimizedData.success && optimizedData.data) {
          const formattedDays: Record<string, DayData> = {}
          
          // Process the combined data (much faster!)
          optimizedData.data.forEach((day: any) => {
            // Only include week 1 and 2 days
            if (day.week <= 2) {
              formattedDays[day.dayId] = {
                date: day.date,
                displayName: day.displayName,
                week: day.week,
                combos: Array.isArray(day.combos) ? day.combos.map(formatDailyCombo) : []
              }
            }
          })
          
          setWeeklyMenu(formattedDays)
          console.log('✅ Loaded menu using optimized endpoint')
        }
      } catch (optimizedError) {
        console.log('⚠️ Optimized endpoint failed, falling back to parallel requests')
        
        // Fallback to parallel requests if optimized endpoint fails
        const daysResponse = await fetch('/api/days?isActive=true')
        const daysData = await daysResponse.json()
        
        if (daysData.success) {
          const formattedDays: Record<string, DayData> = {}
          
          // 🚀 OPTIMIZATION #2: Fetch all combos in parallel
          const comboPromises = daysData.data
            .filter((day: any) => day.week <= 2) // Only include week 1 and 2 days
            .map(async (day: any) => {
              try {
                const combosResponse = await fetch(`/api/days/${day.dayId}/combos`)
                const combosData = await combosResponse.json()
                
                if (combosData.success) {
                  const formattedCombos = combosData.data.map(formatDailyCombo)
                  
                  return {
                    dayId: day.dayId,
                    dayData: {
                      date: day.date,
                      displayName: day.displayName,
                      week: day.week,
                      combos: formattedCombos
                    }
                  }
                }
                return null
              } catch (error) {
                console.error(`Error fetching combos for ${day.dayId}:`, error)
                return null
              }
            })
          
          const comboResults = await Promise.all(comboPromises)
          
          comboResults.forEach((result) => {
            if (result) {
              formattedDays[result.dayId] = result.dayData
            }
          })
          
          setWeeklyMenu(formattedDays)
        }
      }
    } catch (error) {
      console.error('Error fetching weekly menu:', error)
    } finally {
      setIsMenuLoading(false)
    }
  }
  
  // Load menu data when dialog opens and initialize selected day
  useEffect(() => {
    if (menuDialogOpen) {
      if (Object.keys(weeklyMenu).length === 0 && !isMenuLoading) {
        fetchWeeklyMenu().then(() => {
          // This will run after fetchWeeklyMenu completes
          if (Object.keys(weeklyMenu).length > 0) {
            // Find the first day of the active week
            const firstDayOfWeek = Object.keys(weeklyMenu)
              .filter(dayId => weeklyMenu[dayId].week === activeWeek)
              .sort((a, b) => {
                const dayOrder: Record<string, number> = { 
                  'monday': 1, 'tuesday': 2, 'wednesday': 3, 
                  'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7 
                };
                const dayA = weeklyMenu[a].displayName.toLowerCase();
                const dayB = weeklyMenu[b].displayName.toLowerCase();
                return (dayOrder[dayA] || 0) - (dayOrder[dayB] || 0);
              })[0];
              
            if (firstDayOfWeek) {
              setSelectedMenuDay(firstDayOfWeek);
            }
          }
        });
      } else {
        // Menu data already loaded, just set selected day
        const firstDayOfWeek = Object.keys(weeklyMenu)
          .filter(dayId => weeklyMenu[dayId].week === activeWeek)
          .sort((a, b) => {
            const dayOrder: Record<string, number> = { 
              'monday': 1, 'tuesday': 2, 'wednesday': 3, 
              'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7 
            };
            const dayA = weeklyMenu[a].displayName.toLowerCase();
            const dayB = weeklyMenu[b].displayName.toLowerCase();
            return (dayOrder[dayA] || 0) - (dayOrder[dayB] || 0);
          })[0];
          
        if (firstDayOfWeek) {
          setSelectedMenuDay(firstDayOfWeek);
        }
      }
    } else {
      // Reset selected day when dialog closes
      setSelectedMenuDay(null);
    }
  }, [menuDialogOpen, activeWeek, weeklyMenu, isMenuLoading])

  useEffect(() => {
    // Always load menu on mount for the preview carousel + dialog. Do not gate
    // on !isMenuLoading: the preview intentionally starts with isMenuLoading true
    // (skeleton first paint), and that guard would skip this effect entirely.
    void fetchWeeklyMenu()
  }, [])

  const features = [
    {
      title: language === 'zh' ? "每日新鲜现做" : "Freshly Made Daily",
      description: language === 'zh' ? "直送上门，满分新鲜度" : "Delivered to your door, maximum freshness",
      icon: <div className="h-6 w-6 text-[#C2884E] flex items-center justify-center">
        <Utensils className="h-5 w-5" />
      </div>
    },
    {
      title: language === 'zh' ? "餐券制" : "Credit-Based System",
      description: language === 'zh' ? "需要哪天就点哪天，灵活不浪费～" : "Order only when you need, flexible and no waste",
      icon: <div className="h-6 w-6 text-[#C2884E] flex items-center justify-center">
        <Ticket className="h-5 w-5" />
      </div>
    },
    {
      title: language === 'zh' ? "午间时段送达" : "Lunch Time Delivery",
      description: language === 'zh' ? "11AM-1PM，享受当日鲜美" : "11AM-1PM, enjoy fresh flavors of the day",
      icon: <div className="h-6 w-6 text-[#C2884E] flex items-center justify-center">
        <Clock className="h-5 w-5" />
      </div>
    }
  ]

  const dayOrder: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  }

  const chineseDayLabels: Record<string, string> = {
    monday: "周一",
    tuesday: "周二",
    wednesday: "周三",
    thursday: "周四",
    friday: "周五",
    saturday: "周六",
    sunday: "周日",
  }

  const getPreviewDayLabel = (displayName: string) => {
    const key = displayName.toLowerCase()
    return language === "zh" ? chineseDayLabels[key] || displayName : displayName.substring(0, 3)
  }

  const weeklyMenuPreviewItems = Object.entries(weeklyMenu)
    .filter(([, day]) => day.week === 1)
    .sort(([, dayA], [, dayB]) => {
      const dayAKey = dayA.displayName.toLowerCase()
      const dayBKey = dayB.displayName.toLowerCase()
      return (dayOrder[dayAKey] || 0) - (dayOrder[dayBKey] || 0)
    })
    .flatMap(([dayId, day]) =>
      day.combos
        .filter((combo) => Boolean(combo.imageUrl))
        .map((combo) => ({
          dayId,
          date: day.date,
          displayName: day.displayName,
          combo,
        }        ))
    )

  const showMenuPreviewSection =
    isMenuLoading || weeklyMenuPreviewItems.length > 0

  const previewLanguage = language === "zh" ? "zh" : "en"

  const openMenuForDay = (dayId: string) => {
    const day = weeklyMenu[dayId]
    if (day) {
      setActiveWeek(day.week)
      setSelectedMenuDay(dayId)
    }
    setMenuDialogOpen(true)
  }
  
  // Render the plan cards
  const renderPlanCards = (plans: VoucherPlan[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -8, boxShadow: "0 10px 25px -5px rgba(194, 136, 78, 0.1), 0 8px 10px -6px rgba(194, 136, 78, 0.1)" }}
            transition={{ duration: 0.3 }}
            className="relative flex flex-col h-full rounded-xl border overflow-hidden group border-[#C2884E]/10 hover:border-[#C2884E]/30"
          >
            {/* Plan tag badge - shows actual tag from catalog */}
            {plan.savings && (
              <div className="absolute top-0 right-0 bg-[#F5EDE4] text-[#C2884E] px-3 py-1 text-xs font-medium rounded-bl-xl z-10">
                {plan.savings}
              </div>
            )}
            
            {/* Card header */}
            <div className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white p-5 relative overflow-hidden">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-white/20 p-1.5 rounded-full">
                    <Utensils className="h-3 w-3" />
                  </div>
                  <span className="text-sm font-medium opacity-90">
                    {plan.type === 'twoDish' 
                      ? (language === 'zh' ? '每餐2菜' : '2-Dish Meal') 
                      : (language === 'zh' ? '每餐3菜' : '3-Dish Meal')}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-sm opacity-80">
                    / {plan.quantity} {language === 'zh' ? '餐券' : 'vouchers'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Card content */}
            <div className="flex flex-col flex-1 p-5 bg-gradient-to-b from-white to-[#F5EDE4]/20">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-[#C2884E]" />
                    <span className="text-sm font-medium text-[#6B5F53]">
                      {language === 'zh' ? '餐券数量' : 'Vouchers'}
                    </span>
                  </div>
                  <span className="font-bold text-[#C2884E]">
                    {plan.displayQuantity && plan.originalQuantity ? (
                      <>
                        <span className="line-through text-[#C2884E]/70 mr-1">{plan.displayQuantity}</span>
                        {plan.originalQuantity}
                      </>
                    ) : plan.quantity}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-[#C2884E]" />
                    <span className="text-sm font-medium text-[#6B5F53]">
                      {language === 'zh' ? '单价' : 'Per meal'}
                    </span>
                  </div>
                  <span className="font-bold text-[#C2884E]">
                    {plan.displayPricePerMeal && plan.originalPricePerMeal ? (
                      <>
                        <span className="line-through text-[#C2884E]/70 mr-1">${plan.displayPricePerMeal}</span>
                        ${plan.originalPricePerMeal}
                      </>
                    ) : `$${plan.pricePerMeal.toFixed(2)}`}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4 pt-3 border-t border-[#C2884E]/10">
                {/* Show 首次推荐 as first tick if available */}
                {plan.savings && (
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                    <span className="text-[#6B5F53]">{plan.savings}</span>
                  </div>
                )}
                
                {/* Show 可转让 as first tick for plans without savings */}
                {!plan.savings && (
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                    <span className="text-[#6B5F53]">
                      {language === 'zh' ? '可转让' : 'Transferable'}
                    </span>
                  </div>
                )}
                
                {/* Show 可转让 as second tick for plans with savings */}
                {plan.savings && (
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                    <span className="text-[#6B5F53]">
                      {language === 'zh' ? '可转让' : 'Transferable'}
                    </span>
                  </div>
                )}
                
                {/* Show Valid for 6 months as a tick */}
                <div className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                  <span className="text-[#6B5F53]">
                    {language === 'zh' ? '有效期半年' : 'Valid for 6 months'}
                  </span>
                </div>
                
                {/* Show refund policy */}
                <div className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                  <span className="text-[#6B5F53]">
                    {language === 'zh' ? '购买后7天内可退款未用部分' : 'Unused portion refundable within 7 days of purchase'}
                  </span>
                </div>
              </div>
              
              <Button
                className="w-full mt-auto bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white transition-all duration-300"
                onClick={() => handlePlanSelect(plan)}
              >
                {language === 'zh' ? '选择此套餐' : 'Select This Plan'}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF7F2] flex flex-col">
      {/* Back Button - Top Left */}
      <div className="absolute top-6 left-6 z-10">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-1 text-[#6B5F53] hover:text-[#C2884E] transition-colors bg-white/80 backdrop-blur-sm rounded-full shadow-sm p-2 h-auto"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">{language === 'zh' ? '返回上一页' : 'Go back'}</span>
        </Button>
      </div>
      
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#FFF6EF] to-[#FBF7F2] pt-8 pb-24">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#C2884E]/10 to-transparent rounded-full blur-3xl"></div>
        
        <div className="container max-w-6xl mx-auto px-4">
          <motion.div 
            className="flex flex-col items-center gap-8"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Header content - Two column layout */}
            <motion.div className="w-full flex flex-col md:flex-row gap-8 md:gap-12" variants={fadeIn}>
              {/* Left column - Title and description */}
              <div className="md:w-1/2 text-center md:text-left">
                <div className="inline-flex items-center mb-4">
                  <div className="px-4 py-1 bg-[#C2884E]/5 rounded-full">
                    <span className="text-sm font-medium text-[#C2884E]">
                      {language === 'zh' ? '每日直送计划' : 'Daily Delivery Plan'}
                    </span>
                  </div>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold mb-6 text-[#6B5F53]">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                    {language === 'zh' ? '每日新鲜' : 'Daily Fresh'}
                  </span>
                  <span className="block mt-2">
                    {language === 'zh' ? '直送到家' : 'Delivered to Your Door'}
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-[#6B5F53]/80 mb-6 max-w-lg">
                  {language === 'zh' 
                    ? '适合注重新鲜度，追求每日现做品质的你' 
                    : 'Perfect for: Those who value freshness and daily prepared quality meals'}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 transition-all duration-300 shadow-md relative z-20"
                    >
                      {language === 'zh' ? '知道更多' : 'Learn More'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] w-[95vw] p-0 rounded-xl sm:rounded-[24px] overflow-hidden border-0 sm:border-[#C2884E]/10 max-h-[85vh] shadow-xl">
                    <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6 text-white h-[90px] flex flex-col justify-center">
                      <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                        {language === 'zh' ? '每日直送计划详情' : 'Daily Delivery Plan Details'}
                      </DialogTitle>
                      <DialogDescription className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base font-light">
                        {language === 'zh' ? '了解我们的每日新鲜配送服务' : 'Learn about our daily fresh delivery service'}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="p-6 overflow-y-auto max-h-[70vh] scrollbar-brand">
                      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6 bg-[#F5EDE4]/30 p-1 rounded-[20px]">
                          <TabsTrigger 
                            value="description" 
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C2884E] data-[state=active]:to-[#D1A46C] data-[state=active]:text-white font-medium rounded-[14px] py-3 transition-all duration-300"
                          >
                            {language === 'zh' ? '产品介绍' : 'Product Description'}
                          </TabsTrigger>
                          <TabsTrigger 
                            value="howItWorks" 
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C2884E] data-[state=active]:to-[#D1A46C] data-[state=active]:text-white font-medium rounded-[14px] py-3 transition-all duration-300"
                          >
                            {language === 'zh' ? '如何运作' : 'How It Works'}
                          </TabsTrigger>
                        </TabsList>
                        
                        <style jsx global>{`
                          .scrollbar-brand::-webkit-scrollbar {
                            width: 5px;
                            height: 5px;
                          }
                          .scrollbar-brand::-webkit-scrollbar-track {
                            background: #F5EDE4;
                          }
                          .scrollbar-brand::-webkit-scrollbar-thumb {
                            background: linear-gradient(to bottom, #C2884E, #D1A46C);
                            border-radius: 20px;
                          }
                        `}</style>
                        
                        <TabsContent value="description" className="mt-0 space-y-4">
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center mt-1 flex-shrink-0">
                                <Check className="w-5 h-5 text-[#C2884E]" />
                              </div>
                              <div>
                                <h3 className="text-lg font-medium text-[#6B5F53] mb-1">{language === 'zh' ? '每日新鲜现做' : 'Freshly Made Daily'}</h3>
                                <p className="text-[#6B5F53]/80">{language === 'zh' ? '直送上门，满分新鲜度。我们坚持每日现做，确保您收到的餐食保持最佳口感和营养价值。' : 'Delivered to your door, maximum freshness. We make meals fresh daily to ensure you receive the best taste and nutritional value.'}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center mt-1 flex-shrink-0">
                                <Check className="w-5 h-5 text-[#C2884E]" />
                              </div>
                              <div>
                                <h3 className="text-lg font-medium text-[#6B5F53] mb-1">{language === 'zh' ? '餐券制' : 'Credit-Based System'}</h3>
                                <p className="text-[#6B5F53]/80">{language === 'zh' ? '购买餐券后，可根据个人需求灵活下单，自由选择使用日期——不浪费，更灵活' : 'After purchasing credits, order flexibly based on your needs and freely choose when to use them—no waste, more flexibility'}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center mt-1 flex-shrink-0">
                                <Check className="w-5 h-5 text-[#C2884E]" />
                              </div>
                              <div>
                                <h3 className="text-lg font-medium text-[#6B5F53] mb-1">{language === 'zh' ? '午间时段送达' : 'Lunch Time Delivery'}</h3>
                                <p className="text-[#6B5F53]/80">{language === 'zh' ? '配送时间为 11AM-1PM。 开始配送后，您将收到包含预计送达时间的短信通知。' : 'Delivery time is 11AM-1PM. Once delivery starts, you will receive an SMS notification with the estimated arrival time.'}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#FFF6EF] rounded-xl p-6 mt-4">
                            <h3 className="text-lg font-medium text-[#C2884E] mb-4">{language === 'zh' ? '适合人群' : 'Perfect For'}</h3>
                            <ul className="space-y-3">
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                                <span className="text-[#6B5F53]">{language === 'zh' ? '注重健康饮食、关注餐食新鲜度的美食爱好者' : 'Food lovers who value healthy eating and meal freshness'}</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                                <span className="text-[#6B5F53]">{language === 'zh' ? '追求高品质食材、坚持每日新鲜制作的你' : 'Those who pursue high-quality ingredients and insist on daily fresh preparation'}</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                                <span className="text-[#6B5F53]">{language === 'zh' ? '学业或工作繁忙但不愿放弃健康饮食的人士' : 'Busy students or professionals who don\'t want to compromise on healthy eating'}</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                                <span className="text-[#6B5F53]">{language === 'zh' ? '寻求灵活订阅方案、可自由安排配送日程的你' : 'Anyone seeking flexible subscription plans with customizable delivery schedules'}</span>
                              </li>
                            </ul>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="howItWorks" className="mt-0 space-y-4">
                          <div className="space-y-8">
                            <h3 className="text-xl font-semibold text-[#6B5F53] mb-4">{language === 'zh' ? '如何运作' : 'How It Works'}</h3>
                            
                            {/* Step 1 */}
                            <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                  <Ticket className="w-5 h-5 text-[#C2884E]" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">1</span>
                                  {language === 'zh' ? '购买餐劵' : 'Purchase Credits'}
                                </h3>
                                <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                  {language === 'zh' ? '通过官网使用 电子转账（EMT）充值餐劵，餐劵会自动记录到您的账户中。' : 'Top up credits via our website using e-Transfer (EMT). Credits will be automatically added to your account.'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Step 2 */}
                            <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                  <CalendarDays className="w-5 h-5 text-[#C2884E]" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">2</span>
                                  {language === 'zh' ? '使用餐劵下单' : 'Order with Credits'}
                                </h3>
                                <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                  {language === 'zh' ? '每周菜单定期更新，进入您的个人账户，选择餐食，使用账户内餐劵下单即可，订1餐扣1张' : 'Weekly menu updates regularly. Log into your account, select meals, and use your credits to order. 1 meal = 1 credit.'}
                                </p>
                                <div className="mt-2 flex items-center">
                                  <Clock className="h-4 w-4 text-[#C2884E] mr-1.5" />
                                  <span className="text-xs font-medium text-[#C2884E]">{language === 'zh' ? '下单截止时间：配送日前一天上午 11:59。' : 'Order deadline: 11:59 AM the day before delivery.'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Step 3 */}
                            <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                  <Utensils className="w-5 h-5 text-[#C2884E]" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">3</span>
                                  {language === 'zh' ? '每日新鲜中央厨房新鲜现做，中午配送～' : 'Fresh Daily Preparation & Lunch Delivery'}
                                </h3>
                                <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                  {language === 'zh' ? '上午 11 点至下午 1 点 之间准时送达，确保新鲜与美味。' : 'Delivered between 11 AM and 1 PM, ensuring freshness and deliciousness.'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#FFF6EF] rounded-xl p-6 mt-8">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center">
                                <Info className="w-5 h-5 text-[#C2884E]" />
                              </div>
                              <h3 className="text-lg font-medium text-[#C2884E]">{language === 'zh' ? '配送要求' : 'Delivery Requirements'}</h3>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                              <div className="flex items-center">
                                <span className="text-[#6B5F53] font-medium">{language === 'zh' ? '每次配送至少2份餐食' : 'Minimum 2 meals per delivery'}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1.5 rounded-full">
                                        <Info className="w-4 h-4 text-[#C2884E]" />
                                        <span className="sr-only">{language === 'zh' ? '更多信息' : 'More info'}</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-white border border-[#C2884E]/20 p-3 shadow-lg">
                                      <div className="text-sm text-[#6B5F53] leading-relaxed">
                                        {language === 'zh' ? '每次配送至少2份餐食，午餐+晚餐一站解决；' : 'Minimum 2 meals per delivery - perfect for lunch + dinner;'}<br/>
                                        {language === 'zh' ? '只需要一餐怎么办？餐食可冷藏保鲜 48 小时，第二天享用也10分新鲜' : 'Need only one meal? Meals stay fresh refrigerated for 48 hours, still perfectly fresh the next day'}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            <p className="text-sm text-[#6B5F53]/80 mt-2">{language === 'zh' ? '我们提供多样化的菜单选择，满足您对不同口味的需求。每周更新菜单，让您的味蕾永远充满惊喜。' : 'We offer diverse menu options to satisfy your different taste preferences. Weekly menu updates keep your taste buds delighted with new surprises.'}</p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/5 transition-all duration-300 flex items-center gap-2 relative z-20"
                    >
                      <Menu className="h-4 w-4" />
                      {language === 'zh' ? '查看本周菜单' : 'View This Week\'s Menu'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[1100px] w-[95vw] p-0 rounded-xl sm:rounded-[24px] overflow-hidden border-0 sm:border-[#C2884E]/10 h-[85vh] shadow-xl">
                    <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6 text-white">
                      <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                        {language === 'zh' ? '本周菜单' : 'This Week\'s Menu'}
                      </DialogTitle>
                      <DialogDescription className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base font-light">
                        {language === 'zh' ? '浏览我们本周的精选菜品' : 'Browse our selected dishes for this week'}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {isMenuLoading ? (
                      <div className="flex justify-center items-center h-[300px]">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2884E] mx-auto mb-4"></div>
                          <p>{language === 'zh' ? '加载中...' : 'Loading...'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row h-full overflow-y-auto scrollbar-thin">
                        <style jsx global>{`
                          .scrollbar-thin::-webkit-scrollbar {
                            width: 4px;
                            height: 4px;
                          }
                          .scrollbar-thin::-webkit-scrollbar-track {
                            background: transparent;
                          }
                          .scrollbar-thin::-webkit-scrollbar-thumb {
                            background: #C2884E40;
                            border-radius: 20px;
                          }
                          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                            background: #C2884E80;
                          }
                        `}</style>
                        {/* Sidebar Day Navigation - Horizontal scrolling tabs on mobile */}
                        <div className="md:w-1/6 md:min-w-[80px] md:border-r md:border-[#C2884E]/20 p-2 md:p-4">
                          {/* Mobile Week Selector - Elegant Pills */}
                          <div className="block md:hidden mb-3">
                            <div className="flex justify-center">
                              <div className="inline-flex p-0.5 bg-[#F5EDE4]/70 rounded-full">
                                <button
                                  onClick={() => setActiveWeek(1)}
                                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300
                                    ${activeWeek === 1 
                                      ? "bg-white text-[#C2884E] shadow-sm" 
                                      : "bg-transparent text-[#6B5F53]/70"}`}
                                >
                                  {language === 'zh' ? '本周' : 'This Week'}
                                </button>
                                {/* Commenting out Next Week button
                                <button
                                  onClick={() => setActiveWeek(2)}
                                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300
                                    ${activeWeek === 2 
                                      ? "bg-white text-[#C2884E] shadow-sm" 
                                      : "bg-transparent text-[#6B5F53]/70"}`}
                                >
                                  {language === 'zh' ? '下周' : 'Next Week'}
                                </button>
                                */}
                              </div>
                            </div>
                          </div>
                          
                          {/* Mobile Day Selector - Elegant Cards */}
                          <div className="block md:hidden mb-4">
                            <div className="overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                              <div className="flex space-x-2 min-w-max px-1">
                                {Object.keys(weeklyMenu)
                                  .filter(dayId => weeklyMenu[dayId].week === activeWeek)
                                  .sort((a, b) => {
                                    const dayOrder: Record<string, number> = { 
                                      'monday': 1, 'tuesday': 2, 'wednesday': 3, 
                                      'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7 
                                    };
                                    const dayA = weeklyMenu[a].displayName.toLowerCase();
                                    const dayB = weeklyMenu[b].displayName.toLowerCase();
                                    return (dayOrder[dayA] || 0) - (dayOrder[dayB] || 0);
                                  })
                                  .map(dayId => (
                                    <button
                                      key={dayId}
                                      onClick={() => setSelectedMenuDay(dayId)}
                                      className={`flex-shrink-0 transition-all duration-300 border
                                        ${selectedMenuDay === dayId 
                                          ? "bg-white border-[#C2884E] text-[#C2884E] shadow-sm" 
                                          : "bg-[#F5EDE4]/30 border-transparent text-[#6B5F53]/80"}
                                        px-3 py-1.5 rounded-xl`}
                                    >
                                      <div className="text-center">
                                        <p className="font-medium capitalize text-xs">{weeklyMenu[dayId].displayName.substring(0, 3)}</p>
                                        <p className="text-[10px] opacity-80 mt-0.5">{weeklyMenu[dayId].date}</p>
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            </div>
                            
                          </div>
                          
                          {/* Desktop Sidebar Navigation - Hidden on mobile */}
                          <div className="hidden md:block sticky top-0 space-y-1 max-h-[80vh] overflow-y-auto pr-1">
                            {/* Week 1 Heading */}
                            <div className="px-3 py-2 mb-2">
                              <h3 className="text-sm font-bold text-[#6B5F53] flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" />
                                {language === 'zh' ? '本周' : 'This Week'}
                              </h3>
                            </div>
                            
                            {/* Week 1 Days */}
                            {Object.keys(weeklyMenu)
                              .filter(dayId => weeklyMenu[dayId].week === 1)
                              .sort((a, b) => {
                                const dayOrder: Record<string, number> = { 
                                  'monday': 1, 'tuesday': 2, 'wednesday': 3, 
                                  'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7 
                                };
                                const dayA = weeklyMenu[a].displayName.toLowerCase();
                                const dayB = weeklyMenu[b].displayName.toLowerCase();
                                return (dayOrder[dayA] || 0) - (dayOrder[dayB] || 0);
                              })
                              .map(dayId => (
                                <button
                                  key={dayId}
                                  onClick={() => {
                                    setActiveWeek(1);
                                    setSelectedMenuDay(dayId);
                                  }}
                                  className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center gap-2
                                    ${selectedMenuDay === dayId ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md" : "hover:bg-[#F5EDE4] text-[#6B5F53]"}`}
                                >
                                  <div className="w-full">
                                    <p className="font-medium capitalize text-sm">{weeklyMenu[dayId].displayName.substring(0, 3)}</p>
                                    <p className="text-xs opacity-80">{weeklyMenu[dayId].date}</p>
                                  </div>
                                </button>
                              ))}
                              
                            {/* Next Week Section */}
                            <div className="mt-4 mb-2 px-3">
                              <div className="relative flex items-center">
                                <div className="h-px bg-[#C2884E]/50 flex-grow"></div>
                                <span className="px-2 text-xs font-medium text-[#C2884E] whitespace-nowrap">
                                  {language === 'zh' ? '下周' : 'Next Week'}
                                </span>
                                <div className="h-px bg-[#C2884E]/50 flex-grow"></div>
                              </div>
                            </div>
                            
                            {/* Show message if no Next Week menu available */}
                            {Object.keys(weeklyMenu).filter(dayId => weeklyMenu[dayId].week === 2).length === 0 && (
                              <div className="px-3 py-2 text-center text-xs text-[#6B5F53]/70">
                                {language === 'zh' ? '暂无下周菜单' : 'No Next Week menu available yet'}
                              </div>
                            )}
                            
                            {/* Next Week Days */}
                            {Object.keys(weeklyMenu)
                              .filter(dayId => weeklyMenu[dayId].week === 2)
                              .sort((a, b) => {
                                const dayOrder: Record<string, number> = { 
                                  'monday': 1, 'tuesday': 2, 'wednesday': 3, 
                                  'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7 
                                };
                                const dayA = weeklyMenu[a].displayName.toLowerCase();
                                const dayB = weeklyMenu[b].displayName.toLowerCase();
                                return (dayOrder[dayA] || 0) - (dayOrder[dayB] || 0);
                              })
                              .map(dayId => (
                                <button
                                  key={dayId}
                                  onClick={() => {
                                    setActiveWeek(2);
                                    setSelectedMenuDay(dayId);
                                  }}
                                  className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center gap-2
                                    ${selectedMenuDay === dayId ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md" : "hover:bg-[#F5EDE4] text-[#6B5F53]"}`}
                                >
                                  <div className="w-full">
                                    <p className="font-medium capitalize text-sm">{weeklyMenu[dayId].displayName.substring(0, 3)}</p>
                                    <p className="text-xs opacity-80">{weeklyMenu[dayId].date}</p>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </div>
                        
                        {/* Content Area */}
                        <div className="w-full md:w-5/6 p-3 md:p-6 overflow-y-auto">
                          {/* Week Content */}
                          <div className="min-h-[300px] md:min-h-[400px] overflow-y-auto">
                            {selectedMenuDay && weeklyMenu[selectedMenuDay] ? (
                              <div>
                                {/* Day Header - Elegant Design */}
                                <div className="mb-5 md:mb-6">
                                  <h3 className="text-center text-lg md:text-2xl font-medium capitalize text-[#6B5F53] tracking-tight">
                                    {weeklyMenu[selectedMenuDay].displayName}
                                  </h3>
                                  <p className="text-center text-xs md:text-sm text-[#C2884E] font-medium mt-1">
                                    {weeklyMenu[selectedMenuDay].date}
                                  </p>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                                  {weeklyMenu[selectedMenuDay].combos.map((combo) => (
                                  <div key={combo.id}>
                                    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#F5EDE4] bg-white/90 shadow-sm backdrop-blur-xl transition-all duration-300 ease-out">
                                      {combo.imageUrl ? (
                                        <div className="aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#F5EDE4]">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={combo.imageUrl}
                                            alt={`${translateComboName(combo.name)} combo`}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                                            onError={(event) => {
                                              event.currentTarget.parentElement?.classList.add("hidden")
                                            }}
                                          />
                                        </div>
                                      ) : null}

                                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                                      <div className="mb-4">
                                        <h3 className="text-base sm:text-lg font-medium text-[#6B5F53] tracking-tight">
                                          {translateComboName(combo.name)}
                                        </h3>
                                      </div>

                                      <div className="mb-4">
                                        <DailyComboMetadata
                                          combo={combo}
                                          language={language === "zh" ? "zh" : "en"}
                                        />
                                      </div>
                                    
                                      {/* Dish lists shared with dashboard `DailyComboGrid` */}
                                      <div className="space-y-4">
                                        <div className="mb-4">
                                          <div className="mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="rounded bg-[#C2884E]/10 px-2 py-0.5 text-sm font-semibold tracking-wider text-[#C2884E]">
                                                {language === "zh" ? "每餐2菜" : "2-Dish Meal"}
                                              </span>
                                            </div>
                                          </div>
                                          <DailyComboTwoDishDishList
                                            combo={combo}
                                            language={language === "zh" ? "zh" : "en"}
                                            translateDishName={translateDishName}
                                          />
                                        </div>

                                        <DailyComboMealOptionDivider />

                                        <div>
                                          <div className="mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="rounded bg-[#C2884E]/10 px-2 py-0.5 text-sm font-semibold tracking-wider text-[#C2884E]">
                                                {language === "zh" ? "每餐3菜" : "3-Dish Meal"}
                                              </span>
                                            </div>
                                          </div>
                                          <DailyComboThreeDishExtraDishes
                                            combo={combo}
                                            language={language === "zh" ? "zh" : "en"}
                                            translateDishName={translateDishName}
                                          />
                                        </div>
                                      </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center items-center h-[300px]">
                                <div className="text-center">
                                  <p className="text-[#6B5F53]">{language === 'zh' ? '请选择一天查看菜单' : 'Please select a day to view the menu'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Note at the bottom */}
                          <div className="mt-4 md:mt-6 p-3 md:p-4 bg-[#FFF6EF] rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                              <Info className="h-5 w-5 text-[#C2884E]" />
                              <h3 className="font-medium text-[#C2884E]">
                                {language === 'zh' ? '菜单说明' : 'Menu Information'}
                              </h3>
                            </div>
                            <p className="text-sm text-[#6B5F53]">
                              {language === 'zh' 
                                ? '菜单每周更新，以上为本周菜单。购买餐券后，您可以灵活选择每日直送的菜品和日期。' 
                                : 'Menu is updated weekly. After purchasing vouchers, you can flexibly choose dishes and delivery dates.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                </div>
              </div>
              
              {/* Right column - Feature tags */}
              <div className="md:w-1/2 flex flex-col justify-center">
                <div className="space-y-4 md:space-y-6">
                  {features.map((feature, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.15 }}
                      className="group flex items-center gap-4 p-1"
                    >
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center shadow-sm border border-[#C2884E]/10 group-hover:border-[#C2884E]/30 transition-all duration-300">
                        <div className="transform group-hover:scale-110 transition-transform duration-300">
                          {feature.icon}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors duration-300">{feature.title}</p>
                        <p className="text-sm text-[#6B5F53]/80">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
            
            {showMenuPreviewSection ? (
              <motion.div className="min-w-0 w-full max-w-full self-stretch" variants={fadeIn}>
                <div className="min-w-0 max-w-full rounded-2xl border border-[#C2884E]/10 bg-white/85 p-4 shadow-xl backdrop-blur-sm md:p-6">
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#C2884E]/10 px-3 py-1 text-xs font-medium text-[#C2884E]">
                        <Sparkles
                          className="h-3.5 w-3.5 shrink-0 fill-[#C2884E]/30 text-[#C2884E]"
                          aria-hidden
                        />
                        {language === "zh" ? "每周更新" : "Updated Weekly"}
                      </div>
                      <h2 className="text-2xl font-bold text-[#6B5F53] md:text-3xl">
                        {language === "zh" ? "本周菜单预览" : "This Week's Menu Preview"}
                      </h2>
                      <p className="mt-2 text-sm text-[#6B5F53]/75">
                        {language === "zh"
                          ? "每周更新，每天两款套餐可选。来看看您这周会吃到什么吧！"
                          : "Fresh menu weekly with two combos to choose from each day. See what's on deck for your week!"}
                      </p>
                    </div>
                    {weeklyMenuPreviewItems.length > 0 ? (
                      <Button
                        variant="outline"
                        className="hidden shrink-0 border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/5 md:inline-flex"
                        onClick={() => openMenuForDay(weeklyMenuPreviewItems[0].dayId)}
                      >
                        {language === "zh" ? "查看完整菜单" : "View Full Menu"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>

                  {isMenuLoading && weeklyMenuPreviewItems.length === 0 ? (
                    <MenuPreviewCarouselSkeleton
                      variant="daily"
                      rowClassName={menuPreviewCarouselRowInsetClassName}
                    />
                  ) : (
                    <MenuPreviewCarouselViewport rowClassName={menuPreviewCarouselRowInsetClassName}>
                      {weeklyMenuPreviewItems.slice(0, 8).map((item) => (
                        <MenuPreviewCardButton
                          key={`${item.dayId}-${item.combo.id}`}
                          language={previewLanguage}
                          imageUrl={item.combo.imageUrl!}
                          imageAlt={`${translateComboName(item.combo.name)} combo`}
                          badge={`${getPreviewDayLabel(item.displayName)} · ${item.date}`}
                          subtitle={item.combo.typeB.dishes
                            .map((dish, index) =>
                              getDailyComboDishName(item.combo, "typeB", index, dish, previewLanguage, translateDishName)
                            )
                            .join(" · ")}
                          subtitleClassName="leading-relaxed"
                          metaRight={`${item.combo.calories} KCAL`}
                          description={getDailyComboDescription(item.combo, previewLanguage)}
                          proteinGrams={item.combo.proteinGrams}
                          tags={getDailyComboTags(item.combo, previewLanguage)}
                          allergens={getDailyComboAllergens(item.combo, previewLanguage)}
                          onClick={() => openMenuForDay(item.dayId)}
                        />
                      ))}
                    </MenuPreviewCarouselViewport>
                  )}

                  {weeklyMenuPreviewItems.length > 0 ? (
                    <div className="mt-5 md:hidden">
                      <Button
                        variant="outline"
                        className="w-full border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/5"
                        onClick={() => openMenuForDay(weeklyMenuPreviewItems[0].dayId)}
                      >
                        {language === "zh" ? "查看完整菜单" : "View Full Menu"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ) : null}

            {/* Pricing Section */}
            <motion.div 
              className="w-full mt-4"
              variants={fadeIn}
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl border border-[#C2884E]/10">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center text-[#6B5F53]">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                    {language === 'zh' ? '餐券套餐' : 'Meal Voucher Plans'}
                  </span>
                </h2>
                
                <Tabs defaultValue={pricingTab} onValueChange={(v) => setPricingTab(v as 'twoDish' | 'threeDish')} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6 bg-[#F5EDE4]/30 p-1 rounded-xl">
                    <TabsTrigger 
                      value="twoDish" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C2884E] data-[state=active]:to-[#D1A46C] data-[state=active]:text-white font-medium rounded-lg py-3 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        {language === 'zh' ? '每餐2菜' : '2-Dish Meal'}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="threeDish" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C2884E] data-[state=active]:to-[#D1A46C] data-[state=active]:text-white font-medium rounded-lg py-3 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        {language === 'zh' ? '每餐3菜' : '3-Dish Meal'}
                      </div>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="twoDish" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {renderPlanCards(twoDishPlans)}
                      
                      {/* Payment method and tax information - commented out
                      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <h4 className="font-medium text-amber-800 mb-2">
                          {language === 'zh' ? '付款方式与税费说明' : 'Payment Method & Tax Information'}
                        </h4>
                        <ul className="space-y-2 text-sm text-amber-700">
                          <li className="flex items-start gap-2">
                            <div className="min-w-[20px] mt-0.5">•</div>
                            <div>
                              {language === 'zh' ? '微信支付：无需支付额外税费，可享受10%折扣～' : 'WeChat Pay: No additional tax required, enjoy 10% discount~'}
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="min-w-[20px] mt-0.5">•</div>
                            <div>
                              {language === 'zh' ? 'Interac e-Transfer：需额外支付13%税费' : 'Interac e-Transfer: Additional 13% tax required'}
                            </div>
                          </li>
                        </ul>
                      </div>
                      */}
                    </motion.div>
                  </TabsContent>
                  
                  <TabsContent value="threeDish" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {renderPlanCards(threeDishPlans)}
                      
                      {/* Payment method and tax information - commented out
                      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <h4 className="font-medium text-amber-800 mb-2">
                          {language === 'zh' ? '付款方式与税费说明' : 'Payment Method & Tax Information'}
                        </h4>
                        <ul className="space-y-2 text-sm text-amber-700">
                          <li className="flex items-start gap-2">
                            <div className="min-w-[20px] mt-0.5">•</div>
                            <div>
                              {language === 'zh' ? '微信支付：无需支付额外税费，可享受10%折扣～' : 'WeChat Pay: No additional tax required, enjoy 10% discount~'}
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="min-w-[20px] mt-0.5">•</div>
                            <div>
                              {language === 'zh' ? 'Interac e-Transfer：需额外支付13%税费' : 'Interac e-Transfer: Additional 13% tax required'}
                            </div>
                          </li>
                        </ul>
                      </div>
                      */}
                    </motion.div>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      
      {/* No tabs in main content anymore, just pricing section */}
    </div>
  )
}
