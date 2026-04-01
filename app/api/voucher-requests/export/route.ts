import { NextResponse } from "next/server";
import { format } from "date-fns";

import { errorJson, parseSearchParams } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import { voucherPurchaseRequestExportQuerySchema } from "@/lib/contracts/voucher-request";
import connectToDatabase from "@/lib/db";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: query, error: queryError } = parseSearchParams(
      request,
      voucherPurchaseRequestExportQuerySchema
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

    const requests = await VoucherPurchaseRequest.find(mongoQuery)
      .sort({ createdAt: -1 })
      .populate("userId", "name email userID phone");

    const csv = convertToCSV(requests);

    const headers = new Headers();
    headers.set("Content-Type", "text/csv");
    headers.set(
      "Content-Disposition",
      `attachment; filename="voucher-requests-${format(new Date(), "yyyy-MM-dd")}.csv"`
    );

    return new NextResponse(csv, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error exporting voucher purchase requests:", error);
    return errorJson("Failed to export voucher purchase requests", 500);
  }
}

function convertToCSV(requests: unknown[]) {
  const headers = [
    "Request ID",
    "User Name",
    "User Email",
    "User ID",
    "Phone",
    "Voucher Type",
    "Quantity",
    "Amount",
    "Status",
    "Created Date",
    "Approved/Declined Date",
    "Admin Notes",
    "User Notes",
    "Payment Reference",
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

    const voucherType = r.type === "twoDish" ? "2-Dish" : "3-Dish";

    const row = [
      escapeCsvField(String(r.requestId || "")),
      escapeCsvField(String(user.name || "")),
      escapeCsvField(String(user.email || "")),
      escapeCsvField(String(user.userID || "")),
      escapeCsvField(String(user.phone || "")),
      escapeCsvField(voucherType),
      String(r.quantity || ""),
      String(r.amount || ""),
      escapeCsvField(String(r.status || "")),
      escapeCsvField(createdDate),
      escapeCsvField(statusDate),
      escapeCsvField(String(r.adminNotes || "")),
      escapeCsvField(String(r.notes || "")),
      escapeCsvField(String(r.paymentReference || "")),
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
