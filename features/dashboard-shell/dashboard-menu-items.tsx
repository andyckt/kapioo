"use client"

import type { ReactNode } from "react"

import { Calendar, CreditCard, Gift, History, Settings, ShoppingCart, User } from "lucide-react"

export interface DashboardMenuItem {
  id: string
  label: string
  icon: ReactNode
  isHeading?: boolean
  children?: DashboardMenuItem[]
}

interface DashboardMenuLabels {
  overview: string
  myOrders: string
  settings: string
}

export function getDashboardMenuItems(
  language: "en" | "zh",
  labels: DashboardMenuLabels
): DashboardMenuItem[] {
  return [
    { id: "overview", label: labels.overview, icon: <User className="h-4 w-4" /> },
    { id: "orders", label: labels.myOrders, icon: <History className="h-4 w-4" /> },
    {
      id: "weekly-subscription-group",
      label: language === "zh" ? "周次Meal Box" : "Weekly Meal Box",
      icon: <Gift className="h-4 w-4" />,
      isHeading: true,
      children: [
        {
          id: "weekly-subscription",
          label: language === "zh" ? "订餐" : "Start Ordering",
          icon: <ShoppingCart className="h-4 w-4" />,
        },
        {
          id: "credits",
          label: language === "zh" ? "充值" : "Recharge",
          icon: <CreditCard className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "daily-delivery-group",
      label: language === "zh" ? "每日直送" : "Daily Delivery",
      icon: <Calendar className="h-4 w-4" />,
      isHeading: true,
      children: [
        {
          id: "daily-delivery",
          label: language === "zh" ? "订餐" : "Start Ordering",
          icon: <ShoppingCart className="h-4 w-4" />,
        },
        {
          id: "meal-vouchers",
          label: language === "zh" ? "充值" : "Recharge",
          icon: <CreditCard className="h-4 w-4" />,
        },
      ],
    },
    { id: "settings", label: labels.settings, icon: <Settings className="h-4 w-4" /> },
  ]
}
