"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"

interface ServiceSelectionCardsProps {
  onSelectDaily?: () => void
  onSelectWeekly?: () => void
  showDaily?: boolean
  showWeekly?: boolean
  className?: string
}

export function ServiceSelectionCards({ 
  onSelectDaily, 
  onSelectWeekly,
  showDaily = true,
  showWeekly = true,
  className = ""
}: ServiceSelectionCardsProps) {
  const { language } = useLanguage()
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className={className}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Daily Delivery Option */}
        {showDaily && (
          <motion.div 
            className="group relative rounded-2xl overflow-hidden shadow-xl h-[400px] transform transition-all duration-700 before:absolute before:inset-0 before:border-2 before:border-transparent before:rounded-2xl before:z-10 hover:before:border-[#C2884E]/40 before:transition-all before:duration-300 cursor-pointer"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            whileHover={{ 
              boxShadow: "0 25px 50px -12px rgba(194, 136, 78, 0.25)"
            }}
            onClick={onSelectDaily}
          >
            <motion.div 
              className="relative h-full w-full overflow-hidden"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Image 
                src="/dailystarter.jpg" 
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
                  <Button 
                    className="bg-white hover:bg-white/90 text-[#C2884E] hover:text-[#C2884E] hover:scale-105 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectDaily?.()
                    }}
                  >
                    {language === 'zh' ? '选择此计划' : 'Select This Plan'}
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
        {showWeekly && (
          <motion.div 
            className="group relative rounded-2xl overflow-hidden shadow-xl h-[400px] transform transition-all duration-700 before:absolute before:inset-0 before:border-2 before:border-transparent before:rounded-2xl before:z-10 hover:before:border-[#C2884E]/40 before:transition-all before:duration-300 cursor-pointer"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            whileHover={{ 
              boxShadow: "0 25px 50px -12px rgba(194, 136, 78, 0.25)"
            }}
            onClick={onSelectWeekly}
          >
            <motion.div 
              className="relative h-full w-full overflow-hidden"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Image 
                src="/weeklyplan.png" 
                alt={language === 'zh' ? '周次 MealBox' : 'Weekly MealBox'} 
                fill
                className="object-cover transition-transform duration-[1.5s]"
                objectPosition="center bottom"
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
                  <Button 
                    className="bg-white hover:bg-white/90 text-[#C2884E] hover:text-[#C2884E] hover:scale-105 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectWeekly?.()
                    }}
                  >
                    {language === 'zh' ? '选择此计划' : 'Select This Plan'}
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
    </motion.div>
  )
}

