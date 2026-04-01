import { NextResponse } from "next/server";
import { format } from "date-fns";

import { errorJson, parseSearchParams } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import { creditPurchaseRequestExportQuerySchema } from "@/lib/contracts/credit-request";
import connectToDatabase from "@/lib/db";
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: query, error: queryError } = parseSearchParams(
      request,
      creditPurchaseRequestExportQuerySchema
    );
    if (queryError) {
      return queryError;
    }

    const { status, startDate, endDate } = query;

    await connectToDatabase();

    const mongoQuery: Record<string, unknown> = {};

    if (status && status !== "all") {
      mongoQuery.status = status;
    }

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) {
        createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.$lte = endOfDay;
      }
      mongoQuery.createdAt = createdAt;
    }

    const requests = await CreditPurchaseRequest.find(mongoQuery)
      .sort({ createdAt: -1 })
      .populate("userId", "name email userID phone");

    const csv = convertToCSV(requests);

    const headers = new Headers();
    headers.set("Content-Type", "text/csv");
    headers.set(
      "Content-Disposition",
      `attachment; filename="credit-requests-${format(new Date(), "yyyy-MM-dd")}.csv"`
    );

    return new NextResponse(csv, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error exporting credit purchase requests:", error);
    return errorJson("Failed to export credit purchase requests", 500);
  }
}

function convertToCSV(requests: unknown[]) {
  const headers = [
    "Request ID",
    "User Name",
    "User Email",
    "User ID",
    "Phone",
    "Meal Plan Type",
    "Plan Description",
    "Meal Plan Quantity",
    "Amount",
    "Status",
    "Created Date",
    "Approved/Declined Date",
    "Admin Notes",
    "Payment Method",
    "Payment Reference",
    "Approved Six Meals",
    "Approved Eight Meals",
    "Approved Ten Meals",
    "Approved Twelve Meals",
    "Approved Sixteen Meals",
    "Approved Plans",
  ];

  let csvContent = headers.join(",") + "\n";

  for (const req of requests) {
    const r = req as Record<string, unknown>;
    const user = (r.userId as Record<string, string>) || {};

    const createdDate = r.createdAt
      ? format(new Date(r.createdAt as string), "yyyy-MM-dd HH:mm:ss")
      : "";
    const statusDate =
      r.approvedAt || r.declinedAt
        ? format(new Date((r.approvedAt || r.declinedAt) as string), "yyyy-MM-dd HH:mm:ss")
        : "";

    const row = [
      escapeCsvField(String(r.requestId || "")),
      escapeCsvField(String(user.name || "")),
      escapeCsvField(String(user.email || "")),
      escapeCsvField(String(user.userID || "")),
      escapeCsvField(String(user.phone || "")),
      escapeCsvField(String(r.mealPlanType || "")),
      escapeCsvField(String(r.planDescription || "")),
      String(r.mealPlanQuantity || ""),
      String(r.amount || ""),
      escapeCsvField(String(r.status || "")),
      escapeCsvField(createdDate),
      escapeCsvField(statusDate),
      escapeCsvField(String(r.adminNotes || "")),
      escapeCsvField(String(r.paymentMethod || "")),
      escapeCsvField(String(r.paymentReference || "")),
      String(r.approvedSixMeals || ""),
      String(r.approvedEightMeals || ""),
      String(r.approvedTenMeals || ""),
      String(r.approvedTwelveMeals || ""),
      String(r.approvedSixteenMeals || ""),
      escapeCsvField(JSON.stringify(r.approvedPlans || [])),
    ];

    csvContent += row.join(",") + "\n";
  }

  return csvContent;
}

function escapeCsvField(field: string) {
  if (field && (field.includes(",") || field.includes('"') || field.includes("\n"))) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
