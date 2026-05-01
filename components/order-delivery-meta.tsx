"use client"

import { useLanguage } from "@/lib/language-context"
import {
  formatDeliveryDatesList,
  getStandardDeliveryWindow,
  uniqueDeliveryDatesFromOrderItems,
} from "@/lib/user-order-delivery-display"

type OrderDeliveryMetaProps = {
  items: Array<{ date?: string }> | undefined | null
  service: "daily" | "weekly"
  className?: string
}

export function OrderDeliveryMeta({ items, service, className }: OrderDeliveryMetaProps) {
  const { t, language } = useLanguage()
  const dates = uniqueDeliveryDatesFromOrderItems(items)
  const datesText = formatDeliveryDatesList(dates, language)
  const windowText = getStandardDeliveryWindow(service, language)

  return (
    <div className={className ?? "mt-1.5 text-sm"}>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-[#4A3F36]">{t("orderDeliveryDates")}</p>
          <p className="mt-1 text-sm font-medium leading-snug text-[#3D3630]">{datesText}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[#4A3F36]">{t("orderDeliveryTime")}</p>
          <p className="mt-1 text-sm font-medium leading-snug text-[#3D3630]">{windowText}</p>
        </div>
      </div>
    </div>
  )
}
