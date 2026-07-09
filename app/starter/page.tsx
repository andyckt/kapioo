"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronLeft, MapPin } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useSmartBack } from "@/hooks/use-smart-back"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { Button } from "@/components/ui/button"
import { ServiceSelectionCards } from "@/components/service-selection-cards"
import type { ParsedGoogleAddress } from "@/lib/address/types"
import {
  getStarterAddressSelection,
  setStarterAddressSelection,
} from "@/lib/plan-flow-state"
import { resolveServiceability, type ServiceabilityResult } from "@/lib/zones/service-areas"

export default function StarterPage() {
  const router = useRouter()
  const handleBack = useSmartBack()
  const [streetAddress, setStreetAddress] = useState(() => {
    if (typeof window === 'undefined') return ""
    return getStarterAddressSelection()?.streetAddress || ""
  })
  const [postalCode, setPostalCode] = useState(() => {
    if (typeof window === 'undefined') return ""
    return getStarterAddressSelection()?.postalCode || ""
  })
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(() => {
    if (typeof window === 'undefined') return null
    const saved = getStarterAddressSelection()
    return saved
      ? {
          areaLabel: saved.areaLabel,
          fsa: saved.fsa,
          canDaily: saved.canDaily,
          canWeekly: saved.canWeekly,
          isServed: saved.canDaily || saved.canWeekly,
          coordsMissing: true,
        }
      : null
  })
  const [animationComplete, setAnimationComplete] = useState(false)
  const { language } = useLanguage()
  
  // Set animation complete after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])
  
  const handleAddressSelect = (result: ParsedGoogleAddress) => {
    const next = resolveServiceability({
      areaLabel: result.address.province,
      postalCode: result.addressGeo.postalCode || result.address.postalCode,
      lat: result.addressGeo.lat,
      lng: result.addressGeo.lng,
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
    <div className="min-h-screen bg-[#FBF7F2] flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="container flex h-16 items-center px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-1 text-[#6B5F53] hover:text-[#C2884E] transition-colors rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'zh' ? '返回' : 'Back'}</span>
          </Button>
        </div>
      </header>
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
              {language === 'zh' ? '请输入配送地址，查看适用的 Kapioo 计划' : 'Enter your delivery address to see available meal plans'}
            </p>
          </motion.div>
          
          {/* Address Selector */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="rounded-xl border border-[#C2884E]/20 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-[#6B5F53]">
                <MapPin className="h-5 w-5 text-[#C2884E]" />
                <span className="font-medium">
                  {language === 'zh' ? '检查您的配送地址' : 'Check your delivery address'}
                </span>
              </div>
              <AddressAutocomplete
                value={streetAddress || ""}
                language={language}
                placeholder={language === 'zh' ? '输入配送地址...' : 'Enter delivery address...'}
                onInputChange={(value) => {
                  setStreetAddress(value)
                  setPostalCode("")
                  setServiceability(null)
                }}
                onAddressSelect={handleAddressSelect}
              />
            </div>
          </motion.div>
          
          {/* Service Options */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: serviceability ? 1 : 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-6"
          >
            {serviceability?.isServed && (
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
            )}

            {serviceability && !serviceability.isServed && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center text-amber-800">
                {language === 'zh'
                  ? '此地址暂不在配送范围内。请尝试其他地址，或稍后再查看服务范围更新。'
                  : 'This address is not in our current delivery area. Please try another address or check back as we expand coverage.'}
              </div>
            )}
            
            {/* No location selected state */}
            {!serviceability && animationComplete && (
              <motion.div 
                className="text-center py-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-[#6B5F53]/70 italic">
                  {language === 'zh' ? '请输入您的地址以查看可用的餐食计划' : 'Please enter your address to view available meal plans'}
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}