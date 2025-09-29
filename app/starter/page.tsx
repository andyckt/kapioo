"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { MapPin, Check, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"

// Location types - same as in location-meal-plans.tsx
type Location = 
  | "Downtown" 
  | "Midtown" 
  | "NorthYork" 
  | "Markham" 
  | "RichmondHill"
  | "Vaughan" 
  | "Mississauga" 
  | "Oakville" 
  | "Aurora" 
  | "Newmarket" 
  | "Hamilton" 
  | "Burlington"

// Group locations by service availability
const FULL_SERVICE_LOCATIONS: Location[] = ["Downtown", "Midtown", "NorthYork", "Markham", "RichmondHill"]
const WEEKLY_ONLY_LOCATIONS: Location[] = ["Vaughan", "Mississauga", "Oakville", "Aurora", "Newmarket", "Hamilton", "Burlington"]

export default function StarterPage() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(false)
  const { language, t } = useLanguage()
  
  // Set animation complete after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Check if location has daily delivery service
  const hasDailyDelivery = (location: Location | null) => {
    if (!location) return false
    return FULL_SERVICE_LOCATIONS.includes(location)
  }
  
  // Check if location has weekly delivery service
  const hasWeeklyDelivery = (location: Location | null) => {
    if (!location) return false
    return FULL_SERVICE_LOCATIONS.includes(location) || WEEKLY_ONLY_LOCATIONS.includes(location)
  }
  
  // All locations
  const allLocations: Location[] = [...FULL_SERVICE_LOCATIONS, ...WEEKLY_ONLY_LOCATIONS]
  
  return (
    <div className="min-h-screen bg-[#FBF7F2] flex flex-col">
      <main className="flex-1 container max-w-5xl py-12 md:py-20 px-4">
        <div className="w-full max-w-3xl mx-auto">
          {/* Page Title */}
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-3xl md:text-4xl font-light mb-4 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                {language === 'zh' ? '开始您的 Kapioo 旅程' : 'Start Your Kapioo Journey'}
              </span>
            </h1>
            <div className="w-16 h-0.5 bg-gradient-to-r from-[#C2884E]/20 to-[#D1A46C]/60 mx-auto mb-6"></div>
            <p className="text-[#6B5F53] text-lg">
              {language === 'zh' ? '请选择您的位置，查看适用的 Kapioo 计划' : 'Please select your location to see available meal plans'}
            </p>
          </motion.div>
          
          {/* Location Selector */}
          <motion.div 
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="relative">
              <button
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                className="w-full flex items-center justify-between p-4 border border-[#C2884E]/20 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-[#C2884E] mr-3" />
                  <span className={`text-lg ${selectedLocation ? 'text-[#6B5F53]' : 'text-[#6B5F53]/60'}`}>
                    {selectedLocation || (language === 'zh' ? '选择位置' : 'Select location')}
                  </span>
                </div>
                <div className={`transition-transform duration-300 ${isLocationOpen ? 'rotate-180' : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6L8 10L12 6" stroke="#C2884E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
              
              {/* Dropdown */}
              {isLocationOpen && (
                <motion.div 
                  className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-[#C2884E]/20 shadow-xl overflow-hidden z-30 max-h-[320px] overflow-y-auto"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-2">
                    {allLocations.map((location) => (
                      <button
                        key={location}
                        className={`w-full text-left px-4 py-3 rounded-lg hover:bg-[#C2884E]/5 transition-colors ${
                          selectedLocation === location ? 'bg-[#C2884E]/10 font-medium' : ''
                        }`}
                        onClick={() => {
                          setSelectedLocation(location)
                          setIsLocationOpen(false)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`${selectedLocation === location ? 'text-[#C2884E]' : 'text-[#6B5F53]'}`}>
                            {location}
                          </span>
                          {selectedLocation === location && (
                            <Check className="h-4 w-4 text-[#C2884E]" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
          
          {/* Service Options */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: selectedLocation ? 1 : 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-6"
          >
            {selectedLocation && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                  {/* Daily Delivery Option */}
                  {hasDailyDelivery(selectedLocation) && (
                    <motion.div 
                      className="group relative rounded-2xl overflow-hidden shadow-xl h-[400px] transform transition-all duration-700 before:absolute before:inset-0 before:border-2 before:border-transparent before:rounded-2xl before:z-10 hover:before:border-[#C2884E]/40 before:transition-all before:duration-300 cursor-pointer"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7 }}
                      whileHover={{ 
                        boxShadow: "0 25px 50px -12px rgba(194, 136, 78, 0.25)"
                      }}
                    >
                      <motion.div 
                        className="relative h-full w-full overflow-hidden"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        <Image 
                          src="/food-gallery/Chinese style meal.jpg" 
                          alt={language === 'zh' ? '每日直送' : 'Daily Fresh Delivery'} 
                          fill
                          className="object-cover transition-transform duration-[1.5s]"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
                      </motion.div>
                      
                      <div className="absolute inset-x-0 bottom-0 z-20 p-8">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="space-y-4"
                        >
                          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            {language === 'zh' ? '每日直送' : 'Daily Fresh Delivery'}
                          </h3>
                          <p className="text-white/90 text-sm sm:text-base max-w-md">
                            {language === 'zh' ? '每日新鲜现做，直送上门，满分新鲜度' : 'Freshly made daily, delivered to your door, maximum freshness'}
                          </p>
                          
                          <div className="pt-4">
                            <Button className="bg-white hover:bg-white/90 text-[#C2884E] hover:text-[#C2884E] hover:scale-105 transition-transform">
                              <Link href="/daily-plan" className="flex items-center justify-center w-full">
                                {language === 'zh' ? '选择此计划' : 'Select This Plan'}
                              </Link>
                            </Button>
                          </div>
                          
                          <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                              initial={{ x: "-100%" }}
                              whileInView={{ x: "0%" }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.7 }}
                            ></motion.div>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Weekly Delivery Option */}
                  {hasWeeklyDelivery(selectedLocation) && (
                    <motion.div 
                      className="group relative rounded-2xl overflow-hidden shadow-xl h-[400px] transform transition-all duration-700 before:absolute before:inset-0 before:border-2 before:border-transparent before:rounded-2xl before:z-10 hover:before:border-[#C2884E]/40 before:transition-all before:duration-300 cursor-pointer"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.2 }}
                      whileHover={{ 
                        boxShadow: "0 25px 50px -12px rgba(194, 136, 78, 0.25)"
                      }}
                    >
                      <motion.div 
                        className="relative h-full w-full overflow-hidden"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        <Image 
                          src="/food-gallery/westernfood.JPG" 
                          alt={language === 'zh' ? '周次 MealBox' : 'Weekly MealBox'} 
                          fill
                          className="object-cover transition-transform duration-[1.5s]"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
                      </motion.div>
                      
                      <div className="absolute inset-x-0 bottom-0 z-20 p-8">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.4 }}
                          className="space-y-4"
                        >
                          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            {language === 'zh' ? '周次 MealBox' : 'Weekly MealBox'}
                          </h3>
                          <p className="text-white/90 text-sm sm:text-base max-w-md">
                            {language === 'zh' ? '每周配送2次，一次配送多餐，轻松覆盖整周' : 'Delivered twice a week, multiple meals per delivery, easily covers the entire week'}
                          </p>
                          
                          <div className="pt-4">
                            <Button className="bg-white hover:bg-white/90 text-[#C2884E] hover:text-[#C2884E] hover:scale-105 transition-transform">
                              <Link href="/login" className="flex items-center justify-center w-full">
                                {language === 'zh' ? '选择此计划' : 'Select This Plan'}
                              </Link>
                            </Button>
                          </div>
                          
                          <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                              initial={{ x: "-100%" }}
                              whileInView={{ x: "0%" }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.7 }}
                            ></motion.div>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </>
            )}
            
            {/* No location selected state */}
            {!selectedLocation && animationComplete && (
              <motion.div 
                className="text-center py-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-[#6B5F53]/70 italic">
                  {language === 'zh' ? '请选择您的位置以查看可用的餐食计划' : 'Please select your location to view available meal plans'}
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}