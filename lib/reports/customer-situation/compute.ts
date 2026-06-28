import { getWeeklyPlanBalanceRows } from "@/lib/plans/balances"
import { parseOrderItemDeliveryDate } from "@/lib/orders/upcoming-order-count"
import type {
  AnalysisPriority,
  ChurnByMonthRow,
  ChurnByPeriodRow,
  ChurnTimingAnalysis,
  CreditObligationRow,
  CustomerSituationRow,
  CustomerStatus,
  ExcludedAccountRow,
  OverallSummary,
  PlanChurnRow,
  RecommendedAction,
  SituationReport,
  StatusSummaryRow,
  ValidationResult,
} from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

const EXCLUDED_ORDER_STATUSES = new Set(["cancelled", "refunded"])

function toYMD(date: Date | null | undefined): string {
  if (!date) return ""
  try {
    return date.toISOString().split("T")[0]
  } catch {
    return ""
  }
}

function toYYYYMM(ymd: string): string {
  return ymd.length >= 7 ? ymd.slice(0, 7) : ""
}

function daysBetween(a: Date | null | undefined, b: Date | null | undefined): number | "" {
  if (!a || !b) return ""
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

function daysSince(date: Date | null | undefined, now: Date): number | "" {
  if (!date) return ""
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS))
}

function asDate(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function mode(values: string[]): string {
  const counts: Record<string, number> = {}
  for (const v of values) {
    if (v) counts[v] = (counts[v] ?? 0) + 1
  }
  let best = ""
  let bestCount = 0
  for (const [k, c] of Object.entries(counts)) {
    if (c > bestCount) {
      best = k
      bestCount = c
    }
  }
  return best
}

function avgOrBlank(nums: (number | "")[]): number | "" {
  const valid = nums.filter((n): n is number => typeof n === "number")
  if (valid.length === 0) return ""
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100
}

function pct(part: number, total: number): number | "" {
  if (total === 0) return ""
  return Math.round((part / total) * 10000) / 100
}

// ─── Internal / test user detection ───────────────────────────────────────────

const TEST_EMAIL_DOMAINS = new Set(["example.com", "test.com", "localhost", "example.org", "test.org"])

const TEST_PATTERNS = [
  /\btest\b/i,
  /\bdemo\b/i,
  /\bseed\b/i,
  /\binternal\b/i,
  /\bstaff\b/i,
  /\bfake\b/i,
  /\bbot\b/i,
  /\badmin\b/i,
  /\bautomation\b/i,
  /\bdev\b/i,
  /\bplayground\b/i,
  /\bsandbox\b/i,
]

function isTestEmailOrName(email: string, name: string): boolean {
  const atIdx = email.lastIndexOf("@")
  if (atIdx >= 0) {
    const domain = email.slice(atIdx + 1).toLowerCase()
    if (TEST_EMAIL_DOMAINS.has(domain)) return true
  }
  const localPart = atIdx >= 0 ? email.slice(0, atIdx) : email
  for (const pattern of TEST_PATTERNS) {
    if (pattern.test(localPart) || pattern.test(name)) return true
  }
  return false
}

const LEGACY_CUTOFF_DATE = new Date("2025-04-14T00:00:00.000Z")
const EXCLUDED_EXACT_NAMES = new Set(["y"])

function detectIsInternalTestUser(
  role: string,
  email: string,
  name: string,
  manualOrOtherCredits: number,
  totalAmountPaid: number,
  joinedDate: Date | null
): { isInternal: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (role === "admin") reasons.push("admin role")
  if (isTestEmailOrName(email, name)) reasons.push("test/demo/admin pattern in email or name")
  if (manualOrOtherCredits > 50 && totalAmountPaid === 0) {
    reasons.push(`high manual credits (${manualOrOtherCredits}) with no purchase history`)
  }
  if (joinedDate && joinedDate < LEGACY_CUTOFF_DATE) {
    reasons.push(`account created on or before 2025-04-13 (${joinedDate.toISOString().split("T")[0]})`)
  }
  if (EXCLUDED_EXACT_NAMES.has(name.trim().toLowerCase())) {
    reasons.push(`excluded name ("${name.trim()}")`)
  }
  return { isInternal: reasons.length > 0, reasons }
}

// ─── Plan label helpers ────────────────────────────────────────────────────────

const MEAL_PLAN_TYPE_LABEL: Record<string, string> = {
  "6aweek": "6 Meals Plan",
  "8aweek": "8 Meals Plan",
  "10aweek": "10 Meals Plan",
  "12aweek": "12 Meals Plan",
  "16aweek": "16 Meals Plan",
}

export const ALL_PLAN_TYPE_LABELS = [
  "2-Dish Voucher",
  "3-Dish Voucher",
  "6 Meals Plan",
  "8 Meals Plan",
  "10 Meals Plan",
  "12 Meals Plan",
  "16 Meals Plan",
  "Manual / Other Credits",
  "Unknown / No Plan",
] as const

function labelFromPlanId(planId: string): string {
  const weeklyMatch = /^weekly-(\d+)x/.exec(planId)
  if (weeklyMatch) return `${weeklyMatch[1]} Meals Plan`
  if (/^daily-2dish/.test(planId)) return "2-Dish Voucher"
  if (/^daily-3dish/.test(planId)) return "3-Dish Voucher"
  return ""
}

interface CreditReqLabelable {
  planId?: string
  mealPlanType?: string
  approvedPlans?: Array<{ planId: string; quantity: number }>
  approvedSixMeals?: number
  approvedEightMeals?: number
  approvedTenMeals?: number
  approvedTwelveMeals?: number
  approvedSixteenMeals?: number
  approvedCredits?: number
}

function labelCreditRequest(req: CreditReqLabelable): string {
  if (req.planId) {
    const l = labelFromPlanId(req.planId)
    if (l) return l
  }
  if (req.mealPlanType && MEAL_PLAN_TYPE_LABEL[req.mealPlanType]) return MEAL_PLAN_TYPE_LABEL[req.mealPlanType]
  if (Array.isArray(req.approvedPlans) && req.approvedPlans.length > 0) {
    const l = labelFromPlanId(req.approvedPlans[0].planId ?? "")
    if (l) return l
  }
  if ((req.approvedSixMeals ?? 0) > 0) return "6 Meals Plan"
  if ((req.approvedEightMeals ?? 0) > 0) return "8 Meals Plan"
  if ((req.approvedTenMeals ?? 0) > 0) return "10 Meals Plan"
  if ((req.approvedTwelveMeals ?? 0) > 0) return "12 Meals Plan"
  if ((req.approvedSixteenMeals ?? 0) > 0) return "16 Meals Plan"
  if ((req.approvedCredits ?? 0) > 0) return "Manual / Other Credits"
  return "Manual / Other Credits"
}

// ─── Churn period ──────────────────────────────────────────────────────────────

export const CHURN_PERIODS = [
  "Last 8–14 Days",
  "Last 15–30 Days",
  "Last 31–60 Days",
  "Last 61–90 Days",
  "90+ Days Ago",
] as const

function getChurnPeriod(daysSinceLastOrder: number | ""): string {
  if (typeof daysSinceLastOrder !== "number") return ""
  if (daysSinceLastOrder >= 8 && daysSinceLastOrder <= 14) return "Last 8–14 Days"
  if (daysSinceLastOrder >= 15 && daysSinceLastOrder <= 30) return "Last 15–30 Days"
  if (daysSinceLastOrder >= 31 && daysSinceLastOrder <= 60) return "Last 31–60 Days"
  if (daysSinceLastOrder >= 61 && daysSinceLastOrder <= 90) return "Last 61–90 Days"
  if (daysSinceLastOrder > 90) return "90+ Days Ago"
  return ""
}

// ─── Purchase history ──────────────────────────────────────────────────────────

interface PurchaseDetail {
  date: Date
  planLabel: string
  mealsCount: number
}

interface PurchaseData {
  totalAmountPaid: number
  purchaseCount: number
  mealsPurchased: number
  firstPurchaseDate: Date | null
  lastPurchaseDate: Date | null
  purchaseHistory: PurchaseDetail[] // chronologically sorted
}

// ─── Meals purchased from a credit purchase request ───────────────────────────

interface CreditReqLike extends CreditReqLabelable {
  approvedSixMeals?: number
  approvedEightMeals?: number
  approvedTenMeals?: number
  approvedTwelveMeals?: number
  approvedSixteenMeals?: number
  approvedCredits?: number
  approvedPlans?: Array<{ planId: string; quantity: number }>
  mealPlanType?: string
  mealPlanQuantity?: number
  finalTotal?: number
  amount?: number
}

const MEAL_COUNT_BY_PLAN_TYPE: Record<string, number> = {
  "6aweek": 6, "8aweek": 8, "10aweek": 10, "12aweek": 12, "16aweek": 16,
}

function mealsPurchasedFromCreditRequest(req: CreditReqLike): number {
  const structured =
    (req.approvedSixMeals ?? 0) * 6 +
    (req.approvedEightMeals ?? 0) * 8 +
    (req.approvedTenMeals ?? 0) * 10 +
    (req.approvedTwelveMeals ?? 0) * 12 +
    (req.approvedSixteenMeals ?? 0) * 16
  if (structured > 0) return structured
  if (Array.isArray(req.approvedPlans) && req.approvedPlans.length > 0) {
    let total = 0
    for (const p of req.approvedPlans) {
      const match = /^weekly-(\d+)x(\d+)$/.exec(p.planId ?? "")
      if (match) total += Number(match[1]) * Number(match[2]) * (p.quantity ?? 1)
    }
    if (total > 0) return total
  }
  if (req.mealPlanType && req.mealPlanQuantity) {
    const m = MEAL_COUNT_BY_PLAN_TYPE[req.mealPlanType] ?? 0
    if (m > 0) return m * req.mealPlanQuantity
  }
  if (req.approvedCredits && req.approvedCredits > 0) return req.approvedCredits
  return 0
}

// ─── User model shape ──────────────────────────────────────────────────────────

const WEEKLY_MEALS_MULTIPLIER: Record<number, number> = { 6: 6, 8: 8, 10: 10, 12: 12, 16: 16 }

interface UserLike {
  _id?: unknown
  userID?: string
  name?: string
  email?: string
  phone?: string
  role?: string
  joined?: unknown
  address?: {
    streetAddress?: string
    unitNumber?: string
    postalCode?: string
    province?: string
    country?: string
  }
  twoDishVoucher?: number
  threeDishVoucher?: number
  weeklySIXmeals?: number
  weeklyEIGHTmeals?: number
  weeklyTENmeals?: number
  weeklyTWELVEmeals?: number
  weeklySIXTEENmeals?: number
  planBalances?: unknown
  credits?: number
  area?: string
}

interface OrderLike {
  _id?: unknown
  userId?: unknown
  status?: string
  createdAt?: unknown
  items?: Array<{ date?: string; deliveryDate?: string; quantity?: number }>
  voucherCost?: { twoDish?: number; threeDish?: number }
  allocatedMealCount?: number
  creditCost?: number
  mealPlanType?: string
}

// ─── Remaining meals ──────────────────────────────────────────────────────────

function computeRemainingMeals(user: UserLike) {
  const balanceRows = getWeeklyPlanBalanceRows(user)
  const weeklyByMeals: Record<number, number> = {}
  for (const row of balanceRows) {
    weeklyByMeals[row.mealsPerWeek] = row.balance * (WEEKLY_MEALS_MULTIPLIER[row.mealsPerWeek] ?? row.mealsPerWeek)
  }
  const twoDish = Number(user.twoDishVoucher) || 0
  const threeDish = Number(user.threeDishVoucher) || 0
  const sixPlan = weeklyByMeals[6] ?? 0
  const eightPlan = weeklyByMeals[8] ?? 0
  const tenPlan = weeklyByMeals[10] ?? 0
  const twelvePlan = weeklyByMeals[12] ?? 0
  const sixteenPlan = weeklyByMeals[16] ?? 0
  const manualOrOther = Number(user.credits) || 0
  return {
    twoDish, threeDish, sixPlan, eightPlan, tenPlan, twelvePlan, sixteenPlan, manualOrOther,
    total: twoDish + threeDish + sixPlan + eightPlan + tenPlan + twelvePlan + sixteenPlan + manualOrOther,
  }
}

function getOrderMeals(order: OrderLike): number {
  if (order.voucherCost) {
    const vc = (order.voucherCost.twoDish ?? 0) + (order.voucherCost.threeDish ?? 0)
    if (vc > 0) return vc
  }
  if (order.allocatedMealCount && order.allocatedMealCount > 0) return order.allocatedMealCount
  if (order.creditCost && order.creditCost > 0) return order.creditCost
  if (Array.isArray(order.items)) {
    const total = order.items.reduce((s, item) => s + (item.quantity ?? 1), 0)
    if (total > 0) return total
  }
  return 0
}

function getLastPastDeliveryDate(order: OrderLike, now: Date): Date | null {
  if (!Array.isArray(order.items)) return null
  let latest: Date | null = null
  for (const item of order.items) {
    const raw = item.date ?? item.deliveryDate
    const d = parseOrderItemDeliveryDate(raw, order.createdAt, now)
    if (d && d.getTime() <= now.getTime()) {
      if (!latest || d.getTime() > latest.getTime()) latest = d
    }
  }
  return latest
}

// ─── Order metrics ─────────────────────────────────────────────────────────────

interface PerUserMetrics {
  totalOrders: number
  firstOrderDate: Date | null
  lastDeliveryDate: Date | null
  lastOrderCreatedAt: Date | null
  orders7: number
  orders14: number
  orders30: number
  totalMeals: number
}

function computeOrderMetrics(userOrders: OrderLike[], now: Date): PerUserMetrics {
  let firstOrderDate: Date | null = null
  let lastDeliveryDate: Date | null = null
  let lastOrderCreatedAt: Date | null = null
  let totalMeals = 0
  const cutoff7 = new Date(now.getTime() - 7 * DAY_MS)
  const cutoff14 = new Date(now.getTime() - 14 * DAY_MS)
  const cutoff30 = new Date(now.getTime() - 30 * DAY_MS)
  let orders7 = 0, orders14 = 0, orders30 = 0

  for (const order of userOrders) {
    const createdAt = asDate(order.createdAt)
    if (!firstOrderDate || (createdAt && createdAt < firstOrderDate)) firstOrderDate = createdAt
    if (createdAt && (!lastOrderCreatedAt || createdAt > lastOrderCreatedAt)) lastOrderCreatedAt = createdAt
    const lastDelivery = getLastPastDeliveryDate(order, now)
    if (lastDelivery && (!lastDeliveryDate || lastDelivery > lastDeliveryDate)) lastDeliveryDate = lastDelivery
    totalMeals += getOrderMeals(order)
    const activityDate = lastDelivery ?? createdAt
    if (activityDate) {
      if (activityDate >= cutoff7) orders7++
      if (activityDate >= cutoff14) orders14++
      if (activityDate >= cutoff30) orders30++
    }
  }
  return { totalOrders: userOrders.length, firstOrderDate, lastDeliveryDate, lastOrderCreatedAt, orders7, orders14, orders30, totalMeals }
}

// ─── Classification ────────────────────────────────────────────────────────────

function classifyStatus(
  totalOrders: number,
  totalCreditsRemaining: number,
  daysSinceLastOrder: number | "",
  totalAmountPaid: number,
  joinedDate: Date | null,
  now: Date
): CustomerStatus {
  const daysNoOrder = typeof daysSinceLastOrder === "number" ? daysSinceLastOrder : null
  const daysSinceCreated = joinedDate ? Math.floor((now.getTime() - joinedDate.getTime()) / DAY_MS) : null

  if (totalOrders > 0) {
    if (daysNoOrder !== null && daysNoOrder <= 7) return "Active"
    // Actual Churn REQUIRES credits = 0
    if (totalCreditsRemaining === 0 && daysNoOrder !== null && daysNoOrder > 7) return "Actual Churn"
    if (totalCreditsRemaining > 2 && (daysNoOrder === null || daysNoOrder > 7)) return "Paused With Credits"
    if (totalCreditsRemaining >= 1 && totalCreditsRemaining <= 2) return "At Risk"
    // Safe fallbacks — never misclassify as Actual Churn when credits > 0
    if (totalCreditsRemaining === 0) return "Actual Churn"
    if (totalCreditsRemaining > 2) return "Paused With Credits"
    return "At Risk"
  }

  if (totalCreditsRemaining > 0 || totalAmountPaid > 0) return "Converted Not Activated"
  if (daysSinceCreated !== null && daysSinceCreated <= 14) return "New Lead"
  return "Never Converted"
}

const RECOMMENDED_ACTION: Record<CustomerStatus, RecommendedAction> = {
  Active: "Normal menu update",
  "Actual Churn": "Winback / repurchase message",
  "Paused With Credits": "Soft credit reminder",
  "At Risk": "Top-up reminder",
  "Converted Not Activated": "Help place first order",
  "New Lead": "Gentle onboarding",
  "Never Converted": "First-order trial message",
}

function computePriority(
  status: CustomerStatus,
  totalCreditsRemaining: number,
  totalAmountPaid: number,
  highAmountPaidThreshold: number,
  daysSinceCreated: number
): AnalysisPriority {
  if (status === "Paused With Credits" && totalCreditsRemaining >= 10) return "High"
  if (status === "Actual Churn" && totalAmountPaid >= highAmountPaidThreshold && highAmountPaidThreshold > 0) return "High"
  if (status === "Converted Not Activated" && totalCreditsRemaining > 0) return "High"
  if (status === "At Risk") return "Medium"
  if (status === "Paused With Credits" && totalCreditsRemaining >= 3 && totalCreditsRemaining <= 9) return "Medium"
  if (status === "Never Converted" && daysSinceCreated <= 30) return "Medium"
  return "Low"
}

// ─── Main compute function ─────────────────────────────────────────────────────

export interface ComputeInputs {
  users: UserLike[]
  dailyOrders: OrderLike[]
  weeklyOrders: OrderLike[]
  purchaseByUser: Map<string, PurchaseData>
  lastCreditUsedByUser?: Map<string, Date>
}

export function buildSituationReport(inputs: ComputeInputs): SituationReport {
  const { users, dailyOrders, weeklyOrders, purchaseByUser, lastCreditUsedByUser } = inputs
  const now = new Date()

  // Group valid orders by userId string
  const ordersByUser = new Map<string, OrderLike[]>()
  for (const order of [...dailyOrders, ...weeklyOrders]) {
    if (EXCLUDED_ORDER_STATUSES.has(order.status ?? "")) continue
    const uid = String(order.userId)
    const existing = ordersByUser.get(uid) ?? []
    existing.push(order)
    ordersByUser.set(uid, existing)
  }

  // ── Pass 1: compute per-user data for ALL users ────────────────────────────

  type RawRow = CustomerSituationRow & {
    _totalAmountPaid: number
    _mealsPurchased: number
    _joinedDate: Date | null
    _firstOrderDateRaw: Date | null
    _lastOrderDateRaw: Date | null
    _firstPurchaseDateRaw: Date | null
    _lastPurchaseDateRaw: Date | null
    _daysSinceCreated: number
    _isInternal: boolean
    _exclusionReasons: string[]
  }

  const allRawRows: RawRow[] = []

  for (const user of users) {
    const uid = String(user._id)
    const userOrders = ordersByUser.get(uid) ?? []
    const om = computeOrderMetrics(userOrders, now)
    const credits = computeRemainingMeals(user)

    const purchase = purchaseByUser.get(uid) ?? {
      totalAmountPaid: 0,
      purchaseCount: 0,
      mealsPurchased: 0,
      firstPurchaseDate: null,
      lastPurchaseDate: null,
      purchaseHistory: [],
    }

    const totalAmountPaid = purchase.totalAmountPaid
    const totalCreditsPurchased = purchase.mealsPurchased
    const totalCreditsUsed = Math.max(0, totalCreditsPurchased - credits.total)

    // Resolve effective last order date with createdAt fallback
    let effectiveLastOrderDate = om.lastDeliveryDate
    let lastOrderDateApproximate = false
    let missingLastOrderDate = false
    if (!effectiveLastOrderDate && om.totalOrders > 0) {
      if (om.lastOrderCreatedAt) {
        effectiveLastOrderDate = om.lastOrderCreatedAt
        lastOrderDateApproximate = true
      } else {
        missingLastOrderDate = true
      }
    }
    const daysSinceLastOrder = daysSince(effectiveLastOrderDate, now)

    // Address
    const addr = user.address
    const addressParts: string[] = []
    if (addr?.unitNumber) addressParts.push(addr.unitNumber)
    if (addr?.streetAddress) addressParts.push(addr.streetAddress)
    if (addr?.postalCode) addressParts.push(addr.postalCode)
    const defaultDeliveryAddress = addressParts.join(", ")
    const cityOrArea = (user as Record<string, unknown>).area as string || addr?.province || ""

    const joinedDate = asDate(user.joined)
    const daysSinceCreatedNum = joinedDate ? Math.max(0, Math.floor((now.getTime() - joinedDate.getTime()) / DAY_MS)) : 0

    // Internal/test detection
    const { isInternal, reasons } = detectIsInternalTestUser(
      user.role ?? "user",
      user.email ?? "",
      user.name ?? "",
      credits.manualOrOther,
      totalAmountPaid,
      joinedDate
    )

    // Plan / purchase behaviour
    const history = purchase.purchaseHistory
    const firstPlan = history[0]
    const lastPlan = history[history.length - 1]
    const firstPlanType = firstPlan?.planLabel ?? ""
    const firstPlanDate = firstPlan?.date ?? null
    const lastPlanType = lastPlan?.planLabel ?? ""
    const lastPlanDate = lastPlan?.date ?? null
    const plansCount = history.length
    const repurchased: CustomerSituationRow["repurchased_after_first_plan"] =
      plansCount === 0 ? "" : plansCount > 1 ? "Yes" : "No"
    const creditsInFirstPlan: number | "" = firstPlan ? firstPlan.mealsCount : ""

    // Credit usage / churn timing
    const lastCreditUsedDate = lastCreditUsedByUser?.get(uid) ?? null
    const status = classifyStatus(om.totalOrders, credits.total, daysSinceLastOrder, totalAmountPaid, joinedDate, now)
    const churnMonth = status === "Actual Churn" ? toYYYYMM(toYMD(effectiveLastOrderDate)) : ""
    const churnPeriod = status === "Actual Churn" ? getChurnPeriod(daysSinceLastOrder) : ""

    // Timing differences
    const firstOrderYMD = toYMD(om.firstOrderDate ?? undefined)
    const lastOrderYMD = toYMD(effectiveLastOrderDate ?? undefined)
    const firstPurchaseYMD = toYMD(purchase.firstPurchaseDate ?? undefined)
    const lastPurchaseYMD = toYMD(purchase.lastPurchaseDate ?? undefined)

    // Data quality flags
    const hasUnrealisticBalance = credits.total > 100 || credits.manualOrOther > 50
    const issues: string[] = []
    if (isInternal) issues.push("admin/internal account")
    if (hasUnrealisticBalance) {
      issues.push(totalAmountPaid > 0 ? "verify high credit real customer" : "unrealistic credit balance — no purchases")
    }
    if (credits.total > 50 && totalAmountPaid === 0 && om.totalOrders === 0) {
      issues.push("high credits, no purchases or orders")
    }
    if (lastOrderDateApproximate) issues.push("last_order_date uses order placement date (no past delivery date found)")
    if (missingLastOrderDate) issues.push("Missing last_order_date despite total_orders > 0")

    allRawRows.push({
      user_id: user.userID ?? uid,
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      created_date: toYMD(joinedDate ?? undefined),
      days_since_created: daysSinceCreatedNum,
      city_or_area: cityOrArea,
      default_delivery_address: defaultDeliveryAddress,
      total_orders: om.totalOrders,
      first_order_date: firstOrderYMD,
      first_order_month: toYYYYMM(firstOrderYMD),
      last_order_date: lastOrderYMD,
      last_order_month: toYYYYMM(lastOrderYMD),
      days_since_last_order: daysSinceLastOrder,
      orders_last_7_days: om.orders7,
      orders_last_14_days: om.orders14,
      orders_last_30_days: om.orders30,
      total_meals_ordered: om.totalMeals,
      average_meals_per_order: om.totalOrders > 0 ? Math.round((om.totalMeals / om.totalOrders) * 100) / 100 : "",
      days_from_signup_to_first_order: daysBetween(joinedDate, om.firstOrderDate),
      days_from_first_order_to_last_order: daysBetween(om.firstOrderDate, effectiveLastOrderDate),
      total_purchase_count: purchase.purchaseCount,
      first_purchase_date: firstPurchaseYMD,
      first_purchase_month: toYYYYMM(firstPurchaseYMD),
      last_purchase_date: lastPurchaseYMD,
      last_purchase_month: toYYYYMM(lastPurchaseYMD),
      days_since_last_purchase: daysSince(purchase.lastPurchaseDate ?? undefined, now),
      total_amount_paid: totalAmountPaid,
      days_from_signup_to_first_purchase: daysBetween(joinedDate, purchase.firstPurchaseDate),
      days_from_first_purchase_to_first_order: daysBetween(purchase.firstPurchaseDate, om.firstOrderDate),
      days_from_first_purchase_to_last_order: daysBetween(purchase.firstPurchaseDate, effectiveLastOrderDate),
      days_from_last_purchase_to_last_order: daysBetween(purchase.lastPurchaseDate, effectiveLastOrderDate),
      customer_avg_meal_price: totalAmountPaid > 0 && totalCreditsPurchased > 0 ? totalAmountPaid / totalCreditsPurchased : "",
      global_avg_meal_price_used_if_missing: "",
      first_plan_type: firstPlanType,
      first_plan_purchase_date: toYMD(firstPlanDate ?? undefined),
      last_plan_type_purchased: lastPlanType !== firstPlanType ? lastPlanType : firstPlanType,
      last_plan_purchase_date: toYMD(lastPlanDate ?? undefined),
      plans_purchased_count: plansCount,
      repurchased_after_first_plan: repurchased,
      credits_purchased_in_first_plan: creditsInFirstPlan,
      two_dish_voucher_remaining: credits.twoDish,
      three_dish_voucher_remaining: credits.threeDish,
      six_meal_plan_remaining: credits.sixPlan,
      eight_meal_plan_remaining: credits.eightPlan,
      ten_meal_plan_remaining: credits.tenPlan,
      twelve_meal_plan_remaining: credits.twelvePlan,
      sixteen_meal_plan_remaining: credits.sixteenPlan,
      manual_or_other_credits_remaining: credits.manualOrOther,
      total_credits_purchased: totalCreditsPurchased,
      total_credits_used: totalCreditsUsed,
      total_credits_remaining: credits.total,
      estimated_remaining_value: 0,
      last_credit_used_date: toYMD(lastCreditUsedDate ?? undefined),
      days_since_last_credit_used: daysSince(lastCreditUsedDate ?? undefined, now),
      credits_used_before_churn: totalCreditsUsed,
      churn_month: churnMonth,
      churn_period: churnPeriod,
      customer_status: status,
      recommended_action: RECOMMENDED_ACTION[status],
      analysis_priority: "Low",
      is_internal_or_test_user: isInternal ? "Yes" : "No",
      has_manual_credit_balance: credits.manualOrOther > 0 ? "Yes" : "No",
      has_unrealistic_credit_balance: hasUnrealisticBalance ? "Yes" : "No",
      data_quality_issue: issues.join("; "),
      _totalAmountPaid: totalAmountPaid,
      _mealsPurchased: totalCreditsPurchased,
      _joinedDate: joinedDate,
      _firstOrderDateRaw: om.firstOrderDate,
      _lastOrderDateRaw: effectiveLastOrderDate,
      _firstPurchaseDateRaw: purchase.firstPurchaseDate,
      _lastPurchaseDateRaw: purchase.lastPurchaseDate,
      _daysSinceCreated: daysSinceCreatedNum,
      _isInternal: isInternal,
      _exclusionReasons: reasons,
    })
  }

  // ── Split real vs excluded ────────────────────────────────────────────────
  const realRawRows = allRawRows.filter((r) => !r._isInternal)
  const excludedRawRows = allRawRows.filter((r) => r._isInternal)

  // ── Pass 2: global avg + priority + estimated value (real customers only) ─
  let globalAmountSum = 0
  let globalMealsSum = 0
  for (const row of realRawRows) {
    if (row._totalAmountPaid > 0 && row._mealsPurchased > 0) {
      globalAmountSum += row._totalAmountPaid
      globalMealsSum += row._mealsPurchased
    }
  }
  const globalAvgMealPrice: number | "" = globalMealsSum > 0 ? globalAmountSum / globalMealsSum : ""

  const payingAmounts = realRawRows.filter((r) => r._totalAmountPaid > 0).map((r) => r._totalAmountPaid).sort((a, b) => a - b)
  const p75Idx = Math.floor(payingAmounts.length * 0.75)
  const highAmountThreshold = payingAmounts.length > 0 ? (payingAmounts[p75Idx] ?? 0) : 0

  const finalRows: CustomerSituationRow[] = realRawRows.map((row) => {
    let avgMealPrice: number
    let flagColumn: CustomerSituationRow["global_avg_meal_price_used_if_missing"]
    if (typeof row.customer_avg_meal_price === "number") {
      avgMealPrice = row.customer_avg_meal_price
      flagColumn = "No"
    } else if (typeof globalAvgMealPrice === "number") {
      avgMealPrice = globalAvgMealPrice
      flagColumn = "Yes"
    } else {
      avgMealPrice = 17
      flagColumn = "Fallback $17"
    }
    const estimatedRemainingValue = Math.round(row.total_credits_remaining * avgMealPrice * 100) / 100
    const priority = computePriority(row.customer_status, row.total_credits_remaining, row._totalAmountPaid, highAmountThreshold, row._daysSinceCreated)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _totalAmountPaid: _1, _mealsPurchased: _2, _joinedDate: _3, _firstOrderDateRaw: _4, _lastOrderDateRaw: _5, _firstPurchaseDateRaw: _6, _lastPurchaseDateRaw: _7, _daysSinceCreated: _8, _isInternal: _9, _exclusionReasons: _10, ...cleanRow } = row
    return { ...cleanRow, global_avg_meal_price_used_if_missing: flagColumn, estimated_remaining_value: estimatedRemainingValue, analysis_priority: priority }
  })

  // ── Tab 2: Credit Obligation ──────────────────────────────────────────────
  const obTypes: Array<{ key: keyof CustomerSituationRow; label: string }> = [
    { key: "two_dish_voucher_remaining", label: "2-Dish Voucher" },
    { key: "three_dish_voucher_remaining", label: "3-Dish Voucher" },
    { key: "six_meal_plan_remaining", label: "6 Meals Plan" },
    { key: "eight_meal_plan_remaining", label: "8 Meals Plan" },
    { key: "ten_meal_plan_remaining", label: "10 Meals Plan" },
    { key: "twelve_meal_plan_remaining", label: "12 Meals Plan" },
    { key: "sixteen_meal_plan_remaining", label: "16 Meals Plan" },
    { key: "manual_or_other_credits_remaining", label: "Manual / Other Credits" },
  ]
  const totalUnusedAll = finalRows.reduce((s, r) => s + r.total_credits_remaining, 0)
  const totalObligationAll = finalRows.reduce((s, r) => s + r.estimated_remaining_value, 0)
  const creditObligationRows: CreditObligationRow[] = obTypes.map(({ key, label }) => {
    const usersWithCredits = finalRows.filter((r) => (r[key] as number) > 0).length
    const totalCredits = finalRows.reduce((s, r) => s + (r[key] as number), 0)
    const obligation = finalRows.reduce((s, row) => {
      const pc = row[key] as number
      if (pc <= 0) return s
      const avgP = typeof row.customer_avg_meal_price === "number" ? row.customer_avg_meal_price
        : typeof globalAvgMealPrice === "number" ? globalAvgMealPrice : 17
      return s + pc * avgP
    }, 0)
    return {
      product_type: label,
      users_with_unused_credits: usersWithCredits,
      total_unused_credits: totalCredits,
      estimated_obligation_value: Math.round(obligation * 100) / 100,
      percentage_of_total_unused_credits: pct(totalCredits, totalUnusedAll),
      percentage_of_total_estimated_obligation: pct(obligation, totalObligationAll),
    }
  })
  const obTotalCredits = creditObligationRows.reduce((s, r) => s + r.total_unused_credits, 0)
  const obTotalObligation = creditObligationRows.reduce((s, r) => s + r.estimated_obligation_value, 0)
  creditObligationRows.push({
    product_type: "Total",
    users_with_unused_credits: finalRows.filter((r) => r.total_credits_remaining > 0).length,
    total_unused_credits: obTotalCredits,
    estimated_obligation_value: Math.round(obTotalObligation * 100) / 100,
    percentage_of_total_unused_credits: 100,
    percentage_of_total_estimated_obligation: 100,
  })

  // ── Tab 3: Status Summary ─────────────────────────────────────────────────
  const ALL_STATUSES: CustomerStatus[] = [
    "Active", "Actual Churn", "Paused With Credits", "At Risk",
    "Converted Not Activated", "New Lead", "Never Converted",
  ]

  function buildStatusRow(group: CustomerSituationRow[], statusLabel: CustomerStatus | "Total"): StatusSummaryRow {
    const withOrders = group.filter((r) => r.total_orders > 0)
    const avgDays = avgOrBlank(withOrders.map((r) => r.days_since_last_order))
    const avgFO2LO = avgOrBlank(group.map((r) => r.days_from_first_order_to_last_order))
    const avgFP2LO = avgOrBlank(group.map((r) => r.days_from_first_purchase_to_last_order))
    return {
      customer_status: statusLabel,
      user_count: group.length,
      percentage_of_total_users: pct(group.length, finalRows.length),
      total_remaining_credits: group.reduce((s, r) => s + r.total_credits_remaining, 0),
      estimated_remaining_value: Math.round(group.reduce((s, r) => s + r.estimated_remaining_value, 0) * 100) / 100,
      total_orders: group.reduce((s, r) => s + r.total_orders, 0),
      total_amount_paid: Math.round(group.reduce((s, r) => s + r.total_amount_paid, 0) * 100) / 100,
      average_days_since_last_order: avgDays,
      average_total_orders_per_customer: group.length > 0 ? Math.round((group.reduce((s, r) => s + r.total_orders, 0) / group.length) * 100) / 100 : "",
      average_remaining_credits_per_customer: group.length > 0 ? Math.round((group.reduce((s, r) => s + r.total_credits_remaining, 0) / group.length) * 100) / 100 : "",
      average_days_from_first_order_to_last_order: avgFO2LO,
      average_days_from_first_purchase_to_last_order: avgFP2LO,
      customers_who_only_bought_once: group.filter((r) => r.plans_purchased_count === 1).length,
      customers_who_repurchased_after_first_plan: group.filter((r) => r.repurchased_after_first_plan === "Yes").length,
      most_common_first_plan_type: mode(group.map((r) => r.first_plan_type)),
      most_common_last_plan_type: mode(group.map((r) => r.last_plan_type_purchased)),
    }
  }

  const statusRows: StatusSummaryRow[] = [
    ...ALL_STATUSES.map((status) => buildStatusRow(finalRows.filter((r) => r.customer_status === status), status)),
    buildStatusRow(finalRows, "Total"),
  ]
  statusRows[statusRows.length - 1].percentage_of_total_users = 100

  // ── Overall summary ───────────────────────────────────────────────────────
  const overallSummary: OverallSummary = {
    total_users: finalRows.length,
    total_paid_customers: finalRows.filter((r) => r.total_amount_paid > 0).length,
    total_users_with_unused_credits: finalRows.filter((r) => r.total_credits_remaining > 0).length,
    total_unused_credits: finalRows.reduce((s, r) => s + r.total_credits_remaining, 0),
    total_estimated_obligation_value: Math.round(finalRows.reduce((s, r) => s + r.estimated_remaining_value, 0) * 100) / 100,
    global_avg_meal_price: typeof globalAvgMealPrice === "number" ? Math.round(globalAvgMealPrice * 100) / 100 : "",
    total_active_customers: finalRows.filter((r) => r.customer_status === "Active").length,
    total_paused_with_credits: finalRows.filter((r) => r.customer_status === "Paused With Credits").length,
    total_actual_churn: finalRows.filter((r) => r.customer_status === "Actual Churn").length,
    total_at_risk: finalRows.filter((r) => r.customer_status === "At Risk").length,
    total_never_converted: finalRows.filter((r) => r.customer_status === "Never Converted").length,
    total_converted_not_activated: finalRows.filter((r) => r.customer_status === "Converted Not Activated").length,
    total_new_leads: finalRows.filter((r) => r.customer_status === "New Lead").length,
  }

  // ── Tab 4: Churn Timing Analysis ──────────────────────────────────────────
  const churnRows = finalRows.filter((r) => r.customer_status === "Actual Churn")
  const totalChurn = churnRows.length

  function buildChurnMonthRow(month: string, group: CustomerSituationRow[]): ChurnByMonthRow {
    return {
      churn_month: month,
      actual_churn_customer_count: group.length,
      percentage_of_total_churn: pct(group.length, totalChurn),
      total_orders_before_churn: group.reduce((s, r) => s + r.total_orders, 0),
      total_amount_paid_before_churn: Math.round(group.reduce((s, r) => s + r.total_amount_paid, 0) * 100) / 100,
      average_orders_before_churn: group.length > 0 ? Math.round((group.reduce((s, r) => s + r.total_orders, 0) / group.length) * 100) / 100 : "",
      average_amount_paid_before_churn: group.length > 0 ? Math.round((group.reduce((s, r) => s + r.total_amount_paid, 0) / group.length) * 100) / 100 : "",
      average_days_from_first_order_to_last_order: avgOrBlank(group.map((r) => r.days_from_first_order_to_last_order)),
      average_days_from_first_purchase_to_last_order: avgOrBlank(group.map((r) => r.days_from_first_purchase_to_last_order)),
      most_common_first_plan_type: mode(group.map((r) => r.first_plan_type)),
      most_common_last_plan_type: mode(group.map((r) => r.last_plan_type_purchased)),
      customers_who_only_bought_once: group.filter((r) => r.plans_purchased_count === 1).length,
      customers_who_repurchased_before_churn: group.filter((r) => r.repurchased_after_first_plan === "Yes").length,
    }
  }

  const churnByMonthMap = new Map<string, CustomerSituationRow[]>()
  for (const row of churnRows) {
    const m = row.churn_month || "Unknown"
    const arr = churnByMonthMap.get(m) ?? []
    arr.push(row)
    churnByMonthMap.set(m, arr)
  }
  const churnByMonth: ChurnByMonthRow[] = [...churnByMonthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, group]) => buildChurnMonthRow(month, group))

  function buildChurnPeriodRow(period: string, group: CustomerSituationRow[]): ChurnByPeriodRow {
    return {
      churn_period: period,
      actual_churn_customer_count: group.length,
      percentage_of_total_churn: pct(group.length, totalChurn),
      total_amount_paid_before_churn: Math.round(group.reduce((s, r) => s + r.total_amount_paid, 0) * 100) / 100,
      average_orders_before_churn: group.length > 0 ? Math.round((group.reduce((s, r) => s + r.total_orders, 0) / group.length) * 100) / 100 : "",
      customers_who_only_bought_once: group.filter((r) => r.plans_purchased_count === 1).length,
      customers_who_repurchased_before_churn: group.filter((r) => r.repurchased_after_first_plan === "Yes").length,
    }
  }

  const churnByPeriod: ChurnByPeriodRow[] = CHURN_PERIODS.map((period) =>
    buildChurnPeriodRow(period, churnRows.filter((r) => r.churn_period === period))
  )

  const churnTiming: ChurnTimingAnalysis = { byMonth: churnByMonth, byPeriod: churnByPeriod }

  // ── Tab 5: Plan Churn Analysis ────────────────────────────────────────────
  const planChurn: PlanChurnRow[] = ALL_PLAN_TYPE_LABELS.map((planType) => {
    const group = finalRows.filter((r) =>
      planType === "Unknown / No Plan" ? r.first_plan_type === "" : r.first_plan_type === planType
    )
    const churnGroup = group.filter((r) => r.customer_status === "Actual Churn")
    const avgDaysTochurn = avgOrBlank(
      churnGroup.map((r) => r.days_from_first_purchase_to_last_order)
    )
    const totalRem = group.reduce((s, r) => s + r.total_credits_remaining, 0)
    const totalObligation = Math.round(group.reduce((s, r) => s + r.estimated_remaining_value, 0) * 100) / 100
    return {
      plan_type: planType,
      customers_who_bought_this_plan: group.length,
      active_customers_from_this_plan: group.filter((r) => r.customer_status === "Active").length,
      paused_with_credits_from_this_plan: group.filter((r) => r.customer_status === "Paused With Credits").length,
      actual_churn_customers_from_this_plan: churnGroup.length,
      at_risk_customers_from_this_plan: group.filter((r) => r.customer_status === "At Risk").length,
      converted_not_activated_from_this_plan: group.filter((r) => r.customer_status === "Converted Not Activated").length,
      never_converted_from_this_plan: group.filter((r) => r.customer_status === "Never Converted").length,
      churn_rate_for_this_plan: group.length > 0 ? Math.round((churnGroup.length / group.length) * 10000) / 100 : "",
      active_rate_for_this_plan: group.length > 0 ? Math.round((group.filter((r) => r.customer_status === "Active").length / group.length) * 10000) / 100 : "",
      paused_rate_for_this_plan: group.length > 0 ? Math.round((group.filter((r) => r.customer_status === "Paused With Credits").length / group.length) * 10000) / 100 : "",
      average_orders_after_buying_this_plan: avgOrBlank(group.map((r) => (typeof r.total_orders === "number" ? r.total_orders : ""))),
      average_days_from_plan_purchase_to_churn: avgDaysTochurn,
      average_remaining_credits: group.length > 0 ? Math.round((totalRem / group.length) * 100) / 100 : "",
      total_remaining_credits: totalRem,
      estimated_remaining_value: totalObligation,
    }
  })

  // ── Excluded accounts ─────────────────────────────────────────────────────
  const excludedAccounts: ExcludedAccountRow[] = excludedRawRows.map((row) => ({
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    role: (users.find((u) => String(u._id) === row.user_id || u.userID === row.user_id)?.role) ?? "user",
    exclusion_reason: row._exclusionReasons.join("; "),
    two_dish_voucher_remaining: row.two_dish_voucher_remaining,
    three_dish_voucher_remaining: row.three_dish_voucher_remaining,
    six_meal_plan_remaining: row.six_meal_plan_remaining,
    eight_meal_plan_remaining: row.eight_meal_plan_remaining,
    ten_meal_plan_remaining: row.ten_meal_plan_remaining,
    twelve_meal_plan_remaining: row.twelve_meal_plan_remaining,
    sixteen_meal_plan_remaining: row.sixteen_meal_plan_remaining,
    manual_or_other_credits_remaining: row.manual_or_other_credits_remaining,
    total_credits_remaining: row.total_credits_remaining,
    total_amount_paid: row.total_amount_paid,
    total_orders: row.total_orders,
    created_date: row.created_date,
    data_quality_issue: row.data_quality_issue,
  }))

  // ── Validation ────────────────────────────────────────────────────────────
  const sumProductCredits = creditObligationRows.find((r) => r.product_type === "Total")?.total_unused_credits ?? 0
  const sumRowCredits = finalRows.reduce((s, r) => s + r.total_credits_remaining, 0)
  const sumProductObligation = creditObligationRows.find((r) => r.product_type === "Total")?.estimated_obligation_value ?? 0
  const sumRowObligation = Math.round(finalRows.reduce((s, r) => s + r.estimated_remaining_value, 0) * 100) / 100
  const manualCreditsTotal = finalRows.reduce((s, r) => s + r.manual_or_other_credits_remaining, 0)
  const manualCreditsPct = sumRowCredits > 0 ? (manualCreditsTotal / sumRowCredits) * 100 : 0

  const validation: ValidationResult = {
    credits_sum_matches: sumProductCredits === sumRowCredits,
    obligation_sum_matches: Math.abs(sumProductObligation - sumRowObligation) < 0.05,
    all_users_have_status: finalRows.every((r) => Boolean(r.customer_status)),
    no_zero_order_user_in_active_statuses: finalRows.every(
      (r) => r.total_orders > 0 || !["Active", "Actual Churn", "Paused With Credits", "At Risk"].includes(r.customer_status)
    ),
    no_actual_churn_with_remaining_credits: finalRows.every(
      (r) => r.customer_status !== "Actual Churn" || r.total_credits_remaining === 0
    ),
    all_paused_have_credits_and_days: finalRows
      .filter((r) => r.customer_status === "Paused With Credits")
      .every((r) => r.total_orders > 0 && r.total_credits_remaining > 2),
    all_at_risk_have_credits_1_or_2: finalRows
      .filter((r) => r.customer_status === "At Risk")
      .every((r) => r.total_orders > 0 && r.total_credits_remaining >= 1 && r.total_credits_remaining <= 2),
    manual_credits_pct_of_total: Math.round(manualCreditsPct * 100) / 100,
    manual_credits_pct_warning: manualCreditsPct > 20,
    high_credit_user_count: finalRows.filter((r) => r.total_credits_remaining > 100).length,
    excluded_account_count: excludedRawRows.length,
  }

  return { rows: finalRows, creditObligation: creditObligationRows, statusSummary: statusRows, overallSummary, validation, churnTiming, planChurn, excludedAccounts }
}

// ─── Purchase aggregation (called from route) ──────────────────────────────────

interface CreditPurchaseReqLike extends CreditReqLike {
  userId: unknown
  status: string
  finalTotal?: number
  amount?: number
  approvedAt?: unknown
  createdAt?: unknown
}

interface VoucherPurchaseReqLike {
  userId: unknown
  status: string
  type?: string
  quantity?: number
  finalTotal?: number
  amount?: number
  approvedAt?: unknown
  createdAt?: unknown
}

export function aggregatePurchasesByUser(
  creditRequests: CreditPurchaseReqLike[],
  voucherRequests: VoucherPurchaseReqLike[]
): Map<string, PurchaseData> {
  const map = new Map<string, PurchaseData>()

  function ensure(uid: string): PurchaseData {
    if (!map.has(uid)) {
      map.set(uid, { totalAmountPaid: 0, purchaseCount: 0, mealsPurchased: 0, firstPurchaseDate: null, lastPurchaseDate: null, purchaseHistory: [] })
    }
    return map.get(uid)!
  }

  for (const req of creditRequests) {
    if (req.status !== "approved") continue
    const uid = String(req.userId)
    const data = ensure(uid)
    const amount = req.finalTotal ?? req.amount ?? 0
    const meals = mealsPurchasedFromCreditRequest(req)
    const d = asDate(req.approvedAt) ?? asDate(req.createdAt)
    data.totalAmountPaid += amount
    data.purchaseCount++
    data.mealsPurchased += meals
    if (d) {
      if (!data.firstPurchaseDate || d < data.firstPurchaseDate) data.firstPurchaseDate = d
      if (!data.lastPurchaseDate || d > data.lastPurchaseDate) data.lastPurchaseDate = d
      data.purchaseHistory.push({ date: d, planLabel: labelCreditRequest(req), mealsCount: meals })
    }
  }

  for (const req of voucherRequests) {
    if (req.status !== "approved") continue
    const uid = String(req.userId)
    const data = ensure(uid)
    const amount = req.finalTotal ?? req.amount ?? 0
    const meals = req.quantity ?? 0
    const planLabel = req.type === "twoDish" ? "2-Dish Voucher" : req.type === "threeDish" ? "3-Dish Voucher" : "Manual / Other Credits"
    const d = asDate(req.approvedAt) ?? asDate(req.createdAt)
    data.totalAmountPaid += amount
    data.purchaseCount++
    data.mealsPurchased += meals
    if (d) {
      if (!data.firstPurchaseDate || d < data.firstPurchaseDate) data.firstPurchaseDate = d
      if (!data.lastPurchaseDate || d > data.lastPurchaseDate) data.lastPurchaseDate = d
      data.purchaseHistory.push({ date: d, planLabel, mealsCount: meals })
    }
  }

  // Sort each user's history chronologically
  for (const data of map.values()) {
    data.purchaseHistory.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  return map
}
