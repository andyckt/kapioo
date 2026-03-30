export interface AdminUserAddress {
  unitNumber?: string
  streetAddress?: string
  province?: string
  postalCode?: string
  country?: string
  buzzCode?: string
}

export interface AdminUser {
  _id: string
  userID?: string
  name: string
  email: string
  phone?: string
  role: string
  joined?: string
  address?: AdminUserAddress
  credits?: number
  twoDishVoucher?: number
  threeDishVoucher?: number
  weeklySIXmeals?: number
  weeklyEIGHTmeals?: number
  weeklyTENmeals?: number
  weeklyTWELVEmeals?: number
  weeklyFOURTEENmeals?: number
  weeklySIXTEENmeals?: number
  dailyOrdersCount?: number
  weeklyOrdersCount?: number
  totalOrderCount?: number
}

export type CreditRequestStatus = "pending" | "approved" | "declined"

export type CreditRequestPaymentMethod = "wechat" | "emt" | string

export interface CreditRequestUserSummary {
  _id?: string
  userID?: string
  name?: string
  email?: string
}

export interface CreditRequest {
  _id: string
  requestId?: string
  userId?: string | CreditRequestUserSummary | null
  userName?: string
  userEmail?: string
  amount?: number
  status: CreditRequestStatus
  planId?: string
  planLabel?: string
  planDescription?: string
  mealPlanType?: string
  mealPlanQuantity?: number
  paymentMethod?: CreditRequestPaymentMethod
  referenceNumber?: string
  promoCode?: string
  promoDiscountAmount?: number
  mealSubtotal?: number
  originalSubtotal?: number
  originalPrice?: number
  deliveryFeeTotal?: number
  deliveryFeePerWeek?: number
  taxAmount?: number
  finalTotal?: number
  notes?: string
  imageProof?: string
  proofOfPayment?: string
  adminNotes?: string
  createdAt: string
  approvedAt?: string
  declinedAt?: string
  updatedAt?: string
}

export interface AdminTransaction {
  _id: string
  transactionId?: string
  userId?: string
  type: string
  amount?: number
  description?: string
  createdAt: string
}

export interface AdminDateRange {
  startDate?: Date
  endDate?: Date
}

export interface UserActivity {
  _id: string
  activityType?: string
  type?: string
  title?: string
  details?: string
  status?: string
  date?: string
  description?: string
  createdAt?: string
  metadata?: Record<string, unknown>
}
