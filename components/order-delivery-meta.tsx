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
      <p className="text-muted-foreground mb-2">
        <span className="font-medium text-foreground">{t("orderDeliveryDates")}</span> {datesText}
      </p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{t("orderDeliveryTime")}</span> {windowText}
      </p>
    </div>
  )
}
