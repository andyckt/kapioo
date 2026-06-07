import connectToDatabase from "@/lib/db";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import { buildDeliveryAgentLearningCaseKey } from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-key";
import { getHistoricalOrdersForLearning } from "@/lib/agents/delivery/learning/historical-cases/get-historical-orders-for-learning";
import { validateLearningDeliveryDate } from "@/lib/agents/delivery/learning/historical-cases/validate-learning-delivery-date";
import {
  buildDeliveryAgentLearningCaseFromHistoricalData,
  upsertDeliveryAgentLearningCase,
} from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-for-date";
import {
  assessDeliveryAgentLearningBackfillReadiness,
  getDryRunBackfillStatus,
  type DeliveryAgentLearningBackfillReadiness,
} from "@/lib/agents/delivery/learning/backfill/learning-backfill-readiness";
import { fetchRouteOptimizerRunsByDate } from "@/lib/integrations/route-optimizer/fetch-runs-by-date";
import {
  RouteOptimizerError,
  RouteOptimizerRateLimitError,
} from "@/lib/integrations/route-optimizer/errors";
import DeliveryAgentLearningCase from "@/models/DeliveryAgentLearningCase";

const DEFAULT_MAX_BACKFILL_DATES = 60;

export type DeliveryAgentLearningBackfillDateStatus =
  | "dry_run_ready"
  | "dry_run_needs_review"
  | "dry_run_blocked"
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
  readiness?: DeliveryAgentLearningBackfillReadiness;
  positiveRetrievalReady?: boolean;
  dataQualityScore?: number;
  matchCoveragePercent?: number;
  matchedOrders?: number;
  unmatchedOrders?: number;
  coordinateCoveragePercent?: number;
  stopsWithCoordinates?: number;
  totalCoordinateStops?: number;
  readinessReasons?: string[];
  warnings?: string[];
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
  dryRunCount: number;
  skippedCount: number;
  errorCount: number;
  readyCount: number;
  needsReviewCount: number;
  blockedCount: number;
  positiveRetrievalReadyCount: number;
  results: DeliveryAgentLearningBackfillDateResult[];
};

export type BackfillDeliveryAgentLearningCasesForDateRangeInput = {
  startDate: string;
  endDate: string;
  profileId?: string;
  force?: boolean;
  dryRun?: boolean;
  routeOptimizerRequestDelayMs?: number;
  routeOptimizerRateLimitRetries?: number;
  routeOptimizerRateLimitRetryDelayMs?: number;
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

function sleep(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeNonNegativeInteger(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Backfill timing options must be non-negative integers.");
  }

  return value;
}

async function readExistingLearningCase(caseKey: string): Promise<ExistingLearningCaseSummary | null> {
  const existing = await DeliveryAgentLearningCase.findOne({ caseKey })
    .select("caseKey sourceHash reviewStatus quality.learningLabel")
    .lean();

  return existing as ExistingLearningCaseSummary | null;
}

function buildResultFromLearningCase(input: {
  deliveryDate: string;
  status: DeliveryAgentLearningBackfillDateStatus;
  caseKey: string;
  sourceHash: string | null;
  orderCount: number;
  routeOptimizerRunCount: number;
  learningCase: {
    quality: {
      learningLabel: string;
      dataQualityScore: number;
      canUseForPositiveRetrieval: boolean;
    };
    reviewStatus: string;
    matchCoverage: {
      matchCoveragePercent: number;
      matchedOrders: number;
      unmatchedOrders: number;
    };
    coordinateCoverage: {
      coveragePercent: number;
      stopsWithCoordinates: number;
      totalStops: number;
    };
    warnings?: string[];
  };
  readiness: ReturnType<typeof assessDeliveryAgentLearningBackfillReadiness>;
}): DeliveryAgentLearningBackfillDateResult {
  return {
    deliveryDate: input.deliveryDate,
    status: input.status,
    caseKey: input.caseKey,
    sourceHash: input.sourceHash,
    orderCount: input.orderCount,
    routeOptimizerRunCount: input.routeOptimizerRunCount,
    learningLabel: input.learningCase.quality.learningLabel,
    reviewStatus: input.learningCase.reviewStatus,
    readiness: input.readiness.readiness,
    positiveRetrievalReady: input.readiness.positiveRetrievalReady,
    dataQualityScore: input.learningCase.quality.dataQualityScore,
    matchCoveragePercent: input.learningCase.matchCoverage.matchCoveragePercent,
    matchedOrders: input.learningCase.matchCoverage.matchedOrders,
    unmatchedOrders: input.learningCase.matchCoverage.unmatchedOrders,
    coordinateCoveragePercent: input.learningCase.coordinateCoverage.coveragePercent,
    stopsWithCoordinates: input.learningCase.coordinateCoverage.stopsWithCoordinates,
    totalCoordinateStops: input.learningCase.coordinateCoverage.totalStops,
    readinessReasons: input.readiness.reasons,
    warnings: input.readiness.warnings,
  };
}

async function fetchRouteOptimizerRunsByDateForBackfill(input: {
  deliveryDate: string;
  requestDelayMs: number;
  rateLimitRetries: number;
  rateLimitRetryDelayMs: number;
}): Promise<Awaited<ReturnType<typeof fetchRouteOptimizerRunsByDate>>> {
  await sleep(input.requestDelayMs);

  for (let attempt = 0; attempt <= input.rateLimitRetries; attempt += 1) {
    try {
      return await fetchRouteOptimizerRunsByDate(input.deliveryDate);
    } catch (error) {
      const isLastAttempt = attempt >= input.rateLimitRetries;

      if (!(error instanceof RouteOptimizerRateLimitError) || isLastAttempt) {
        throw error;
      }

      await sleep(input.rateLimitRetryDelayMs);
    }
  }

  return fetchRouteOptimizerRunsByDate(input.deliveryDate);
}

export async function backfillDeliveryAgentLearningCaseForDate(input: {
  deliveryDate: string;
  profileId: string;
  backfillBatchId: string;
  force: boolean;
  dryRun: boolean;
  routeOptimizerRequestDelayMs: number;
  routeOptimizerRateLimitRetries: number;
  routeOptimizerRateLimitRetryDelayMs: number;
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

  const routeOptimizerResponse = await fetchRouteOptimizerRunsByDateForBackfill({
    deliveryDate: input.deliveryDate,
    requestDelayMs: input.routeOptimizerRequestDelayMs,
    rateLimitRetries: input.routeOptimizerRateLimitRetries,
    rateLimitRetryDelayMs: input.routeOptimizerRateLimitRetryDelayMs,
  });
  const learningCase = buildDeliveryAgentLearningCaseFromHistoricalData({
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
    backfillBatchId: input.backfillBatchId,
    orders,
    routeOptimizerResponse,
  });

  if (existing?.sourceHash && existing.sourceHash === learningCase.sourceHash) {
    const unchangedLearningCase = {
      ...learningCase,
      quality: {
        ...learningCase.quality,
        learningLabel: existing.quality?.learningLabel ?? learningCase.quality.learningLabel,
      },
      reviewStatus: existing.reviewStatus ?? learningCase.reviewStatus,
    };
    const readiness = assessDeliveryAgentLearningBackfillReadiness(unchangedLearningCase);

    return buildResultFromLearningCase({
      deliveryDate: input.deliveryDate,
      status: "skipped_unchanged",
      caseKey,
      sourceHash: learningCase.sourceHash,
      orderCount: orders.length,
      routeOptimizerRunCount: routeOptimizerResponse.runs.length,
      learningCase: unchangedLearningCase,
      readiness,
    });
  }

  const readiness = assessDeliveryAgentLearningBackfillReadiness(learningCase);

  if (input.dryRun) {
    return buildResultFromLearningCase({
      deliveryDate: input.deliveryDate,
      status: getDryRunBackfillStatus(readiness.readiness),
      caseKey,
      sourceHash: learningCase.sourceHash,
      orderCount: orders.length,
      routeOptimizerRunCount: routeOptimizerResponse.runs.length,
      learningCase,
      readiness,
    });
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

  return buildResultFromLearningCase({
    deliveryDate: input.deliveryDate,
    status: "saved",
    caseKey,
    sourceHash: saved.sourceHash ?? null,
    orderCount: orders.length,
    routeOptimizerRunCount: routeOptimizerResponse.runs.length,
    learningCase: saved,
    readiness,
  });
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
  const routeOptimizerRequestDelayMs = sanitizeNonNegativeInteger(
    input.routeOptimizerRequestDelayMs,
    0
  );
  const routeOptimizerRateLimitRetries = sanitizeNonNegativeInteger(
    input.routeOptimizerRateLimitRetries,
    0
  );
  const routeOptimizerRateLimitRetryDelayMs = sanitizeNonNegativeInteger(
    input.routeOptimizerRateLimitRetryDelayMs,
    0
  );

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
        dryRun: input.dryRun === true,
        routeOptimizerRequestDelayMs,
        routeOptimizerRateLimitRetries,
        routeOptimizerRateLimitRetryDelayMs,
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
  const dryRunCount = results.filter((result) => result.status.startsWith("dry_run_")).length;
  const errorCount = results.filter((result) => result.status === "failed").length;
  const skippedCount = results.length - savedCount - dryRunCount - errorCount;
  const readyCount = results.filter((result) => result.readiness === "ready").length;
  const needsReviewCount = results.filter((result) => result.readiness === "needs_review").length;
  const blockedCount = results.filter((result) => result.readiness === "blocked").length;
  const positiveRetrievalReadyCount = results.filter(
    (result) => result.positiveRetrievalReady === true
  ).length;

  const summary: DeliveryAgentLearningBackfillSummary = {
    backfillBatchId,
    profileId,
    startDate,
    endDate,
    totalDates: dates.length,
    savedCount,
    dryRunCount,
    skippedCount,
    errorCount,
    readyCount,
    needsReviewCount,
    blockedCount,
    positiveRetrievalReadyCount,
    results,
  };

  if (logProgress) {
    logBackfillProgress("delivery_agent.learning_backfill.completed", {
      backfillBatchId,
      profileId,
      savedCount,
      dryRunCount,
      skippedCount,
      errorCount,
      readyCount,
      needsReviewCount,
      blockedCount,
      positiveRetrievalReadyCount,
    });
  }

  return summary;
}
