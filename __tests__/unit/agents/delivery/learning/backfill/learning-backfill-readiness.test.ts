import { assessDeliveryAgentLearningBackfillReadiness } from "@/lib/agents/delivery/learning/backfill/learning-backfill-readiness";
import { buildFullLearningCasePayload } from "@/__tests__/unit/agents/delivery/learning/learning-case-fixtures";

describe("assessDeliveryAgentLearningBackfillReadiness", () => {
  it("marks high-quality reviewed/clean cases as ready for positive retrieval", () => {
    const learningCase = {
      ...buildFullLearningCasePayload(),
      reviewStatus: "none" as const,
      matchCoverage: {
        totalOrders: 10,
        matchedOrders: 10,
        unmatchedOrders: 0,
        totalRoCustomerStops: 10,
        matchedRoCustomerStops: 10,
        unmatchedRoCustomerStops: 0,
        matchCoveragePercent: 100,
        exactMatches: 10,
        highConfidenceMatches: 0,
        uncertainMatches: 0,
        syntheticUnmatchedStops: 1,
      },
      coordinateCoverage: {
        totalStops: 11,
        stopsWithCoordinates: 10,
        stopsAddressOnly: 1,
        coveragePercent: 91,
        sourceBreakdown: { route_optimizer_historical: 10, address_only: 1 },
        handoffCoordinatesPresent: true,
        kitchenCoordinatesPresent: false,
        recommendationConfidence: "high" as const,
        warnings: [],
      },
    };

    const result = assessDeliveryAgentLearningBackfillReadiness(learningCase);

    expect(result).toMatchObject({
      readiness: "ready",
      positiveRetrievalReady: true,
      reasons: [],
    });
  });

  it("blocks cases that would be garbage-in for the LLM", () => {
    const learningCase = {
      ...buildFullLearningCasePayload(),
      reviewStatus: "pending" as const,
      quality: {
        ...buildFullLearningCasePayload().quality,
        learningLabel: "excluded" as const,
        excludeReason: "no_matched_orders",
        dataQualityScore: 20,
        canUseForPositiveRetrieval: false,
      },
      matchCoverage: {
        totalOrders: 10,
        matchedOrders: 0,
        unmatchedOrders: 10,
        totalRoCustomerStops: 10,
        matchedRoCustomerStops: 0,
        unmatchedRoCustomerStops: 10,
        matchCoveragePercent: 0,
        exactMatches: 0,
        highConfidenceMatches: 0,
        uncertainMatches: 0,
        syntheticUnmatchedStops: 0,
      },
      coordinateCoverage: {
        totalStops: 10,
        stopsWithCoordinates: 0,
        stopsAddressOnly: 10,
        coveragePercent: 0,
        sourceBreakdown: { address_only: 10 },
        handoffCoordinatesPresent: false,
        kitchenCoordinatesPresent: false,
        recommendationConfidence: "low" as const,
        warnings: ["low_coordinate_coverage"],
      },
    };

    const result = assessDeliveryAgentLearningBackfillReadiness(learningCase);

    expect(result.readiness).toBe("blocked");
    expect(result.positiveRetrievalReady).toBe(false);
    expect(result.reasons.join(" ")).toContain("No Admin orders matched");
    expect(result.reasons.join(" ")).toContain("Coordinate coverage is 0%");
  });
});
