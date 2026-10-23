"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  ArrowRight, 
  Info, 
  Utensils,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Menu,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductDetailsDialog } from '@/components/product-details-dialog'
import { ProductJourney } from '@/components/product-journey'
import { ProductMenuGallery } from '@/components/product-menu-gallery'
import { VoucherBenefits } from '@/components/voucher-benefits'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/lib/language-context'
import { PRODUCT_LINE_LABELS } from '@/lib/product-lines/names'
import { useSmartBack } from '@/hooks/use-smart-back'
import {
  applyDailyMenuPreviewCuration,
  formatDailyCombo,
  getDailyComboAllergens,
  getDailyComboDescription,
  getDailyComboDishName,
  getDailyComboTags,
  type DayData,
} from '@/lib/daily-delivery'
import { getDailyDeliveryState, getStarterAddressSelection, setDailyDeliveryState } from '@/lib/plan-flow-state'
import { listDailyPlans } from '@/lib/plans/service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DailyComboMetadata,
  DailyComboMealOptionDivider,
  DailyComboThreeDishExtraDishes,
  DailyComboTwoDishDishList,
} from "@/features/daily-ordering/daily-combo-meal-lists"
import '../starter/order-flow.css'

// Define types for voucher plans
interface VoucherPlan {
  id: string;
  type: 'twoDish' | 'threeDish';
  quantity: number;
  price: number;
  isPopular?: boolean;
  pricePerMeal: number;
  savings?: string;
}

export default function DailyDeliveryPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const handleBack = useSmartBack()
  const [pricingTab, setPricingTab] = useState<'twoDish' | 'threeDish'>('twoDish')
  const [restoredPricing, setRestoredPricing] = useState(false)
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
  
  useEffect(() => {
    const saved = getDailyDeliveryState()
    if (saved) setPricingTab(saved.pricingTab)
    setRestoredPricing(true)
  }, [])

  // Persist pricing tab so returning from signup shows same options
  useEffect(() => {
    if (!restoredPricing) return
    setDailyDeliveryState({ pricingTab })
  }, [pricingTab, restoredPricing])

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
    return {
      id: plan.id,
      type: plan.dishType,
      quantity: plan.credits,
      price: plan.basePrice,
      pricePerMeal: plan.pricePerMeal,
      isPopular: Boolean(plan.tags),
      savings: language === 'zh' ? plan.tags?.zh : plan.tags?.en,
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
    if (!getStarterAddressSelection()?.canDaily) {
      router.push('/starter')
      return
    }
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

  const dayOrder: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  }

  const carouselRowsWithImage = Object.entries(weeklyMenu)
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

  const weeklyMenuPreviewItems = applyDailyMenuPreviewCuration(carouselRowsWithImage)

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
      <div className="ko-voucher-grid">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.25 }}
            className="ko-voucher-card"
          >
            <div className="ko-voucher-topline">
              <span>{language === 'zh' ? '每日便当' : 'DAILY BENTO'}</span>
              {plan.savings && <span className="ko-voucher-badge">{language === 'zh' ? (plan.quantity === 10 ? '首次推荐' : '最超值') : (plan.quantity === 10 ? 'Great first pack' : 'Best value')}</span>}
            </div>
            <h3 className="ko-voucher-count">
              <strong>{plan.quantity}</strong> {language === 'zh' ? '张餐券' : 'meal vouchers'}
            </h3>
            <div className="ko-voucher-price">
              <strong>${plan.price}</strong>
              <span>{language === 'zh' ? '总价' : 'total'}</span>
            </div>
            <div className="ko-voucher-unit">
              <span>{language === 'zh' ? '每餐' : 'Per meal'}</span>
              <strong>${plan.pricePerMeal.toFixed(2)}</strong>
            </div>
            <Button className="ko-voucher-button" onClick={() => handlePlanSelect(plan)}>
              {language === 'zh' ? `选择 ${plan.quantity} 张餐券` : `Choose ${plan.quantity} vouchers`}
              <ArrowRight aria-hidden="true" size={17} />
            </Button>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="ko-order ko-product ko-daily min-h-screen flex flex-col">
      <header className="ko-header"><Link href="/" className="ko-logo" aria-label="Kapioo home">kapioo<span>.</span></Link><div className="ko-header-actions"><Link href="/starter" className="ko-change-address"><MapPin size={16} />{language === 'zh' ? '更改配送地址' : 'Change address'}</Link><button type="button" className="ko-language" onClick={handleBack} aria-label={language === 'zh' ? '返回上一页' : 'Go back'}><ChevronLeft size={19} /></button></div></header>
      
      {/* Hero Section */}
      <section className="ko-product-section relative w-full overflow-hidden pt-8 pb-24">
        
        <div className="container max-w-6xl mx-auto px-4">
          <motion.div 
            className="flex flex-col items-center gap-8"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Header content - Two column layout */}
            <motion.div className="ko-product-hero w-full flex flex-col md:flex-row gap-8 md:gap-12" variants={fadeIn}>
              {/* Left column - Title and description */}
              <div className="ko-product-copy md:w-1/2 text-center md:text-left">
                <p className="ko-eyebrow">{language === 'zh' ? '每日便当' : 'Daily Bento / Toronto meal delivery'}</p>
                
                <h1>{language === 'zh' ? <>午餐，<em>值得期待。</em></> : <>Lunch worth <em>looking forward to.</em></>}</h1>
                
                <p className="ko-product-lead">{language === 'zh' ? '新鲜现做的亚洲融合便当，午间送达。每次配送至少 2 份。' : 'Freshly cooked Asian fusion bentos, delivered for lunch. Minimum 2 meals per delivery.'}</p>
                <p className="ko-product-sidenote">{language === 'zh' ? '先买餐券，想吃的时候再兑换。' : 'Buy vouchers first. Redeem when you’re ready.'}</p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                <ProductDetailsDialog kind="daily" language={language} />

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
                  <DialogContent className="ko-dialog sm:max-w-[1100px] w-[95vw] p-0 rounded-xl sm:rounded-[24px] overflow-hidden border-0 sm:border-[#C2884E]/10 h-[85vh] shadow-xl">
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
                      <div className="ko-menu-scroll flex flex-col md:flex-row h-full overflow-y-auto">
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
                          <div className="ko-menu-scroll hidden md:block sticky top-0 space-y-1 max-h-[80vh] overflow-y-auto pr-1">
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
                        <div className="ko-menu-scroll w-full md:w-5/6 p-3 md:p-6 overflow-y-auto">
                          {/* Week Content */}
                          <div className="ko-menu-scroll min-h-[300px] md:min-h-[400px] overflow-y-auto">
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

                                <p className="mb-5 text-center text-[9px] leading-snug text-[#6B5F53]/70 md:mb-6">
                                  {language === "zh" ? "* 图片仅供参考" : "* Images shown are for reference only"}
                                </p>

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
                                ? `菜单每周更新，以上为本周菜单。购买餐券后，您可以灵活选择${PRODUCT_LINE_LABELS.daily.zh}的菜品和日期。` 
                                : `Menu is updated weekly. After purchasing vouchers, you can flexibly choose dishes and delivery dates for ${PRODUCT_LINE_LABELS.daily.en}.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                </div>
                <a href="#daily-plans" className="ko-product-primary">{language === 'zh' ? '查看餐券套餐' : 'Explore voucher plans'}<ArrowRight size={18} /></a>
              </div>
              
              <figure className="ko-product-visual md:w-1/2"><Image src="/marketing/plan-daily-1280.webp" alt="Kapioo Daily Bento with freshly cooked dishes and branded packaging" fill priority sizes="(max-width: 760px) 100vw, 44vw" /><figcaption>{language === 'zh' ? '新鲜现做，认真装盒。' : 'Freshly cooked. Thoughtfully packed.'}</figcaption></figure>
            </motion.div>
            <ProductJourney kind="daily" />
            
              <motion.div className="w-full" variants={fadeIn}>
                <ProductMenuGallery
                  kind="daily"
                  language={language === 'zh' ? 'zh' : 'en'}
                  loading={isMenuLoading}
                  items={weeklyMenuPreviewItems.map(({ dayId, date, displayName, combo }) => ({
                    id: `${dayId}-${combo.id}`,
                    groupId: dayId,
                    imageUrl: combo.imageUrl!,
                    title: combo.typeA.dishes[0]
                      ? getDailyComboDishName(combo, 'typeA', 0, combo.typeA.dishes[0], language === 'zh' ? 'zh' : 'en', translateDishName)
                      : translateComboName(combo.name),
                    eyebrow: `${displayName}${date ? ` · ${date}` : ''}`,
                    onSelect: () => openMenuForDay(dayId),
                  }))}
                  onViewMenu={() => weeklyMenuPreviewItems[0] ? openMenuForDay(weeklyMenuPreviewItems[0].dayId) : setMenuDialogOpen(true)}
                />
              </motion.div>

            {/* Pricing Section */}
            <motion.div 
              id="daily-plans"
              tabIndex={-1}
              className="ko-pricing w-full mt-4"
              variants={fadeIn}
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl border border-[#C2884E]/10">
                <div className="ko-pricing-header">
                  <div className="ko-pricing-heading">
                    <p className="ko-pricing-eyebrow">{language === 'zh' ? '灵活用餐' : 'FLEXIBLE BY DESIGN'}</p>
                    <h2><span>{language === 'zh' ? '餐券套餐' : 'Meal Voucher Plans'}</span></h2>
                    <p className="ko-pricing-intro">{language === 'zh' ? '先购买餐券，想吃的日子再兑换。只为需要的餐食付费。' : 'Buy vouchers now. Redeem for the lunch days you want, at your own pace.'}</p>
                  </div>
                  <VoucherBenefits language={language} />
                </div>
                
                <Tabs value={pricingTab} onValueChange={(v) => setPricingTab(v as 'twoDish' | 'threeDish')} className="w-full">
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
