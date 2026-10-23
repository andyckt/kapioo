"use client"

import { useLanguage } from "@/lib/language-context"
import { cn } from "@/lib/utils"
import { CreditCard, ShoppingBag } from "lucide-react"

interface OrderSectionNavigationProps {
  activeSection: "orders" | "recharges"
  onSectionChange: (section: "orders" | "recharges") => void
  /** Primary segmented control (compact) vs vertical rail for alternate layouts */
  variant?: "pill-row" | "sidebar"
}

/** Shared account history navigation. */
export function OrderSectionNavigation({
  activeSection,
  onSectionChange,
  variant = "pill-row",
}: OrderSectionNavigationProps) {
  const { language } = useLanguage()

  const orderLabel = language === "zh" ? "订餐历史" : "Order History"
  const rechargeLabel = language === "zh" ? "充值历史" : "Recharge History"

  if (variant === "sidebar") {
    return (
      <nav className="flex w-full flex-col gap-1 rounded-2xl border border-[#e6dacc] bg-[#fffcf7] p-1">
        <button
          type="button"
          onClick={() => onSectionChange("orders")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
            activeSection === "orders"
              ? "bg-[#4a3a2b] text-white"
              : "text-[#786a5b] hover:bg-[#eee5da] hover:text-[#4a3a2b]"
          )}
        >
          <ShoppingBag className="h-3.5 w-3.5 shrink-0 opacity-95" strokeWidth={2} />
          {orderLabel}
        </button>
        <button
          type="button"
          onClick={() => onSectionChange("recharges")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
            activeSection === "recharges"
              ? "bg-[#4a3a2b] text-white"
              : "text-[#786a5b] hover:bg-[#eee5da] hover:text-[#4a3a2b]"
          )}
        >
          <CreditCard className="h-3.5 w-3.5 shrink-0 opacity-95" strokeWidth={2} />
          {rechargeLabel}
        </button>
      </nav>
    )
  }

  return (
    <div className="w-full max-w-[390px]">
      <div
        className={cn(
          "flex w-full rounded-full border border-[#e6dacc] bg-[#eee6dd] p-1"
        )}
      >
        <button
          type="button"
          onClick={() => onSectionChange("orders")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-all duration-200 sm:gap-1.5 sm:px-3 sm:text-[13px]",
            "outline-none [-webkit-tap-highlight-color:transparent]",
            "focus-visible:ring-2 focus-visible:ring-[#9f7254]/40 focus-visible:ring-offset-0",
            activeSection === "orders"
              ? "bg-[#4a3a2b] text-white"
              : "text-[#786a5b] hover:bg-white/65 hover:text-[#4a3a2b]"
          )}
        >
          <ShoppingBag className="h-3 w-3 shrink-0 opacity-95 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
          {orderLabel}
        </button>

        <button
          type="button"
          onClick={() => onSectionChange("recharges")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-all duration-200 sm:gap-1.5 sm:px-3 sm:text-[13px]",
            "outline-none [-webkit-tap-highlight-color:transparent]",
            "focus-visible:ring-2 focus-visible:ring-[#9f7254]/40 focus-visible:ring-offset-0",
            activeSection === "recharges"
              ? "bg-[#4a3a2b] text-white"
              : "text-[#786a5b] hover:bg-white/65 hover:text-[#4a3a2b]"
          )}
        >
          <CreditCard className="h-3 w-3 shrink-0 opacity-95 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
          {rechargeLabel}
        </button>
      </div>
    </div>
  )
}
