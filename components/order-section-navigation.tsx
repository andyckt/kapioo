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

/** Segmented control styling aligned with homepage / marketing (#C2884E · #D1A46C · #fff6ef). */
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
      <nav className="flex w-full flex-col gap-1 rounded-2xl border border-[#C2884E]/12 bg-[#fff6ef]/80 p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onSectionChange("orders")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
            activeSection === "orders"
              ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-sm"
              : "text-[#6B5F53] hover:bg-white/70 hover:text-[#3D342C]"
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
              ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-sm"
              : "text-[#6B5F53] hover:bg-white/70 hover:text-[#3D342C]"
          )}
        >
          <CreditCard className="h-3.5 w-3.5 shrink-0 opacity-95" strokeWidth={2} />
          {rechargeLabel}
        </button>
      </nav>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div
        className={cn(
          "flex w-full rounded-full border border-[#C2884E]/12 bg-[#fff6ef] p-0.5",
          "shadow-sm"
        )}
      >
        <button
          type="button"
          onClick={() => onSectionChange("orders")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-all duration-200 sm:gap-1.5 sm:px-3 sm:text-[13px]",
            "outline-none [-webkit-tap-highlight-color:transparent]",
            "focus-visible:ring-2 focus-visible:ring-[#C2884E]/30 focus-visible:ring-offset-0",
            activeSection === "orders"
              ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-sm"
              : "text-[#6B5F53] hover:bg-white/65 hover:text-[#3D342C]"
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
            "focus-visible:ring-2 focus-visible:ring-[#C2884E]/30 focus-visible:ring-offset-0",
            activeSection === "recharges"
              ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-sm"
              : "text-[#6B5F53] hover:bg-white/65 hover:text-[#3D342C]"
          )}
        >
          <CreditCard className="h-3 w-3 shrink-0 opacity-95 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
          {rechargeLabel}
        </button>
      </div>
    </div>
  )
}
