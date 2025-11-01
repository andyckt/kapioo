import type React from "react"
import type { Metadata } from "next"
import { Noto_Sans_SC } from "next/font/google"
// import { Analytics } from "@vercel/analytics/next"
import "../globals.css"

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Kapioo Calm Club 集章计划 | 邀请好友，免费吃一周",
  description: "加入Kapioo集章计划，推荐好友下单获得印章奖励，兑换免费餐食。本周双倍印章活动进行中！",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSansSC.variable} font-sans antialiased`}>
        {children}
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
