import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

export function RewardTiers() {
  const tiers = [
    {
      stamps: 2,
      reward: "免费1餐",
      scale: 0.9,
      description: "开启你的集章之旅",
      gradient: "from-white to-[#F8F6F2]",
      highlight: false,
      tierName: "青铜",
      tierColor: "#CD7F32",
      animation: "hover:scale-105",
      glow: "hover:drop-shadow-[0_0_15px_rgba(205,127,50,0.3)]",
    },
    {
      stamps: 4,
      reward: "免费5餐",
      scale: 1.0,
      description: "一整周的美味！",
      gradient: "from-white via-[#F8F6F2] to-[#975820]/5",
      highlight: true,
      badge: "本周最热门",
      tierName: "白银",
      tierColor: "#C0C0C0",
      animation: "hover:scale-110",
      glow: "hover:drop-shadow-[0_0_20px_rgba(192,192,192,0.4)]",
    },
    {
      stamps: 6,
      reward: "免费8餐",
      scale: 1.05,
      description: "超值奖励等你来",
      gradient: "from-white via-[#F8F6F2] to-[#E8DCC8]",
      highlight: false,
      tierName: "黄金",
      tierColor: "#FFD700",
      animation: "hover:scale-110 hover:rotate-3",
      glow: "hover:drop-shadow-[0_0_25px_rgba(255,215,0,0.4)]",
    },
    {
      stamps: 8,
      reward: "免费12餐",
      scale: 1.1,
      description: "终极大奖",
      gradient: "from-[#975820]/10 via-[#F8F6F2] to-white",
      highlight: false,
      tierName: "铂金",
      tierColor: "#975820",
      animation: "hover:scale-115",
      glow: "hover:drop-shadow-[0_0_30px_rgba(151,88,32,0.5)]",
    },
  ]

  return (
    null
  )
}
