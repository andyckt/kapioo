import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import { buildCompactHistoricalPackageForDeliveryAgent } from "@/lib/agents/delivery/llm-planning/compact-historical-package";
import {
  buildHistoricalRetrievalTargetFromLearningCase,
  retrieveSimilarHistoricalLearningCases,
  scoreHistoricalLearningCaseSimilarity,
} from "@/lib/agents/delivery/learning/retrieval/historical-similarity";
import {
  DELIVERY_AGENT_HISTORICAL_RETRIEVAL_VERSION,
  deliveryAgentHistoricalRetrievalResultSchema,
  type DeliveryAgentHistoricalRetrievalTarget,
} from "@/lib/contracts/delivery-agent-historical-retrieval";
import type { DeliveryAgentLearningCaseContract } from "@/lib/contracts/delivery-agent-learning";
import { buildFullLearningCasePayload } from "@/__tests__/unit/agents/delivery/learning/learning-case-fixtures";

type LearningCaseOverrides = Omit<
  Partial<DeliveryAgentLearningCaseContract>,
  | "quality"
  | "matchCoverage"
  | "coordinateCoverage"
  | "geoFeatures"
  | "routeShapeFeatures"
  | "stopControlFeatures"
  | "outcomeFeatures"
  | "resourceProfileFeatures"
> & {
  quality?: Partial<DeliveryAgentLearningCaseContract["quality"]>;
  matchCoverage?: Partial<DeliveryAgentLearningCaseContract["matchCoverage"]>;
  coordinateCoverage?: Partial<DeliveryAgentLearningCaseContract["coordinateCoverage"]>;
  geoFeatures?: Partial<DeliveryAgentLearningCaseContract["geoFeatures"]>;
  routeShapeFeatures?: Partial<DeliveryAgentLearningCaseContract["routeShapeFeatures"]>;
  stopControlFeatures?: Partial<DeliveryAgentLearningCaseContract["stopControlFeatures"]>;
  outcomeFeatures?: Partial<DeliveryAgentLearningCaseContract["outcomeFeatures"]>;
  resourceProfileFeatures?: Partial<DeliveryAgentLearningCaseContract["resourceProfileFeatures"]>;
};

const DEFAULT_TARGET: DeliveryAgentHistoricalRetrievalTarget = {
  deliveryDate: "2026-06-10",
  profileId: "daily-default",
  orderCount: 30,
  areaDistribution: {
    core_dt: 10,
    flexible_north_york: 12,
    core_uptown: 8,
  },
  coordinateCoveragePercent: 92,
  spreadKm: { northSouth: 18, eastWest: 12 },
  dynamicOutlierCount: 1,
  dynamicOutlierDirections: ["far_north"],
  sameBuildingClusterCount: 1,
  plannedRunCount: 2,
  hiredDriverRunCount: 2,
  availableRunCount: 2,
  supportAvailable: true,
  needsHandoff: true,
  needsSelfOrSupport: false,
  fixedStopsExpected: false,
  endStopsExpected: false,
};

function buildCase(overrides: LearningCaseOverrides = {}): DeliveryAgentLearningCaseContract {
  const base = buildFullLearningCasePayload() as unknown as DeliveryAgentLearningCaseContract;

  return {
    ...base,
    caseKey: "historical-case",
    deliveryDate: "2026-06-01",
    reviewStatus: "reviewed",
    ...overrides,
    matchCoverage: {
      ...base.matchCoverage,
      totalOrders: 30,
      matchedOrders: 30,
      matchCoveragePercent: 100,
      ...overrides.matchCoverage,
    },
    coordinateCoverage: {
      ...base.coordinateCoverage,
      totalStops: 30,
      stopsWithCoordinates: 28,
      coveragePercent: 93,
      ...overrides.coordinateCoverage,
    },
    geoFeatures: {
      ...base.geoFeatures,
      areaDistribution: DEFAULT_TARGET.areaDistribution,
      spreadKm: DEFAULT_TARGET.spreadKm,
      dynamicOutliers: [
        {
          ref: "order:far-north",
          orderId: "far-north",
          distanceFromCenterKm: 14,
          direction: "far_north",
          reason: "far_north_outlier",
        },
      ],
      sameBuildingClusterCount: 1,
      ...overrides.geoFeatures,
    },
    routeShapeFeatures: {
      ...base.routeShapeFeatures,
      runCount: 2,
      kitchenStartRunCount: 1,
      handoffStartRunCount: 1,
      selfRunUsed: false,
      supportRunUsed: false,
      ...overrides.routeShapeFeatures,
    },
    stopControlFeatures: {
      ...base.stopControlFeatures,
      fixedStopsUsed: false,
      endStopsUsed: false,
      handoffStopsUsed: true,
      ...overrides.stopControlFeatures,
    },
    outcomeFeatures: {
      ...base.outcomeFeatures,
      runCompletedBefore1pm: true,
      deadlineBufferMinutes: 14,
      lateMinutes: 0,
      latenessAttribution: "on_time",
      ...overrides.outcomeFeatures,
    },
    resourceProfileFeatures: {
      ...base.resourceProfileFeatures,
      hiredDriverRunCount: 2,
      availableRunCount: 2,
      supportAvailable: true,
      supportRunUsed: false,
      selfRunUsed: false,
      runCountUsed: 2,
      profileCompatibilityForFuture: "same_profile",
      ...overrides.resourceProfileFeatures,
      runRoles: [
        ...(overrides.resourceProfileFeatures?.runRoles ??
          base.resourceProfileFeatures.runRoles),
      ],
    },
    quality: {
      ...base.quality,
      learningLabel: "positive",
      learningWeight: 0.9,
      dataQualityScore: 92,
      canUseForPositiveRetrieval: true,
      ...overrides.quality,
    },
  };
}

describe("historical delivery learning similarity retrieval", () => {
  it("selects the most similar positive and avoid-pattern cases for a compact prompt", () => {
    const similarPositive = buildCase({
      caseKey: "similar-positive",
      deliveryDate: "2026-06-03",
    });
    const distantPositive = buildCase({
      caseKey: "distant-positive",
      deliveryDate: "2026-06-04",
      matchCoverage: { totalOrders: 14 },
      geoFeatures: {
        areaDistribution: {
          markham: 8,
          richmond_hill: 6,
        },
        spreadKm: { northSouth: 34, eastWest: 26 },
        dynamicOutliers: [
          {
            ref: "order:far-east",
            orderId: "far-east",
            distanceFromCenterKm: 19,
            direction: "far_east",
            reason: "far_east_outlier",
          },
        ],
        sameBuildingClusterCount: 0,
      },
      routeShapeFeatures: { runCount: 3, handoffStartRunCount: 0 },
      stopControlFeatures: { handoffStopsUsed: false },
    });
    const similarAvoid = buildCase({
      caseKey: "similar-avoid",
      deliveryDate: "2026-06-02",
      quality: {
        learningLabel: "avoid_pattern",
        learningWeight: 0.8,
        dataQualityScore: 90,
        canUseForPositiveRetrieval: false,
      },
      outcomeFeatures: {
        runCompletedBefore1pm: false,
        lateMinutes: 22,
        latenessAttribution: "route_problem",
      },
    });

    const result = retrieveSimilarHistoricalLearningCases({
      target: DEFAULT_TARGET,
      learningCases: [distantPositive, similarAvoid, similarPositive],
      maxPositiveMatches: 1,
      maxAvoidMatches: 1,
    });

    expect(deliveryAgentHistoricalRetrievalResultSchema.parse(result)).toEqual(result);
    expect(result.retrievalVersion).toBe(DELIVERY_AGENT_HISTORICAL_RETRIEVAL_VERSION);
    expect(result.selectedPositiveCaseIds).toEqual(["similar-positive"]);
    expect(result.selectedAvoidCaseIds).toEqual(["similar-avoid"]);
    expect(result.matches.map((match) => match.useAs)).toEqual([
      "positive_example",
      "avoid_example",
    ]);
    expect(result.matches[0].similarityScore).toBeGreaterThan(
      scoreHistoricalLearningCaseSimilarity({
        target: DEFAULT_TARGET,
        learningCase: distantPositive,
      }).similarityScore
    );
  });

  it("filters pending, excluded, low-quality, and same-day cases before selection", () => {
    const valid = buildCase({
      caseKey: "valid-positive",
      deliveryDate: "2026-06-04",
    });
    const pending = buildCase({
      caseKey: "pending-case",
      deliveryDate: "2026-06-05",
      reviewStatus: "pending",
    });
    const excluded = buildCase({
      caseKey: "excluded-case",
      deliveryDate: "2026-06-06",
      quality: {
        learningLabel: "excluded",
        learningWeight: 0,
        dataQualityScore: 95,
        canUseForPositiveRetrieval: false,
      },
    });
    const lowQuality = buildCase({
      caseKey: "low-quality-case",
      deliveryDate: "2026-06-07",
      quality: { dataQualityScore: 49 },
    });
    const sameDay = buildCase({
      caseKey: "same-day-case",
      deliveryDate: DEFAULT_TARGET.deliveryDate,
    });

    const result = retrieveSimilarHistoricalLearningCases({
      target: DEFAULT_TARGET,
      learningCases: [pending, excluded, lowQuality, sameDay, valid],
      maxPositiveMatches: 3,
    });

    expect(result.selectedPositiveCaseIds).toEqual(["valid-positive"]);
    expect(result.eligibleCaseCount).toBe(1);
    expect(result.omittedCaseCount).toBe(4);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "1 historical case(s) omitted: data quality below 50.",
        "1 historical case(s) omitted: excluded learning label.",
        "1 historical case(s) omitted: pending Donald review.",
        "1 historical case(s) omitted: same delivery date as target.",
      ])
    );
  });

  it("keeps negative and avoid cases as avoid examples, not positive recommendations", () => {
    const avoid = buildCase({
      caseKey: "avoid-case",
      quality: {
        learningLabel: "avoid_pattern",
        learningWeight: 0.8,
        dataQualityScore: 89,
        canUseForPositiveRetrieval: false,
      },
    });
    const negative = buildCase({
      caseKey: "negative-case",
      deliveryDate: "2026-06-02",
      quality: {
        learningLabel: "negative",
        learningWeight: 0.7,
        dataQualityScore: 86,
        canUseForPositiveRetrieval: false,
      },
    });

    const result = retrieveSimilarHistoricalLearningCases({
      target: DEFAULT_TARGET,
      learningCases: [negative, avoid],
      maxPositiveMatches: 2,
      maxAvoidMatches: 2,
    });

    expect(result.selectedPositiveCaseIds).toEqual([]);
    expect(result.selectedAvoidCaseIds).toEqual(["avoid-case", "negative-case"]);
    expect(result.matches.every((match) => match.useAs === "avoid_example")).toBe(true);
    expect(result.warnings).toContain(
      "No similar positive historical cases were selected for today's planning prompt."
    );
  });

  it("rewards same or transferable driver profiles over different profiles", () => {
    const sameProfile = buildCase({
      caseKey: "same-profile",
    });
    const differentProfile = buildCase({
      caseKey: "different-profile",
      profileId: "legacy-profile",
      resourceProfileFeatures: {
        profileId: "legacy-profile",
        profileCompatibilityForFuture: "different_profile",
      },
    });

    const sameScore = scoreHistoricalLearningCaseSimilarity({
      target: DEFAULT_TARGET,
      learningCase: sameProfile,
    }).similarityScore;
    const differentScore = scoreHistoricalLearningCaseSimilarity({
      target: DEFAULT_TARGET,
      learningCase: differentProfile,
    }).similarityScore;

    expect(sameScore).toBeGreaterThan(differentScore);
  });

  it("returns stable selected case ids when input order changes", () => {
    const newest = buildCase({
      caseKey: "newest",
      deliveryDate: "2026-06-05",
    });
    const middle = buildCase({
      caseKey: "middle",
      deliveryDate: "2026-06-04",
    });
    const oldest = buildCase({
      caseKey: "oldest",
      deliveryDate: "2026-06-03",
    });

    const first = retrieveSimilarHistoricalLearningCases({
      target: DEFAULT_TARGET,
      learningCases: [oldest, newest, middle],
      maxPositiveMatches: 2,
      maxAvoidMatches: 0,
    });
    const second = retrieveSimilarHistoricalLearningCases({
      target: DEFAULT_TARGET,
      learningCases: [middle, oldest, newest],
      maxPositiveMatches: 2,
      maxAvoidMatches: 0,
    });

    expect(first.selectedPositiveCaseIds).toEqual(["newest", "middle"]);
    expect(second.selectedPositiveCaseIds).toEqual(["newest", "middle"]);
  });

  it("can feed selected similar cases into the compact historical prompt package", () => {
    const similarPositive = buildCase({
      caseKey: "similar-positive",
      deliveryDate: "2026-06-03",
    });
    const similarAvoid = buildCase({
      caseKey: "similar-avoid",
      deliveryDate: "2026-06-02",
      quality: {
        learningLabel: "avoid_pattern",
        learningWeight: 0.8,
        dataQualityScore: 90,
        canUseForPositiveRetrieval: false,
      },
    });
    const target = buildHistoricalRetrievalTargetFromLearningCase(similarPositive, {
      deliveryDate: "2026-06-10",
    });
    const retrieval = retrieveSimilarHistoricalLearningCases({
      target,
      learningCases: [similarPositive, similarAvoid],
      maxPositiveMatches: 1,
      maxAvoidMatches: 1,
    });
    const selectedIds = new Set([
      ...retrieval.selectedPositiveCaseIds,
      ...retrieval.selectedAvoidCaseIds,
    ]);

    const historicalPackage = buildCompactHistoricalPackageForDeliveryAgent({
      learningCases: [similarPositive, similarAvoid].filter((learningCase) =>
        selectedIds.has(learningCase.caseKey)
      ),
      policy: createDefaultDeliveryAgentCostPolicy({
        historicalPrompt: {
          maxDetailedHistoricalCases: 2,
          maxCompactHistoricalLessons: 8,
        },
      }),
      deliveryDate: "2026-06-10",
      profileId: "daily-default",
    });

    expect(historicalPackage.selectedCaseIds).toEqual(
      expect.arrayContaining(["similar-positive", "similar-avoid"])
    );
    expect(JSON.stringify(historicalPackage)).not.toContain("adminOrdersSnapshot");
    expect(JSON.stringify(historicalPackage)).not.toContain("routeOptimizerRunsSnapshot");
  });
});
