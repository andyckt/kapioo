"use client"

import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type OrderingInfoDialogProps = {
  language: "en" | "zh"
  orderType: "daily" | "weekly"
}

const menuAdjustmentCopy = {
  zh: {
    title: "菜单调整说明",
    paragraphs: [
      "为确保每一餐都符合 Kapioo 的食材与品质标准，如遇临时供应变化、食材短缺，或当日食材品质未达到我们的要求，厨房可能会将个别菜品替换为品质及搭配相近的其他菜品，恕不另行通知。",
      "我们会尽量确保替换后的餐点在整体营养搭配、品质与价值上保持一致。",
    ],
  },
  en: {
    title: "Menu Adjustment Notice",
    paragraphs: [
      "To ensure every meal meets Kapioo’s ingredient and quality standards, the kitchen may replace individual dishes with alternatives of comparable quality and composition if there are unexpected supply changes, ingredient shortages, or if the ingredients available that day do not meet our standards. These substitutions may be made without prior notice.",
      "We will make every effort to ensure that any substituted meal remains consistent in its overall nutritional balance, quality, and value.",
    ],
  },
} as const

export function OrderingInfoDialog({ language, orderType }: OrderingInfoDialogProps) {
  const isChinese = language === "zh"
  const adjustmentCopy = menuAdjustmentCopy[language]
  const infoLabel = isChinese ? "查看订餐须知" : "View ordering information"

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={infoLabel}
          title={infoLabel}
          className="h-9 w-9 shrink-0 rounded-full border border-[#C2884E]/30 bg-[#FFF8F1] text-[#C2884E] shadow-sm transition-colors hover:border-[#C2884E]/50 hover:bg-[#F5EDE4] hover:text-[#A66F38] focus-visible:ring-[#C2884E] md:h-10 md:w-10"
        >
          <Info className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg gap-0 overflow-hidden border-[#C2884E]/15 p-0 shadow-2xl sm:rounded-2xl">
        <DialogHeader className="border-b border-[#C2884E]/15 bg-gradient-to-br from-[#FFF8F1] to-[#F5EDE4]/80 px-6 py-5 pr-14 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C2884E] text-white shadow-sm">
              <Info className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#6B5F53]">
                {isChinese ? "订餐须知" : "Ordering Information"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-[#6B5F53]/70">
                {isChinese ? "下单前请查看以下说明。" : "Please review the following details before ordering."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[min(65vh,560px)] space-y-5 overflow-y-auto px-6 py-5 text-left">
          {orderType === "daily" ? (
            <section className="rounded-xl border border-[#C2884E]/15 bg-[#FFF8F1] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C2884E] text-sm font-bold text-white">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-[#6B5F53]">
                    {isChinese ? "最低订餐要求" : "Minimum Order Requirement"}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6B5F53]/85">
                    {isChinese
                      ? "每个配送日每次下单至少选择 2 份餐食。"
                      : "A minimum of 2 meals is required for each delivery date."}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="text-base font-semibold text-[#C2884E]">
              {adjustmentCopy.title}
            </h3>
            <div className="mt-2 space-y-3 text-sm leading-6 text-[#6B5F53]/85">
              {adjustmentCopy.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
