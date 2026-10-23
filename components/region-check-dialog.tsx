"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { PRODUCT_LINE_LABELS } from '@/lib/product-lines/names'

interface RegionCheckDialogProps {
  open: boolean
  onClose: () => void
  currentRegion?: string
  /**
   * true  → outside daily polygon, but inside weekly FSA list
   * false → outside both daily and weekly
   */
  canWeekly?: boolean
}

export function RegionCheckDialog({
  open,
  onClose,
  canWeekly = false,
}: RegionCheckDialogProps) {
  const { language } = useLanguage()
  const daily = PRODUCT_LINE_LABELS.daily
  const weekly = PRODUCT_LINE_LABELS.weekly

  const handleUpdateAddress = () => {
    onClose()
    window.location.href = '/dashboard?tab=settings'
  }

  const handleGoWeekly = () => {
    onClose()
    window.location.href = '/dashboard?tab=credits'
  }

  /* ── Scenario A: outside daily, but weekly is available ── */
  if (canWeekly) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="kp-address-dialog">
          <DialogHeader className="kp-address-dialog-header">
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
              {language === 'zh' ? '配送服务说明' : 'Delivery Availability'}
            </DialogTitle>
            <DialogDescription className="kp-address-dialog-description">
              {language === 'zh'
                ? '以下为您的地址目前可用的配送服务'
                : 'Delivery options available at your address'}
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Service availability rows */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 kp-availability-unavailable">
                <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {language === 'zh' ? daily.zh : daily.en}
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {language === 'zh'
                      ? '暂不配送到此地址'
                      : 'Not available at this address'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 kp-availability-available">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    {language === 'zh' ? weekly.zh : weekly.en}
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {language === 'zh'
                      ? '可配送到此地址'
                      : 'Available at this address'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {language === 'zh'
                      ? '每周配送 2 次，每次可收到多份餐食。'
                      : 'Two deliveries each week, with multiple meals in each delivery.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Main message */}
            <p className="text-xs text-[#8A7968] leading-relaxed">
              {language === 'zh'
                ? <>每日 Bento 覆盖 Downtown Toronto、Midtown、North York、Markham 和 Richmond Hill 的部分地址。更换地址后可重新查询。</>
                : <>Daily Bento serves selected addresses in Downtown Toronto, Midtown, North York, Markham, and Richmond Hill. Try another address to check availability.</>}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#C2884E]/10">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-[#C2884E]/25 text-[#6B5F53] hover:bg-[#fff6ef]"
                onClick={handleUpdateAddress}
              >
                <ArrowLeft className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                {language === 'zh' ? '更新地址' : 'Update address'}
              </Button>
              <Button
                type="button"
                className="flex-1 kp-address-primary"
                onClick={handleGoWeekly}
              >
                {language === 'zh'
                  ? `查看${weekly.zh}`
                  : `Explore ${weekly.en}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  /* ── Scenario B: outside both daily and weekly ── */
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="kp-address-dialog">
        <DialogHeader className="kp-address-dialog-header">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {language === 'zh' ? '暂不在服务范围内' : 'Outside Our Service Area'}
          </DialogTitle>
          <DialogDescription className="kp-address-dialog-description">
            {language === 'zh' ? '感谢您对 Kapioo 的支持' : 'Thank you for your interest in Kapioo'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 kp-availability-unavailable">
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                {language === 'zh' ? daily.zh : daily.en}
                {language === 'zh' ? '：暂不配送到此地址' : ': Not available'}
              </p>
            </div>
            <div className="flex items-start gap-3 p-4 kp-availability-unavailable">
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                {language === 'zh' ? weekly.zh : weekly.en}
                {language === 'zh' ? '：暂不配送到此地址' : ': Not available'}
              </p>
            </div>
          </div>

          <p className="text-sm text-[#6B5F53] leading-relaxed">
            {language === 'zh'
              ? '您选择的地址暂不在 Kapioo 当前服务范围内，但我们很快会努力覆盖到更多区域！非常感谢您的支持～'
              : 'Your address is not within Kapioo\'s current service area, but we\'re working hard to expand! Thank you so much for your support.'}
          </p>

          <div className="flex justify-center pt-2 border-t border-[#C2884E]/10">
            <Button
              type="button"
              variant="outline"
              className="border-[#C2884E]/25 text-[#6B5F53] hover:bg-[#fff6ef] px-8"
              onClick={handleUpdateAddress}
            >
              <ArrowLeft className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              {language === 'zh' ? '更新地址' : 'Update address'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
