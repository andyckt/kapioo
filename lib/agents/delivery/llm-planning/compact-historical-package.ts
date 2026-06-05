import { createHash } from "crypto";

import type { DeliveryAgentCostPolicy } from "@/lib/contracts/delivery-agent-cost-policy";
import type { DeliveryAgentLearningCaseContract } from "@/lib/contracts/delivery-agent-learning";
import {
  DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION,
  type DeliveryAgentCompactHistoricalCase,
  type DeliveryAgentCompactHistoricalPackage,
} from "@/lib/contracts/delivery-agent-llm-planning";

type LearningCaseScore = {
  learningCase: DeliveryAgentLearningCaseContract;
  score: number;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, stableValue(entryValue)])
    );
  }

  return value;
}

function hashValue(value: unknown, length = 32): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex")
    .slice(0, length);
}

function compactString(value: string | null | undefined, maxLength = 160): string | undefined {
  const compact = value?.trim().replace(/\s+/g, " ");
  if (!compact) {
    return undefined;
  }

  return compact.length > maxLength
    ? `${compact.slice(0, maxLength - 1).trim()}...`
    : compact;
}

function uniqueStrings(values: Array<string | undefined>, maxCount: number): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const compact = compactString(value, 220);
    if (!compact || seen.has(compact)) {
      continue;
    }

    seen.add(compact);
    output.push(compact);
    if (output.length >= maxCount) {
      break;
    }
  }

  return output;
}

function labelScore(
  label: DeliveryAgentLearningCaseContract["quality"]["learningLabel"]
): number {
  switch (label) {
    case "positive":
      return 100;
    case "weak_positive":
      return 80;
    case "avoid_pattern":
      return 70;
    case "negative":
      return 55;
    case "uncertain":
      return 20;
    case "excluded":
      return -100;
  }
}

function reviewScore(reviewStatus: DeliveryAgentLearningCaseContract["reviewStatus"]): number {
  if (reviewStatus === "reviewed") {
    return 15;
  }

  if (reviewStatus === "none") {
    return 5;
  }

  return -40;
}

function profileScore(
  compatibility: DeliveryAgentLearningCaseContract[
    "resourceProfileFeatures"
  ]["profileCompatibilityForFuture"]
): number {
  switch (compatibility) {
    case "same_profile":
      return 15;
    case "transferable_profile":
      return 10;
    case "different_profile":
      return -25;
    case "unknown":
    default:
      return 0;
  }
}

function shouldUseCase(learningCase: DeliveryAgentLearningCaseContract): boolean {
  if (learningCase.quality.learningLabel === "excluded") {
    return false;
  }

  if (learningCase.reviewStatus === "pending") {
    return false;
  }

  return learningCase.quality.dataQualityScore >= 50;
}

function scoreLearningCase(learningCase: DeliveryAgentLearningCaseContract): number {
  return (
    labelScore(learningCase.quality.learningLabel) +
    reviewScore(learningCase.reviewStatus) +
    profileScore(learningCase.resourceProfileFeatures.profileCompatibilityForFuture) +
    learningCase.quality.dataQualityScore * 0.4 +
    learningCase.quality.learningWeight * 20
  );
}

function summarizeOutliers(learningCase: DeliveryAgentLearningCaseContract): string[] {
  return learningCase.geoFeatures.dynamicOutliers.slice(0, 4).map((outlier) => {
    const direction = outlier.direction ? ` ${outlier.direction}` : "";
    const orderSuffix = outlier.orderId ? ` ${outlier.orderId}` : "";
    return `Outlier${orderSuffix}${direction}: ${Math.round(outlier.distanceFromCenterKm)}km from center`;
  });
}

function buildOutcomeLesson(learningCase: DeliveryAgentLearningCaseContract): string | undefined {
  const outcome = learningCase.outcomeFeatures;
  const label = learningCase.quality.learningLabel;

  if (label === "positive" || label === "weak_positive") {
    const buffer = outcome.deadlineBufferMinutes;
    return `Useful pattern: ${learningCase.deliveryDate} ${label} finished before 1 PM${
      typeof buffer === "number" ? ` with ${Math.round(buffer)} min buffer` : ""
    }.`;
  }

  if (label === "avoid_pattern" || label === "negative") {
    const lateMinutes = outcome.lateMinutes;
    return `Avoid pattern: ${learningCase.deliveryDate} ${label}${
      typeof lateMinutes === "number" && lateMinutes > 0
        ? ` was late by ${Math.round(lateMinutes)} min`
        : ""
    }.`;
  }

  return undefined;
}

function buildRouteLesson(learningCase: DeliveryAgentLearningCaseContract): string | undefined {
  const route = learningCase.routeShapeFeatures;
  const controls = learningCase.stopControlFeatures;
  const parts = [
    `${route.runCount} run(s)`,
    route.handoffStartRunCount > 0 ? "handoff used" : undefined,
    route.selfRunUsed ? "self/support used" : undefined,
    controls.fixedStopsUsed ? "fixed stops used" : undefined,
    controls.endStopsUsed ? "end stops used" : undefined,
    route.routeDirectionSmoothness && route.routeDirectionSmoothness !== "unknown"
      ? `smoothness ${route.routeDirectionSmoothness}`
      : undefined,
  ].filter(Boolean);

  if (parts.length === 0) {
    return undefined;
  }

  return `Route shape: ${parts.join(", ")}.`;
}

function buildGeoLesson(learningCase: DeliveryAgentLearningCaseContract): string | undefined {
  const geo = learningCase.geoFeatures;
  const spread = geo.spreadKm;
  const areaEntries = Object.entries(geo.areaDistribution)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 4)
    .map(([area, count]) => `${area}:${count}`);

  if (areaEntries.length === 0 && !spread) {
    return undefined;
  }

  return `Geo shape: ${areaEntries.join(", ")}${
    spread
      ? `; spread ${Math.round(spread.northSouth)}km N/S x ${Math.round(
          spread.eastWest
        )}km E/W`
      : ""
  }.`;
}

function buildPromptSafeLessons(learningCase: DeliveryAgentLearningCaseContract): string[] {
  return uniqueStrings(
    [
      buildOutcomeLesson(learningCase),
      buildRouteLesson(learningCase),
      buildGeoLesson(learningCase),
      ...learningCase.quality.qualityReasons,
      ...learningCase.resourceProfileFeatures.profileTransferNotes,
    ],
    6
  );
}

function buildCompactCase(
  learningCase: DeliveryAgentLearningCaseContract
): DeliveryAgentCompactHistoricalCase {
  return {
    caseKey: learningCase.caseKey,
    deliveryDate: learningCase.deliveryDate,
    profileId: learningCase.profileId,
    learningLabel: learningCase.quality.learningLabel,
    learningWeight: learningCase.quality.learningWeight,
    dataQualityScore: learningCase.quality.dataQualityScore,
    reviewStatus: learningCase.reviewStatus,
    profileCompatibilityForFuture:
      learningCase.resourceProfileFeatures.profileCompatibilityForFuture ?? "unknown",
    orderCount: learningCase.matchCoverage.totalOrders,
    matchedOrderCount: learningCase.matchCoverage.matchedOrders,
    matchCoveragePercent: learningCase.matchCoverage.matchCoveragePercent,
    coordinateCoveragePercent: learningCase.coordinateCoverage.coveragePercent,
    areaDistribution: learningCase.geoFeatures.areaDistribution,
    majorClusterSummary: compactString(learningCase.geoFeatures.majorClusterSummary),
    sameBuildingClusterCount: learningCase.geoFeatures.sameBuildingClusterCount,
    outlierSummary: summarizeOutliers(learningCase),
    routeShape: {
      runCount: learningCase.routeShapeFeatures.runCount,
      supportRunUsed: learningCase.routeShapeFeatures.supportRunUsed,
      selfRunUsed: learningCase.routeShapeFeatures.selfRunUsed,
      kitchenStartRunCount: learningCase.routeShapeFeatures.kitchenStartRunCount,
      handoffStartRunCount: learningCase.routeShapeFeatures.handoffStartRunCount,
      backtrackingRisk: learningCase.routeShapeFeatures.backtrackingRisk,
      routeDirectionSmoothness: learningCase.routeShapeFeatures.routeDirectionSmoothness,
    },
    stopControls: {
      fixedStopsUsed: learningCase.stopControlFeatures.fixedStopsUsed,
      endStopsUsed: learningCase.stopControlFeatures.endStopsUsed,
      firstStopsUsed: learningCase.stopControlFeatures.firstStopsUsed,
      handoffStopsUsed: learningCase.stopControlFeatures.handoffStopsUsed,
    },
    outcome: {
      runCompletedBefore1pm: learningCase.outcomeFeatures.runCompletedBefore1pm,
      deadlineBufferMinutes: learningCase.outcomeFeatures.deadlineBufferMinutes,
      lateMinutes: learningCase.outcomeFeatures.lateMinutes,
      latenessAttribution: learningCase.outcomeFeatures.latenessAttribution,
      routeWouldHaveMetDeadlineIfStartedOnTime:
        learningCase.outcomeFeatures.routeWouldHaveMetDeadlineIfStartedOnTime,
    },
    resourceProfile: {
      runCountUsed: learningCase.resourceProfileFeatures.runCountUsed,
      hiredDriverRunCount: learningCase.resourceProfileFeatures.hiredDriverRunCount,
      availableRunCount: learningCase.resourceProfileFeatures.availableRunCount,
      supportAvailable: learningCase.resourceProfileFeatures.supportAvailable,
      supportRunUsed: learningCase.resourceProfileFeatures.supportRunUsed,
      selfRunUsed: learningCase.resourceProfileFeatures.selfRunUsed,
      runRoles: [...learningCase.resourceProfileFeatures.runRoles],
    },
    promptSafeLessons: buildPromptSafeLessons(learningCase),
    warnings: uniqueStrings(
      [
        ...learningCase.warnings,
        ...learningCase.quality.warnings,
        ...learningCase.coordinateCoverage.warnings,
      ],
      8
    ),
  };
}

function buildPackageWarnings(input: {
  totalCases: number;
  selectedCases: number;
  omittedForQuality: number;
  policy: DeliveryAgentCostPolicy;
}): string[] {
  const warnings: string[] = [];

  if (input.totalCases === 0) {
    warnings.push("No historical learning cases were available for this planning prompt.");
  }

  if (input.omittedForQuality > 0) {
    warnings.push(
      `${input.omittedForQuality} historical case(s) were omitted because they were pending, excluded, or too low quality.`
    );
  }

  if (input.selectedCases > input.policy.historicalPrompt.maxDetailedHistoricalCases) {
    warnings.push("Historical package selected more detailed cases than policy allows.");
  }

  return warnings;
}

export function buildCompactHistoricalPackageForDeliveryAgent(input: {
  learningCases: DeliveryAgentLearningCaseContract[];
  policy: DeliveryAgentCostPolicy;
  deliveryDate?: string;
  profileId?: string;
}): DeliveryAgentCompactHistoricalPackage {
  const scoredCases: LearningCaseScore[] = input.learningCases
    .filter(shouldUseCase)
    .map((learningCase) => ({
      learningCase,
      score: scoreLearningCase(learningCase),
    }))
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.learningCase.deliveryDate.localeCompare(left.learningCase.deliveryDate);
    });

  const selectedCases = scoredCases
    .slice(0, input.policy.historicalPrompt.maxDetailedHistoricalCases)
    .map(({ learningCase }) => buildCompactCase(learningCase));

  const compactLessons = uniqueStrings(
    selectedCases.flatMap((learningCase) => learningCase.promptSafeLessons),
    input.policy.historicalPrompt.maxCompactHistoricalLessons
  );

  const selectedCaseIds = selectedCases.map((learningCase) => learningCase.caseKey);
  const retrievalHash = hashValue({
    packageVersion: DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION,
    selectedCaseIds,
    detailedCases: selectedCases,
  });
  const compactLessonHash = hashValue({
    packageVersion: DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION,
    compactLessons,
  });

  return {
    packageVersion: DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION,
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
    selectedCaseIds,
    retrievalHash,
    compactLessonHash,
    detailedCases: selectedCases,
    compactLessons,
    omittedCaseCount: input.learningCases.length - selectedCases.length,
    warnings: buildPackageWarnings({
      totalCases: input.learningCases.length,
      selectedCases: selectedCases.length,
      omittedForQuality: input.learningCases.length - scoredCases.length,
      policy: input.policy,
    }),
  };
}
