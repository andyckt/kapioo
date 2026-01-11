"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { MapPin, Check } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { ServiceSelectionCards } from "@/components/service-selection-cards"

// Location types - same as in location-meal-plans.tsx
type Location = 
  | "Downtown Toronto" 
  | "Midtown" 
  | "North York" 
  | "Markham" 
  | "Richmond Hill"
  | "Vaughan" 
  | "Mississauga" 
  | "Oakville" 
  | "Aurora" 
  | "Newmarket" 
  | "Hamilton" 
  | "Burlington"
  | "Scarborough"

// Group locations by service availability
const FULL_SERVICE_LOCATIONS: Location[] = ["Downtown Toronto", "Midtown", "North York", "Markham", "Richmond Hill"]
const WEEKLY_ONLY_LOCATIONS: Location[] = ["Scarborough", "Vaughan", "Mississauga", "Oakville", "Aurora", "Newmarket", "Hamilton", "Burlington"]

export default function StarterPage() {
  const router = useRouter()
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
  
  // Format location display names (no longer needed - using actual names)
  const getLocationDisplayName = (location: Location | null): string => {
    if (!location) return ""
    return location
  }
  
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
            className="mb-8"
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
                    {getLocationDisplayName(selectedLocation) || (language === 'zh' ? '选择位置' : 'Select location')}
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
                            {getLocationDisplayName(location)}
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
              <ServiceSelectionCards 
                showDaily={hasDailyDelivery(selectedLocation)}
                showWeekly={hasWeeklyDelivery(selectedLocation)}
                onSelectDaily={() => router.push("/daily-delivery")}
                onSelectWeekly={() => router.push("/weekly-meal")}
              />
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