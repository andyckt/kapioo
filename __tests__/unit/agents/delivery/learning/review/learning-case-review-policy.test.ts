import {
  buildLearningCaseManualReviewPatch,
  buildLearningCaseReviewActions,
} from "@/lib/agents/delivery/learning/review/learning-case-review-policy";
import type { DeliveryAgentLearningCaseContract } from "@/lib/contracts/delivery-agent-learning";
import { buildFullLearningCasePayload } from "@/__tests__/unit/agents/delivery/learning/learning-case-fixtures";

function buildHighQualityCase(): DeliveryAgentLearningCaseContract {
  const base = buildFullLearningCasePayload();

  return {
    ...base,
    matchCoverage: {
      ...base.matchCoverage,
      totalOrders: 1,
      matchedOrders: 1,
      unmatchedOrders: 0,
      matchCoveragePercent: 100,
    },
    coordinateCoverage: {
      ...base.coordinateCoverage,
      totalStops: 2,
      stopsWithCoordinates: 2,
      coveragePercent: 100,
    },
    quality: {
      ...base.quality,
      dataQualityScore: 90,
      qualityReasons: ["Matched, coordinate-backed route finished before 1 PM."],
    },
  } as unknown as DeliveryAgentLearningCaseContract;
}

describe("learning-case-review-policy", () => {
  it("approves a high-quality case as trusted positive retrieval", () => {
    const learningCase = buildHighQualityCase();

    const patch = buildLearningCaseManualReviewPatch({
      learningCase,
      action: "approve_positive",
      notes: "Worked well.",
      reviewedBy: "donald",
      reviewedAt: new Date("2026-06-07T12:00:00.000Z"),
    });

    expect(patch.reviewStatus).toBe("reviewed");
    expect(patch.quality.learningLabel).toBe("positive");
    expect(patch.quality.canUseForPositiveRetrieval).toBe(true);
    expect(patch.manualReview).toEqual(
      expect.objectContaining({
        action: "approve_positive",
        previousLearningLabel: "positive",
        learningLabel: "positive",
        reviewedBy: "donald",
      })
    );
  });

  it("blocks positive approval when match coverage is too low", () => {
    const learningCase = {
      ...buildHighQualityCase(),
      matchCoverage: {
        ...buildHighQualityCase().matchCoverage,
        matchCoveragePercent: 60,
      },
    } as DeliveryAgentLearningCaseContract;

    expect(() =>
      buildLearningCaseManualReviewPatch({
        learningCase,
        action: "approve_positive",
        notes: "Looks okay.",
      })
    ).toThrow("not safe enough");
  });

  it("requires notes for avoid and exclude actions", () => {
    const learningCase = buildHighQualityCase();

    expect(() =>
      buildLearningCaseManualReviewPatch({
        learningCase,
        action: "mark_avoid_pattern",
        notes: "",
      })
    ).toThrow("short reason");
  });

  it("marks avoid patterns as reviewed but not positive retrieval candidates", () => {
    const learningCase = buildHighQualityCase();

    const patch = buildLearningCaseManualReviewPatch({
      learningCase,
      action: "mark_avoid_pattern",
      notes: "Bad handoff split.",
    });

    expect(patch.reviewStatus).toBe("reviewed");
    expect(patch.quality.learningLabel).toBe("avoid_pattern");
    expect(patch.quality.canUseForPositiveRetrieval).toBe(false);
    expect(patch.manualReview?.notes).toBe("Bad handoff split.");
  });

  it("disables positive buttons for low-quality cases", () => {
    const learningCase = {
      ...buildHighQualityCase(),
      coordinateCoverage: {
        ...buildHighQualityCase().coordinateCoverage,
        coveragePercent: 40,
      },
    } as DeliveryAgentLearningCaseContract;

    const actions = buildLearningCaseReviewActions(learningCase);

    expect(actions.find((action) => action.action === "approve_positive")).toEqual(
      expect.objectContaining({
        disabled: true,
      })
    );
    expect(actions.find((action) => action.action === "exclude")).toEqual(
      expect.objectContaining({
        disabled: false,
      })
    );
  });

  it("reset pending clears manual review and removes positive retrieval trust", () => {
    const learningCase = buildHighQualityCase();

    const patch = buildLearningCaseManualReviewPatch({
      learningCase,
      action: "reset_pending",
      notes: "Review again.",
    });

    expect(patch.reviewStatus).toBe("pending");
    expect(patch.quality.learningLabel).toBe("uncertain");
    expect(patch.quality.canUseForPositiveRetrieval).toBe(false);
    expect(patch.manualReview).toBeNull();
  });
});
