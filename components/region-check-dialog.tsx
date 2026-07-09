"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
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
import { productLineBracketZh, PRODUCT_LINE_LABELS } from '@/lib/product-lines/names'

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
  const router = useRouter()

  const daily = PRODUCT_LINE_LABELS.daily
  const weekly = PRODUCT_LINE_LABELS.weekly

  const handleBack = () => {
    onClose()
    router.back()
  }

  const handleGoWeekly = () => {
    onClose()
    router.push('/dashboard?tab=credits')
  }

  /* ── Scenario A: outside daily, but weekly is available ── */
  if (canWeekly) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-0 sm:border-[#C2884E]/10 shadow-xl rounded-xl sm:rounded-[24px]">
          <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-5 sm:p-6 text-white flex flex-col justify-center">
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
              {language === 'zh' ? '配送服务说明' : 'Delivery Availability'}
            </DialogTitle>
            <DialogDescription className="text-white/85 mt-1 text-sm font-light">
              {language === 'zh'
                ? '以下为您的地址目前可用的配送服务'
                : 'Delivery options available at your address'}
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Service availability rows */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {language === 'zh' ? productLineBracketZh('daily') : `【${daily.en}】`}
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {language === 'zh'
                      ? '暂不配送到此地址'
                      : 'Not available at this address'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    {language === 'zh' ? productLineBracketZh('weekly') : `【${weekly.en}】`}
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {language === 'zh'
                      ? '可配送到此地址'
                      : 'Available at this address'}
                  </p>
                </div>
              </div>
            </div>

            {/* Main message */}
            <div className="text-sm text-[#6B5F53] space-y-3 leading-relaxed">
              <p>
                {language === 'zh'
                  ? <>您选择的地址暂不在{productLineBracketZh('daily')}配送范围内，但 Kapioo 经典热卖的{productLineBracketZh('weekly')}仍可配送到您的地址。</>
                  : <>Your address is currently outside the {`【${daily.en}】`} delivery zone, but the popular {`【${weekly.en}】`} can still be delivered to you.</>}
              </p>
              <p className="text-xs text-[#8A7968]">
                {language === 'zh'
                  ? <>{productLineBracketZh('daily')}目前覆盖 Downtown Toronto、Midtown、North York、Markham 和 Richmond Hill 的部分地址。由于各区域内仍有部分地址暂未开放每日配送，您可以尝试更换地址后重新确认。</>
                  : <>{`【${daily.en}】`} currently covers selected addresses in Downtown Toronto, Midtown, North York, Markham and Richmond Hill. Coverage is based on your exact address — not the city name — so you can try a different address to check again.</>}
              </p>
              <p className="text-xs text-[#8A7968]">
                {language === 'zh'
                  ? <>{productLineBracketZh('weekly')}每周配送 2 次（周日 &amp; 周二），一次配送多餐，轻松覆盖整周。</>
                  : <>{`【${weekly.en}】`} delivers twice a week (Sunday &amp; Tuesday) with multiple meals per delivery, conveniently covering your whole week.</>}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#C2884E]/10">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-[#C2884E]/25 text-[#6B5F53] hover:bg-[#fff6ef]"
                onClick={handleBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                {language === 'zh' ? '返回' : 'Go back'}
              </Button>
              <Button
                type="button"
                className="flex-1 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white"
                onClick={handleGoWeekly}
              >
                {language === 'zh'
                  ? `查看${productLineBracketZh('weekly')}`
                  : `View 【${weekly.en}】`}
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
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-0 sm:border-[#C2884E]/10 shadow-xl rounded-xl sm:rounded-[24px]">
        <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-5 sm:p-6 text-white flex flex-col justify-center">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {language === 'zh' ? '暂不在服务范围内' : 'Outside Our Service Area'}
          </DialogTitle>
          <DialogDescription className="text-white/85 mt-1 text-sm font-light">
            {language === 'zh' ? '感谢您对 Kapioo 的支持' : 'Thank you for your interest in Kapioo'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                {language === 'zh' ? productLineBracketZh('daily') : `【${daily.en}】`}
                {language === 'zh' ? '：暂不配送到此地址' : ': Not available'}
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                {language === 'zh' ? productLineBracketZh('weekly') : `【${weekly.en}】`}
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
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              {language === 'zh' ? '返回' : 'Go back'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
