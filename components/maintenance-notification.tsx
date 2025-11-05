"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { useMaintenanceMode } from "@/lib/maintenance-context"

export function MaintenanceNotification() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { language } = useLanguage()
  const { isMaintenanceMode } = useMaintenanceMode()
  const wechatId = "kapioomeal06"

  // Show popup after a short delay if maintenance mode is active
  useEffect(() => {
    if (isMaintenanceMode) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [isMaintenanceMode])

  const handleDismiss = () => {
    setIsOpen(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(wechatId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
        >
          <motion.div
            className="relative max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
              onClick={handleDismiss}
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Content */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-[#6B5F53] mb-3">
                {language === 'zh' ? '网站维护通知' : 'Website Maintenance Notice'}
              </h3>
              
              <p className="text-[#8A7968] mb-6">
                {language === 'zh' 
                  ? '您好，目前网站仍在修复当中，请您添加微信客服进行您的订单处理，抱歉为您带来的不便！' 
                  : 'Hello, our website is currently under maintenance. Please add our WeChat customer service to process your order. We apologize for any inconvenience!'}
              </p>
              
              {/* WeChat ID with copy button */}
              <div className="w-full bg-amber-50 rounded-lg p-4 flex items-center justify-between mb-6 border border-amber-100">
                <div className="flex items-center">
                  <img 
                    src="/wechatsmallicon.png" 
                    alt="WeChat" 
                    className="w-6 h-6 mr-3"
                  />
                  <span className="font-medium text-amber-800">{wechatId}</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              
              <Button
                className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white"
                onClick={handleDismiss}
              >
                {language === 'zh' ? '我知道了' : 'Got it'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
