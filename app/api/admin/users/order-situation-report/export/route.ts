import { NextResponse } from "next/server"

import { requireAdminMfa } from "@/lib/auth/guards"
import connectToDatabase from "@/lib/db"
import { logAuditEvent } from "@/lib/security/audit"
import { aggregatePurchasesByUser, buildSituationReport } from "@/lib/reports/customer-situation/compute"
import { buildSituationWorkbook } from "@/lib/reports/customer-situation/build-workbook"
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest"
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest"
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder"
import WeeklyOrder from "@/models/WeeklyOrder"
import Transaction from "@/models/Transaction"
import User from "@/models/User"

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    await connectToDatabase()

    // ── 1. All users (lean, no sensitive fields) ──────────────────────────────
    const users = await User.find({})
      .select("-password -salt -verificationCode -resetPasswordCode -verificationExpires -resetPasswordExpires -adminMfaCodeHash -adminMfaCodeExpires -adminMfaCodeSentAt")
      .lean()

    // ── 2. Orders (lean, exclude cancelled/refunded at DB level) ──────────────
    const orderProjection = {
      userId: 1,
      status: 1,
      createdAt: 1,
      items: 1,
      voucherCost: 1,
      allocatedMealCount: 1,
      creditCost: 1,
      mealPlanType: 1,
    }
    const orderFilter = { status: { $nin: ["cancelled", "refunded"] } }

    const [dailyOrders, weeklyOrders] = await Promise.all([
      DailyDeliveryOrder.find(orderFilter).select(orderProjection).lean(),
      WeeklyOrder.find(orderFilter).select(orderProjection).lean(),
    ])

    // ── 3. Approved purchase requests ─────────────────────────────────────────
    const purchaseProjection = {
      userId: 1,
      status: 1,
      amount: 1,
      finalTotal: 1,
      approvedAt: 1,
      createdAt: 1,
      // CreditPurchaseRequest fields
      approvedSixMeals: 1,
      approvedEightMeals: 1,
      approvedTenMeals: 1,
      approvedTwelveMeals: 1,
      approvedSixteenMeals: 1,
      approvedCredits: 1,
      approvedPlans: 1,
      mealPlanType: 1,
      mealPlanQuantity: 1,
      // VoucherPurchaseRequest field
      quantity: 1,
    }
    const approvedFilter = { status: "approved" }

    const [creditRequests, voucherRequests] = await Promise.all([
      CreditPurchaseRequest.find(approvedFilter).select(purchaseProjection).lean(),
      VoucherPurchaseRequest.find(approvedFilter).select(purchaseProjection).lean(),
    ])

    // ── 4. Aggregate purchases per user ───────────────────────────────────────
    const purchaseByUser = aggregatePurchasesByUser(
      creditRequests as Parameters<typeof aggregatePurchasesByUser>[0],
      voucherRequests as Parameters<typeof aggregatePurchasesByUser>[1]
    )

    // ── 5. Last credit-used date per user (from Transaction deducts) ──────────
    const lastCreditUsedByUser = new Map<string, Date>()
    try {
      const txAgg = await Transaction.aggregate<{ _id: unknown; lastDate: Date }>([
        { $match: { type: { $in: ["Deduct", "debit"] } } },
        { $group: { _id: "$userId", lastDate: { $max: "$createdAt" } } },
      ])
      for (const { _id, lastDate } of txAgg) {
        if (_id && lastDate) lastCreditUsedByUser.set(String(_id), new Date(lastDate))
      }
    } catch {
      // Non-fatal: omit last_credit_used_date if Transaction query fails
    }

    // ── 6. Build report ───────────────────────────────────────────────────────
    const report = buildSituationReport({
      users: users as Parameters<typeof buildSituationReport>[0]["users"],
      dailyOrders: dailyOrders as Parameters<typeof buildSituationReport>[0]["dailyOrders"],
      weeklyOrders: weeklyOrders as Parameters<typeof buildSituationReport>[0]["weeklyOrders"],
      purchaseByUser,
      lastCreditUsedByUser,
    })

    // ── 7. Log validation failures ────────────────────────────────────────────
    const { validation } = report
    if (!validation.credits_sum_matches || !validation.obligation_sum_matches || !validation.all_users_have_status
      || !validation.no_zero_order_user_in_active_statuses || !validation.no_actual_churn_with_remaining_credits) {
      console.warn("[situation-report] validation checks failed:", validation)
    }

    // ── 8. Build workbook ─────────────────────────────────────────────────────
    const excelBuffer = buildSituationWorkbook(report)

    await logAuditEvent({
      actor,
      action: "users.situation-report-export",
      targetType: "user-export",
      metadata: {
        exportedCount: report.rows.length,
        validation,
      },
      request,
    })

    const date = new Date().toISOString().split("T")[0]
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="kapioo_customer_order_situation_report_${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error: unknown) {
    console.error("[situation-report] export error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
