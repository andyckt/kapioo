import { ApiError } from "@/lib/api";
import {
  buildLearningCaseManualReviewPatch,
  buildLearningCaseReviewActions,
  getDeliveryAgentLearningReviewActionLabel,
  getLearningCaseReviewReadiness,
} from "@/lib/agents/delivery/learning/review/learning-case-review-policy";
import connectToDatabase from "@/lib/db";
import type { DeliveryAgentLearningCaseContract } from "@/lib/contracts/delivery-agent-learning";
import type {
  DeliveryAgentLearningCaseReviewBody,
  DeliveryAgentLearningReviewCaseDetail,
  DeliveryAgentLearningReviewCaseSummary,
  DeliveryAgentLearningReviewListQuery,
  DeliveryAgentLearningReviewListResponse,
  DeliveryAgentLearningReviewSummaryStats,
  DeliveryAgentLearningReviewUpdateResponse,
} from "@/lib/contracts/delivery-agent-learning-review";
import DeliveryAgentLearningCase from "@/models/DeliveryAgentLearningCase";

function toIsoString(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return null;
}

function toLearningCaseContract(raw: unknown): DeliveryAgentLearningCaseContract {
  return raw as DeliveryAgentLearningCaseContract;
}

function getCaseId(raw: unknown): string {
  const id = (raw as { _id?: unknown })._id;
  return id ? String(id) : "";
}

export function summarizeLearningCaseForReview(
  raw: unknown
): DeliveryAgentLearningReviewCaseSummary {
  const learningCase = toLearningCaseContract(raw);
  const readiness = getLearningCaseReviewReadiness(learningCase);

  return {
    id: getCaseId(raw),
    deliveryDate: learningCase.deliveryDate,
    profileId: learningCase.profileId,
    caseKey: learningCase.caseKey,
    reviewStatus: learningCase.reviewStatus,
    learningLabel: learningCase.quality.learningLabel,
    learningWeight: learningCase.quality.learningWeight,
    dataQualityScore: learningCase.quality.dataQualityScore,
    canUseForPositiveRetrieval: learningCase.quality.canUseForPositiveRetrieval,
    readiness: readiness.readiness,
    positiveRetrievalReady: readiness.positiveRetrievalReady,
    readinessReasons: readiness.reasons,
    warningCount:
      (learningCase.warnings?.length ?? 0) +
      (learningCase.quality.warnings?.length ?? 0) +
      (learningCase.coordinateCoverage.warnings?.length ?? 0),
    orderCount: learningCase.adminOrdersSnapshot.length,
    matchedOrders: learningCase.matchCoverage.matchedOrders,
    unmatchedOrders: learningCase.matchCoverage.unmatchedOrders,
    matchCoveragePercent: learningCase.matchCoverage.matchCoveragePercent,
    coordinateCoveragePercent: learningCase.coordinateCoverage.coveragePercent,
    runCount: learningCase.routeShapeFeatures.runCount,
    selfRunUsed: learningCase.routeShapeFeatures.selfRunUsed,
    supportRunUsed: learningCase.routeShapeFeatures.supportRunUsed,
    completedBefore1pm: learningCase.outcomeFeatures.runCompletedBefore1pm ?? null,
    deadlineBufferMinutes: learningCase.outcomeFeatures.deadlineBufferMinutes ?? null,
    latestRunCompletedAt: learningCase.outcomeFeatures.latestRunCompletedAt ?? null,
    handoffStopsUsed: learningCase.stopControlFeatures.handoffStopsUsed,
    majorClusterSummary: learningCase.geoFeatures.majorClusterSummary ?? null,
    manualReview: learningCase.manualReview ?? null,
    updatedAt: toIsoString((raw as { updatedAt?: unknown }).updatedAt),
  };
}

function summarizeLearningCaseDetail(raw: unknown): DeliveryAgentLearningReviewCaseDetail {
  const learningCase = toLearningCaseContract(raw);
  const summary = summarizeLearningCaseForReview(raw);

  return {
    ...summary,
    qualityReasons: learningCase.quality.qualityReasons ?? [],
    warnings: [
      ...(learningCase.warnings ?? []),
      ...(learningCase.quality.warnings ?? []),
      ...(learningCase.routeShapeFeatures.warnings ?? []),
      ...(learningCase.stopControlFeatures.warnings ?? []),
      ...(learningCase.outcomeFeatures.warnings ?? []),
    ],
    coordinateWarnings: learningCase.coordinateCoverage.warnings ?? [],
    unmatchedOrderSummaries: (learningCase.unmatchedOrders ?? []).map((order) => ({
      orderId: order.orderId,
      reason: order.reason,
    })),
    unmatchedRoStopSummaries: (learningCase.unmatchedRoStops ?? []).map((stop) => ({
      roRunId: stop.roRunId,
      sequence: stop.roStopSequence,
      customerName: stop.roCustomerName ?? null,
      address: stop.roCustomerAddress ?? null,
      reason: stop.reason,
    })),
    areaDistribution: learningCase.geoFeatures.areaDistribution ?? {},
    dynamicOutliers: (learningCase.geoFeatures.dynamicOutliers ?? []).map((outlier) => ({
      ref: outlier.ref,
      orderId: outlier.orderId ?? null,
      distanceFromCenterKm: outlier.distanceFromCenterKm,
      direction: outlier.direction ?? null,
      reason: outlier.reason,
    })),
    runSummaries: (learningCase.stopControlFeatures.runs ?? []).map((run) => ({
      roRunId: run.roRunId,
      driverName: run.driverName ?? null,
      role: run.runRole,
      stopCount: run.stops.length,
      startLocation: run.startLocation ?? null,
      endLocation: run.endLocation ?? null,
    })),
    reviewActions: buildLearningCaseReviewActions(learningCase),
  };
}

function createEmptySummary(): DeliveryAgentLearningReviewSummaryStats {
  return {
    total: 0,
    ready: 0,
    needsReview: 0,
    blocked: 0,
    pending: 0,
    reviewed: 0,
    none: 0,
    trustedPositiveReady: 0,
    labels: {
      positive: 0,
      weak_positive: 0,
      negative: 0,
      avoid_pattern: 0,
      uncertain: 0,
      excluded: 0,
    },
  };
}

function buildSummaryStats(cases: DeliveryAgentLearningReviewCaseSummary[]) {
  const summary = createEmptySummary();

  for (const learningCase of cases) {
    summary.total += 1;
    if (learningCase.readiness === "needs_review") {
      summary.needsReview += 1;
    } else {
      summary[learningCase.readiness] += 1;
    }
    summary[learningCase.reviewStatus] += 1;
    summary.labels[learningCase.learningLabel] += 1;
    if (learningCase.positiveRetrievalReady) {
      summary.trustedPositiveReady += 1;
    }
  }

  return summary;
}

function matchesSearch(learningCase: DeliveryAgentLearningReviewCaseSummary, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return [
    learningCase.deliveryDate,
    learningCase.profileId,
    learningCase.caseKey,
    learningCase.majorClusterSummary ?? "",
  ].some((value) => value.toLowerCase().includes(needle));
}

export async function listDeliveryAgentLearningCasesForReview(
  query: DeliveryAgentLearningReviewListQuery
): Promise<DeliveryAgentLearningReviewListResponse> {
  await connectToDatabase();

  const rawCases = await DeliveryAgentLearningCase.find({})
    .sort({ reviewStatus: 1, deliveryDate: -1 })
    .limit(500)
    .lean();
  const allCases = rawCases.map(summarizeLearningCaseForReview);
  const summary = buildSummaryStats(allCases);
  const filtered = allCases.filter((learningCase) => {
    if (query.reviewStatus !== "all" && learningCase.reviewStatus !== query.reviewStatus) {
      return false;
    }

    if (query.label !== "all" && learningCase.learningLabel !== query.label) {
      return false;
    }

    if (query.readiness !== "all" && learningCase.readiness !== query.readiness) {
      return false;
    }

    return matchesSearch(learningCase, query.search);
  });
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / query.limit));
  const page = Math.min(query.page, pages);
  const offset = (page - 1) * query.limit;

  return {
    summary,
    cases: filtered.slice(offset, offset + query.limit),
    pagination: {
      page,
      limit: query.limit,
      total,
      pages,
    },
  };
}

export async function getDeliveryAgentLearningCaseReviewDetail(
  id: string
): Promise<DeliveryAgentLearningReviewCaseDetail> {
  await connectToDatabase();

  const learningCase = await DeliveryAgentLearningCase.findById(id).lean();
  if (!learningCase) {
    throw new ApiError("Historical learning case not found", {
      status: 404,
      code: "learning_case_not_found",
    });
  }

  return summarizeLearningCaseDetail(learningCase);
}

export async function updateDeliveryAgentLearningCaseReview(input: {
  id: string;
  body: DeliveryAgentLearningCaseReviewBody;
  reviewedBy: string;
}): Promise<DeliveryAgentLearningReviewUpdateResponse> {
  await connectToDatabase();

  const learningCase = await DeliveryAgentLearningCase.findById(input.id);
  if (!learningCase) {
    throw new ApiError("Historical learning case not found", {
      status: 404,
      code: "learning_case_not_found",
    });
  }

  const patch = buildLearningCaseManualReviewPatch({
    learningCase: learningCase.toObject() as DeliveryAgentLearningCaseContract,
    action: input.body.action,
    notes: input.body.notes,
    reviewedBy: input.reviewedBy,
  });

  learningCase.reviewStatus = patch.reviewStatus;
  learningCase.quality = patch.quality;
  learningCase.manualReview = patch.manualReview;
  await learningCase.save();

  return {
    case: summarizeLearningCaseDetail(learningCase.toObject()),
    message: `${getDeliveryAgentLearningReviewActionLabel(input.body.action)} saved.`,
  };
}
