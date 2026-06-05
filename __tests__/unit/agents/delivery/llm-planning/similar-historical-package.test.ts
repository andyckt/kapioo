import { vi } from "vitest";

vi.mock("@/models/DeliveryAgentLearningCase", () => ({
  default: {
    find: vi.fn(),
  },
}));

import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import {
  buildHistoricalRetrievalTargetFromOrderFacts,
  buildSimilarCompactHistoricalPackageForDeliveryAgent,
  loadHistoricalLearningCasesForRetrieval,
} from "@/lib/agents/delivery/llm-planning/similar-historical-package";
import {
  deliveryAgentHistoricalRetrievalResultSchema,
  type DeliveryAgentHistoricalRetrievalTarget,
} from "@/lib/contracts/delivery-agent-historical-retrieval";
import {
  deliveryAgentCompactHistoricalPackageSchema,
  type DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";
import type { DeliveryAgentLearningCaseContract } from "@/lib/contracts/delivery-agent-learning";
import DeliveryAgentLearningCase from "@/models/DeliveryAgentLearningCase";
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

const TODAY_ORDERS: DeliveryAgentPlanningFingerprintOrderFact[] = [
  {
    orderId: "DD-1001",
    status: "ready",
    area: "Downtown Toronto",
    formattedAddress: "100 King St W, Toronto",
    lat: 43.648,
    lng: -79.382,
    coordinateSource: "delivery_agent_cache",
    coordinateConfidence: "high",
  },
  {
    orderId: "DD-1002",
    status: "ready",
    area: "North York",
    formattedAddress: "5000 Yonge St, Toronto",
    lat: 43.766,
    lng: -79.414,
    coordinateSource: "delivery_agent_cache",
    coordinateConfidence: "high",
  },
  {
    orderId: "DD-1003",
    status: "ready",
    area: "North York",
    formattedAddress: "5010 Yonge St, Toronto",
    lat: 43.7661,
    lng: -79.4141,
    coordinateSource: "delivery_agent_cache",
    coordinateConfidence: "high",
  },
  {
    orderId: "DD-1004",
    status: "ready",
    area: "Midtown",
    formattedAddress: "2300 Yonge St, Toronto",
  },
];

const TARGET: DeliveryAgentHistoricalRetrievalTarget = {
  deliveryDate: "2026-06-10",
  profileId: "daily-default",
  orderCount: 30,
  areaDistribution: {
    "Downtown Toronto": 10,
    "North York": 12,
    Midtown: 8,
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
      areaDistribution: TARGET.areaDistribution,
      spreadKm: TARGET.spreadKm,
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

function mockedFind() {
  return vi.mocked(DeliveryAgentLearningCase.find);
}

describe("similar historical package for delivery-agent planning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a retrieval target from today's order facts without requiring every order to have coordinates", () => {
    const target = buildHistoricalRetrievalTargetFromOrderFacts({
      deliveryDate: "2026-06-10",
      profileId: "daily-default",
      orders: TODAY_ORDERS,
      plannedRunCount: 2,
      hiredDriverRunCount: 2,
      availableRunCount: 2,
      supportAvailable: true,
      needsHandoff: true,
    });

    expect(target.orderCount).toBe(4);
    expect(target.areaDistribution).toEqual({
      "Downtown Toronto": 1,
      "North York": 2,
      Midtown: 1,
    });
    expect(target.coordinateCoveragePercent).toBe(75);
    expect(target.spreadKm?.northSouth).toBeGreaterThan(0);
    expect(target.sameBuildingClusterCount).toBe(1);
    expect(target.needsHandoff).toBe(true);
  });

  it("builds a compact package from similar positive and avoid-pattern cases only", () => {
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
        dataQualityScore: 91,
        canUseForPositiveRetrieval: false,
      },
      outcomeFeatures: {
        runCompletedBefore1pm: false,
        lateMinutes: 25,
        latenessAttribution: "route_problem",
      },
    });
    const irrelevant = buildCase({
      caseKey: "irrelevant-markham",
      deliveryDate: "2026-06-04",
      matchCoverage: { totalOrders: 12 },
      geoFeatures: {
        areaDistribution: {
          Markham: 6,
          "Richmond Hill": 6,
        },
        spreadKm: { northSouth: 32, eastWest: 28 },
        dynamicOutliers: [],
        sameBuildingClusterCount: 0,
      },
      routeShapeFeatures: { runCount: 3, handoffStartRunCount: 0 },
      stopControlFeatures: { handoffStopsUsed: false },
    });

    const result = buildSimilarCompactHistoricalPackageForDeliveryAgent({
      target: TARGET,
      profileId: "daily-default",
      deliveryDate: "2026-06-10",
      learningCases: [irrelevant, similarAvoid, similarPositive],
      policy: createDefaultDeliveryAgentCostPolicy({
        historicalPrompt: {
          maxDetailedHistoricalCases: 2,
          maxCompactHistoricalLessons: 8,
        },
      }),
    });

    expect(deliveryAgentHistoricalRetrievalResultSchema.parse(result.retrieval)).toEqual(
      result.retrieval
    );
    expect(deliveryAgentCompactHistoricalPackageSchema.parse(result.historicalPackage)).toEqual(
      result.historicalPackage
    );
    expect(result.retrieval.selectedPositiveCaseIds).toEqual(["similar-positive"]);
    expect(result.retrieval.selectedAvoidCaseIds).toEqual(["similar-avoid"]);
    expect(result.historicalPackage.selectedCaseIds).toEqual(
      expect.arrayContaining(["similar-positive", "similar-avoid"])
    );
    expect(result.historicalPackage.selectedCaseIds).not.toContain("irrelevant-markham");
    expect(JSON.stringify(result.historicalPackage)).not.toContain("adminOrdersSnapshot");
    expect(JSON.stringify(result.historicalPackage)).not.toContain("routeOptimizerRunsSnapshot");
  });

  it("respects the compact historical case budget and still returns warnings", () => {
    const policy = createDefaultDeliveryAgentCostPolicy({
      historicalPrompt: {
        maxDetailedHistoricalCases: 1,
        maxCompactHistoricalLessons: 4,
      },
    });
    const result = buildSimilarCompactHistoricalPackageForDeliveryAgent({
      target: {
        ...TARGET,
        areaDistribution: {},
        spreadKm: null,
      },
      profileId: "daily-default",
      learningCases: [
        buildCase({ caseKey: "positive-1", deliveryDate: "2026-06-03" }),
        buildCase({ caseKey: "positive-2", deliveryDate: "2026-06-02" }),
      ],
      policy,
    });

    expect(result.retrieval.matches).toHaveLength(1);
    expect(result.historicalPackage.detailedCases).toHaveLength(1);
    expect(result.historicalPackage.warnings).toEqual(
      expect.arrayContaining([
        "Historical retrieval: Historical retrieval target has no area distribution, so area similarity is weaker.",
        "Historical retrieval: Historical retrieval target has no map spread, so spread similarity is weaker.",
      ])
    );
  });

  it("returns an empty package when no historical cases are eligible", () => {
    const result = buildSimilarCompactHistoricalPackageForDeliveryAgent({
      target: TARGET,
      profileId: "daily-default",
      learningCases: [
        buildCase({
          caseKey: "pending",
          reviewStatus: "pending",
        }),
      ],
      policy: createDefaultDeliveryAgentCostPolicy(),
    });

    expect(result.selectedLearningCases).toEqual([]);
    expect(result.historicalPackage.selectedCaseIds).toEqual([]);
    expect(result.historicalPackage.warnings).toEqual(
      expect.arrayContaining([
        "Historical retrieval: No eligible historical learning cases remained after quality and similarity filters.",
        "Historical retrieval: No similar positive historical cases were selected for today's planning prompt.",
      ])
    );
  });

  it("loads eligible learning cases with a safe read-only query", async () => {
    const exec = vi.fn().mockResolvedValue([buildCase({ caseKey: "loaded-case" })]);
    const lean = vi.fn(() => ({ exec }));
    const limit = vi.fn(() => ({ lean }));
    const sort = vi.fn(() => ({ limit }));

    mockedFind().mockReturnValue({ sort } as never);

    const learningCases = await loadHistoricalLearningCasesForRetrieval({
      deliveryDate: "2026-06-10",
      limit: 25,
    });

    expect(mockedFind()).toHaveBeenCalledWith({
      reviewStatus: { $ne: "pending" },
      "quality.learningLabel": {
        $in: ["positive", "weak_positive", "negative", "avoid_pattern", "uncertain"],
      },
      "quality.dataQualityScore": { $gte: 50 },
      deliveryDate: { $ne: "2026-06-10" },
    });
    expect(sort).toHaveBeenCalledWith({ deliveryDate: -1, "quality.dataQualityScore": -1 });
    expect(limit).toHaveBeenCalledWith(25);
    expect(learningCases[0].caseKey).toBe("loaded-case");
  });

  it("does not query the database when the retrieval limit is zero", async () => {
    const learningCases = await loadHistoricalLearningCasesForRetrieval({
      limit: 0,
    });

    expect(learningCases).toEqual([]);
    expect(mockedFind()).not.toHaveBeenCalled();
  });
});
