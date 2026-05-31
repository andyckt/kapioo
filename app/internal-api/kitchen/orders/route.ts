import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { authorizeKitchenRequest } from "@/lib/agents/kitchen/auth";
import { getOrdersForKitchenPrep } from "@/lib/agents/kitchen/get-orders-for-kitchen-prep";
import type { KitchenSourceFilter } from "@/lib/agents/kitchen/types";
import connectToDatabase from "@/lib/db";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_SOURCES = new Set<KitchenSourceFilter>(["daily", "weekly", "all"]);

function isValidIsoDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function parseSourceParam(raw: string | null): KitchenSourceFilter {
  const normalized = raw?.trim().toLowerCase() || "all";
  if (VALID_SOURCES.has(normalized as KitchenSourceFilter)) {
    return normalized as KitchenSourceFilter;
  }
  return "all";
}

function logKitchenRequest(params: {
  requestId: string;
  date: string;
  source: KitchenSourceFilter;
  dailyCount: number;
  weeklyCount: number;
  excluded: {
    cancelled: number;
    refunded: number;
    unpaid: number;
    wrong_date: number;
  };
}) {
  console.info("[kitchen-api] request completed", {
    request_id: params.requestId,
    date: params.date,
    source: params.source,
    daily_orders_included: params.dailyCount,
    weekly_orders_included: params.weeklyCount,
    excluded_cancelled: params.excluded.cancelled,
    excluded_refunded: params.excluded.refunded,
    excluded_unpaid: params.excluded.unpaid,
    excluded_wrong_date: params.excluded.wrong_date,
  });
}

export async function GET(request: Request) {
  const requestId = randomUUID();

  console.info("[kitchen-api] request received", {
    request_id: requestId,
  });

  const auth = authorizeKitchenRequest(request);
  if (!auth.ok) {
    console.warn("[kitchen-api] unauthorized request", {
      request_id: requestId,
      reason: auth.reason,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date")?.trim() ?? "";
  const source = parseSourceParam(url.searchParams.get("source"));

  if (!dateParam) {
    return NextResponse.json(
      { error: "Invalid date format. Expected YYYY-MM-DD." },
      { status: 400 }
    );
  }

  if (!isValidIsoDate(dateParam)) {
    return NextResponse.json(
      { error: "Invalid date format. Expected YYYY-MM-DD." },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const result = await getOrdersForKitchenPrep({
      deliveryDateIso: dateParam,
      source,
    });

    logKitchenRequest({
      requestId,
      date: dateParam,
      source,
      dailyCount: result.daily.orders_count,
      weeklyCount: result.weekly.orders_count,
      excluded: result.debug.excluded_order_summary,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[kitchen-api] failed to fetch kitchen orders", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to fetch kitchen orders",
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
