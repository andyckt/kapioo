"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

interface AvailableAreasProps {
  className?: string
}

export function AvailableAreas({ className = '' }: AvailableAreasProps) {
  const { language } = useLanguage()
  
  // Available service areas
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
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background gradient effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#F5EDE4]/30 to-[#F8F0E5]/10 rounded-xl blur-xl opacity-70"></div>
      
      {/* Content container */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] flex items-center justify-center shadow-sm">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-lg font-medium text-[#6B5F53]">
            {language === 'zh' ? '配送区域' : 'Available Areas'}
          </h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
          {serviceAreas.map((area, index) => (
            <motion.div 
              key={area}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#C2884E]/5 to-[#D1A46C]/5 rounded-lg transform group-hover:scale-105 transition-all duration-300"></div>
              <div className="relative flex items-center px-4 py-3 rounded-lg bg-white/80 backdrop-blur-sm border border-[#C2884E]/10 hover:border-[#C2884E]/30 transition-all duration-300 group-hover:shadow-md">
                <motion.div
                  initial={{ scale: 0.8 }}
                  whileHover={{ scale: 1.1 }}
                  className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] mr-2.5"
                ></motion.div>
                <span className="text-sm font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors duration-300">
                  {area}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
