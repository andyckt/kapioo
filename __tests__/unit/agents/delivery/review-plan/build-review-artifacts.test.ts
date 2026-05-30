import { describe, expect, it } from "vitest";

import { buildReviewArtifacts } from "@/lib/agents/delivery/review-plan/build-review-artifacts";
import {
  LEARNING_ARTIFACTS_VERSION,
  LOCATION_ARTIFACTS_VERSION,
  PLANNING_ARTIFACTS_VERSION,
} from "@/lib/agents/delivery/run-log-types";

describe("lib/agents/delivery/review-plan/build-review-artifacts", () => {
  it("includes artifactVersion on all buckets", () => {
    const artifacts = buildReviewArtifacts({
      reviewStatus: "approved",
      recommendedCandidateId: "rec-1",
      selectedCandidateId: "sel-2",
      didDonaldOverrideRecommendation: true,
      reviewedBy: "donald@kapioo.com",
      reviewedAt: new Date("2026-06-08T12:00:00.000Z"),
      candidatePreviewSnapshot: {
        deliveryDate: "2026-06-09",
        profileId: "daily-v1",
        profileVersion: "daily-v1.0",
        candidates: [],
        recommendedCandidateId: "rec-1",
        recommendedPlanSummary: null,
        selectionNotes: "",
        selectionWarnings: [],
        notes: "",
      },
    });

    expect(artifacts.planningArtifacts.artifactVersion).toBe(PLANNING_ARTIFACTS_VERSION);
    expect(artifacts.locationArtifacts.artifactVersion).toBe(LOCATION_ARTIFACTS_VERSION);
    expect(artifacts.learningArtifacts.artifactVersion).toBe(LEARNING_ARTIFACTS_VERSION);
    expect(artifacts.planningArtifacts.didDonaldOverrideRecommendation).toBe(true);
  });
});
