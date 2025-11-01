"use client"

import { MessageCircle, Smartphone, Gift } from "lucide-react"
import { Card } from "@/components/ui/card"

export function HowItWorks() {
  const steps = [
    {
      icon: MessageCircle,
      emoji: "🤝",
      title: "获取并分享你的推荐码",
      description: "推荐码格式：Kapi_ + 你的微信账号前4位（例如：Kapi_ABCD）",
      details: ["直接发送给朋友", "或在小红书、朋友圈贴文中附上推荐码"],
      example: '"我最近在吃 Kapioo，每天都超好吃！用我的推荐码 Kapi_ABCD，你能免费吃 1 餐 🍱"',
      color: "from-[#975820]/10 to-[#975820]/5",
      iconBg: "bg-[#975820]",
    },
    {
      icon: Smartphone,
      emoji: "🍱",
      title: "好友下单时告知客服推荐码",
      description: "好友通过微信客服下单时，在聊天中提供你的推荐码",
      details: ["客服会帮好友完成下单并记录推荐关系"],
      example: "客服确认推荐码后，订单即可完成",
      color: "from-[#B78C5B]/10 to-[#B78C5B]/5",
      iconBg: "bg-[#B78C5B]",
    },
    {
      icon: Gift,
      emoji: "🌿",
      title: "订单完成后自动发放奖励",
      description: "当好友首单送达后，双方都能获得免费餐奖励",
      details: [
        "你的好友获得：1 顿免费餐",
        "你获得的奖励：",
        "  • 推荐 1 人 = 免费 1 餐",
        "  • 推荐 3 人 = 免费 6 餐",
        "  • 推荐 5 人 = 免费 10 餐",
      ],
      example: "客服将在 24–48 小时内确认并发放奖励",
      color: "from-[#C6D8C0]/20 to-[#C6D8C0]/10",
      iconBg: "bg-[#C6D8C0]",
    },
  ]

  return (
    <section className="py-12 md:py-16 lg:py-24 bg-gradient-to-b from-white to-[#F8F6F2]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 md:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#2C3E2C] mb-3 md:mb-4 text-balance">
            🌿 如何参加
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-[#5A7C5A] max-w-2xl mx-auto text-pretty px-4">
            只需三步，让你和好友都能免费吃 Kapioo 🍱
          </p>
        </div>

        <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto mb-8 md:mb-12">
          {steps.map((step, index) => (
            <Card
              key={index}
              className={`p-4 sm:p-6 md:p-8 border-none shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl md:rounded-3xl bg-gradient-to-br ${step.color} group`}
            >
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <div className="relative">
                    <div
                      className={`${step.iconBg} w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
                    >
                      <step.icon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-[#975820] text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-md">
                      {index + 1}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#2C3E2C] mb-2 flex items-center justify-center sm:justify-start gap-2">
                      {step.title}
                      <span className="text-xl sm:text-2xl">{step.emoji}</span>
                    </h3>
                    <p className="text-sm sm:text-base text-[#5A7C5A] leading-relaxed text-pretty text-center sm:text-left">
                      {step.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {step.details.map((detail, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#975820] mt-2 flex-shrink-0" />
                        <p className="text-[#2C3E2C]/80 text-xs sm:text-sm md:text-base">{detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#975820]/10">
                    <p className="text-xs sm:text-sm md:text-base text-[#2C3E2C]/70 italic">💡 {step.example}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="max-w-3xl mx-auto px-4">
          <Card className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm border border-[#975820]/20 shadow-md rounded-xl sm:rounded-2xl">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="text-xl sm:text-2xl flex-shrink-0">💚</div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm md:text-base text-[#2C3E2C]/80 leading-relaxed">
                  <span className="font-semibold text-[#975820]">💡 隐私保护：</span>
                  推荐码由 &quot;Kapi_&quot; + 你的微信账号前4位组成，我们不会泄露你的微信信息，请放心分享
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
