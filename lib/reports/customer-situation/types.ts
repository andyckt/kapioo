// ─── Customer status classification ───────────────────────────────────────────

export type CustomerStatus =
  | "Active"
  | "Actual Churn"
  | "Paused With Credits"
  | "At Risk"
  | "Converted Not Activated"
  | "New Lead"
  | "Never Converted"

export type RecommendedAction =
  | "Normal menu update"
  | "Winback / repurchase message"
  | "Soft credit reminder"
  | "Top-up reminder"
  | "Help place first order"
  | "Gentle onboarding"
  | "First-order trial message"

export type AnalysisPriority = "High" | "Medium" | "Low"

// ─── Tab 1 row (real customers only) ──────────────────────────────────────────

export interface CustomerSituationRow {
  // Basic
  user_id: string
  name: string
  email: string
  phone: string
  created_date: string // YYYY-MM-DD
  days_since_created: number
  city_or_area: string
  default_delivery_address: string

  // Order behaviour
  total_orders: number
  first_order_date: string // YYYY-MM-DD or ""
  first_order_month: string // YYYY-MM or ""
  last_order_date: string // YYYY-MM-DD or ""
  last_order_month: string // YYYY-MM or ""
  days_since_last_order: number | ""
  orders_last_7_days: number
  orders_last_14_days: number
  orders_last_30_days: number
  total_meals_ordered: number
  average_meals_per_order: number | ""
  days_from_signup_to_first_order: number | ""
  days_from_first_order_to_last_order: number | ""

  // Purchase / payment
  total_purchase_count: number
  first_purchase_date: string // YYYY-MM-DD or ""
  first_purchase_month: string // YYYY-MM or ""
  last_purchase_date: string // YYYY-MM-DD or ""
  last_purchase_month: string // YYYY-MM or ""
  days_since_last_purchase: number | ""
  total_amount_paid: number
  days_from_signup_to_first_purchase: number | ""
  days_from_first_purchase_to_first_order: number | ""
  days_from_first_purchase_to_last_order: number | ""
  days_from_last_purchase_to_last_order: number | ""
  customer_avg_meal_price: number | ""
  global_avg_meal_price_used_if_missing: "Yes" | "No" | "Fallback $17" | ""

  // Plan / package behaviour
  first_plan_type: string // "2-Dish Voucher", "6 Meals Plan", etc., or ""
  first_plan_purchase_date: string // YYYY-MM-DD or ""
  last_plan_type_purchased: string // "" if same as first or no purchase
  last_plan_purchase_date: string // YYYY-MM-DD or ""
  plans_purchased_count: number
  repurchased_after_first_plan: "Yes" | "No" | ""
  credits_purchased_in_first_plan: number | ""

  // Credits remaining (in MEALS)
  two_dish_voucher_remaining: number
  three_dish_voucher_remaining: number
  six_meal_plan_remaining: number // vouchers × 6
  eight_meal_plan_remaining: number // vouchers × 8
  ten_meal_plan_remaining: number // vouchers × 10
  twelve_meal_plan_remaining: number // vouchers × 12
  sixteen_meal_plan_remaining: number // vouchers × 16
  manual_or_other_credits_remaining: number // legacy credits field; source cannot be split without Transaction audit
  total_credits_purchased: number
  total_credits_used: number
  total_credits_remaining: number
  estimated_remaining_value: number

  // Credit usage / churn timing
  last_credit_used_date: string // YYYY-MM-DD or ""
  days_since_last_credit_used: number | ""
  credits_used_before_churn: number // = total_credits_used for all customers
  churn_month: string // YYYY-MM — Actual Churn only, else ""
  churn_period: string // "Last 8–14 Days" etc. — Actual Churn only, else ""

  // Classification
  customer_status: CustomerStatus
  recommended_action: RecommendedAction
  analysis_priority: AnalysisPriority

  // Data quality flags
  is_internal_or_test_user: "Yes" | "No"
  has_manual_credit_balance: "Yes" | "No"
  has_unrealistic_credit_balance: "Yes" | "No"
  data_quality_issue: string
}

// ─── Tab 2 row ─────────────────────────────────────────────────────────────────

export interface CreditObligationRow {
  product_type: string
  users_with_unused_credits: number
  total_unused_credits: number
  estimated_obligation_value: number
  percentage_of_total_unused_credits: number | ""
  percentage_of_total_estimated_obligation: number | ""
}

// ─── Tab 3 row ─────────────────────────────────────────────────────────────────

export interface StatusSummaryRow {
  customer_status: CustomerStatus | "Total"
  user_count: number
  percentage_of_total_users: number | ""
  total_remaining_credits: number
  estimated_remaining_value: number
  total_orders: number
  total_amount_paid: number
  average_days_since_last_order: number | ""
  average_total_orders_per_customer: number | ""
  average_remaining_credits_per_customer: number | ""
  average_days_from_first_order_to_last_order: number | ""
  average_days_from_first_purchase_to_last_order: number | ""
  customers_who_only_bought_once: number
  customers_who_repurchased_after_first_plan: number
  most_common_first_plan_type: string
  most_common_last_plan_type: string
}

export interface OverallSummary {
  total_users: number
  total_paid_customers: number
  total_users_with_unused_credits: number
  total_unused_credits: number
  total_estimated_obligation_value: number
  global_avg_meal_price: number | ""
  total_active_customers: number
  total_paused_with_credits: number
  total_actual_churn: number
  total_at_risk: number
  total_never_converted: number
  total_converted_not_activated: number
  total_new_leads: number
}

export interface ValidationResult {
  credits_sum_matches: boolean
  obligation_sum_matches: boolean
  all_users_have_status: boolean
  no_zero_order_user_in_active_statuses: boolean
  no_actual_churn_with_remaining_credits: boolean
  all_paused_have_credits_and_days: boolean
  all_at_risk_have_credits_1_or_2: boolean
  // Data quality
  manual_credits_pct_of_total: number
  manual_credits_pct_warning: boolean
  high_credit_user_count: number
  excluded_account_count: number
}

// ─── Tab 4: Churn Timing Analysis ─────────────────────────────────────────────

export interface ChurnByMonthRow {
  churn_month: string
  actual_churn_customer_count: number
  percentage_of_total_churn: number | ""
  total_orders_before_churn: number
  total_amount_paid_before_churn: number
  average_orders_before_churn: number | ""
  average_amount_paid_before_churn: number | ""
  average_days_from_first_order_to_last_order: number | ""
  average_days_from_first_purchase_to_last_order: number | ""
  most_common_first_plan_type: string
  most_common_last_plan_type: string
  customers_who_only_bought_once: number
  customers_who_repurchased_before_churn: number
}

export interface ChurnByPeriodRow {
  churn_period: string
  actual_churn_customer_count: number
  percentage_of_total_churn: number | ""
  total_amount_paid_before_churn: number
  average_orders_before_churn: number | ""
  customers_who_only_bought_once: number
  customers_who_repurchased_before_churn: number
}

export interface ChurnTimingAnalysis {
  byMonth: ChurnByMonthRow[]
  byPeriod: ChurnByPeriodRow[]
}

// ─── Tab 5: Plan Churn Analysis ────────────────────────────────────────────────

export interface PlanChurnRow {
  plan_type: string
  customers_who_bought_this_plan: number
  active_customers_from_this_plan: number
  paused_with_credits_from_this_plan: number
  actual_churn_customers_from_this_plan: number
  at_risk_customers_from_this_plan: number
  converted_not_activated_from_this_plan: number
  never_converted_from_this_plan: number
  churn_rate_for_this_plan: number | ""
  active_rate_for_this_plan: number | ""
  paused_rate_for_this_plan: number | ""
  average_orders_after_buying_this_plan: number | ""
  average_days_from_plan_purchase_to_churn: number | ""
  average_remaining_credits: number | ""
  total_remaining_credits: number
  estimated_remaining_value: number
}

// ─── Tab 6: Excluded accounts audit ───────────────────────────────────────────

export interface ExcludedAccountRow {
  user_id: string
  name: string
  email: string
  role: string
  exclusion_reason: string
  two_dish_voucher_remaining: number
  three_dish_voucher_remaining: number
  six_meal_plan_remaining: number
  eight_meal_plan_remaining: number
  ten_meal_plan_remaining: number
  twelve_meal_plan_remaining: number
  sixteen_meal_plan_remaining: number
  manual_or_other_credits_remaining: number
  total_credits_remaining: number
  total_amount_paid: number
  total_orders: number
  created_date: string
  data_quality_issue: string
}

// ─── Full report payload ───────────────────────────────────────────────────────

export interface SituationReport {
  rows: CustomerSituationRow[]
  creditObligation: CreditObligationRow[]
  statusSummary: StatusSummaryRow[]
  overallSummary: OverallSummary
  validation: ValidationResult
  churnTiming: ChurnTimingAnalysis
  planChurn: PlanChurnRow[]
  excludedAccounts: ExcludedAccountRow[]
}
