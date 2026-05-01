"use client"

import { AlertCircle, CheckCircle, Clock, RefreshCcw, Truck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/language-context"

function normalizeCustomerOrderStatus(raw: unknown): string {
  if (typeof raw !== "string") return ""
  return raw.trim().toLowerCase()
}

/**
 * Customer-facing order status — warm, premium palette (not cold system UI).
 */
export function CustomerOrderStatusBadge({ status: rawStatus }: { status: string }) {
  const { t } = useLanguage()
  const status = normalizeCustomerOrderStatus(rawStatus)

  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border-[#E8C9A0]/90 bg-[#FFF4E8] px-2.5 py-1 text-[11px] font-semibold text-[#A06A28] shadow-sm sm:text-xs"
        >
          <Clock className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
          {t("pendingStatus")}
        </Badge>
      )
    case "confirmed":
      return (
        <Badge
          variant="outline"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border-[#B8C8DC]/90 bg-[#EEF3FA] px-2.5 py-1 text-[11px] font-semibold text-[#4A6689] shadow-sm sm:text-xs"
        >
          <CheckCircle className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
          {t("confirmedStatus")}
        </Badge>
      )
    case "delivery":
    case "out-for-delivery":
      return (
        <Badge
          variant="outline"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border-[#C9B8DC]/85 bg-[#F3EEF9] px-2.5 py-1 text-[11px] font-semibold text-[#5D4A78] shadow-sm sm:text-xs"
        >
          <Truck className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
          {t("deliveryStatus")}
        </Badge>
      )
    case "delivered":
      return (
        <Badge
          variant="outline"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border-[#B4D4BE]/90 bg-[#EDF6F0] px-2.5 py-1 text-[11px] font-semibold text-[#2E6B45] shadow-sm sm:text-xs"
        >
          <CheckCircle className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
          {t("deliveredStatus")}
        </Badge>
      )
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border-[#E0B8B8]/90 bg-[#F9EFEF] px-2.5 py-1 text-[11px] font-semibold text-[#984545] shadow-sm sm:text-xs"
        >
          <AlertCircle className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
          {t("cancelledStatus")}
        </Badge>
      )
    case "refunded":
      return (
        <Badge
          variant="outline"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border-[#E5C4A8]/90 bg-[#FBF1E8] px-2.5 py-1 text-[11px] font-semibold text-[#9A5F2A] shadow-sm sm:text-xs"
        >
          <RefreshCcw className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
          {t("refundedStatus")}
        </Badge>
      )
    default:
      return (
        <Badge
          variant="outline"
          className="inline-flex shrink-0 rounded-full border-[#D8CFC4]/90 bg-[#F5F0EA] px-2.5 py-1 text-[11px] font-semibold text-[#6B6056] sm:text-xs"
        >
          {rawStatus || "—"}
        </Badge>
      )
  }
}
