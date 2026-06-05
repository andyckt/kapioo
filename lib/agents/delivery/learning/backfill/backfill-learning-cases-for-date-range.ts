import connectToDatabase from "@/lib/db";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import { buildDeliveryAgentLearningCaseKey } from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-key";
import { getHistoricalOrdersForLearning } from "@/lib/agents/delivery/learning/historical-cases/get-historical-orders-for-learning";
import { validateLearningDeliveryDate } from "@/lib/agents/delivery/learning/historical-cases/validate-learning-delivery-date";
import {
  buildDeliveryAgentLearningCaseFromHistoricalData,
  upsertDeliveryAgentLearningCase,
} from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-for-date";
import { fetchRouteOptimizerRunsByDate } from "@/lib/integrations/route-optimizer/fetch-runs-by-date";
import {
  RouteOptimizerError,
  RouteOptimizerRateLimitError,
} from "@/lib/integrations/route-optimizer/errors";
import DeliveryAgentLearningCase from "@/models/DeliveryAgentLearningCase";

const DEFAULT_MAX_BACKFILL_DATES = 60;

export type DeliveryAgentLearningBackfillDateStatus =
  | "saved"
  | "skipped_existing"
  | "skipped_no_orders"
  | "skipped_unchanged"
  | "failed";

export type DeliveryAgentLearningBackfillDateResult = {
  deliveryDate: string;
  status: DeliveryAgentLearningBackfillDateStatus;
  caseKey?: string;
  sourceHash?: string | null;
  orderCount?: number;
  routeOptimizerRunCount?: number;
  learningLabel?: string;
  reviewStatus?: string;
  error?: {
    name: string;
    message: string;
    code?: string;
    retryable: boolean;
  };
};

export type DeliveryAgentLearningBackfillSummary = {
  backfillBatchId: string;
  profileId: string;
  startDate: string;
  endDate: string;
  totalDates: number;
  savedCount: number;
  skippedCount: number;
  errorCount: number;
  results: DeliveryAgentLearningBackfillDateResult[];
};

export type BackfillDeliveryAgentLearningCasesForDateRangeInput = {
  startDate: string;
  endDate: string;
  profileId?: string;
  force?: boolean;
  maxDates?: number;
  backfillBatchId?: string;
  logProgress?: boolean;
};

type ExistingLearningCaseSummary = {
  caseKey: string;
  sourceHash?: string | null;
  reviewStatus?: string | null;
  quality?: { learningLabel?: string | null };
};

function parseDateOnlyUtc(date: string): Date {
  const validated = validateLearningDeliveryDate(date);
  const parsed = new Date(`${validated}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid delivery date: ${date}`);
  }

  return parsed;
}

function formatDateOnlyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function buildLearningBackfillDateList(input: {
  startDate: string;
  endDate: string;
  maxDates?: number;
}): string[] {
  const start = parseDateOnlyUtc(input.startDate);
  const end = parseDateOnlyUtc(input.endDate);

  if (start.getTime() > end.getTime()) {
    throw new Error("startDate must be on or before endDate for learning backfill.");
  }

  const maxDates = Math.max(1, input.maxDates ?? DEFAULT_MAX_BACKFILL_DATES);
  const dates: string[] = [];

  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addUtcDays(cursor, 1)) {
    dates.push(formatDateOnlyUtc(cursor));

    if (dates.length > maxDates) {
      throw new Error(`Learning backfill date range exceeds maxDates (${maxDates}).`);
    }
  }

  return dates;
}

function buildDefaultBackfillBatchId(input: {
  startDate: string;
  endDate: string;
  profileId: string;
}): string {
  return `delivery-learning-backfill:${input.profileId}:${input.startDate}:${input.endDate}:${Date.now()}`;
}

function toErrorResult(input: {
  deliveryDate: string;
  error: unknown;
}): DeliveryAgentLearningBackfillDateResult {
  const error = input.error;
  const isRouteOptimizerError = error instanceof RouteOptimizerError;
  const message = error instanceof Error ? error.message : String(error);

  return {
    deliveryDate: input.deliveryDate,
    status: "failed",
    error: {
      name: error instanceof Error ? error.name : "UnknownError",
      message,
      code: isRouteOptimizerError ? error.code : undefined,
      retryable:
        error instanceof RouteOptimizerRateLimitError ||
        (isRouteOptimizerError && error.code === "ROUTE_OPTIMIZER_NETWORK_ERROR"),
    },
  };
}

function logBackfillProgress(event: string, payload: Record<string, unknown>): void {
  console.info(
    JSON.stringify({
      event,
      ...payload,
    })
  );
}

async function readExistingLearningCase(caseKey: string): Promise<ExistingLearningCaseSummary | null> {
  const existing = await DeliveryAgentLearningCase.findOne({ caseKey })
    .select("caseKey sourceHash reviewStatus quality.learningLabel")
    .lean();

  return existing as ExistingLearningCaseSummary | null;
}

export async function backfillDeliveryAgentLearningCaseForDate(input: {
  deliveryDate: string;
  profileId: string;
  backfillBatchId: string;
  force: boolean;
  logProgress: boolean;
}): Promise<DeliveryAgentLearningBackfillDateResult> {
  const caseKey = buildDeliveryAgentLearningCaseKey({
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
  });
  const existing = await readExistingLearningCase(caseKey);

  if (existing && !input.force) {
    return {
      deliveryDate: input.deliveryDate,
      status: "skipped_existing",
      caseKey,
      sourceHash: existing.sourceHash ?? null,
      learningLabel: existing.quality?.learningLabel ?? undefined,
      reviewStatus: existing.reviewStatus ?? undefined,
    };
  }

  const orders = await getHistoricalOrdersForLearning({
    deliveryDate: input.deliveryDate,
  });

  if (orders.length === 0) {
    return {
      deliveryDate: input.deliveryDate,
      status: "skipped_no_orders",
      caseKey,
      orderCount: 0,
    };
  }

  const routeOptimizerResponse = await fetchRouteOptimizerRunsByDate(input.deliveryDate);
  const learningCase = buildDeliveryAgentLearningCaseFromHistoricalData({
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
    backfillBatchId: input.backfillBatchId,
    orders,
    routeOptimizerResponse,
  });

  if (existing?.sourceHash && existing.sourceHash === learningCase.sourceHash) {
    return {
      deliveryDate: input.deliveryDate,
      status: "skipped_unchanged",
      caseKey,
      sourceHash: learningCase.sourceHash,
      orderCount: orders.length,
      routeOptimizerRunCount: routeOptimizerResponse.runs.length,
      learningLabel: existing.quality?.learningLabel ?? undefined,
      reviewStatus: existing.reviewStatus ?? undefined,
    };
  }

  const saved = await upsertDeliveryAgentLearningCase(learningCase);

  if (input.logProgress) {
    logBackfillProgress("delivery_agent.learning_backfill.date_saved", {
      deliveryDate: input.deliveryDate,
      caseKey,
      learningLabel: saved.quality.learningLabel,
      reviewStatus: saved.reviewStatus,
    });
  }

  return {
    deliveryDate: input.deliveryDate,
    status: "saved",
    caseKey,
    sourceHash: saved.sourceHash ?? null,
    orderCount: orders.length,
    routeOptimizerRunCount: routeOptimizerResponse.runs.length,
    learningLabel: saved.quality.learningLabel,
    reviewStatus: saved.reviewStatus,
  };
}

export async function backfillDeliveryAgentLearningCasesForDateRange(
  input: BackfillDeliveryAgentLearningCasesForDateRangeInput
): Promise<DeliveryAgentLearningBackfillSummary> {
  const startDate = validateLearningDeliveryDate(input.startDate);
  const endDate = validateLearningDeliveryDate(input.endDate);
  const profile = getDeliveryPlanningProfile(input.profileId);
  const profileId = profile.profileId;
  const dates = buildLearningBackfillDateList({
    startDate,
    endDate,
    maxDates: input.maxDates,
  });
  const backfillBatchId =
    input.backfillBatchId?.trim() ||
    buildDefaultBackfillBatchId({ startDate, endDate, profileId });
  const logProgress = input.logProgress === true;

  await connectToDatabase();

  if (logProgress) {
    logBackfillProgress("delivery_agent.learning_backfill.started", {
      backfillBatchId,
      profileId,
      startDate,
      endDate,
      totalDates: dates.length,
      force: input.force === true,
    });
  }

  const results: DeliveryAgentLearningBackfillDateResult[] = [];

  for (const deliveryDate of dates) {
    try {
      const result = await backfillDeliveryAgentLearningCaseForDate({
        deliveryDate,
        profileId,
        backfillBatchId,
        force: input.force === true,
        logProgress,
      });
      results.push(result);
    } catch (error) {
      const errorResult = toErrorResult({ deliveryDate, error });
      results.push(errorResult);

      if (logProgress) {
        logBackfillProgress("delivery_agent.learning_backfill.date_failed", errorResult);
      }
    }
  }

  const savedCount = results.filter((result) => result.status === "saved").length;
  const errorCount = results.filter((result) => result.status === "failed").length;
  const skippedCount = results.length - savedCount - errorCount;

  const summary: DeliveryAgentLearningBackfillSummary = {
    backfillBatchId,
    profileId,
    startDate,
    endDate,
    totalDates: dates.length,
    savedCount,
    skippedCount,
    errorCount,
    results,
  };

  if (logProgress) {
    logBackfillProgress("delivery_agent.learning_backfill.completed", {
      backfillBatchId,
      profileId,
      savedCount,
      skippedCount,
      errorCount,
    });
  }

  return summary;
}
