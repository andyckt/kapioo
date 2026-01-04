"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export function AnnouncementBar() {
  const { language } = useLanguage()

  const message = language === 'zh' 
    ? '新年假期 • 配送服务将于1月11日恢复 • 2026新年快乐 ✨' 
    : 'New Year Break • Delivery Service Resumes January 11 • Happy 2026 ✨'

  return (
    <div className="relative w-full bg-gradient-to-r from-[#C2884E] via-[#D1A46C] to-[#C2884E] overflow-hidden">
      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
      
      <div className="relative overflow-hidden py-2.5">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: [0, -1000],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 25,
              ease: "linear",
            },
          }}
        >
          {/* Repeat the message multiple times for seamless loop */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center mx-8">
              <Sparkles className="h-4 w-4 text-white/90 mr-2 flex-shrink-0" />
              <span className="text-white font-medium text-sm tracking-wide">
                {message}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Add shimmer animation to globals.css */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  )
}

