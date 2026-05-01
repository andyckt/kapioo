"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { DAILY_DELIVERY_AREAS } from '@/lib/constants/areas'

// Use centralized daily delivery areas
const DAILY_DELIVERY_REGIONS = DAILY_DELIVERY_AREAS

interface RegionCheckDialogProps {
  open: boolean
  onClose: () => void
  currentRegion: string | undefined
}

export function RegionCheckDialog({
  open,
  onClose,
  currentRegion
}: RegionCheckDialogProps) {
  const { language } = useLanguage()
  const router = useRouter()

  const handleBack = () => {
    onClose()
    router.back()
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 sm:border-[#C2884E]/10 shadow-xl rounded-xl sm:rounded-[24px]">
        <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6 text-white h-[90px] flex flex-col justify-center">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {language === 'zh' ? '区域服务提示' : 'Service Area Notice'}
          </DialogTitle>
          <DialogDescription className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base font-light">
            {language === 'zh' ? '每日直送服务区域限制' : 'Daily Delivery Service Area Restriction'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-800 font-medium">
                  {language === 'zh' ? (
                    <>您当前选择的区域 <span className="font-bold">{currentRegion || "未设置"}</span> 不在每日直送服务范围内</>
                  ) : (
                    <>Your selected area <span className="font-bold">{currentRegion || "Not set"}</span> is not within the daily delivery service area</>
                  )}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  {language === 'zh' 
                    ? '每日直送服务目前仅限于以下区域：Downtown Toronto、Midtown、North York、Markham、Richmond Hill'
                    : 'Daily delivery service is currently limited to the following areas: Downtown Toronto, Midtown, North York, Markham, Richmond Hill'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-row flex-wrap justify-center gap-2 pt-4 border-t border-[#C2884E]/10 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-[#C2884E]/25 text-[#6B5F53] hover:bg-[#fff6ef]"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              {language === 'zh' ? '返回' : 'Back'}
            </Button>
            <Button 
              type="button"
              className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white px-8"
              onClick={onClose}
            >
              {language === 'zh' ? '我只是看看' : "I'm just browsing"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
