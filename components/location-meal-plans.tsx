"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useRouter } from "next/navigation"
import { DAILY_DELIVERY_AREAS, WEEKLY_ONLY_AREAS } from "@/lib/constants/areas"
import { setStarterLocation } from "@/lib/plan-flow-state"
import { ServiceSelectionCards } from "@/components/service-selection-cards"

// Location types - using centralized constants
type Location = (typeof DAILY_DELIVERY_AREAS)[number] | (typeof WEEKLY_ONLY_AREAS)[number]

// Group locations by service availability - using centralized constants
const FULL_SERVICE_LOCATIONS = [...DAILY_DELIVERY_AREAS] as Location[]
const WEEKLY_ONLY_LOCATIONS_TYPED = [...WEEKLY_ONLY_AREAS] as Location[]

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

  const hasDailyDelivery = (location: Location | ""): boolean => {
    if (!location) return false
    return FULL_SERVICE_LOCATIONS.includes(location as Location)
  }

  const hasWeeklyDelivery = (location: Location | ""): boolean => {
    if (!location) return false
    return (
      FULL_SERVICE_LOCATIONS.includes(location as Location) ||
      WEEKLY_ONLY_LOCATIONS_TYPED.includes(location as Location)
    )
  }

  // Location display names (no longer needed - using actual names)
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
  const allLocations: Location[] = [...FULL_SERVICE_LOCATIONS, ...WEEKLY_ONLY_LOCATIONS_TYPED]

  return (
    <section className="pt-12 md:pt-16 pb-20 md:pb-20 px-4 bg-gradient-to-b from-[#fff6ef] to-white relative overflow-visible">
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
          className="text-center max-w-3xl mx-auto mb-8 md:mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          ></motion.div>

          <motion.h2
            className="text-3xl md:text-5xl font-bold mb-4 relative inline-block"
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
              {t("mealPlanOptionsTitle")}
            </span>
            <motion.div
              className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C2884E]/0 via-[#C2884E]/70 to-[#C2884E]/0 origin-center"
              initial={{ scaleX: 0 }}
              animate={isVisible ? { scaleX: 1 } : {}}
              transition={{ duration: 1, delay: 0.7 }}
            />
          </motion.h2>

          <motion.p
            className="text-lg md:text-xl text-[#6B5F53] mt-6 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {t("selectAreaText")}
          </motion.p>
        </motion.div>

        {/* Location Selector */}
        <motion.div
          className="relative w-full max-w-md mx-auto mb-8 md:mb-16 z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="relative cursor-pointer" onClick={toggleDropdown}>
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2">
                <span className="text-[#6B5F53] font-medium text-xl md:text-2xl">{t("deliverToAreaLabel")}</span>
                <span className="text-[#C2884E] font-medium border-b-2 border-[#C2884E]/30 px-2 min-w-[120px] text-center text-xl md:text-2xl">
                  {getLocationDisplayName(selectedLocation) || <span className="text-transparent">___________</span>}
                </span>
                <ChevronDown
                  className={`h-5 w-5 ml-1 text-[#C2884E] transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
            </div>

            {/* Dropdown */}
            {isDropdownOpen && (
              <>
                {/* Backdrop overlay */}
                <div
                  className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsDropdownOpen(false)
                  }}
                />
                {/* Dropdown menu */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl border border-[#C2884E]/20 shadow-2xl overflow-hidden z-50 w-full max-w-sm">
                  <div className="max-h-80 overflow-y-auto py-2 scrollbar-hide">
                    {allLocations.map((location) => (
                      <div
                        key={location}
                        className={`px-6 py-3 hover:bg-[#C2884E]/5 transition-colors cursor-pointer flex items-center gap-3 ${
                          selectedLocation === location ? "bg-[#C2884E]/10 font-medium" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          selectLocation(location)
                        }}
                      >
                        {selectedLocation === location && (
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"></div>
                        )}
                        <span
                          className={`${selectedLocation === location ? "text-[#C2884E]" : "text-[#6B5F53]"}`}
                        >
                          {getLocationDisplayName(location)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedLocation ? 1 : 0 }}
          transition={{ duration: 0.7 }}
          className="space-y-6"
        >
          {selectedLocation ? (
            <ServiceSelectionCards
              showDaily={hasDailyDelivery(selectedLocation)}
              showWeekly={hasWeeklyDelivery(selectedLocation)}
              onSelectDaily={() => {
                setStarterLocation(selectedLocation)
                router.push("/daily-delivery")
              }}
              onSelectWeekly={() => {
                setStarterLocation(selectedLocation)
                router.push("/weekly-meal")
              }}
            />
          ) : isVisible ? (
            <motion.p
              className="text-center text-[#6B5F53]/70 italic max-w-5xl mx-auto py-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {language === "zh"
                ? "请选择您的位置以查看可用的餐食计划"
                : "Please select your location to view available meal plans"}
            </motion.p>
          ) : null}
        </motion.div>
      </div>
    </section>
  )
}
