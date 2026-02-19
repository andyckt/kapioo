"use client"

import React from 'react'
import { MapPin } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { cn } from '@/lib/utils'
import { ALL_WEEKLY_AREAS } from '@/lib/constants/areas'

interface AvailableAreasProps {
  className?: string
}

export function AvailableAreas({ className }: AvailableAreasProps) {
  const { language } = useLanguage()
  
  // Use centralized area list
  const serviceAreas = ALL_WEEKLY_AREAS

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-[#C2884E]" />
        <p className="text-sm font-medium text-[#6B5F53]">
          {language === 'zh' ? '配送区域' : 'Available Areas'}
        </p>
      </div>
      <div className="px-3 py-1.5 text-sm font-medium text-[#6B5F53]">
        {language === 'zh' ? '大多伦多地区全覆盖' : 'Greater Toronto Area Coverage'}
      </div>
    </div>
  )
}