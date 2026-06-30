"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MapPin } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useRouter } from "next/navigation"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import type { ParsedGoogleAddress } from "@/lib/address/types"
import { setStarterAddressSelection } from "@/lib/plan-flow-state"
import { resolveServiceability, type ServiceabilityResult } from "@/lib/zones/service-areas"
import { ServiceSelectionCards } from "@/components/service-selection-cards"

export default function LocationMealPlans() {
  const router = useRouter()
  const [streetAddress, setStreetAddress] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { language, t } = useLanguage()

  // Set visibility for animation
  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleAddressSelect = (result: ParsedGoogleAddress) => {
    const next = resolveServiceability({
      areaLabel: result.address.province,
      postalCode: result.addressGeo.postalCode || result.address.postalCode,
    })
    setStreetAddress(result.address.streetAddress || "")
    setPostalCode(result.addressGeo.postalCode || result.address.postalCode || "")
    setServiceability(next)
  }

  const saveStarterSelection = () => {
    if (!serviceability) return
    setStarterAddressSelection({
      areaLabel: serviceability.areaLabel,
      postalCode,
      fsa: serviceability.fsa,
      streetAddress: streetAddress || undefined,
      canDaily: serviceability.canDaily,
      canWeekly: serviceability.canWeekly,
    })
  }

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
            {language === "zh"
              ? "请输入配送地址，查看适用的餐食计划"
              : "Enter your delivery address to see available meal plans"}
          </motion.p>
        </motion.div>

        {/* Address Selector */}
        <motion.div
          className="relative w-full max-w-md mx-auto mb-8 md:mb-16 z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="rounded-xl border border-[#C2884E]/20 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-[#6B5F53]">
              <MapPin className="h-5 w-5 text-[#C2884E]" />
              <span className="font-medium">
                {language === "zh" ? "检查您的配送地址" : "Check your delivery address"}
              </span>
            </div>
            <AddressAutocomplete
              value={streetAddress}
              language={language}
              placeholder={language === "zh" ? "输入配送地址..." : "Enter delivery address..."}
              onInputChange={(value) => {
                setStreetAddress(value)
                setPostalCode("")
                setServiceability(null)
              }}
              onAddressSelect={handleAddressSelect}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: serviceability ? 1 : 0 }}
          transition={{ duration: 0.7 }}
          className="space-y-6"
        >
          {serviceability?.isServed ? (
            <ServiceSelectionCards
              showDaily={serviceability.canDaily}
              showWeekly={serviceability.canWeekly}
              onSelectDaily={() => {
                saveStarterSelection()
                router.push("/daily-delivery")
              }}
              onSelectWeekly={() => {
                saveStarterSelection()
                router.push("/weekly-meal")
              }}
            />
          ) : serviceability ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-center text-amber-800">
              {language === "zh"
                ? "此地址暂不在配送范围内。请尝试其他地址，或稍后再查看服务范围更新。"
                : "This address is not in our current delivery area. Please try another address or check back as we expand coverage."}
            </div>
          ) : isVisible ? (
            <motion.p
              className="text-center text-[#6B5F53]/70 italic max-w-5xl mx-auto py-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {language === "zh"
                ? "请输入您的地址以查看可用的餐食计划"
                : "Please enter your address to view available meal plans"}
            </motion.p>
          ) : null}
        </motion.div>
      </div>
    </section>
  )
}
