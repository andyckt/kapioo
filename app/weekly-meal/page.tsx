"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  Calendar,
  Star,
  Check,
  Clock,
  Truck,
  Info,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  CalendarCheck,
  UtensilsCrossed,
  Menu,
  Loader2,
  MapPin,
  Plus,
  Minus
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { getUserWeeklySubscription } from "@/lib/weekly-subscription"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define plan types
interface PlanOption {
  id: string;
  duration: 1 | 2 | 4;
  durationLabel: string;
  durationLabelZh: string;
  mealsPerWeek: 6 | 8 | 10 | 12;
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
  const [selectedMealsPerWeek, setSelectedMealsPerWeek] = useState<6 | 8 | 10 | 12>(6)
  const [purchaseStep, setPurchaseStep] = useState<'mealSelect' | 'planSelect'>('mealSelect')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [menuDialogOpen, setMenuDialogOpen] = useState(false)
  const [isMenuLoading, setIsMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)
  interface MenuOption {
    id: string;
    name: string;
    nameEn?: string;
    tags?: string[];
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
  
  // Fetch weekly menu data when dialog opens
  useEffect(() => {
    if (menuDialogOpen) {
      const fetchWeeklyMenu = async () => {
        setIsMenuLoading(true);
        setMenuError(null);
        try {
          // Fetch real data from API
          const data = await getUserWeeklySubscription();
          
          if (data && data.length > 0) {
            // Format dates based on language and create unique IDs
            const formattedData = data.map(day => ({
              ...day,
              // Create a unique ID that includes the week information
              uniqueId: `${day.id}-week-${day.weekOffset}`,
              name: language === 'zh' 
                ? (day.id === 'sunday' ? '周日' : '周二')
                : (day.id === 'sunday' ? 'Sunday' : 'Tuesday')
            }));
            
            setWeeklyMenu(formattedData);
            
            // Set the first day as selected by default
            if (formattedData.length > 0) {
              const firstDayOfActiveWeek = formattedData.find(day => day.weekOffset === activeWeek - 1);
              if (firstDayOfActiveWeek) {
                setSelectedMenuDay(firstDayOfActiveWeek.uniqueId);
              }
            }
          } else {
            // If no data is returned, don't use mock data, just set empty menu
            console.warn('No menu data returned from API, all days may be inactive');
            setWeeklyMenu([]);
            setMenuError(language === 'zh' 
              ? '当前没有可用的菜单，请稍后再试或联系客服' 
              : 'No menu is currently available. Please try again later or contact customer service.');
            
            // No need to set a selected day when there are no days
            setSelectedMenuDay(null);
          }
        } catch (error) {
          console.error('Error fetching weekly menu:', error);
          setMenuError(language === 'zh' 
            ? '加载菜单时出错，请稍后再试' 
            : 'Error loading menu, please try again later');
          setWeeklyMenu([]); // Clear any previous data
        } finally {
          setIsMenuLoading(false);
        }
      };
      
      fetchWeeklyMenu();
    }
  }, [menuDialogOpen, activeWeek, language])

  // Define plan options based on the credit-purchase-plans component
  const planOptions: PlanOption[] = [
    // 1 week options - 6 meals/week
    { 
      id: 'week1-6', 
      duration: 1, 
      durationLabel: 'One week plan', 
      durationLabelZh: '1周次卡券', 
      mealsPerWeek: 6, 
      totalPrice: 103, 
      pricePerMeal: 17.16 
    },
    // 1 week options - 8 meals/week
    { 
      id: 'week1-8', 
      duration: 1, 
      durationLabel: 'One week plan', 
      durationLabelZh: '1周次卡券', 
      mealsPerWeek: 8, 
      totalPrice: 137, 
      pricePerMeal: 17.13
    },
    // 1 week options - 10 meals/week
    { 
      id: 'week1-10', 
      duration: 1, 
      durationLabel: 'One week plan', 
      durationLabelZh: '1周次卡券', 
      mealsPerWeek: 10, 
      totalPrice: 170, 
      pricePerMeal: 17.00 
    },
    // 1 week options - 12 meals/week
    { 
      id: 'week1-12', 
      duration: 1, 
      durationLabel: 'One week plan', 
      durationLabelZh: '1周次卡券', 
      mealsPerWeek: 12, 
      totalPrice: 203, 
      pricePerMeal: 16.92 
    },
    
    // 2 week options - 6 meals/week
    { 
      id: 'week2-6', 
      duration: 2, 
      durationLabel: 'Two weeks plan', 
      durationLabelZh: '2周次卡券', 
      mealsPerWeek: 6, 
      totalPrice: 186, 
      pricePerMeal: 15.50,
      isRecommended: true,
      tag: 'Best value',
      tagZh: '首次推荐'
    },
    // 2 week options - 8 meals/week
    { 
      id: 'week2-8', 
      duration: 2, 
      durationLabel: 'Two weeks plan', 
      durationLabelZh: '2周次卡券', 
      mealsPerWeek: 8, 
      totalPrice: 246, 
      pricePerMeal: 15.38,
      isRecommended: true,
      tag: 'First Time Recommended',
      tagZh: '首次推荐'
    },
    // 2 week options - 10 meals/week
    { 
      id: 'week2-10', 
      duration: 2, 
      durationLabel: 'Two weeks plan', 
      durationLabelZh: '2周次卡券', 
      mealsPerWeek: 10, 
      totalPrice: 304, 
      pricePerMeal: 15.20,
      isRecommended: true,
      tag: 'Most popular',
      tagZh: '首次推荐'
    },
    // 2 week options - 12 meals/week
    { 
      id: 'week2-12', 
      duration: 2, 
      durationLabel: 'Two weeks plan', 
      durationLabelZh: '2周次卡券', 
      mealsPerWeek: 12, 
      totalPrice: 364, 
      pricePerMeal: 15.17,
      isRecommended: true,
      tag: 'First Time Recommended',
      tagZh: '首次推荐'
    },
    
    // 4 week options - 6 meals/week
    { 
      id: 'week4-6', 
      duration: 4, 
      durationLabel: 'Four weeks plan', 
      durationLabelZh: '4周次卡券', 
      mealsPerWeek: 6, 
      totalPrice: 360, 
      pricePerMeal: 15.00,
      isPopular: true,
      tag: 'Best long-term choice',
      tagZh: '长期最佳选择'
    },
    // 4 week options - 8 meals/week
    { 
      id: 'week4-8', 
      duration: 4, 
      durationLabel: 'Four weeks plan', 
      durationLabelZh: '4周次卡券', 
      mealsPerWeek: 8, 
      totalPrice: 477, 
      pricePerMeal: 14.91,
      isPopular: true,
      tag: 'Best long-term choice',
      tagZh: '长期最佳选择'
    },
    // 4 week options - 10 meals/week
    { 
      id: 'week4-10', 
      duration: 4, 
      durationLabel: 'Four weeks plan', 
      durationLabelZh: '4周次卡券', 
      mealsPerWeek: 10, 
      totalPrice: 592, 
      pricePerMeal: 14.80,
      isPopular: true,
      tag: 'Best long-term choice',
      tagZh: '长期最佳选择'
    },
    // 4 week options - 12 meals/week
    { 
      id: 'week4-12', 
      duration: 4, 
      durationLabel: 'Four weeks plan', 
      durationLabelZh: '4周次卡券', 
      mealsPerWeek: 12, 
      totalPrice: 709, 
      pricePerMeal: 14.77,
      isPopular: true,
      tag: 'Best long-term choice',
      tagZh: '长期最佳选择'
    },
  ]

  // Get filtered plans based on selected meals per week
  const filteredPlans = planOptions.filter(plan => plan.mealsPerWeek === selectedMealsPerWeek)

  // Handle meal count selection
  const handleMealCountSelect = (mealCount: 6 | 8 | 10 | 12) => {
    setSelectedMealsPerWeek(mealCount)
    setPurchaseStep('planSelect')
  }
  
  // Go back to meal count selection
  const handleBackToMealSelect = () => {
    setPurchaseStep('mealSelect')
  }
  
  // Handle plan selection and redirection
  const handlePlanSelect = (plan: PlanOption) => {
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
  
  // Define features for the hero section
  const features = [
    {
      title: language === 'zh' ? "周次MealBox" : "Weekly MealBox",
      description: language === 'zh' ? "每周配送2次，轻松覆盖整周" : "Two deliveries per week, covering the entire week",
      icon: <Calendar className="h-6 w-6" />
    },
    {
      title: language === 'zh' ? "晚间配送" : "Evening Delivery",
      description: language === 'zh' ? "6PM-10PM送达，方便省心" : "Delivered 6PM-10PM, convenient and worry-free",
      icon: <Clock className="h-6 w-6" />
    },
    {
      title: language === 'zh' ? "冷藏保存" : "Refrigerate & Enjoy",
      description: language === 'zh' ? "储存于冰箱，随取随享" : "Store in refrigerator, enjoy anytime",
      icon: <Star className="h-6 w-6" />
    }
  ]

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
    <div className="min-h-screen bg-[#FBF7F2] flex flex-col">
      {/* Back Button - Top Left */}
      <div className="absolute top-6 left-6 z-10">
        <Button 
          variant="ghost" 
          size="sm"
          className="flex items-center gap-1 text-[#6B5F53] hover:text-[#C2884E] transition-colors bg-white/80 backdrop-blur-sm rounded-full shadow-sm p-2 h-auto"
          asChild
        >
          <Link href="/">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">{language === 'zh' ? '返回首页' : 'Back to Home'}</span>
          </Link>
        </Button>
      </div>
      
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#FFF6EF] to-[#FBF7F2] pt-16 pb-24">
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
                      {language === 'zh' ? '周次餐盒订阅' : 'Weekly Meal Subscription'}
                    </span>
                  </div>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold mb-6 text-[#6B5F53]">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                    {language === 'zh' ? '周次MealBox' : 'Weekly MealBox'}
                  </span>
                  <span className="block mt-2">
                    {language === 'zh' ? '餐盒订阅' : 'Meal Subscription'}
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-[#6B5F53]/80 mb-6 max-w-lg">
                  {language === 'zh' 
                    ? '适合把餐食储存于冰箱，随取随享，注重极度便利的你' 
                    : 'Perfect for those who prefer to store meals in the refrigerator and enjoy maximum convenience'}
                </p>
                
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
                    <DialogContent className="sm:max-w-[1100px] w-[92vw] p-0 rounded-xl sm:rounded-[24px] overflow-hidden border-0 sm:border-[#C2884E]/10 h-[85vh] max-h-[600px] sm:max-h-none shadow-xl">
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
                        <div className="flex flex-col md:flex-row h-full overflow-y-auto scrollbar-brand">
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
                          <div className="md:w-1/6 md:min-w-[80px] md:border-r md:border-[#C2884E]/20 px-2 py-1 sm:p-2 md:p-4 md:sticky md:top-0 md:max-h-[80vh] md:overflow-y-auto md:pr-1 scrollbar-brand">
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
                            <div className="hidden md:block sticky top-0 space-y-1 max-h-[80vh] overflow-y-auto pr-1">
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
                          <div className="flex-1 px-3 py-2 sm:p-4 md:p-6 menu-content overflow-y-auto scrollbar-brand">
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
                                    </div>
                                    
                                    <div className="space-y-4 sm:space-y-6">
                                      {selectedDay.options.map((option, index) => (
                                        <div 
                                          key={option.id}
                                          className="bg-white/95 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-[#F5EDE4] shadow-sm hover:shadow-md transition-shadow duration-300 mobile-menu-animation"
                                          style={{animationDelay: `${index * 0.05}s`}}
                                        >
                                          <h4 className="text-base sm:text-lg font-medium text-[#6B5F53] mb-2.5 sm:mb-3 leading-tight">{translateOptionName(option)}</h4>
                                          
                                          {option.tags && option.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                                              {option.tags.map((tag, tagIndex) => (
                                                <span 
                                                  key={tagIndex}
                                                  className="px-2 py-0.5 sm:py-1 bg-[#F5EDE4]/70 text-[#6B5F53] rounded-full text-[10px] sm:text-xs font-medium"
                                                >
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                          )}
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
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 transition-all duration-300 shadow-md relative z-20"
                      >
                        {language === 'zh' ? '如何运作' : 'How It Works'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] w-[95vw] p-0 rounded-xl sm:rounded-[24px] overflow-hidden border-0 sm:border-[#C2884E]/10 max-h-[85vh] shadow-xl">
                      <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6 text-white h-[90px] flex flex-col justify-center">
                        <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                          {language === 'zh' ? '如何运作' : 'How It Works'}
                        </DialogTitle>
                        <DialogDescription className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base font-light">
                          {language === 'zh' ? '了解我们的周次餐盒订阅服务' : 'Learn about our weekly meal subscription service'}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="p-6 overflow-y-auto max-h-[70vh] scrollbar-brand">
                        <div className="space-y-8">
                          <h3 className="text-xl font-semibold text-[#6B5F53] mb-4">{language === 'zh' ? '订阅方式' : 'Subscription Process'}</h3>
                          
                          {/* Step 1 */}
                          <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-[#C2884E]" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">1</span>
                                {language === 'zh' ? '选择适合你的周卡' : 'Choose Your Weekly Plan'}
                              </h3>
                              <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                {language === 'zh' ? '根据您的用餐需求选择合适的周卡套餐，灵活安排每周用餐计划。' : 'Select a weekly plan that suits your meal needs and flexibly arrange your weekly meal schedule.'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Step 2 */}
                          <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-[#C2884E]" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">2</span>
                                {language === 'zh' ? '完成在线付款' : 'Complete Online Payment'}
                              </h3>
                              <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                {language === 'zh' ? '通过线上支付方式完成周卡购买，系统自动记录您的周卡余额。' : 'Complete your weekly plan purchase through online payment. The system automatically records your plan balance.'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Step 3 */}
                          <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                <CalendarCheck className="w-5 h-5 text-[#C2884E]" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">3</span>
                                {language === 'zh' ? '使用周卡下单订餐' : 'Order Meals with Your Plan'}
                              </h3>
                              <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                {language === 'zh' ? '登录账户，使用周卡下单订餐，无需重复支付。' : 'Log into your account and use your weekly plan to order meals without repeated payments.'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Step 4 */}
                          <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                <UtensilsCrossed className="w-5 h-5 text-[#C2884E]" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">4</span>
                                {language === 'zh' ? '每周更新菜单，自由挑选餐食' : 'Weekly Menu Updates, Choose Freely'}
                              </h3>
                              <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                {language === 'zh' ? '我们每周更新菜单，您可以提前选择喜欢的菜品和配送日期。' : 'We update our menu weekly. You can select your favorite dishes and delivery dates in advance.'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Step 5 */}
                          <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                <Truck className="w-5 h-5 text-[#C2884E]" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">5</span>
                                {language === 'zh' ? '晚间送达 → 冷藏保存 → 按最佳日期享用' : 'Evening Delivery → Refrigerate → Enjoy by Best-By Date'}
                              </h3>
                              <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                                {language === 'zh' ? '我们会在晚间将餐食送达您指定的地址，您可以将餐食冷藏保存，按照标注的最佳食用日期享用。' : 'We deliver meals to your specified address in the evening. You can refrigerate the meals and enjoy them by the labeled best-by date.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
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
                        <div className="transform group-hover:scale-110 transition-transform duration-300 text-[#C2884E]">
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
          </motion.div>
        </div>
      </section>
      
      {/* Main Content */}
      <section className="container mx-auto pt-0 pb-10 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="w-full -mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl border border-[#C2884E]/10">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#6B5F53]">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                  {language === 'zh' ? '周次卡券' : 'Weekly Voucher Plans'}
                </span>
              </h2>
              
              <div className="space-y-6">
                {purchaseStep === 'mealSelect' ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-[#6B5F53] text-center mb-4">
                      {language === 'zh' ? '请选择每周餐数' : 'Please select meals per week'}
                    </h3>
                    
                    {/* Meals per week selector */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Card 
                        className="overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl border-[#E5D6BC] hover:border-[#C2884E] cursor-pointer"
                        onClick={() => handleMealCountSelect(6)}
                      >
                        <CardContent className="p-6 text-center">
                          <h3 className="text-2xl font-bold text-[#6B5F53] mb-2">6</h3>
                          <p className="text-sm text-[#8A7968]">{language === 'zh' ? '餐/周' : 'meals/week'}</p>
                        </CardContent>
                      </Card>
                      
                      <div className="relative">
                        <Card 
                          className="overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl border-[#C2884E] cursor-pointer"
                          onClick={() => handleMealCountSelect(8)}
                        >
                          <CardContent className="p-6 text-center">
                            <h3 className="text-2xl font-bold text-[#6B5F53] mb-2">8</h3>
                            <p className="text-sm text-[#8A7968]">{language === 'zh' ? '餐/周' : 'meals/week'}</p>
                          </CardContent>
                        </Card>
                        <div className="absolute -top-3 left-0 right-0 flex justify-center">
                          <span className="bg-[#C2884E] text-white text-xs px-3 py-1 rounded-full shadow-sm">
                            {language === 'zh' ? '最推荐' : 'Most Recommended'}
                          </span>
                        </div>
                      </div>
                      
                      <Card 
                        className="overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl border-[#E5D6BC] hover:border-[#C2884E] cursor-pointer"
                        onClick={() => handleMealCountSelect(10)}
                      >
                        <CardContent className="p-6 text-center">
                          <h3 className="text-2xl font-bold text-[#6B5F53] mb-2">10</h3>
                          <p className="text-sm text-[#8A7968]">{language === 'zh' ? '餐/周' : 'meals/week'}</p>
                        </CardContent>
                      </Card>
                      
                      <Card 
                        className="overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl border-[#E5D6BC] hover:border-[#C2884E] cursor-pointer"
                        onClick={() => handleMealCountSelect(12)}
                      >
                        <CardContent className="p-6 text-center">
                          <h3 className="text-2xl font-bold text-[#6B5F53] mb-2">12</h3>
                          <p className="text-sm text-[#8A7968]">{language === 'zh' ? '餐/周' : 'meals/week'}</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Additional information */}
                    <div className="text-xs text-[#8A7968] space-y-1 mt-6">
                      <p>* {language === 'zh' ? '餐券卡有效期为半年，可转赠亲友，购买后7天内可退款未用部分' : 'Credits valid for 6 months, transferable, unused portion refundable within 7 days of purchase'}</p>
                      <p>* {language === 'zh' ? '以上均为税前价格，支付方式：EMT' : 'All prices before tax, payment method: EMT'}</p>
                    </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {filteredPlans.map((plan) => (
                        <Card 
                          key={plan.id} 
                          className={`overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl ${
                            plan.isPopular || plan.isRecommended ? 'border-[#C2884E]' : 'border-[#E5D6BC]'
                          }`}
                        >
                          <div className="relative">
                            {(plan.isPopular || plan.isRecommended) && (
                              <div className="absolute top-0 right-0 left-0 bg-[#C2884E] text-white text-center py-1.5 text-sm font-medium">
                                {language === 'zh' ? plan.tagZh : plan.tag}
                              </div>
                            )}
                            
                            <CardHeader className={`${(plan.isPopular || plan.isRecommended) ? 'pt-10' : 'pt-6'}`}>
                              <CardTitle className="text-center text-xl text-[#6B5F53]">
                                {language === 'zh' ? plan.durationLabelZh : plan.durationLabel}
                              </CardTitle>
                            </CardHeader>
                            
                            <CardContent className="space-y-4">
                              <div className="text-center">
                                <div className="text-3xl font-bold text-[#C2884E]">
                                  ${plan.totalPrice}
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-[#C2884E]" />
                                    <span className="text-sm font-medium text-[#6B5F53]">
                                      {language === 'zh' ? '餐数/周' : 'Meals/week'}
                                    </span>
                                  </div>
                                  <span className="font-bold text-[#C2884E]">{plan.mealsPerWeek}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Star className="h-4 w-4 text-[#C2884E]" />
                                    <span className="text-sm font-medium text-[#6B5F53]">
                                      {language === 'zh' ? '单价' : 'Per meal'}
                                    </span>
                                  </div>
                                  <span className="font-bold text-[#C2884E]">${plan.pricePerMeal.toFixed(2)}</span>
                                </div>
                              </div>
                              
                              <div className="space-y-2 pt-3 border-t border-[#C2884E]/10">
                                <div className="flex items-start gap-2 text-sm">
                                  <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                                  <span className="text-[#6B5F53]">
                                    {language === 'zh' ? '可转让' : 'Transferable'}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2 text-sm">
                                  <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                                  <span className="text-[#6B5F53]">
                                    {language === 'zh' ? '有效期半年' : 'Valid for 6 months'}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                            
                            <CardFooter>
                              <Button 
                                className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 rounded-xl"
                                onClick={() => handlePlanSelect(plan)}
                              >
                                {language === 'zh' ? '选择此套餐' : 'Select This Plan'}
                              </Button>
                            </CardFooter>
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Delivery fee info */}
                    <div className="bg-[#F9F3EC] p-4 rounded-xl border border-[#E5D6BC] text-center">
                      <span className="text-[#8A7968]">
                        {language === 'zh' ? '配送费/周 (2次配送)' : 'Delivery fee/week (2 deliveries)'}: 
                      </span>
                      <span className="font-medium text-[#6B5F53] ml-2">$11.99</span>
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
