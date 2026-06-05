import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import {
  buildCompactHistoricalPackageForDeliveryAgent,
} from "@/lib/agents/delivery/llm-planning/compact-historical-package";
import { buildDeliveryAgentPlanningFingerprint } from "@/lib/agents/delivery/llm-planning/planning-fingerprint";
import {
  DELIVERY_AGENT_COST_POLICY_VERSION,
  DELIVERY_AGENT_MODEL_ROUTING_POLICY_VERSION,
} from "@/lib/contracts/delivery-agent-cost-policy";
import {
  DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION,
  deliveryAgentCompactHistoricalPackageSchema,
} from "@/lib/contracts/delivery-agent-llm-planning";
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

function buildCase(
  overrides: LearningCaseOverrides = {}
): DeliveryAgentLearningCaseContract {
  const base = buildFullLearningCasePayload() as unknown as DeliveryAgentLearningCaseContract;

  return {
    ...base,
    ...overrides,
    quality: {
      ...base.quality,
      ...overrides.quality,
    },
    matchCoverage: {
      ...base.matchCoverage,
      totalOrders: 10,
      matchedOrders: 10,
      matchCoveragePercent: 100,
      ...overrides.matchCoverage,
    },
    coordinateCoverage: {
      ...base.coordinateCoverage,
      totalStops: 10,
      stopsWithCoordinates: 9,
      coveragePercent: 90,
      ...overrides.coordinateCoverage,
    },
    geoFeatures: {
      ...base.geoFeatures,
      ...overrides.geoFeatures,
    },
    routeShapeFeatures: {
      ...base.routeShapeFeatures,
      runCount: 2,
      kitchenStartRunCount: 1,
      handoffStartRunCount: 1,
      ...overrides.routeShapeFeatures,
    },
    stopControlFeatures: {
      ...base.stopControlFeatures,
      ...overrides.stopControlFeatures,
    },
    outcomeFeatures: {
      ...base.outcomeFeatures,
      runCompletedBefore1pm: true,
      deadlineBufferMinutes: 12,
      lateMinutes: 0,
      latenessAttribution: "on_time",
      ...overrides.outcomeFeatures,
    },
    resourceProfileFeatures: {
      ...base.resourceProfileFeatures,
      ...overrides.resourceProfileFeatures,
      runRoles: [...(overrides.resourceProfileFeatures?.runRoles ?? base.resourceProfileFeatures.runRoles)],
    },
  };
}

describe("buildCompactHistoricalPackageForDeliveryAgent", () => {
  it("returns an empty warning package when no historical cases exist yet", () => {
    const historicalPackage = buildCompactHistoricalPackageForDeliveryAgent({
      learningCases: [],
      policy: createDefaultDeliveryAgentCostPolicy(),
    });

    expect(historicalPackage.selectedCaseIds).toEqual([]);
    expect(historicalPackage.detailedCases).toEqual([]);
    expect(historicalPackage.compactLessons).toEqual([]);
    expect(historicalPackage.warnings).toContain(
      "No historical learning cases were available for this planning prompt."
    );
  });

  it("builds a prompt-safe compact package that validates against the contract", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();
    const learningCase = buildCase({
      caseKey: "learning-case-1",
      deliveryDate: "2026-05-31",
    });

    const historicalPackage = buildCompactHistoricalPackageForDeliveryAgent({
      learningCases: [learningCase],
      policy,
      deliveryDate: "2026-06-09",
      profileId: "daily-default",
    });

    expect(deliveryAgentCompactHistoricalPackageSchema.parse(historicalPackage)).toEqual(
      historicalPackage
    );
    expect(historicalPackage.packageVersion).toBe(
      DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION
    );
    expect(historicalPackage.selectedCaseIds).toEqual(["learning-case-1"]);
    expect(historicalPackage.detailedCases[0]).toEqual(
      expect.objectContaining({
        caseKey: "learning-case-1",
        learningLabel: "positive",
        orderCount: 10,
        matchedOrderCount: 10,
      })
    );
    expect(JSON.stringify(historicalPackage)).not.toContain("Donald");
    expect(JSON.stringify(historicalPackage)).not.toContain("4379891111");
    expect(JSON.stringify(historicalPackage)).not.toContain("routeOptimizerRunsSnapshot");
    expect(JSON.stringify(historicalPackage)).not.toContain("adminOrdersSnapshot");
  });

  it("honors detailed-case and compact-lesson policy limits", () => {
    const policy = createDefaultDeliveryAgentCostPolicy({
      historicalPrompt: {
        maxDetailedHistoricalCases: 2,
        maxCompactHistoricalLessons: 3,
      },
    });
    const cases = [1, 2, 3, 4].map((index) =>
      buildCase({
        caseKey: `learning-case-${index}`,
        deliveryDate: `2026-05-${20 + index}`,
        quality: {
          learningLabel: "positive",
          learningWeight: 0.9,
          dataQualityScore: 90 - index,
          canUseForPositiveRetrieval: true,
        },
      })
    );

    const historicalPackage = buildCompactHistoricalPackageForDeliveryAgent({
      learningCases: cases,
      policy,
    });

    expect(historicalPackage.detailedCases).toHaveLength(2);
    expect(historicalPackage.compactLessons.length).toBeLessThanOrEqual(3);
    expect(historicalPackage.omittedCaseCount).toBe(2);
  });

  it("ranks reviewed positive cases ahead of lower-quality or transferable cases", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();
    const best = buildCase({
      caseKey: "reviewed-positive",
      reviewStatus: "reviewed",
      quality: {
        learningLabel: "positive",
        learningWeight: 0.9,
        dataQualityScore: 92,
        canUseForPositiveRetrieval: true,
      },
      resourceProfileFeatures: {
        ...buildCase().resourceProfileFeatures,
        profileCompatibilityForFuture: "same_profile",
      },
    });
    const weaker = buildCase({
      caseKey: "weak-positive",
      quality: {
        learningLabel: "weak_positive",
        learningWeight: 0.55,
        dataQualityScore: 78,
        canUseForPositiveRetrieval: true,
      },
    });

    const historicalPackage = buildCompactHistoricalPackageForDeliveryAgent({
      learningCases: [weaker, best],
      policy,
    });

    expect(historicalPackage.selectedCaseIds[0]).toBe("reviewed-positive");
  });

  it("keeps avoid and negative cases as lessons but excludes pending or excluded cases", () => {
    const policy = createDefaultDeliveryAgentCostPolicy({
      historicalPrompt: {
        maxDetailedHistoricalCases: 4,
        maxCompactHistoricalLessons: 12,
      },
    });
    const avoid = buildCase({
      caseKey: "avoid-case",
      quality: {
        learningLabel: "avoid_pattern",
        learningWeight: 0.75,
        dataQualityScore: 82,
        canUseForPositiveRetrieval: false,
      },
      outcomeFeatures: {
        ...buildCase().outcomeFeatures,
        runCompletedBefore1pm: false,
        lateMinutes: 35,
        latenessAttribution: "route_problem",
      },
    });
    const pending = buildCase({
      caseKey: "pending-case",
      reviewStatus: "pending",
    });
    const excluded = buildCase({
      caseKey: "excluded-case",
      quality: {
        learningLabel: "excluded",
        learningWeight: 0,
        dataQualityScore: 90,
        canUseForPositiveRetrieval: false,
      },
    });

    const historicalPackage = buildCompactHistoricalPackageForDeliveryAgent({
      learningCases: [pending, excluded, avoid],
      policy,
    });

    expect(historicalPackage.selectedCaseIds).toEqual(["avoid-case"]);
    expect(historicalPackage.compactLessons.join(" ")).toContain("Avoid pattern");
    expect(historicalPackage.warnings).toEqual(
      expect.arrayContaining([
        "2 historical case(s) were omitted because they were pending, excluded, or too low quality.",
      ])
    );
  });

  it("changes the planning fingerprint when compact historical lessons change", () => {
    const policy = createDefaultDeliveryAgentCostPolicy();
    const firstPackage = buildCompactHistoricalPackageForDeliveryAgent({
      learningCases: [buildCase({ caseKey: "case-a" })],
      policy,
    });
    const secondPackage = buildCompactHistoricalPackageForDeliveryAgent({
      learningCases: [
        buildCase({
          caseKey: "case-a",
          geoFeatures: {
            ...buildCase().geoFeatures,
            majorClusterSummary: "Different geography lesson",
          },
        }),
      ],
      policy,
    });

    const baseInput = {
      scope: "daily_generation" as const,
      deliveryDate: "2026-06-09",
      promptVersion: "daily-candidate-prompt-v1",
      costPolicyVersion: DELIVERY_AGENT_COST_POLICY_VERSION,
      modelRoutingPolicyVersion: DELIVERY_AGENT_MODEL_ROUTING_POLICY_VERSION,
      profile: {
        profileId: "default",
        profileVersion: "profile-v1",
      },
      orders: [
        {
          orderId: "order-1",
          status: "confirmed",
          formattedAddress: "1 King St",
        },
      ],
    };

    const firstFingerprint = buildDeliveryAgentPlanningFingerprint({
      ...baseInput,
      historicalPackage: {
        packageVersion: firstPackage.packageVersion,
        retrievalHash: firstPackage.retrievalHash,
        selectedCaseIds: firstPackage.selectedCaseIds,
        compactLessonHash: firstPackage.compactLessonHash,
      },
    });
    const secondFingerprint = buildDeliveryAgentPlanningFingerprint({
      ...baseInput,
      historicalPackage: {
        packageVersion: secondPackage.packageVersion,
        retrievalHash: secondPackage.retrievalHash,
        selectedCaseIds: secondPackage.selectedCaseIds,
        compactLessonHash: secondPackage.compactLessonHash,
      },
    });

    expect(secondFingerprint.planningFingerprint).not.toBe(
      firstFingerprint.planningFingerprint
    );
  });
});
