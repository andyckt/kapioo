"use client"

import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"

type MenuUpdateBannerProps = {
  language: "en" | "zh"
  onRefresh: () => void
}

export function MenuUpdateBanner({ language, onRefresh }: MenuUpdateBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-2 border-[#C2884E] bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 p-4 shadow-sm"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#C2884E]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[#6B5F53]">
              {language === "zh" ? "菜单已更新！" : "Menu Updated!"}
            </p>
            <p className="text-sm text-[#6B5F53]/80">
              {language === "zh" ? "请点击刷新以查看最新内容" : "Please press to refresh"}
            </p>
          </div>
        </div>
        <Button
          onClick={onRefresh}
          className="flex w-full items-center gap-2 bg-[#C2884E] text-white hover:bg-[#B67A45] sm:w-auto"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          {language === "zh" ? "刷新菜单" : "Refresh Menu"}
        </Button>
      </div>
    </motion.div>
  )
}
