"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/language-context"
import { cn } from "@/lib/utils"
import { ShoppingBag, CreditCard } from "lucide-react"

interface OrderSectionNavigationProps {
  activeSection: 'orders' | 'recharges'
  onSectionChange: (section: 'orders' | 'recharges') => void
}

export function OrderSectionNavigation({ activeSection, onSectionChange }: OrderSectionNavigationProps) {
  const { language } = useLanguage()
  
  return (
    <div className="mb-6">
      <div className="flex justify-center md:justify-start">
        <div className="bg-muted/30 rounded-full p-1 flex">
          <button
            onClick={() => onSectionChange('orders')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              activeSection === 'orders' 
                ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-sm" 
                : "text-[#6B5F53] hover:bg-muted"
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            {language === 'zh' ? '订餐历史' : 'Order History'}
          </button>
          
          <button
            onClick={() => onSectionChange('recharges')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              activeSection === 'recharges' 
                ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-sm" 
                : "text-[#6B5F53] hover:bg-muted"
            )}
          >
            <CreditCard className="h-4 w-4" />
            {language === 'zh' ? '充值历史' : 'Recharge History'}
          </button>
        </div>
      </div>
    </div>
  )
}
