import * as XLSX from "xlsx"

import type {
  ChurnByMonthRow,
  ChurnByPeriodRow,
  CreditObligationRow,
  CustomerSituationRow,
  ExcludedAccountRow,
  OverallSummary,
  PlanChurnRow,
  SituationReport,
  StatusSummaryRow,
  ValidationResult,
} from "./types"
import { CHURN_PERIODS } from "./compute"

function makeSheet(data: unknown[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(data)
}

function n(v: number | "" | undefined | null): number | string {
  if (typeof v === "number") return v
  return ""
}

// ─── Tab 1: Customer Order Situation ─────────────────────────────────────────

const TAB1_HEADERS: string[] = [
  // Basic
  "user_id", "name", "email", "phone", "created_date", "days_since_created", "city_or_area", "default_delivery_address",
  // Order behaviour
  "total_orders", "first_order_date", "first_order_month", "last_order_date", "last_order_month",
  "days_since_last_order", "orders_last_7_days", "orders_last_14_days", "orders_last_30_days",
  "total_meals_ordered", "average_meals_per_order",
  "days_from_signup_to_first_order", "days_from_first_order_to_last_order",
  // Purchase / payment
  "total_purchase_count", "first_purchase_date", "first_purchase_month", "last_purchase_date", "last_purchase_month",
  "days_since_last_purchase", "total_amount_paid",
  "days_from_signup_to_first_purchase", "days_from_first_purchase_to_first_order",
  "days_from_first_purchase_to_last_order", "days_from_last_purchase_to_last_order",
  "customer_avg_meal_price", "global_avg_meal_price_used_if_missing",
  // Plan / package behaviour
  "first_plan_type", "first_plan_purchase_date", "last_plan_type_purchased", "last_plan_purchase_date",
  "plans_purchased_count", "repurchased_after_first_plan", "credits_purchased_in_first_plan",
  // Credits remaining
  "two_dish_voucher_remaining", "three_dish_voucher_remaining",
  "six_meal_plan_remaining", "eight_meal_plan_remaining", "ten_meal_plan_remaining",
  "twelve_meal_plan_remaining", "sixteen_meal_plan_remaining", "manual_or_other_credits_remaining",
  "total_credits_purchased", "total_credits_used", "total_credits_remaining", "estimated_remaining_value",
  // Credit usage / churn timing
  "last_credit_used_date", "days_since_last_credit_used", "credits_used_before_churn",
  "churn_month", "churn_period",
  // Classification
  "customer_status", "recommended_action", "analysis_priority",
  // Data quality
  "is_internal_or_test_user", "has_manual_credit_balance", "has_unrealistic_credit_balance", "data_quality_issue",
]

function rowToTab1Array(row: CustomerSituationRow): (string | number)[] {
  return [
    row.user_id, row.name, row.email, row.phone, row.created_date, n(row.days_since_created),
    row.city_or_area, row.default_delivery_address,
    n(row.total_orders), row.first_order_date, row.first_order_month, row.last_order_date, row.last_order_month,
    n(row.days_since_last_order), n(row.orders_last_7_days), n(row.orders_last_14_days), n(row.orders_last_30_days),
    n(row.total_meals_ordered), n(row.average_meals_per_order),
    n(row.days_from_signup_to_first_order), n(row.days_from_first_order_to_last_order),
    n(row.total_purchase_count), row.first_purchase_date, row.first_purchase_month, row.last_purchase_date, row.last_purchase_month,
    n(row.days_since_last_purchase), n(row.total_amount_paid),
    n(row.days_from_signup_to_first_purchase), n(row.days_from_first_purchase_to_first_order),
    n(row.days_from_first_purchase_to_last_order), n(row.days_from_last_purchase_to_last_order),
    n(row.customer_avg_meal_price), row.global_avg_meal_price_used_if_missing,
    row.first_plan_type, row.first_plan_purchase_date, row.last_plan_type_purchased, row.last_plan_purchase_date,
    n(row.plans_purchased_count), row.repurchased_after_first_plan, n(row.credits_purchased_in_first_plan),
    n(row.two_dish_voucher_remaining), n(row.three_dish_voucher_remaining),
    n(row.six_meal_plan_remaining), n(row.eight_meal_plan_remaining), n(row.ten_meal_plan_remaining),
    n(row.twelve_meal_plan_remaining), n(row.sixteen_meal_plan_remaining), n(row.manual_or_other_credits_remaining),
    n(row.total_credits_purchased), n(row.total_credits_used), n(row.total_credits_remaining), n(row.estimated_remaining_value),
    row.last_credit_used_date, n(row.days_since_last_credit_used), n(row.credits_used_before_churn),
    row.churn_month, row.churn_period,
    row.customer_status, row.recommended_action, row.analysis_priority,
    row.is_internal_or_test_user, row.has_manual_credit_balance, row.has_unrealistic_credit_balance, row.data_quality_issue,
  ]
}

function buildTab1(rows: CustomerSituationRow[]): XLSX.WorkSheet {
  return makeSheet([TAB1_HEADERS, ...rows.map(rowToTab1Array)])
}

// ─── Tab 2: Credit Obligation Summary ────────────────────────────────────────

const TAB2_HEADERS = [
  "product_type", "users_with_unused_credits", "total_unused_credits",
  "estimated_obligation_value", "percentage_of_total_unused_credits", "percentage_of_total_estimated_obligation",
]

function buildTab2(rows: CreditObligationRow[], validation: ValidationResult): XLSX.WorkSheet {
  const notes: (string | number)[][] = [
    ["NOTE: Includes REAL CUSTOMER accounts only. Internal/test/admin accounts excluded (see Excluded Accounts tab)."],
    ["Manual / Other Credits are legacy-field credits — source (paid/compensation/test) cannot be split without a Transaction audit."],
    [],
  ]
  const warnings: (string | number)[][] = validation.manual_credits_pct_warning
    ? [[`WARNING: Manual / Other Credits is ${validation.manual_credits_pct_of_total}% of total unused credits (threshold: 20%). Check for remaining test/admin accounts.`], []]
    : []
  return makeSheet([...notes, ...warnings, TAB2_HEADERS, ...rows.map((r) => [
    r.product_type, n(r.users_with_unused_credits), n(r.total_unused_credits),
    n(r.estimated_obligation_value), n(r.percentage_of_total_unused_credits), n(r.percentage_of_total_estimated_obligation),
  ])])
}

// ─── Tab 3: Status Summary ────────────────────────────────────────────────────

const TAB3_HEADERS = [
  "customer_status", "user_count", "percentage_of_total_users",
  "total_remaining_credits", "estimated_remaining_value",
  "total_orders", "total_amount_paid",
  "average_days_since_last_order", "average_total_orders_per_customer", "average_remaining_credits_per_customer",
  "average_days_from_first_order_to_last_order", "average_days_from_first_purchase_to_last_order",
  "customers_who_only_bought_once", "customers_who_repurchased_after_first_plan",
  "most_common_first_plan_type", "most_common_last_plan_type",
]

function statusRowToArray(row: StatusSummaryRow): (string | number)[] {
  return [
    row.customer_status, n(row.user_count), n(row.percentage_of_total_users),
    n(row.total_remaining_credits), n(row.estimated_remaining_value),
    n(row.total_orders), n(row.total_amount_paid),
    n(row.average_days_since_last_order), n(row.average_total_orders_per_customer), n(row.average_remaining_credits_per_customer),
    n(row.average_days_from_first_order_to_last_order), n(row.average_days_from_first_purchase_to_last_order),
    n(row.customers_who_only_bought_once), n(row.customers_who_repurchased_after_first_plan),
    row.most_common_first_plan_type, row.most_common_last_plan_type,
  ]
}

function overallSummaryBlock(s: OverallSummary): (string | number)[][] {
  return [
    [], ["--- Overall Summary (real customers only) ---"],
    ["total_users", n(s.total_users)], ["total_paid_customers", n(s.total_paid_customers)],
    ["total_users_with_unused_credits", n(s.total_users_with_unused_credits)],
    ["total_unused_credits", n(s.total_unused_credits)],
    ["total_estimated_obligation_value", n(s.total_estimated_obligation_value)],
    ["global_avg_meal_price", n(s.global_avg_meal_price)],
    ["total_active_customers", n(s.total_active_customers)],
    ["total_paused_with_credits", n(s.total_paused_with_credits)],
    ["total_actual_churn", n(s.total_actual_churn)],
    ["total_at_risk", n(s.total_at_risk)],
    ["total_never_converted", n(s.total_never_converted)],
    ["total_converted_not_activated", n(s.total_converted_not_activated)],
    ["total_new_leads", n(s.total_new_leads)],
  ]
}

function validationBlock(v: ValidationResult): (string | number)[][] {
  return [
    [], ["--- Validation Checks ---"],
    ["credits_sum_matches", v.credits_sum_matches ? "PASS" : "FAIL"],
    ["obligation_sum_matches", v.obligation_sum_matches ? "PASS" : "FAIL"],
    ["all_users_have_status", v.all_users_have_status ? "PASS" : "FAIL"],
    ["no_zero_order_user_in_active_statuses", v.no_zero_order_user_in_active_statuses ? "PASS" : "FAIL"],
    ["no_actual_churn_with_remaining_credits", v.no_actual_churn_with_remaining_credits ? "PASS" : "FAIL"],
    ["all_paused_have_credits_and_days", v.all_paused_have_credits_and_days ? "PASS" : "FAIL"],
    ["all_at_risk_have_credits_1_or_2", v.all_at_risk_have_credits_1_or_2 ? "PASS" : "FAIL"],
    [], ["--- Data Quality ---"],
    ["excluded_account_count", n(v.excluded_account_count)],
    ["high_credit_user_count (>100 meals)", n(v.high_credit_user_count)],
    ["manual_credits_pct_of_total", n(v.manual_credits_pct_of_total)],
    ["manual_credits_pct_warning", v.manual_credits_pct_warning
      ? `WARNING: ${v.manual_credits_pct_of_total}% — check test/admin/internal accounts` : "OK"],
  ]
}

function buildTab3(statusRows: StatusSummaryRow[], summary: OverallSummary, validation: ValidationResult): XLSX.WorkSheet {
  return makeSheet([TAB3_HEADERS, ...statusRows.map(statusRowToArray), ...overallSummaryBlock(summary), ...validationBlock(validation)])
}

// ─── Tab 4: Churn Timing Analysis ─────────────────────────────────────────────

const CHURN_BY_MONTH_HEADERS = [
  "churn_month", "actual_churn_customer_count", "percentage_of_total_churn",
  "total_orders_before_churn", "total_amount_paid_before_churn",
  "average_orders_before_churn", "average_amount_paid_before_churn",
  "average_days_from_first_order_to_last_order", "average_days_from_first_purchase_to_last_order",
  "most_common_first_plan_type", "most_common_last_plan_type",
  "customers_who_only_bought_once", "customers_who_repurchased_before_churn",
]

const CHURN_BY_PERIOD_HEADERS = [
  "churn_period", "actual_churn_customer_count", "percentage_of_total_churn",
  "total_amount_paid_before_churn", "average_orders_before_churn",
  "customers_who_only_bought_once", "customers_who_repurchased_before_churn",
]

function churnMonthToArray(r: ChurnByMonthRow): (string | number)[] {
  return [
    r.churn_month, n(r.actual_churn_customer_count), n(r.percentage_of_total_churn),
    n(r.total_orders_before_churn), n(r.total_amount_paid_before_churn),
    n(r.average_orders_before_churn), n(r.average_amount_paid_before_churn),
    n(r.average_days_from_first_order_to_last_order), n(r.average_days_from_first_purchase_to_last_order),
    r.most_common_first_plan_type, r.most_common_last_plan_type,
    n(r.customers_who_only_bought_once), n(r.customers_who_repurchased_before_churn),
  ]
}

function churnPeriodToArray(r: ChurnByPeriodRow): (string | number)[] {
  return [
    r.churn_period, n(r.actual_churn_customer_count), n(r.percentage_of_total_churn),
    n(r.total_amount_paid_before_churn), n(r.average_orders_before_churn),
    n(r.customers_who_only_bought_once), n(r.customers_who_repurchased_before_churn),
  ]
}

function buildTab4(churnTiming: SituationReport["churnTiming"]): XLSX.WorkSheet {
  const periodRows = CHURN_PERIODS.map((p) => churnTiming.byPeriod.find((r) => r.churn_period === p) ?? {
    churn_period: p, actual_churn_customer_count: 0, percentage_of_total_churn: 0,
    total_amount_paid_before_churn: 0, average_orders_before_churn: 0,
    customers_who_only_bought_once: 0, customers_who_repurchased_before_churn: 0,
  } as ChurnByPeriodRow)

  const data: (string | number)[][] = [
    ["NOTE: Only includes customers with customer_status = Actual Churn."],
    ["Purpose: Understand when churn happened, which period lost the most customers, and whether churn is recent or accumulated."],
    [],
    ["--- Section A: Churn by Month ---"],
    CHURN_BY_MONTH_HEADERS,
    ...(churnTiming.byMonth.length > 0 ? churnTiming.byMonth.map(churnMonthToArray) : [["(no Actual Churn customers)"]]),
    [],
    ["--- Section B: Churn by Period ---"],
    CHURN_BY_PERIOD_HEADERS,
    ...periodRows.map(churnPeriodToArray),
  ]
  return makeSheet(data)
}

// ─── Tab 5: Plan Churn Analysis ───────────────────────────────────────────────

const PLAN_CHURN_HEADERS = [
  "plan_type",
  "customers_who_bought_this_plan",
  "active_customers_from_this_plan",
  "paused_with_credits_from_this_plan",
  "actual_churn_customers_from_this_plan",
  "at_risk_customers_from_this_plan",
  "converted_not_activated_from_this_plan",
  "never_converted_from_this_plan",
  "churn_rate_for_this_plan",
  "active_rate_for_this_plan",
  "paused_rate_for_this_plan",
  "average_orders_after_buying_this_plan",
  "average_days_from_plan_purchase_to_churn",
  "average_remaining_credits",
  "total_remaining_credits",
  "estimated_remaining_value",
]

function planChurnToArray(r: PlanChurnRow): (string | number)[] {
  return [
    r.plan_type,
    n(r.customers_who_bought_this_plan),
    n(r.active_customers_from_this_plan),
    n(r.paused_with_credits_from_this_plan),
    n(r.actual_churn_customers_from_this_plan),
    n(r.at_risk_customers_from_this_plan),
    n(r.converted_not_activated_from_this_plan),
    n(r.never_converted_from_this_plan),
    n(r.churn_rate_for_this_plan),
    n(r.active_rate_for_this_plan),
    n(r.paused_rate_for_this_plan),
    n(r.average_orders_after_buying_this_plan),
    n(r.average_days_from_plan_purchase_to_churn),
    n(r.average_remaining_credits),
    n(r.total_remaining_credits),
    n(r.estimated_remaining_value),
  ]
}

function buildTab5(planChurn: PlanChurnRow[]): XLSX.WorkSheet {
  return makeSheet([
    ["NOTE: Grouped by first_plan_type (the first package/voucher the customer purchased)."],
    ["Purpose: Which plan has highest churn rate? Which creates active customers? Which generates unused credit obligation?"],
    [],
    PLAN_CHURN_HEADERS,
    ...planChurn.map(planChurnToArray),
  ])
}

// ─── Tab 6: Excluded Accounts ─────────────────────────────────────────────────

const TAB6_HEADERS = [
  "user_id", "name", "email", "role", "exclusion_reason",
  "two_dish_voucher_remaining", "three_dish_voucher_remaining",
  "six_meal_plan_remaining", "eight_meal_plan_remaining", "ten_meal_plan_remaining",
  "twelve_meal_plan_remaining", "sixteen_meal_plan_remaining",
  "manual_or_other_credits_remaining", "total_credits_remaining",
  "total_amount_paid", "total_orders", "created_date", "data_quality_issue",
]

function excludedRowToArray(row: ExcludedAccountRow): (string | number)[] {
  return [
    row.user_id, row.name, row.email, row.role, row.exclusion_reason,
    n(row.two_dish_voucher_remaining), n(row.three_dish_voucher_remaining),
    n(row.six_meal_plan_remaining), n(row.eight_meal_plan_remaining), n(row.ten_meal_plan_remaining),
    n(row.twelve_meal_plan_remaining), n(row.sixteen_meal_plan_remaining),
    n(row.manual_or_other_credits_remaining), n(row.total_credits_remaining),
    n(row.total_amount_paid), n(row.total_orders), row.created_date, row.data_quality_issue,
  ]
}

function buildTab6(excludedAccounts: ExcludedAccountRow[]): XLSX.WorkSheet {
  const totalCreditsHeld = excludedAccounts.reduce((s, r) => s + r.total_credits_remaining, 0)
  const totalManualHeld = excludedAccounts.reduce((s, r) => s + r.manual_or_other_credits_remaining, 0)
  return makeSheet([
    ["EXCLUDED ACCOUNTS — NOT included in main tabs. Shown for audit only."],
    ["Exclusion criteria: admin role, test/demo pattern, high manual credits with no purchases, created on or before 2025-04-13, or excluded name."],
    [`Total credits held by excluded accounts: ${totalCreditsHeld} meals (Manual/Other: ${totalManualHeld} meals)`],
    [],
    TAB6_HEADERS,
    ...excludedAccounts.map(excludedRowToArray),
  ])
}

// ─── Public builder ───────────────────────────────────────────────────────────

export function buildSituationWorkbook(report: SituationReport): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildTab1(report.rows), "Customer Order Situation")
  XLSX.utils.book_append_sheet(wb, buildTab2(report.creditObligation, report.validation), "Credit Obligation Summary")
  XLSX.utils.book_append_sheet(wb, buildTab3(report.statusSummary, report.overallSummary, report.validation), "Status Summary")
  XLSX.utils.book_append_sheet(wb, buildTab4(report.churnTiming), "Churn Timing Analysis")
  XLSX.utils.book_append_sheet(wb, buildTab5(report.planChurn), "Plan Churn Analysis")
  XLSX.utils.book_append_sheet(wb, buildTab6(report.excludedAccounts), "Excluded Accounts")
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}
