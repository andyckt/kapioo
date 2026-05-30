"use client"

import type { ReactNode } from "react"

import {
  Calendar as CalendarIcon,
  CreditCard,
  DollarSign,
  Eye,
  Gift,
  Library,
  Mail,
  Package,
  Route,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  Truck,
  Users,
} from "lucide-react"

export interface AdminSidebarMenuItem {
  id: string
  label: string
  icon: ReactNode
  isHeading?: boolean
  children?: AdminSidebarMenuItem[]
}

export const adminSidebarMenuItems: AdminSidebarMenuItem[] = [
  { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
  {
    id: "food-management-group",
    label: "Food Management",
    icon: <CalendarIcon className="h-4 w-4" />,
    isHeading: true,
    children: [
      { id: "daily-delivery", label: "Daily Delivery", icon: <Truck className="h-4 w-4" /> },
      { id: "weekly-subscription", label: "Weekly Delivery", icon: <Gift className="h-4 w-4" /> },
      { id: "daily-combo-library", label: "Daily Combo Library", icon: <Library className="h-4 w-4" /> },
      { id: "weekly-combo-library", label: "Weekly Combo Library", icon: <Library className="h-4 w-4" /> },
      {
        id: "next-week-menu-email",
        label: "Next Week Menu Update Email",
        icon: <Mail className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "credit-request-group",
    label: "Credit Request",
    icon: <CreditCard className="h-4 w-4" />,
    isHeading: true,
    children: [
      { id: "credit-requests", label: "Weekly Request", icon: <DollarSign className="h-4 w-4" /> },
      { id: "promo-codes", label: "Promo Codes", icon: <Tag className="h-4 w-4" /> },
      { id: "meal-vouchers", label: "2Dish 3Dish Voucher", icon: <CreditCard className="h-4 w-4" /> },
      { id: "credits", label: "Manual +/- credit", icon: <CreditCard className="h-4 w-4" /> },
    ],
  },
  {
    id: "orders-group",
    label: "Orders",
    icon: <ShoppingCart className="h-4 w-4" />,
    isHeading: true,
    children: [
      { id: "view-all-orders", label: "View Daily Delivery Orders", icon: <Eye className="h-4 w-4" /> },
      { id: "delivery-agent", label: "Delivery Agent", icon: <Route className="h-4 w-4" /> },
      { id: "view-weekly-orders", label: "View Weekly Orders", icon: <CalendarIcon className="h-4 w-4" /> },
    ],
  },
  {
    id: "meal-ratings-group",
    label: "Meal Ratings",
    icon: <Star className="h-4 w-4" />,
    isHeading: true,
    children: [
      { id: "meal-feedback", label: "Feedback", icon: <Star className="h-4 w-4" /> },
      { id: "rating-dishes", label: "Rating Setup", icon: <Package className="h-4 w-4" /> },
    ],
  },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
]
