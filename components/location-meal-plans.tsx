"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useRouter } from "next/navigation"

// Location types
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
const FULL_SERVICE_LOCATIONS: Location[] = ["Downtown Toronto", "Midtown", "NorthYork", "Markham", "RichmondHill"]
const WEEKLY_ONLY_LOCATIONS: Location[] = ["Vaughan", "Mississauga", "Oakville", "Aurora", "Newmarket", "Hamilton", "Burlington"]

// Meal plan types
interface MealPlan {
  id: string
  title: {
    en: string
    zh: string
    [key: string]: string
  }
  description: {
    en: string
    zh: string
    [key: string]: string
  }
  imagePath: string
}

export default function LocationMealPlans() {
  const router = useRouter()
  const [selectedLocation, setSelectedLocation] = useState<Location | "">("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const { language, t } = useLanguage()
  
  // Set visibility for animation
  useEffect(() => {
    setIsVisible(true)
  }, [])
  
  // Define meal plans
  const weeklyPlan: MealPlan = {
    id: "weekly",
    title: {
      en: t('weeklySubscriptionTitle'),
      zh: t('weeklySubscriptionTitle')
    },
    description: {
      en: t('weeklySubscriptionDesc'),
      zh: t('weeklySubscriptionDesc')
    },
    // Note: These image paths are placeholders. You'll need to add actual images to the public/meal-plans directory
    imagePath: "/weeklyplan.png" // Weekly subscription image
  }
  
  const dailyPlan: MealPlan = {
    id: "daily",
    title: {
      en: t('dailyDeliveryTitle'),
      zh: t('dailyDeliveryTitle')
    },
    description: {
      en: t('dailyDeliveryDesc'),
      zh: t('dailyDeliveryDesc')
    },
    // Note: These image paths are placeholders. You'll need to add actual images to the public/meal-plans directory
    imagePath: "/dailystarter.jpg" // Daily delivery image
  }
  
  // Get available plans based on location
  const getAvailablePlans = (): MealPlan[] => {
    if (selectedLocation === "") {
      return [weeklyPlan]
    } else if (FULL_SERVICE_LOCATIONS.includes(selectedLocation as Location)) {
      return [weeklyPlan, dailyPlan]
    } else {
      return [weeklyPlan]
    }
  }
  
  // Location display names
  const getLocationDisplayName = (location: Location | ""): string => {
    return location
  }
  
  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }
  
  // Select location
  const selectLocation = (location: Location) => {
    setSelectedLocation(location)
    setIsDropdownOpen(false)
  }
  
  // All locations
  const allLocations: Location[] = [...FULL_SERVICE_LOCATIONS, ...WEEKLY_ONLY_LOCATIONS]
  
  return (
    <section className="pt-12 pb-24 px-4 bg-gradient-to-b from-[#fff6ef] to-white relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-[10%] w-[400px] h-[400px] bg-gradient-to-tr from-[#C2884E]/5 to-transparent rounded-full blur-[80px]"></div>
        <div className="absolute bottom-20 right-[10%] w-[500px] h-[500px] bg-gradient-to-bl from-[#C2884E]/5 to-transparent rounded-full blur-[100px]"></div>
        
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(#C2884E_1px,transparent_1px)] [background-size:24px_24px]"></div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >

          </motion.div>
          
          <motion.h2 
            className="text-3xl md:text-5xl font-bold mb-4 relative inline-block"
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
              {t('mealPlanOptionsTitle')}
            </span>
            <motion.div 
              className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C2884E]/0 via-[#C2884E]/70 to-[#C2884E]/0"
              initial={{ width: 0, x: "50%" }}
              animate={isVisible ? { width: "100%", x: 0 } : {}}
              transition={{ duration: 1, delay: 0.7 }}
            ></motion.div>
          </motion.h2>
          
          <motion.p 
            className="text-lg md:text-xl text-[#6B5F53] mt-6 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {t('selectAreaText')}
          </motion.p>
        </motion.div>
        
        {/* Location Selector */}
        <motion.div 
          className="relative w-full max-w-md mx-auto mb-16 z-20"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div 
            className="relative cursor-pointer"
            onClick={toggleDropdown}
          >
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2">
                <span className="text-[#6B5F53] font-medium text-xl md:text-2xl">
                  {language === 'en' ? 'Deliver to' : '配送地址'}
                </span>
                <span className="text-[#C2884E] font-medium border-b-2 border-[#C2884E]/30 px-2 min-w-[120px] text-center text-xl md:text-2xl">
                  {getLocationDisplayName(selectedLocation) || <span className="text-transparent">___________</span>}
                </span>
                <ChevronDown 
                  className={`h-5 w-5 ml-1 text-[#C2884E] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                />
              </div>
            </div>
            
            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[#C2884E]/20 shadow-xl overflow-hidden z-30 w-full">
                <div className="max-h-64 overflow-y-auto py-2">
                  {allLocations.map((location) => (
                    <div 
                      key={location}
                      className={`px-6 py-3 hover:bg-[#C2884E]/5 transition-colors cursor-pointer flex items-center gap-3 ${
                        selectedLocation === location ? 'bg-[#C2884E]/10 font-medium' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        selectLocation(location)
                      }}
                    >
                      {selectedLocation === location && (
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"></div>
                      )}
                      <span className={`${selectedLocation === location ? 'text-[#C2884E]' : 'text-[#6B5F53]'}`}>
                        {getLocationDisplayName(location)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
        

        
        {/* Meal Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto min-h-[400px]">
          {selectedLocation ? getAvailablePlans().map((plan, index) => (
            <motion.div 
              key={plan.id}
              className="group relative rounded-2xl overflow-hidden shadow-xl h-[400px] transform transition-all duration-700 cursor-pointer"
              initial={{ opacity: 0, y: 40 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.7 + index * 0.2 }}
              whileHover={{ 
                y: -5,
                boxShadow: "0 25px 50px -12px rgba(194, 136, 78, 0.25)"
              }}
              onClick={() => {
                // Redirect to the appropriate page based on plan.id
                router.push(plan.id === "weekly" ? "/weekly-meal" : "/daily-delivery");
              }}
            >
              <motion.div 
                className="relative h-full w-full overflow-hidden"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Image 
                  src={plan.imagePath} 
                  alt={language === 'en' ? plan.title.en : plan.title.zh} 
                  fill
                  className="object-cover transition-transform duration-[1.5s]"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
              </motion.div>
              
              <div className="absolute inset-x-0 bottom-0 z-20 p-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.9 + index * 0.2 }}
                  className="space-y-4"
                >
                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {plan.title[language]}
                  </h3>
                  <p className="text-white/90 text-sm sm:text-base max-w-md">
                    {plan.description[language]}
                  </p>
                  <div className="overflow-hidden h-px w-full opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                      initial={{ x: "-100%" }}
                      whileInView={{ x: "0%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7 }}
                    ></motion.div>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center text-white text-sm font-medium">
                      {language === 'en' ? 'Select this plan' : '选择此计划'} 
                      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-1 md:col-span-2 flex items-center justify-center h-[400px]">
              <div className="text-center text-[#6B5F53] text-lg md:text-xl opacity-70">
                {language === 'en' ? 'Please select a location to view available meal plans' : '请选择位置以查看可用的餐饮计划'}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
