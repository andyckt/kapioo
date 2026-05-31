import { beforeEach, describe, expect, it, vi } from "vitest";

const runLogMocks = vi.hoisted(() => ({
  attachLearningArtifactsMock: vi.fn(),
  attachPlanningArtifactsMock: vi.fn(),
  findDeliveryAgentRunByIdMock: vi.fn(),
  recordDonaldReviewMock: vi.fn(),
  updateDeliveryAgentRunForReviewMock: vi.fn(),
}));

vi.mock("@/lib/agents/delivery/run-log", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agents/delivery/run-log")>();
  return {
    ...actual,
    attachLearningArtifacts: runLogMocks.attachLearningArtifactsMock,
    attachPlanningArtifacts: runLogMocks.attachPlanningArtifactsMock,
    findDeliveryAgentRunById: runLogMocks.findDeliveryAgentRunByIdMock,
    recordDonaldReview: runLogMocks.recordDonaldReviewMock,
    updateDeliveryAgentRunForReview: runLogMocks.updateDeliveryAgentRunForReviewMock,
  };
});

import { PLANNING_ARTIFACTS_VERSION } from "@/lib/agents/delivery/run-log-types";
import { saveCandidateGeneration } from "@/lib/agents/delivery/candidate-plans/save-candidate-generation";

describe("saveCandidateGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runLogMocks.findDeliveryAgentRunByIdMock.mockResolvedValue({
      id: "run-1",
      planningArtifacts: {
        artifactVersion: PLANNING_ARTIFACTS_VERSION,
        candidatePreviewSnapshot: { deliveryDate: "2026-06-09" },
        systemRecommendedCandidateId: "gen-1-candidate",
      },
      learningArtifacts: {
        improvementRequestHistory: [
          {
            reviewedAt: "2026-06-09T12:00:00.000Z",
            reviewedBy: "donald@kapioo.com",
            reviewStatus: "improvement_requested",
          },
        ],
      },
    });
  });

  it("backfills generation 1 and appends the new active generation", async () => {
    const preview = {
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      profileVersion: "daily-v1.0",
      candidates: [],
      recommendedCandidateId: "gen-2-candidate",
      recommendedPlanSummary: { candidateName: "Gen 2" },
      selectionNotes: "",
      selectionWarnings: [],
      expansionWarnings: [],
      notes: "",
    };

    await saveCandidateGeneration({
      deliveryAgentRunId: "run-1",
      generatedBy: "donald@kapioo.com",
      preview: preview as never,
      record: {
        generationNumber: 2,
        generatedAt: "2026-06-09T13:00:00.000Z",
        generatedBy: "donald@kapioo.com",
        sourceFeedbackReviewedAt: "2026-06-09T12:00:00.000Z",
        applicationStatus: "applied",
        applicationNotes: ["Applied meet-up pin."],
        candidatePreviewSnapshot: preview as unknown as Record<string, unknown>,
        recommendedCandidateId: "gen-2-candidate",
        previousRecommendedCandidateId: "gen-1-candidate",
      },
    });

    expect(runLogMocks.attachPlanningArtifactsMock).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        activeCandidateGenerationNumber: 2,
        candidateGenerations: expect.arrayContaining([
          expect.objectContaining({ generationNumber: 1, supersededAt: expect.any(String) }),
          expect.objectContaining({ generationNumber: 2, recommendedCandidateId: "gen-2-candidate" }),
        ]),
      })
    );
    expect(runLogMocks.recordDonaldReviewMock).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        reviewStatus: "pending",
        donaldFeedbackText: "",
        donaldFeedbackTags: [],
      })
    );
    expect(runLogMocks.attachLearningArtifactsMock).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        regenerationHistory: expect.arrayContaining([
          expect.objectContaining({ generationNumber: 2, applicationStatus: "applied" }),
        ]),
      })
    );
  });
});
