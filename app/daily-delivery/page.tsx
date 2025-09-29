"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, Check, Info } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function DailyDeliveryPage() {
  const [activeTab, setActiveTab] = useState('description')

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

  return (
    <div className="min-h-screen bg-[#FBF7F2] flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#FFF6EF] to-[#FBF7F2] pt-16 pb-24">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#C2884E]/10 to-transparent rounded-full blur-3xl"></div>
        
        <div className="container max-w-6xl mx-auto px-4">
          <motion.div 
            className="flex flex-col md:flex-row items-center gap-8 md:gap-12"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Left content */}
            <motion.div className="flex-1 text-center md:text-left" variants={fadeIn}>
              <div className="inline-flex items-center justify-center mb-4">
                <div className="px-4 py-1 bg-[#C2884E]/5 rounded-full">
                  <span className="text-sm font-medium text-[#C2884E]">每日配送计划</span>
                </div>
              </div>
              
              <h1 className="text-3xl md:text-5xl font-bold mb-6 text-[#6B5F53]">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                  每日新鲜
                </span>
                <span className="block mt-2">直送到家</span>
              </h1>
              
              <p className="text-lg md:text-xl text-[#6B5F53]/80 mb-8 max-w-lg">
                适合：注重新鲜度，追求每日现做品质的你
              </p>
              
              <div className="flex flex-wrap gap-3 mb-8 justify-center md:justify-start">
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
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-105 transition-transform text-white shadow-md"
                >
                  立即订购 <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/5"
                >
                  了解更多
                </Button>
              </div>
            </motion.div>
            
            {/* Right content - Image */}
            <motion.div 
              className="flex-1 mt-8 md:mt-0"
              variants={fadeIn}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-[#C2884E]/10">
                <div className="aspect-[4/3] relative">
                  <Image 
                    src="/Chinese style meal.jpg" 
                    alt="Daily Fresh Meal" 
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-[#C2884E]/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center">
                        <Check className="w-5 h-5 text-[#C2884E]" />
                      </div>
                      <p className="font-medium text-[#6B5F53]">新鲜送达</p>
                    </div>
                    <p className="text-sm text-[#6B5F53]/80">每日新鲜现做，直送上门，满分新鲜度</p>
                  </div>
                </div>
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
