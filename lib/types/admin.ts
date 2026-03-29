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

export interface CreditRequest {
  _id: string
  userId: string
  userName?: string
  userEmail?: string
  amount?: number
  status: "pending" | "approved" | "declined"
  planId?: string
  planLabel?: string
  proofOfPayment?: string
  adminNotes?: string
  createdAt: string
  updatedAt?: string
}

export interface AdminTransaction {
  _id: string
  userId: string
  type: string
  amount?: number
  description?: string
  createdAt: string
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
