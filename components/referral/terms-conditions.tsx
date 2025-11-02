"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function TermsConditions() {
  const [open, setOpen] = useState(false)

  return (
    <section className="py-8 bg-[#F8F6F2] flex justify-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="border-[#975820] text-[#975820] hover:bg-[#975820]/10 hover:text-[#975820] flex items-center gap-2"
          >
            <span className="text-lg">📜</span> 查看活动条款与细则
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md md:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-[#2C3E2C] flex items-center justify-center gap-2">
              <span className="text-2xl">📜</span> Kapioo 推荐活动 · 条款与细则
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-3">
              {[
                "本活动仅适用于首次下单的新用户。",
                "推荐人与被推荐人均须完成真实有效订单方可获得奖励。",
                "被推荐用户的免费餐将在首单套餐的最后一餐发放；如套餐在使用完付费餐前取消或退款，免费餐资格将自动失效。",
                "推荐人奖励将在好友订单送达并超过 7 天退款期后发放，以确保订单有效性。",
                "奖励以阶段形式发放，每个阶段仅可领取一次对应奖励，不可叠加累计。",
                "免费餐奖励须在有效期内与下次套餐订单一起使用，逾期作废。",
                "如发现虚假订单、重复账号或其他滥用行为，Kapioo 有权取消相关奖励。",
                "每位用户最高可获得 10 顿免费餐奖励。",
                "Kapioo 保留对活动内容、奖励及条款的最终解释权与调整权。",
              ].map((item, index) => (
                <div key={index} className="flex gap-2">
                  <span className="font-semibold text-[#975820]">{index + 1}.</span>
                  <p className="text-[#2C3E2C]/90 flex-1">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
