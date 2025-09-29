"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { 
  ArrowRight, 
  Clock, 
  Check, 
  Info, 
  Tag, 
  Utensils,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/lib/language-context'
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
  const { t, language } = useLanguage()
  const [activeTab, setActiveTab] = useState('description')
  const [pricingTab, setPricingTab] = useState<'twoDish' | 'threeDish'>('twoDish')
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // Define voucher plans
  const twoDishPlans: VoucherPlan[] = [
    { id: 'two-6', type: 'twoDish', quantity: 6, price: 131, pricePerMeal: 21.83 },
    { id: 'two-10', type: 'twoDish', quantity: 10, price: 195, pricePerMeal: 19.50, isPopular: true, savings: language === 'zh' ? '首次推荐' : 'First Time Recommend!' },
    { id: 'two-22', type: 'twoDish', quantity: 22, price: 356, pricePerMeal: 16.18 },
    { id: 'two-46', type: 'twoDish', quantity: 46, price: 712, pricePerMeal: 15.48 }
  ]

  const threeDishPlans: VoucherPlan[] = [
    { id: 'three-6', type: 'threeDish', quantity: 6, price: 150, pricePerMeal: 25.00 },
    { id: 'three-10', type: 'threeDish', quantity: 10, price: 228, pricePerMeal: 22.80, isPopular: true, savings: language === 'zh' ? '首次推荐' : 'First Time Recommend!' },
    { id: 'three-22', type: 'threeDish', quantity: 22, price: 417, pricePerMeal: 18.95 },
    { id: 'three-46', type: 'threeDish', quantity: 46, price: 818, pricePerMeal: 17.78 }
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

  const features = [
    {
      title: "每日新鲜现做",
      description: "直送上门，满分新鲜度",
      icon: <Image 
        src="/未命名設計.png" 
        alt="Kapioo Logo" 
        width={24} 
        height={24} 
        className="h-6 w-6" 
      />
    },
    {
      title: "餐券制",
      description: "灵活选择每周所需天数",
      icon: <Image 
        src="/未命名設計.png" 
        alt="Kapioo Logo" 
        width={24} 
        height={24}
        className="h-6 w-6" 
      />
    },
    {
      title: "午间时段送达",
      description: "11AM-1PM，享受当日鲜美",
      icon: <Image 
        src="/未命名設計.png" 
        alt="Kapioo Logo" 
        width={24} 
        height={24}
        className="h-6 w-6" 
      />
    }
  ]
  
  // Render the plan cards
  const renderPlanCards = (plans: VoucherPlan[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -8, boxShadow: "0 10px 25px -5px rgba(194, 136, 78, 0.1), 0 8px 10px -6px rgba(194, 136, 78, 0.1)" }}
            transition={{ duration: 0.3 }}
            className="relative rounded-xl border overflow-hidden group border-[#C2884E]/10 hover:border-[#C2884E]/30"
          >
            {/* Popular badge */}
            {plan.isPopular && (
              <div className="absolute top-0 right-0 bg-[#F5EDE4] text-[#C2884E] px-3 py-1 text-xs font-medium rounded-bl-xl z-10">
                  {language === 'zh' ? '推荐' : 'Most Popular'}
              </div>
            )}
            
            {/* Savings badge */}
            {plan.savings && !plan.isPopular && (
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
            <div className="p-5 bg-gradient-to-b from-white to-[#F5EDE4]/20">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-[#C2884E]" />
                    <span className="text-sm font-medium text-[#6B5F53]">
                      {language === 'zh' ? '餐券数量' : 'Vouchers'}
                    </span>
                  </div>
                  <span className="font-bold text-[#C2884E]">{plan.quantity}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-[#C2884E]" />
                    <span className="text-sm font-medium text-[#6B5F53]">
                      {language === 'zh' ? '单价' : 'Per meal'}
                    </span>
                  </div>
                  <span className="font-bold text-[#C2884E]">${plan.pricePerMeal.toFixed(2)}</span>
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
                
                {/* Show Valid for 1 year as the last tick */}
                <div className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                  <span className="text-[#6B5F53]">
                    {language === 'zh' ? '有效期1年' : 'Valid for 1 year'}
                  </span>
                </div>
              </div>
              
              <Button
                className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white transition-all duration-300"
                asChild
              >
                <Link href="/starter">
                  {language === 'zh' ? '选择此套餐' : 'Select This Plan'}
                </Link>
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF7F2] flex flex-col">
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
                      {language === 'zh' ? '每日配送计划' : 'Daily Delivery Plan'}
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
                
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 transition-all duration-300 shadow-md"
                    >
                      {language === 'zh' ? '知道更多' : 'Learn More'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[900px] w-[90vw] p-0 rounded-[32px] overflow-hidden border-[#C2884E]/10">
                    <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-6 text-white">
                      <DialogTitle className="text-2xl font-bold">
                        {language === 'zh' ? '每日配送计划详情' : 'Daily Delivery Plan Details'}
                      </DialogTitle>
                      <DialogDescription className="text-white/80 mt-2">
                        {language === 'zh' ? '了解我们的每日新鲜配送服务' : 'Learn about our daily fresh delivery service'}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="p-6">
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
                        <div className="max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          <style jsx>{`
                            div::-webkit-scrollbar {
                              display: none;
                            }
                          `}</style>
                        
                        <TabsContent value="description" className="mt-0 space-y-4">
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center mt-1 flex-shrink-0">
                                <Check className="w-5 h-5 text-[#C2884E]" />
                              </div>
                              <div>
                                <h3 className="text-lg font-medium text-[#6B5F53] mb-1">每日新鲜现做</h3>
                                <p className="text-[#6B5F53]/80">直送上门，满分新鲜度。我们坚持每日现做，确保您收到的餐食保持最佳口感和营养价值。</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center mt-1 flex-shrink-0">
                                <Check className="w-5 h-5 text-[#C2884E]" />
                              </div>
                              <div>
                                <h3 className="text-lg font-medium text-[#6B5F53] mb-1">餐券制</h3>
                                <p className="text-[#6B5F53]/80">灵活选择每周所需天数。根据您的需求购买餐券，自由安排用餐日期，不浪费，更经济。</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center mt-1 flex-shrink-0">
                                <Check className="w-5 h-5 text-[#C2884E]" />
                              </div>
                              <div>
                                <h3 className="text-lg font-medium text-[#6B5F53] mb-1">午间时段送达</h3>
                                <p className="text-[#6B5F53]/80">11AM-1PM，享受当日鲜美。准时送达，让您在工作日也能享用健康美味的餐食。</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#FFF6EF] rounded-xl p-6 mt-4">
                            <h3 className="text-lg font-medium text-[#C2884E] mb-4">适合人群</h3>
                            <ul className="space-y-3">
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                                <span className="text-[#6B5F53]">注重新鲜度的美食爱好者</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                                <span className="text-[#6B5F53]">追求每日现做品质的你</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                                <span className="text-[#6B5F53]">工作繁忙但不想放弃健康饮食的职场人士</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                                <span className="text-[#6B5F53]">需要灵活订餐方案的家庭</span>
                              </li>
                            </ul>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="howItWorks" className="mt-0 space-y-4">
                          <div className="space-y-8">
                            {/* Step 1 */}
                            <div className="flex flex-row gap-4 items-start">
                              <div className="flex items-center gap-2">
                                <div className="text-2xl font-light text-[#C2884E]/30">
                                  1
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                  <Image src="/未命名設計.png" alt="Choose meal voucher" width={24} height={24} />
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-medium text-[#6B5F53]">选择适合你的餐券</h3>
                                <p className="text-sm text-[#6B5F53]/80 mt-1">根据您的用餐需求选择合适的餐券套餐，灵活安排每周用餐计划。</p>
                              </div>
                            </div>
                            
                            {/* Step 2 */}
                            <div className="flex flex-row gap-4 items-start">
                              <div className="flex items-center gap-2">
                                <div className="text-2xl font-light text-[#C2884E]/30">
                                  2
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#C2884E" strokeWidth="1.5"/>
                                    <path d="M12 8V12L14 14" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-medium text-[#6B5F53]">完成在线付款</h3>
                                <p className="text-sm text-[#6B5F53]/80 mt-1">通过线上支付方式完成餐券购买，系统自动记录您的餐券余额。</p>
                              </div>
                            </div>
                            
                            {/* Step 3 */}
                            <div className="flex flex-row gap-4 items-start">
                              <div className="flex items-center gap-2">
                                <div className="text-2xl font-light text-[#C2884E]/30">
                                  3
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-medium text-[#6B5F53]">每周更新菜单，订购你需要餐食的日期</h3>
                                <p className="text-sm text-[#6B5F53]/80 mt-1">我们每周更新菜单，您可以提前选择喜欢的菜品和配送日期。</p>
                              </div>
                            </div>
                            
                            {/* Step 4 */}
                            <div className="flex flex-row gap-4 items-start">
                              <div className="flex items-center gap-2">
                                <div className="text-2xl font-light text-[#C2884E]/30">
                                  4
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-medium text-[#6B5F53]">美味餐食按时送达</h3>
                                <p className="text-sm text-[#6B5F53]/80 mt-1">我们会在11AM-1PM之间将新鲜制作的餐食送达您指定的地址，确保最佳品质。</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-[#FFF6EF] rounded-xl p-6 mt-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center">
                                <Info className="w-5 h-5 text-[#C2884E]" />
                              </div>
                              <h3 className="text-lg font-medium text-[#C2884E]">配送要求</h3>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                              <div className="flex items-center">
                                <span className="text-[#6B5F53]">每次配送至少2份餐食</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="w-4 h-4 text-[#C2884E]/70 ml-1 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-white border border-[#C2884E]/20">
                                      <div className="text-sm text-[#6B5F53]">
                                        每次配送至少2份餐食，午餐+晚餐一站解决；<br/>
                                        只需要一餐怎么办？餐食可冷藏保鲜 48 小时，第二天享用也10分新鲜
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            <p className="text-sm text-[#6B5F53]/80 mt-2">我们提供多样化的菜单选择，满足您对不同口味的需求。每周更新菜单，让您的味蕾永远充满惊喜。</p>
                          </div>
                        </TabsContent>
                        </div>
                      </Tabs>
                    </div>
                  </DialogContent>
                </Dialog>
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
                      
                      {/* Payment method and tax information */}
                      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <h4 className="font-medium text-amber-800 mb-2">
                          {language === 'zh' ? '付款方式与税费说明' : 'Payment Method & Tax Information'}
                        </h4>
                        <ul className="space-y-2 text-sm text-amber-700">
                          <li className="flex items-start gap-2">
                            <div className="min-w-[20px] mt-0.5">•</div>
                            <div>
                              {language === 'zh' ? '微信支付：无需支付额外税费' : 'WeChat Pay: No additional tax required'}
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
                      
                      {/* Payment method and tax information */}
                      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <h4 className="font-medium text-amber-800 mb-2">
                          {language === 'zh' ? '付款方式与税费说明' : 'Payment Method & Tax Information'}
                        </h4>
                        <ul className="space-y-2 text-sm text-amber-700">
                          <li className="flex items-start gap-2">
                            <div className="min-w-[20px] mt-0.5">•</div>
                            <div>
                              {language === 'zh' ? '微信支付：无需支付额外税费' : 'WeChat Pay: No additional tax required'}
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
