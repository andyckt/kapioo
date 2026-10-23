"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  ArrowRight,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Menu,
  Loader2,
  MapPin,
  Plus,
  Minus,
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useSmartBack } from "@/hooks/use-smart-back"
import { getWeeklyMealState, getStarterAddressSelection, setWeeklyMealState } from "@/lib/plan-flow-state"
import { getUserWeeklySubscription } from "@/lib/weekly-subscription"
import { listWeeklyPlans } from "@/lib/plans/service"

import { Button } from "@/components/ui/button"
import { ProductDetailsDialog } from "@/components/product-details-dialog"
import { ProductJourney } from "@/components/product-journey"
import { ProductMenuGallery } from "@/components/product-menu-gallery"
import { VoucherBenefits } from "@/components/voucher-benefits"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MealProteinAllergenRow } from "@/components/landing/meal-protein-allergen-row"
import '../starter/order-flow.css'

// Define plan types
interface PlanOption {
  id: string;
  duration: 1 | 2 | 4 | 8;
  durationLabel: string;
  durationLabelZh: string;
  mealsPerWeek: 6 | 8 | 10 | 12 | 16;
  totalPrice: number;
  pricePerMeal: number;
  isPopular?: boolean;
  isRecommended?: boolean;
  tag?: string;
  tagZh?: string;
}

export default function WeeklyMealPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const handleBack = useSmartBack()
  const [selectedMealsPerWeek, setSelectedMealsPerWeek] = useState<6 | 8 | 10 | 12 | 16>(6)
  const [purchaseStep, setPurchaseStep] = useState<'mealSelect' | 'planSelect'>('mealSelect')
  const [restoredSelection, setRestoredSelection] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [menuDialogOpen, setMenuDialogOpen] = useState(false)
  /** Initial true → preview section mounts with skeleton until subscription menu fetch completes. */
  const [isMenuLoading, setIsMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState<string | null>(null)
  interface MenuOption {
    id: string;
    name: string;
    nameEn?: string;
    tags?: string[];
    tagsEn?: string[];
    calories?: number;
    proteinGrams?: number;
    allergens?: string[];
    allergensEn?: string[];
    description?: string;
    descriptionEn?: string;
    imageUrl?: string;
    /** When true from admin, included in homepage menu preview carousel (still needs photo). */
    featuredInMenuPreview?: boolean;
  }
  
  interface MenuDay {
    id: string;
    name: string;
    date: string;
    weekOffset: number;
    week?: number;
    uniqueId?: string;
    options: MenuOption[];
  }
  
  const [weeklyMenu, setWeeklyMenu] = useState<MenuDay[]>([])
  const [activeWeek, setActiveWeek] = useState(1)
  const [selectedMenuDay, setSelectedMenuDay] = useState<string | null>(null)
  
  useEffect(() => {
    const saved = getWeeklyMealState()
    if (saved) {
      setSelectedMealsPerWeek(saved.selectedMealsPerWeek)
      setPurchaseStep(saved.purchaseStep)
    }
    setRestoredSelection(true)
  }, [])

  // Persist selection so returning from signup shows same options
  useEffect(() => {
    if (!restoredSelection) return
    setWeeklyMealState({ selectedMealsPerWeek, purchaseStep })
  }, [selectedMealsPerWeek, purchaseStep, restoredSelection])

  // Check if user is authenticated on component mount
  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated')
    const userData = localStorage.getItem('user')
    setIsAuthenticated(authStatus === 'true' && !!userData)
  }, [])
  
  // Helper function to translate menu option names
  const translateOptionName = (option: MenuOption): string => {
    if (language === 'zh') {
      return option.name
    }
    return option.nameEn || option.name
  }

  const getOptionDescription = (option: MenuOption) =>
    language === "zh" ? option.description : option.descriptionEn || option.description

  const getOptionTags = (option: MenuOption) =>
    language === "zh" ? option.tags : option.tagsEn?.length ? option.tagsEn : option.tags

  const getOptionAllergens = (option: MenuOption) =>
    language === "zh"
      ? option.allergens ?? option.allergensEn ?? []
      : option.allergensEn ?? option.allergens ?? []
  
  // Fetch the weekly menu eagerly on mount (and re-format on language change).
  // The carousel preview below the hero needs this data even before the dialog
  // is opened, so we cannot scope the fetch to the dialog-open state.
  // Single fetcher → no duplicate network requests when the dialog opens.
  useEffect(() => {
    const controller = new AbortController()

    const fetchWeeklyMenu = async () => {
      setIsMenuLoading(true);
      setMenuError(null);
      try {
        const data = await getUserWeeklySubscription({ signal: controller.signal });

        if (controller.signal.aborted) return;

        if (data && data.length > 0) {
          // Format day names based on language and create unique IDs.
          // imageUrl is preserved through the spread so the carousel can use it.
          const formattedData = data.map(day => ({
            ...day,
            uniqueId: `${day.id}-week-${day.weekOffset}`,
            name: language === 'zh'
              ? (day.id === 'sunday' ? '周日' : '周二')
              : (day.id === 'sunday' ? 'Sunday' : 'Tuesday')
          }));

          setWeeklyMenu(formattedData);
        } else {
          // Empty menu: keep the carousel hidden; surface the error inside the
          // dialog only (handled by menuError state below) so the landing page
          // looks normal when no menu is configured yet.
          console.warn('No menu data returned from API, all days may be inactive');
          setWeeklyMenu([]);
          setMenuError(language === 'zh'
            ? '当前没有可用的菜单，请稍后再试或联系客服'
            : 'No menu is currently available. Please try again later or contact customer service.');
          setSelectedMenuDay(null);
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        console.error('Error fetching weekly menu:', error);
        setMenuError(language === 'zh'
          ? '加载菜单时出错，请稍后再试'
          : 'Error loading menu, please try again later');
        setWeeklyMenu([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsMenuLoading(false);
        }
      }
    };

    fetchWeeklyMenu();

    return () => controller.abort();
  }, [language])

  // When the dialog opens (or activeWeek changes), pick a sensible default day
  // from the already-loaded data. Pure UI selection, no network calls.
  useEffect(() => {
    if (!menuDialogOpen || weeklyMenu.length === 0) return;

    const firstDayOfActiveWeek = weeklyMenu.find(day => day.weekOffset === activeWeek - 1);
    if (firstDayOfActiveWeek) {
      setSelectedMenuDay(firstDayOfActiveWeek.uniqueId || firstDayOfActiveWeek.id);
    }
  }, [menuDialogOpen, activeWeek, weeklyMenu])

  const durationLabels: Record<number, { en: string; zh: string }> = {
    1: { en: '1 week', zh: '1 周' },
    2: { en: '2 weeks', zh: '2 周' },
    4: { en: '4 weeks', zh: '4 周' },
    8: { en: '8 weeks', zh: '8 周' }
  }

  const planOptions: PlanOption[] = listWeeklyPlans().map((plan) => ({
    id: plan.id,
    duration: plan.weeks as 1 | 2 | 4 | 8,
    durationLabel: durationLabels[plan.weeks]?.en || `${plan.weeks} weeks`,
    durationLabelZh: durationLabels[plan.weeks]?.zh || `${plan.weeks} 周`,
    mealsPerWeek: plan.mealsPerWeek as 6 | 8 | 10 | 12 | 16,
    totalPrice: plan.basePrice,
    pricePerMeal: plan.pricePerMeal,
    isRecommended: plan.weeks === 2,
    isPopular: plan.weeks === 8,
    tag: plan.tags?.en,
    tagZh: plan.tags?.zh
  }))

  // Get filtered plans based on selected meals per week
  const filteredPlans = planOptions.filter(plan => plan.mealsPerWeek === selectedMealsPerWeek)

  // Handle meal count selection
  const handleMealCountSelect = (mealCount: 6 | 8 | 10 | 12 | 16) => {
    setSelectedMealsPerWeek(mealCount)
    setPurchaseStep('planSelect')
  }

  // Go back to meal count selection
  const handleBackToMealSelect = () => {
    setPurchaseStep('mealSelect')
  }
  
  // Handle plan selection and redirection
  const handlePlanSelect = (plan: PlanOption) => {
    if (!getStarterAddressSelection()?.canWeekly) {
      router.push('/starter')
      return
    }
    // Create a plan identifier
    const planIdentifier = `plan=${plan.id}`
    
    // Store the selected plan in localStorage
    localStorage.setItem('selectedMealPlan', JSON.stringify({
      id: plan.id,
      duration: plan.duration,
      mealsPerWeek: plan.mealsPerWeek,
      totalPrice: plan.totalPrice,
      pricePerMeal: plan.pricePerMeal,
      isRecommended: plan.isRecommended || false,
      tag: plan.tag || null,
      tagZh: plan.tagZh || null
    }))
    
    // Check if user is authenticated by directly checking localStorage
    const authStatus = localStorage.getItem('isAuthenticated')
    const userData = localStorage.getItem('user')
    
    if (authStatus === 'true' && userData) {
      // If authenticated and user data exists, redirect to dashboard credits tab with plan selection
      router.push(`/dashboard?tab=credits&selectPlan=true&${planIdentifier}`)
    } else {
      // If not authenticated or no user data, redirect to signup with plan identifier
      router.push(`/signup?from=weekly-meal&${planIdentifier}`)
    }
  }
  
  // Carousel: if admins flag at least one combo for the homepage strip (`featuredInMenuPreview`),
  // only those flagged combos WITH a photo are shown (honours curation; fix photos if strip is empty).
  // Before any flags exist on the fetched menu: every combo with an image qualifies (legacy).
  const weekDayOrder: Record<string, number> = { sunday: 0, tuesday: 1 }
  const carouselRowsWithImage = [...weeklyMenu]
    .sort((a, b) => {
      const w = (a.weekOffset ?? 0) - (b.weekOffset ?? 0)
      if (w !== 0) return w
      return (weekDayOrder[a.id] ?? 99) - (weekDayOrder[b.id] ?? 99)
    })
    .flatMap((day) =>
      day.options
        .filter((option) => Boolean(option.imageUrl))
        .map((option) => ({
          dayUniqueId: day.uniqueId || day.id,
          dayName: day.name,
          dayDate: day.date,
          option,
        }))
    )

  /** True if admin has flagged at least one combo for the preview strip anywhere in the loaded menu */
  const menuPreviewCarouselIsCurated = weeklyMenu.some((day) =>
    day.options.some((opt) => opt.featuredInMenuPreview === true)
  )

  const carouselRowsFeaturedOnly = carouselRowsWithImage.filter(
    (row) => row.option.featuredInMenuPreview === true
  )

  const weeklyMenuPreviewItems = menuPreviewCarouselIsCurated
    ? carouselRowsFeaturedOnly
    : carouselRowsWithImage

  // Open the dialog on the tab + day that owns this carousel card (not always "this week").
  const openMenuDialogForDay = (dayUniqueId: string) => {
    const target = weeklyMenu.find(
      (d) => d.uniqueId === dayUniqueId || d.id === dayUniqueId
    )
    const w = typeof target?.weekOffset === 'number' ? target.weekOffset : 0
    setActiveWeek(w + 1)
    setSelectedMenuDay(dayUniqueId)
    setMenuDialogOpen(true)
  }

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

  return (
    <div className="ko-order ko-product ko-weekly min-h-screen flex flex-col">
      <header className="ko-header"><Link href="/" className="ko-logo" aria-label="Kapioo home">kapioo<span>.</span></Link><div className="ko-header-actions"><Link href="/starter" className="ko-change-address"><MapPin size={16} />{language === 'zh' ? '更改配送地址' : 'Change address'}</Link><button type="button" className="ko-language" onClick={handleBack} aria-label={language === 'zh' ? '返回上一页' : 'Go back'}><ChevronLeft size={19} /></button></div></header>
      
      {/* Hero Section */}
      <section className="ko-product-section relative w-full overflow-hidden pt-16 pb-24">
        
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
                <p className="ko-eyebrow">{language === 'zh' ? '周次餐盒' : 'Weekly Meal Box / Toronto meal delivery'}</p>
                
                <h1>{language === 'zh' ? <>把冰箱，<em>装满好日子。</em></> : <>A good week <em>starts in the fridge.</em></>}</h1>
                
                <p className="ko-product-lead">{language === 'zh' ? '新鲜制作的亚洲融合餐食，每周配送两次。冷藏备好，加热即可享用。' : 'Freshly prepared Asian fusion meals, delivered twice a week. Stock the fridge, heat and enjoy whenever you’re ready.'}</p>
                <p className="ko-product-sidenote">{language === 'zh' ? '按周购买餐券，想用的时候再兑换。' : 'Choose a weekly voucher pack. Redeem weeks at your own pace.'}</p>
                
                <div className="flex flex-col sm:flex-row gap-3">
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
                    <DialogContent className="ko-dialog sm:max-w-[1100px] w-[92vw] p-0 rounded-xl sm:rounded-[24px] overflow-hidden border-0 sm:border-[#C2884E]/10 h-[85vh] max-h-[600px] sm:max-h-none shadow-xl">
                      <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-3 sm:p-6 text-white h-[70px] sm:h-[90px] flex flex-col justify-center relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white/0 via-white/20 to-white/0"></div>
                        <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
                          {language === 'zh' ? '本周菜单' : 'This Week\'s Menu'}
                        </DialogTitle>
                        <DialogDescription className="text-white/90 mt-0.5 sm:mt-2 text-xs sm:text-sm md:text-base font-light">
                          {language === 'zh' ? '浏览我们本周的精选菜品' : 'Browse our selected dishes for this week'}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {isMenuLoading ? (
                        <div className="flex justify-center items-center h-[200px] sm:h-[300px]">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#C2884E] mx-auto mb-3 sm:mb-4"></div>
                            <p className="text-sm sm:text-base text-[#6B5F53]">{language === 'zh' ? '加载中...' : 'Loading...'}</p>
                          </div>
                        </div>
                      ) : menuError ? (
                        <div className="flex justify-center items-center h-[200px] sm:h-[300px]">
                          <div className="text-center bg-red-50 p-4 rounded-xl border border-red-200 max-w-[90%] sm:max-w-[80%]">
                            <div className="text-red-500 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className="text-sm sm:text-base text-red-700">{menuError}</p>
                            <Button 
                              className="mt-4 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
                              onClick={() => {
                                setMenuDialogOpen(false);
                                // Reset error when dialog is closed
                                setTimeout(() => setMenuError(null), 300);
                              }}
                            >
                              {language === 'zh' ? '关闭' : 'Close'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="ko-menu-scroll flex flex-col md:flex-row h-full overflow-y-auto">
                          <style jsx global>{`
                            .menu-content {
                              height: calc(85vh - 70px);
                              max-height: 530px;
                              overflow-y: auto;
                            }
                            @media (min-width: 640px) {
                              .menu-content {
                                height: calc(85vh - 90px);
                                max-height: none;
                              }
                            }
                            .no-scrollbar::-webkit-scrollbar {
                              display: none;
                            }
                            .no-scrollbar {
                              -ms-overflow-style: none;
                              scrollbar-width: none;
                            }
                            @media (max-width: 639px) {
                              .mobile-menu-animation {
                                animation: fadeInUp 0.3s ease-out;
                              }
                              @keyframes fadeInUp {
                                from {
                                  opacity: 0;
                                  transform: translateY(10px);
                                }
                                to {
                                  opacity: 1;
                                  transform: translateY(0);
                                }
                              }
                            }
                          `}</style>
                          {/* Sidebar Day Navigation - Horizontal scrolling tabs on mobile */}
                          <div className="ko-menu-scroll md:w-1/6 md:min-w-[80px] md:border-r md:border-[#C2884E]/20 px-2 py-1 sm:p-2 md:p-4 md:sticky md:top-0 md:max-h-[80vh] md:overflow-y-auto md:pr-1">
                            {/* Mobile Week Selector - Elegant Pills */}
                            <div className="block md:hidden mb-4">
                              <div className="flex justify-center">
                                <div className="inline-flex p-0.5 bg-[#F5EDE4] rounded-full shadow-sm w-[85%] max-w-[280px]">
                                  <button
                                    onClick={() => {
                                      setActiveWeek(1);
                                      const firstDayOfWeek = weeklyMenu.find(day => day.week === 1);
                                      if (firstDayOfWeek) {
                                        setSelectedMenuDay(firstDayOfWeek.id);
                                      } else {
                                        setSelectedMenuDay(null);
                                      }
                                    }}
                                    className={`flex-1 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-300
                                      ${activeWeek === 1 
                                        ? "bg-white text-[#C2884E] shadow-sm" 
                                        : "bg-transparent text-[#6B5F53]/70 hover:bg-white/30"}`}
                                  >
                                    {language === 'zh' ? '本周' : 'This Week'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveWeek(2);
                                      const firstDayOfWeek = weeklyMenu.find(day => day.week === 2);
                                      if (firstDayOfWeek) {
                                        setSelectedMenuDay(firstDayOfWeek.id);
                                      } else {
                                        setSelectedMenuDay(null);
                                      }
                                    }}
                                    className={`flex-1 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-300
                                      ${activeWeek === 2 
                                        ? "bg-white text-[#C2884E] shadow-sm" 
                                        : "bg-transparent text-[#6B5F53]/70 hover:bg-white/30"}`}
                                  >
                                    {language === 'zh' ? '下周' : 'Next Week'}
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Mobile Day Selector - Elegant Cards */}
                            <div className="block md:hidden mb-3 sm:mb-5">
                              <div className="overflow-x-auto pb-2 no-scrollbar text-center">
                                <div className="inline-flex justify-center space-x-2.5 px-1 py-1">
                                  {weeklyMenu
                                    .filter(day => day.weekOffset === activeWeek - 1)
                                    .map((day) => (
                                      <button
                                        key={day.id}
                                        onClick={() => setSelectedMenuDay(day.uniqueId || day.id)}
                                        className={`flex-shrink-0 transition-all duration-300 border
                                          ${selectedMenuDay === day.uniqueId 
                                            ? "bg-white border-[#C2884E] text-[#C2884E] shadow-md" 
                                            : "bg-white/60 border-[#F5EDE4] text-[#6B5F53]/80 hover:border-[#C2884E]/30"}
                                          px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl min-w-[70px] sm:min-w-[80px]`}
                                      >
                                        <div className="text-center">
                                          <p className="font-medium capitalize text-sm">{day.name}</p>
                                          <p className="text-xs opacity-80 mt-1">{day.date}</p>
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
                                  <Calendar className="h-4 w-4" />
                                  {language === 'zh' ? '本周' : 'This Week'}
                                </h3>
                              </div>
                              
                              {/* Week 1 Days */}
                              {weeklyMenu
                                .filter(day => day.weekOffset === 0)
                                .map((day) => (
                                  <button
                                    key={day.id}
                                    onClick={() => {
                                      setActiveWeek(1);
                                      setSelectedMenuDay(day.uniqueId || day.id);
                                    }}
                                    className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center gap-2
                                      ${selectedMenuDay === day.uniqueId ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md" : "hover:bg-[#F5EDE4] text-[#6B5F53]"}`}
                                  >
                                    <div className="w-full">
                                      <p className="font-medium capitalize text-sm">{day.name}</p>
                                      <p className="text-xs opacity-80">{day.date}</p>
                                    </div>
                                  </button>
                                ))}
                                
                              {/* Week Separator */}
                              <div className="mt-4 mb-2 px-3">
                                <div className="h-px bg-[#C2884E]/50 w-full"></div>
                              </div>
                              
                              {/* Week 2 Heading */}
                              <div className="px-3 py-2 mb-2">
                                <h3 className="text-sm font-bold text-[#6B5F53] flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {language === 'zh' ? '下周' : 'Next Week'}
                                </h3>
                              </div>
                              
                              {/* Week 2 Days */}
                              {weeklyMenu
                                .filter(day => day.weekOffset === 1)
                                .map((day) => (
                                  <button
                                    key={day.id}
                                    onClick={() => {
                                      setActiveWeek(2);
                                      setSelectedMenuDay(day.uniqueId || day.id);
                                    }}
                                    className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center gap-2
                                      ${selectedMenuDay === day.uniqueId ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md" : "hover:bg-[#F5EDE4] text-[#6B5F53]"}`}
                                  >
                                    <div className="w-full">
                                      <p className="font-medium capitalize text-sm">{day.name}</p>
                                      <p className="text-xs opacity-80">{day.date}</p>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                          
                          {/* Main Content Area */}
                          <div className="ko-menu-scroll flex-1 px-3 py-2 sm:p-4 md:p-6 menu-content overflow-y-auto">
                            {selectedMenuDay ? (
                              (() => {
                                const selectedDay = weeklyMenu.find(day => day.uniqueId === selectedMenuDay)
                                
                                if (!selectedDay) {
                                  return (
                                    <div className="h-auto sm:h-[300px] py-10 sm:py-0 flex items-center justify-center">
                                      <div className="bg-white/80 rounded-xl p-4 sm:p-6 shadow-sm border border-[#F5EDE4] max-w-[90%] sm:max-w-[80%] text-center">
                                        <p className="text-[#6B5F53] text-sm sm:text-base">
                                          {language === 'zh' ? '请选择一个日期查看菜单' : 'Please select a day to view the menu'}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                }
                                
                                return (
                                  <div>
                                    <div className="mb-4 sm:mb-6">
                                      <div className="flex items-center justify-center sm:justify-start">
                                        <div className="bg-[#F5EDE4]/60 px-4 py-1.5 rounded-full shadow-sm">
                                          <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#C2884E]">
                                            {selectedDay.name} <span className="font-normal text-[#C2884E]/80 ml-1 text-sm sm:text-base">{selectedDay.date}</span>
                                          </h3>
                                        </div>
                                      </div>
                                      <p className="mt-2 text-left text-[11px] text-[#6B5F53]/55">
                                        {language === 'zh' ? '* 图片仅供参考' : '* Pictures are for reference only.'}
                                      </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:gap-5">
                                      {selectedDay.options.map((option, index) => (
                                        <div 
                                          key={option.id}
                                          className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#F5EDE4] bg-white/95 shadow-sm transition-all duration-300 hover:shadow-md sm:rounded-2xl mobile-menu-animation"
                                          style={{animationDelay: `${index * 0.05}s`}}
                                        >
                                          {option.imageUrl ? (
                                            <div className="aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#F5EDE4]">
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img
                                                src={option.imageUrl}
                                                alt={`${translateOptionName(option)} meal`}
                                                loading="lazy"
                                                decoding="async"
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                                                onError={(event) => {
                                                  event.currentTarget.parentElement?.classList.add("hidden")
                                                }}
                                              />
                                            </div>
                                          ) : null}

                                          <div className="flex flex-1 flex-col p-3 sm:p-4">
                                            <div>
                                              <h4 className="text-sm font-medium leading-snug text-[#6B5F53] sm:text-base">
                                                {translateOptionName(option)}
                                              </h4>
                                            </div>

                                            {getOptionDescription(option) ? (
                                              <p className="mt-2 text-xs leading-relaxed text-[#6B5F53]/75 sm:text-sm">
                                                {getOptionDescription(option)}
                                              </p>
                                            ) : null}

                                            {(typeof option.calories === "number" || getOptionTags(option)?.length || getOptionAllergens(option).length || typeof option.proteinGrams === "number") ? (
                                              <div className="mt-3 space-y-2">
                                                {(typeof option.calories === "number" || (getOptionTags(option) && getOptionTags(option)!.length > 0)) ? (
                                                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                                    {typeof option.calories === "number" ? (
                                                      <span className="px-2 py-0.5 sm:py-1 bg-[#C2884E]/10 text-[#C2884E] rounded-full text-[10px] sm:text-xs font-semibold">
                                                        {option.calories} KCAL
                                                      </span>
                                                    ) : null}
                                                    {getOptionTags(option)?.map((tag, tagIndex) => (
                                                      <span
                                                        key={tagIndex}
                                                        className="px-2 py-0.5 sm:py-1 bg-[#F5EDE4]/70 text-[#6B5F53] rounded-full text-[10px] sm:text-xs font-medium"
                                                      >
                                                        {tag}
                                                      </span>
                                                    ))}
                                                  </div>
                                                ) : null}

                                                {(typeof option.proteinGrams === "number" && Number.isFinite(option.proteinGrams)) || getOptionAllergens(option).length > 0 ? (
                                                  <MealProteinAllergenRow
                                                    language={language === "zh" ? "zh" : "en"}
                                                    variant="panel"
                                                    proteinGrams={option.proteinGrams}
                                                    allergens={getOptionAllergens(option)}
                                                  />
                                                ) : null}
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })()
                            ) : (
                              <div className="h-auto sm:h-[300px] py-10 sm:py-0 flex items-center justify-center">
                                {activeWeek === 2 ? (
                                  <div className="bg-white/80 rounded-xl p-4 sm:p-6 shadow-sm border border-[#F5EDE4] max-w-[90%] sm:max-w-[80%] text-center">
                                    <p className="text-[#6B5F53] text-sm sm:text-base">
                                      {language === 'zh' ? '下周菜单将于周五更新，敬请期待～' : 'Next week\'s menu will be updated on Friday, stay tuned~'}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="bg-white/80 rounded-xl p-4 sm:p-6 shadow-sm border border-[#F5EDE4] max-w-[90%] sm:max-w-[80%] text-center">
                                    <p className="text-[#6B5F53] text-sm sm:text-base">
                                      {language === 'zh' ? '请选择一个日期查看菜单' : 'Please select a day to view the menu'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  <ProductDetailsDialog kind="weekly" language={language} />
                </div>
                <a href="#weekly-plans" className="ko-product-primary">{language === 'zh' ? '查看周次餐券' : 'Explore weekly plans'}<ArrowRight size={18} /></a>
                
              </div>
              
              {/* Right column - Feature tags */}
              <figure className="ko-product-visual md:w-1/2"><Image src="/marketing/plan-weekly-1280.webp" alt="Kapioo Weekly Meal Box with three different Asian fusion meals" fill priority sizes="(max-width: 760px) 100vw, 44vw" /><figcaption>{language === 'zh' ? '装进冰箱的好好吃饭。' : 'A fridge full of possibilities.'}</figcaption></figure>
            </motion.div>
            <ProductJourney kind="weekly" />

              <motion.div className="w-full" variants={fadeIn}>
                <ProductMenuGallery
                  kind="weekly"
                  language={language === 'zh' ? 'zh' : 'en'}
                  loading={isMenuLoading}
                  items={weeklyMenuPreviewItems.map(({ dayUniqueId, dayName, dayDate, option }) => ({
                    id: `${dayUniqueId}-${option.id}`,
                    groupId: dayUniqueId,
                    imageUrl: option.imageUrl!,
                    title: translateOptionName(option),
                    eyebrow: `${dayName}${dayDate ? ` · ${dayDate}` : ''}`,
                    onSelect: () => openMenuDialogForDay(dayUniqueId),
                  }))}
                  onViewMenu={() => weeklyMenuPreviewItems[0] ? openMenuDialogForDay(weeklyMenuPreviewItems[0].dayUniqueId) : setMenuDialogOpen(true)}
                />
              </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Main Content */}
      <section className="container mx-auto pt-0 pb-10 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            id="weekly-plans"
            tabIndex={-1}
            className="ko-pricing w-full -mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl border border-[#C2884E]/10">
              <div className="ko-pricing-header">
                <div className="ko-pricing-heading">
                  <p className="ko-pricing-eyebrow">{language === 'zh' ? '每周有新鲜选择' : 'A PLAN THAT FITS YOUR WEEK'}</p>
                  <h2><span>{language === 'zh' ? '周次卡券' : 'Weekly Voucher Plans'}</span></h2>
                  <p className="ko-pricing-intro">{language === 'zh' ? '选择每周餐数和餐券周数。想吃的时候再兑换，不必连续使用。' : 'Choose your meals per week, then your voucher pack. Redeem a week whenever you’re ready.'}</p>
                </div>
                <VoucherBenefits language={language} />
              </div>
              
              <div className="space-y-6">
                {purchaseStep === 'mealSelect' ? (
                  <div className="space-y-6">
                    <div className="ko-weekly-select-intro">
                      <h3 className="ko-weekly-select-heading">{language === 'zh' ? '每周想要几餐？' : 'How many meals each week?'}</h3>
                      <p>{language === 'zh' ? '选择餐数，查看对应的周次餐券。' : 'Choose a size to see your weekly voucher plans.'}</p>
                    </div>
                    <div className="ko-weekly-meal-choice-grid">
                      {([6, 8, 10, 12, 16] as const).map((mealCount) => (
                        <button
                          key={mealCount}
                          type="button"
                          className={`ko-weekly-meal-choice${mealCount === 8 ? ' ko-weekly-meal-choice-popular' : ''}`}
                          onClick={() => handleMealCountSelect(mealCount)}
                          aria-label={language === 'zh' ? `选择每周 ${mealCount} 餐并查看餐券` : `Choose ${mealCount} meals per week and view plans`}
                        >
                          {mealCount === 8 && <span className="ko-weekly-recommendation">{language === 'zh' ? '热门选择' : 'Popular choice'}</span>}
                          <strong>{mealCount}</strong>
                          <span className="ko-weekly-meal-choice-unit">{language === 'zh' ? '餐／周' : 'meals per week'}</span>
                          <span className="ko-weekly-meal-choice-action">{language === 'zh' ? '查看餐券' : 'See plans'}<ArrowRight size={15} aria-hidden="true" /></span>
                        </button>
                      ))}
                    </div>
                    
                    {/* Additional information */}
                    <p className="ko-pricing-tax-note">{language === 'zh' ? '价格不含税，支持电子转账付款。' : 'Prices before tax. Payment by e-Transfer.'}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 text-[#8A7968] hover:text-[#6B5F53] hover:bg-transparent p-0"
                        onClick={handleBackToMealSelect}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {language === 'zh' ? '返回选择餐数' : 'Back to meal selection'}
                      </Button>
                      
                      <h3 className="text-lg font-medium text-[#6B5F53]">
                        {selectedMealsPerWeek} {language === 'zh' ? '餐/周' : 'meals/week'}
                      </h3>
                    </div>
                    
                    {/* Plan options */}
                    <div className="ko-voucher-grid">
                      {filteredPlans.map((plan) => (
                        <motion.div key={plan.id} whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className="ko-voucher-card">
                          <div className="ko-voucher-topline">
                            <span>{language === 'zh' ? '每周餐盒' : 'WEEKLY MEAL BOX'}</span>
                            {(plan.isPopular || plan.isRecommended) && <span className="ko-voucher-badge">{language === 'zh' ? (plan.duration === 2 ? '首次推荐' : '最超值') : (plan.duration === 2 ? 'Great first pack' : 'Best value')}</span>}
                          </div>
                          <h4 className="ko-voucher-count"><strong>{plan.duration}</strong> {language === 'zh' ? '周' : plan.duration === 1 ? 'week' : 'weeks'}</h4>
                          <p className="ko-weekly-meal-count">{plan.mealsPerWeek} {language === 'zh' ? '餐/周' : 'meals per week'}</p>
                          <div className="ko-voucher-price"><strong>${plan.totalPrice}</strong><span>{language === 'zh' ? '总价' : 'total'}</span></div>
                          <div className="ko-voucher-unit"><span>{language === 'zh' ? '每餐' : 'Per meal'}</span><strong>${plan.pricePerMeal.toFixed(2)}</strong></div>
                          <p className="ko-voucher-bonus">{plan.duration === 1
                            ? (language === 'zh' ? '先从一周开始，轻松尝试' : 'A simple way to start.')
                            : (language === 'zh' ? '按周兑换，随时暂停' : 'Redeem week by week. Pause anytime.')}</p>
                          <Button className="ko-voucher-button" onClick={() => handlePlanSelect(plan)}>
                            {language === 'zh' ? `选择 ${plan.duration} 周` : `Choose ${plan.duration} ${plan.duration === 1 ? 'week' : 'weeks'}`}
                            <ArrowRight aria-hidden="true" size={17} />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Delivery fee info */}
                    <div className="ko-weekly-delivery-fee">
                      <span>{language === 'zh' ? '每周配送 2 次' : 'Two deliveries each week'}</span>
                      <strong>{language === 'zh' ? '配送费 $11.99／周' : '$11.99 delivery per week'}</strong>
                      <small>{language === 'zh' ? 'Hamilton / Burlington：$15.99／周' : 'Hamilton / Burlington: $15.99 per week'}</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
      </div>
      </section>
    </div>
  );
}
