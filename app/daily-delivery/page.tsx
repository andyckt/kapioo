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
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    },
    {
      title: "餐券制",
      description: "灵活选择每周所需天数",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.5 6L12 9L7.5 6M3 6L12 12L21 6M3 18L12 12L21 18" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    },
    {
      title: "午间时段送达",
      description: "11AM-1PM，享受当日鲜美",
      icon: <Clock className="w-6 h-6 text-[#C2884E]" />
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
            {/* Header content */}
            <motion.div className="text-center max-w-3xl mx-auto" variants={fadeIn}>
              <div className="inline-flex items-center justify-center mb-4">
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
              
              <p className="text-lg md:text-xl text-[#6B5F53]/80 mb-8 max-w-lg mx-auto">
                {language === 'zh' 
                  ? '适合：注重新鲜度，追求每日现做品质的你' 
                  : 'Perfect for: Those who value freshness and daily prepared quality meals'}
              </p>
              
              <div className="flex flex-wrap gap-3 mb-8 justify-center">
                {features.map((feature, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg shadow-sm border border-[#C2884E]/10"
                  >
                    <div className="text-[#C2884E]">
                      {feature.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#6B5F53]">{feature.title}</p>
                      <p className="text-xs text-[#6B5F53]/70">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            {/* Pricing Section */}
            <motion.div 
              className="w-full mt-8"
              variants={fadeIn}
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl border border-[#C2884E]/10">
                <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#6B5F53]">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                    {language === 'zh' ? '餐券套餐' : 'Meal Voucher Plans'}
                  </span>
                </h2>
                
                <Tabs defaultValue={pricingTab} onValueChange={(v) => setPricingTab(v as 'twoDish' | 'threeDish')} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-8 bg-[#F5EDE4]/30 p-1 rounded-xl">
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
      
      {/* Main Content */}
      <main className="flex-1 container max-w-5xl py-12 md:py-20 px-4 mx-auto">
        {/* Tabs */}
        <div className="flex border-b border-[#C2884E]/20 mb-8">
          <button 
            className={`px-6 py-3 text-lg font-medium transition-colors relative ${
              activeTab === 'description' 
                ? 'text-[#C2884E]' 
                : 'text-[#6B5F53]/70 hover:text-[#6B5F53]'
            }`}
            onClick={() => setActiveTab('description')}
          >
            产品介绍
            {activeTab === 'description' && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C2884E]"
                layoutId="activeTab"
              />
            )}
          </button>
          <button 
            className={`px-6 py-3 text-lg font-medium transition-colors relative ${
              activeTab === 'howItWorks' 
                ? 'text-[#C2884E]' 
                : 'text-[#6B5F53]/70 hover:text-[#6B5F53]'
            }`}
            onClick={() => setActiveTab('howItWorks')}
          >
            如何运作
            {activeTab === 'howItWorks' && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C2884E]"
                layoutId="activeTab"
              />
            )}
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="py-6">
          {activeTab === 'description' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-[#C2884E]/10">
                <h2 className="text-2xl md:text-3xl font-bold mb-6 text-[#6B5F53]">每日配送计划</h2>
                
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
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
                    
                    <div className="md:w-1/3 bg-[#FFF6EF] rounded-xl p-6 border border-[#C2884E]/10">
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
                  </div>
                  
                  <div className="bg-[#C2884E]/5 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/4 flex justify-center">
                      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-md">
                        <Image src="/未命名設計.png" alt="Kapioo Logo" width={40} height={40} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-[#C2884E] mb-2 text-center md:text-left">配送要求</h3>
                      <div className="flex items-center gap-2 mb-1">
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
                      <p className="text-sm text-[#6B5F53]/80">我们提供多样化的菜单选择，满足您对不同口味的需求。每周更新菜单，让您的味蕾永远充满惊喜。</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {activeTab === 'howItWorks' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-[#C2884E]/10">
                <h2 className="text-2xl md:text-3xl font-bold mb-8 text-[#6B5F53]">订阅方式</h2>
                
                <div className="space-y-12">
                  {/* Step 1 */}
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-light text-[#C2884E]/30">
                        1
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                        <Image src="/未命名設計.png" alt="Choose meal voucher" width={28} height={28} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-[#6B5F53]">选择适合你的餐券</h3>
                    </div>
                    <div className="hidden md:block h-12 border-l border-dashed border-[#C2884E]/20 ml-6"></div>
                  </div>
                  
                  {/* Step 2 */}
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-light text-[#C2884E]/30">
                        2
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#C2884E" strokeWidth="1.5"/>
                          <path d="M12 8V12L14 14" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-[#6B5F53]">完成在线付款</h3>
                    </div>
                    <div className="hidden md:block h-12 border-l border-dashed border-[#C2884E]/20 ml-6"></div>
                  </div>
                  
                  {/* Step 3 */}
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-light text-[#C2884E]/30">
                        3
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="#C2884E" strokeWidth="1.5"/>
                          <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" stroke="#C2884E" strokeWidth="1.5"/>
                          <path d="M9 12L11 14L15 10" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-[#6B5F53]">使用餐券，下单订餐</h3>
                    </div>
                    <div className="hidden md:block h-12 border-l border-dashed border-[#C2884E]/20 ml-6"></div>
                  </div>
                  
                  {/* Step 4 */}
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-light text-[#C2884E]/30">
                        4
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-[#6B5F53]">每周更新菜单，订购你需要餐食的日期</h3>
                    </div>
                    <div className="hidden md:block h-12 border-l border-dashed border-[#C2884E]/20 ml-6"></div>
                  </div>
                  
                  {/* Step 5 */}
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-light text-[#C2884E]/30">
                        5
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-[#6B5F53]">美味餐食按时送达</h3>
                    </div>
                  </div>
                </div>
                
                <div className="mt-12 pt-8 border-t border-[#C2884E]/10">
                  <div className="bg-[#FFF6EF] rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="md:w-1/4 flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-lg font-medium text-[#C2884E] mb-2">配送信息</h3>
                      <p className="text-[#6B5F53] mb-2">午间时段送达：11AM-1PM，享受当日鲜美</p>
                      <p className="text-sm text-[#6B5F53]/80">我们的专业配送团队确保您的餐食在最佳温度下送达，保持食物的口感和新鲜度。</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-105 transition-transform text-white shadow-md"
                >
                  立即订购 <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
