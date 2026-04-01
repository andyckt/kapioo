"use client"

import type { PaginationState } from "@/lib/types/pagination"

export type AdminOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "delivery"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "refunded"
  | string

export interface AdminOrderAddress {
  unitNumber?: string
  streetAddress?: string
  postalCode?: string
  country?: string
  buzzCode?: string
}

export interface AdminOrderCustomerInfo {
  name?: string
  email?: string
  phoneNumber?: string
  area?: string
  specialInstructions?: string
  deliveryAddress?: AdminOrderAddress
}

export interface AdminOrderUpdateLog {
  updatedAt?: string
  updatedBy?: string
  reason?: string
  previousCustomerInfo?: AdminOrderCustomerInfo
  newCustomerInfo?: AdminOrderCustomerInfo
  [key: string]: unknown
}

export interface AdminOrderItem {
  comboId?: string
  comboName?: string
  itemType?: string
  deliveryDate?: string
  quantity?: number
  [key: string]: unknown
}

export interface WeeklyEntitlementSummary {
  mealCount?: number
  deliveryCount?: number
  label?: string
  description?: string
  [key: string]: unknown
}

export interface LinkedWeeklyGroup {
  groupId?: string
  parentOrderId?: string
  childOrderIds?: string[]
  allocatedMealCount?: number
  [key: string]: unknown
}

export interface AdminOrder {
  _id: string
  orderId?: string
  userId?: string
  userEmail?: string
  customerName?: string
  customerEmail?: string
  name?: string
  email?: string
  phoneNumber?: string
  area?: string
  status: AdminOrderStatus
  createdAt?: string
  updatedAt?: string
  deliveryDate?: string
  deliveryAddress?: AdminOrderAddress
  specialInstructions?: string
  items?: AdminOrderItem[]
  effectiveCustomerInfo?: AdminOrderCustomerInfo
  orderCustomerOverrideLogs?: AdminOrderUpdateLog[]
  weeklyEntitlementSummary?: WeeklyEntitlementSummary
  weeklyEntitlementGroupId?: string
  linkedWeeklyGroup?: LinkedWeeklyGroup
  [key: string]: unknown
}

export interface AdminOrderFilters {
  status: string
  search: string
  area: string
  deliveryDate: string
  deliveryDateEnd: string
  comboName?: string
}

export interface AdminOrderOverrideForm extends AdminOrderCustomerInfo {
  name: string
  phoneNumber: string
  area: string
  specialInstructions: string
  deliveryAddress: Required<AdminOrderAddress>
}

export interface AdminOrderDeliveryDateOption {
  date: string
  day: string
  display: string
}

export interface AdminOrdersListResponse {
  orders: AdminOrder[]
  page: number
  limit: number
  total: number
  pages: number
}

export interface AdminOrdersState {
  orders: AdminOrder[]
  pagination: PaginationState
}

