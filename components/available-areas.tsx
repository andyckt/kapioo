"use client"

import React from 'react'
import { MapPin } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { cn } from '@/lib/utils'

interface AvailableAreasProps {
  className?: string
}

export function AvailableAreas({ className }: AvailableAreasProps) {
  const { language } = useLanguage()
  
  // Available service areas - exact same as in meal-voucher-purchase.tsx
  const serviceAreas = [
    'Downtown', 
    'Midtown', 
    'North York', 
    'Markham', 
    'Richmond Hill',
    'Vaughan', 
    'Mississauga', 
    'Oakville', 
    'Aurora', 
    'Newmarket'
  ]

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-[#C2884E]" />
        <p className="text-sm font-medium text-[#6B5F53]">
          {language === 'zh' ? '配送区域' : 'Available Areas'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {serviceAreas.map((area) => (
          <div 
            key={area} 
            className="px-3 py-1.5 text-xs font-medium text-[#6B5F53] hover:text-[#C2884E] transition-colors duration-300"
          >
            {area}
          </div>
        ))}
      </div>
    </div>
  )
}