import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findDeliveryAgentRunByDuplicateKeyMock: vi.fn(),
  findDeliveryAgentRunByIdMock: vi.fn(),
  generateCandidatePlansForAgentMock: vi.fn(),
  getDeliveryOrdersForRoutingMock: vi.fn(),
  previewCandidatePlansPipelineMock: vi.fn(),
  saveCandidateGenerationMock: vi.fn(),
}));

vi.mock("@/lib/agents/delivery/run-log", () => ({
  buildDeliveryAgentDuplicateKey: vi.fn(() => "dup-key"),
  findDeliveryAgentRunByDuplicateKey: mocks.findDeliveryAgentRunByDuplicateKeyMock,
  findDeliveryAgentRunById: mocks.findDeliveryAgentRunByIdMock,
}));

vi.mock("@/lib/agents/delivery/candidate-plans/generate-candidate-plans", () => ({
  generateCandidatePlansForAgent: mocks.generateCandidatePlansForAgentMock,
}));

vi.mock("@/lib/agents/delivery/get-delivery-orders-for-routing", () => ({
  getDeliveryOrdersForRouting: mocks.getDeliveryOrdersForRoutingMock,
}));

vi.mock("@/lib/agents/delivery/candidate-plans/preview-candidate-plans", () => ({
  previewCandidatePlansPipeline: mocks.previewCandidatePlansPipelineMock,
}));

vi.mock("@/lib/agents/delivery/candidate-plans/save-candidate-generation", () => ({
  saveCandidateGeneration: mocks.saveCandidateGenerationMock,
}));

import {
  DeliveryAgentRegenerationBlockedError,
  generateImprovedCandidatePlansForAgent,
} from "@/lib/agents/delivery/candidate-plans/generate-improved-candidate-plans";
import { DeliveryAgentReviewLockedError } from "@/lib/agents/delivery/review-plan/submit-donald-plan-review";
import { buildMixedAreaRoutingStops } from "../candidate-plans/test-fixtures";

const previewResponse = {
  deliveryDate: "2026-06-09",
  profileId: "daily-v1-current-dt-marco-self",
  profileVersion: "daily-v1.0",
  candidates: [],
  recommendedCandidateId: "baseline:2026-06-09:meetup-b:pos1",
  recommendedPlanSummary: { candidateName: "Improved combo", score: 88 },
  selectionNotes: "Improved",
  selectionWarnings: [],
  expansionWarnings: [],
  notes: "notes",
};

const baseRun = {
  id: "run-1",
  deliveryDate: "2026-06-09",
  profileId: "daily-v1-current-dt-marco-self",
  reviewStatus: "improvement_requested" as const,
  reviewedAt: new Date("2026-06-09T12:00:00.000Z"),
  donaldFeedbackText: "Use 5180 Yonge St",
  donaldFeedbackTags: ["meetup_too_far_for_provider"],
  learningArtifacts: {
    improvementRequestHistory: [
      {
        reviewedAt: "2026-06-09T12:00:00.000Z",
        reviewedBy: "donald@kapioo.com",
        reviewStatus: "improvement_requested" as const,
        feedbackText: "Use 5180 Yonge St",
        feedbackTags: ["meetup_too_far_for_provider"],
      },
    ],
  },
  planningArtifacts: {
    candidatePreviewSnapshot: previewResponse,
    systemRecommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
  },
};

describe("generateImprovedCandidatePlansForAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findDeliveryAgentRunByDuplicateKeyMock.mockResolvedValue(baseRun);
    mocks.getDeliveryOrdersForRoutingMock.mockResolvedValue({
      stops: buildMixedAreaRoutingStops(),
    });
    mocks.generateCandidatePlansForAgentMock.mockResolvedValue({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      profileVersion: "daily-v1.0",
      candidates: [
        {
          candidateId: "baseline:2026-06-09",
          name: "Baseline",
          strategyType: "baseline_two_run",
          runs: [],
          summary: {
            runCount: 2,
            totalStops: 3,
            selfUsed: false,
            selfStopCount: 0,
          },
          warnings: [],
          assumptions: [],
        },
      ],
    });
    mocks.previewCandidatePlansPipelineMock.mockResolvedValue(previewResponse);
    mocks.saveCandidateGenerationMock.mockResolvedValue(undefined);
  });

  it("generates improved candidates when improvement feedback exists", async () => {
    const result = await generateImprovedCandidatePlansForAgent({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      generatedBy: "donald@kapioo.com",
    });

    expect(result.generationNumber).toBe(2);
    expect(result.preview.recommendedCandidateId).toBe(previewResponse.recommendedCandidateId);
    expect(mocks.previewCandidatePlansPipelineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        previewBudget: expect.objectContaining({
          action: "improved_candidate_preview",
          correlationId: expect.stringContaining("delivery-agent:improved_candidate_preview:2026-06-09"),
        }),
        planningHints: expect.objectContaining({
          interpretation: expect.objectContaining({
            penalties: expect.arrayContaining(["provider_meetup_too_far"]),
          }),
        }),
      })
    );
    expect(mocks.saveCandidateGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        record: expect.objectContaining({
          generationNumber: 2,
          applicationStatus: expect.any(String),
        }),
      })
    );
  });

  it("blocks regeneration when the plan is approved", async () => {
    mocks.findDeliveryAgentRunByDuplicateKeyMock.mockResolvedValue({
      ...baseRun,
      reviewStatus: "approved",
    });

    await expect(
      generateImprovedCandidatePlansForAgent({
        deliveryDate: "2026-06-09",
        profileId: "daily-v1-current-dt-marco-self",
        generatedBy: "donald@kapioo.com",
      })
    ).rejects.toBeInstanceOf(DeliveryAgentReviewLockedError);
  });

  it("blocks regeneration when review is still pending", async () => {
    mocks.findDeliveryAgentRunByDuplicateKeyMock.mockResolvedValue({
      ...baseRun,
      reviewStatus: "pending",
      learningArtifacts: { improvementRequestHistory: [] },
      donaldFeedbackText: undefined,
      donaldFeedbackTags: undefined,
    });

    await expect(
      generateImprovedCandidatePlansForAgent({
        deliveryDate: "2026-06-09",
        profileId: "daily-v1-current-dt-marco-self",
        generatedBy: "donald@kapioo.com",
      })
    ).rejects.toBeInstanceOf(DeliveryAgentRegenerationBlockedError);
  });
});
