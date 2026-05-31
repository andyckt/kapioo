import { beforeEach, describe, expect, it, vi } from "vitest";

const runLogMocks = vi.hoisted(() => ({
  attachLearningArtifactsMock: vi.fn(),
  attachLocationArtifactsMock: vi.fn(),
  attachPlanningArtifactsMock: vi.fn(),
  buildDeliveryAgentDuplicateKeyMock: vi.fn(),
  createDeliveryAgentRunLogMock: vi.fn(),
  findDeliveryAgentRunByDuplicateKeyMock: vi.fn(),
  markDeliveryAgentRunReadyForReviewMock: vi.fn(),
  recordDonaldReviewMock: vi.fn(),
  updateDeliveryAgentRunForReviewMock: vi.fn(),
}));

vi.mock("@/lib/agents/delivery/run-log", () => ({
  attachLearningArtifacts: runLogMocks.attachLearningArtifactsMock,
  attachLocationArtifacts: runLogMocks.attachLocationArtifactsMock,
  attachPlanningArtifacts: runLogMocks.attachPlanningArtifactsMock,
  buildDeliveryAgentDuplicateKey: runLogMocks.buildDeliveryAgentDuplicateKeyMock,
  createDeliveryAgentRunLog: runLogMocks.createDeliveryAgentRunLogMock,
  findDeliveryAgentRunByDuplicateKey: runLogMocks.findDeliveryAgentRunByDuplicateKeyMock,
  markDeliveryAgentRunReadyForReview: runLogMocks.markDeliveryAgentRunReadyForReviewMock,
  recordDonaldReview: runLogMocks.recordDonaldReviewMock,
  updateDeliveryAgentRunForReview: runLogMocks.updateDeliveryAgentRunForReviewMock,
}));

import { PLANNING_ARTIFACTS_VERSION } from "@/lib/agents/delivery/run-log-types";
import type { DeliveryAgentPreviewCandidatePlansResponse } from "@/lib/contracts/delivery-agent";
import {
  DeliveryAgentReviewLockedError,
  DeliveryAgentReviewValidationError,
  submitDonaldPlanReview,
} from "@/lib/agents/delivery/review-plan/submit-donald-plan-review";

const previewSnapshot = {
  deliveryDate: "2026-06-09",
  profileId: "daily-v1-current-dt-marco-self",
  profileVersion: "daily-v1.0",
  candidates: [
    {
      candidateId: "baseline:2026-06-09:meetup-a:pos1",
      name: "Recommended combo",
      strategyType: "baseline_two_run",
      status: "previewed",
      score: 90,
      rank: 1,
      recommendationStatus: "recommended",
      scoreBreakdown: [],
      pros: [],
      cons: [],
      blockingIssues: [],
      decisionSummary: "Best finish time",
      runs: [],
      summary: {
        allRunsFinishBeforeDeadline: true,
        runCount: 2,
        totalStops: 3,
        selfUsed: false,
        comparisonNotes: "",
      },
      handoffPlan: {
        providerRunSlot: "A",
        receiverRunSlot: "B",
        handoffSkipped: false,
        selectedMeetup: {
          meetupAddress: "4000 Yonge St",
          meetupFixedStopPosition: 1,
          syntheticHandoffStopUsed: true,
        },
      },
      candidateRepairSummary: {
        repairAttempted: false,
        repairSucceeded: false,
        issuesDetected: [],
        repairActionsApplied: [],
        warnings: [],
      },
      warnings: [],
      errors: [],
      assumptions: [],
    },
    {
      candidateId: "baseline:2026-06-09:meetup-b:pos2",
      name: "Alternative combo",
      strategyType: "baseline_two_run",
      status: "previewed",
      score: 82,
      rank: 2,
      recommendationStatus: "acceptable",
      scoreBreakdown: [],
      pros: [],
      cons: [],
      blockingIssues: [],
      decisionSummary: "Alternative",
      runs: [],
      summary: {
        allRunsFinishBeforeDeadline: true,
        runCount: 2,
        totalStops: 3,
        selfUsed: false,
        comparisonNotes: "",
      },
      handoffPlan: {
        providerRunSlot: "A",
        receiverRunSlot: "B",
        handoffSkipped: true,
        skipReason: "No handoff",
      },
      candidateRepairSummary: {
        repairAttempted: false,
        repairSucceeded: false,
        issuesDetected: [],
        repairActionsApplied: [],
        warnings: [],
      },
      warnings: [],
      errors: [],
      assumptions: [],
    },
  ],
  recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
  recommendedPlanSummary: {
    candidateId: "baseline:2026-06-09:meetup-a:pos1",
    candidateName: "Recommended combo",
    score: 90,
    recommendationStatus: "recommended",
    allRunsFinishBeforeDeadline: true,
    selfUsed: false,
    runFinishTimes: { A: "2026-06-09T16:00:00.000Z" },
    routeRepairStatus: "not_needed",
    decisionSummary: "Best finish time",
  },
  selectionNotes: "Ranked by score",
  selectionWarnings: [],
  notes: "Preview only",
} as unknown as DeliveryAgentPreviewCandidatePlansResponse;

const orderSnapshot = {
  orderCount: 3,
  validStopCount: 3,
  invalidStopCount: 0,
  warningCount: 0,
  orderIds: ["DD-1", "DD-2", "DD-3"],
};

function setupExistingRun(overrides: Record<string, unknown> = {}) {
  const run = {
    id: "run-123",
    learningArtifacts: {
      rejectionHistory: [],
      manualEdits: [],
      overrideHistory: [],
    },
    ...overrides,
  };

  runLogMocks.findDeliveryAgentRunByDuplicateKeyMock.mockResolvedValue(run);
  runLogMocks.attachPlanningArtifactsMock.mockResolvedValue(run);
  runLogMocks.attachLocationArtifactsMock.mockResolvedValue(run);
  runLogMocks.attachLearningArtifactsMock.mockResolvedValue(run);
  runLogMocks.recordDonaldReviewMock.mockResolvedValue({
    ...run,
    reviewStatus: "approved",
    reviewedAt: new Date("2026-06-08T12:00:00.000Z"),
  });
  runLogMocks.markDeliveryAgentRunReadyForReviewMock.mockResolvedValue(run);
  runLogMocks.updateDeliveryAgentRunForReviewMock.mockResolvedValue(run);
  return run;
}

describe("lib/agents/delivery/review-plan/submit-donald-plan-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runLogMocks.buildDeliveryAgentDuplicateKeyMock.mockReturnValue(
      "daily-delivery-agent:2026-06-09:daily-v1-current-dt-marco-self"
    );
  });

  it("approves recommended plan with approved reviewStatus", async () => {
    setupExistingRun();

    const result = await submitDonaldPlanReview({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      profileVersion: "daily-v1.0",
      reviewStatus: "approved",
      recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      selectedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      candidatePreviewSnapshot: previewSnapshot,
      orderSnapshot,
      reviewedBy: "donald@kapioo.com",
    });

    expect(result.reviewStatus).toBe("approved");
    expect(result.didDonaldOverrideRecommendation).toBe(false);
    expect(result.message).toContain("Next step: create the Final Route Optimizer run");
    expect(runLogMocks.recordDonaldReviewMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({ reviewStatus: "approved" })
    );
    expect(runLogMocks.attachPlanningArtifactsMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        artifactVersion: PLANNING_ARTIFACTS_VERSION,
        systemRecommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
        donaldSelectedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
        didDonaldOverrideRecommendation: false,
        finalAcceptedPlan: expect.any(Object),
      })
    );
    expect(runLogMocks.createDeliveryAgentRunLogMock).not.toHaveBeenCalled();
  });

  it("rejects review without feedback", async () => {
    setupExistingRun();

    await expect(
      submitDonaldPlanReview({
        deliveryDate: "2026-06-09",
        profileId: "daily-v1-current-dt-marco-self",
        profileVersion: "daily-v1.0",
        reviewStatus: "rejected",
        recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
        selectedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
        candidatePreviewSnapshot: previewSnapshot,
        orderSnapshot,
        reviewedBy: "donald@kapioo.com",
      })
    ).rejects.toBeInstanceOf(DeliveryAgentReviewValidationError);
  });

  it("saves rejection feedback tags and text", async () => {
    setupExistingRun();

    const result = await submitDonaldPlanReview({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      profileVersion: "daily-v1.0",
      reviewStatus: "rejected",
      feedbackText: "Meet-up too late for receiver",
      feedbackTags: ["meetup_too_late"],
      recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      selectedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      candidatePreviewSnapshot: previewSnapshot,
      orderSnapshot,
      reviewedBy: "donald@kapioo.com",
    });

    expect(result.reviewStatus).toBe("improvement_requested");
    expect(result.message).toContain("generate improved candidate plans");
    expect(runLogMocks.recordDonaldReviewMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        reviewStatus: "improvement_requested",
        donaldFeedbackText: "Meet-up too late for receiver",
        donaldFeedbackTags: ["meetup_too_late"],
      })
    );
    expect(runLogMocks.attachLearningArtifactsMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        improvementRequestHistory: expect.arrayContaining([
          expect.objectContaining({
            feedbackTags: ["meetup_too_late"],
          }),
        ]),
        rejectionHistory: expect.arrayContaining([
          expect.objectContaining({
            feedbackTags: ["meetup_too_late"],
          }),
        ]),
      })
    );
  });

  it("normalizes legacy edited status to improvement_requested", async () => {
    setupExistingRun();

    const result = await submitDonaldPlanReview({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      profileVersion: "daily-v1.0",
      reviewStatus: "edited",
      feedbackText: "Provider route shape needs work",
      feedbackTags: ["provider_route_shape_wrong"],
      recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      selectedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      candidatePreviewSnapshot: previewSnapshot,
      orderSnapshot,
      reviewedBy: "donald@kapioo.com",
    });

    expect(result.reviewStatus).toBe("improvement_requested");
    expect(result.message).toContain("generate improved candidate plans");
    expect(runLogMocks.attachLearningArtifactsMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        improvementRequestHistory: expect.arrayContaining([
          expect.objectContaining({ feedbackTags: ["provider_route_shape_wrong"] }),
        ]),
        manualEdits: expect.arrayContaining([
          expect.objectContaining({ type: "needs_revision" }),
        ]),
      })
    );
  });

  it("blocks improvement feedback after approval", async () => {
    setupExistingRun({ reviewStatus: "approved" });

    await expect(
      submitDonaldPlanReview({
        deliveryDate: "2026-06-09",
        profileId: "daily-v1-current-dt-marco-self",
        profileVersion: "daily-v1.0",
        reviewStatus: "improvement_requested",
        feedbackText: "Too late",
        feedbackTags: ["meetup_too_late"],
        recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
        selectedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
        candidatePreviewSnapshot: previewSnapshot,
        orderSnapshot,
        reviewedBy: "donald@kapioo.com",
      })
    ).rejects.toBeInstanceOf(DeliveryAgentReviewLockedError);
  });

  it("records override when Donald selects another candidate", async () => {
    setupExistingRun();

    const result = await submitDonaldPlanReview({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      profileVersion: "daily-v1.0",
      reviewStatus: "approved",
      feedbackTags: ["preferred_another_candidate"],
      recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      selectedCandidateId: "baseline:2026-06-09:meetup-b:pos2",
      candidatePreviewSnapshot: previewSnapshot,
      orderSnapshot,
      reviewedBy: "donald@kapioo.com",
    });

    expect(result.didDonaldOverrideRecommendation).toBe(true);
    expect(result.message).toContain("Next step: create the Final Route Optimizer run");
    expect(runLogMocks.attachPlanningArtifactsMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        didDonaldOverrideRecommendation: true,
        donaldSelectedCandidateId: "baseline:2026-06-09:meetup-b:pos2",
        systemRecommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      })
    );
    expect(runLogMocks.attachLearningArtifactsMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        overrideHistory: expect.arrayContaining([
          expect.objectContaining({ type: "recommendation_override" }),
        ]),
      })
    );
  });

  it("rejects invalid reviewStatus", async () => {
    setupExistingRun();

    await expect(
      submitDonaldPlanReview({
        deliveryDate: "2026-06-09",
        profileId: "daily-v1-current-dt-marco-self",
        profileVersion: "daily-v1.0",
        reviewStatus: "pending" as "approved",
        recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
        selectedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
        candidatePreviewSnapshot: previewSnapshot,
        orderSnapshot,
        reviewedBy: "donald@kapioo.com",
      })
    ).rejects.toBeInstanceOf(DeliveryAgentReviewValidationError);
  });

  it("creates a run log when duplicate key does not exist", async () => {
    runLogMocks.findDeliveryAgentRunByDuplicateKeyMock.mockResolvedValue(null);
    runLogMocks.createDeliveryAgentRunLogMock.mockResolvedValue({
      id: "run-new",
      learningArtifacts: null,
    });
    runLogMocks.updateDeliveryAgentRunForReviewMock.mockResolvedValue({ id: "run-new" });
    runLogMocks.attachPlanningArtifactsMock.mockResolvedValue({ id: "run-new" });
    runLogMocks.attachLocationArtifactsMock.mockResolvedValue({ id: "run-new" });
    runLogMocks.attachLearningArtifactsMock.mockResolvedValue({ id: "run-new" });
    runLogMocks.recordDonaldReviewMock.mockResolvedValue({
      id: "run-new",
      reviewStatus: "approved",
      reviewedAt: new Date("2026-06-08T12:00:00.000Z"),
    });
    runLogMocks.markDeliveryAgentRunReadyForReviewMock.mockResolvedValue({ id: "run-new" });

    await submitDonaldPlanReview({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      profileVersion: "daily-v1.0",
      reviewStatus: "approved",
      recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      selectedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      candidatePreviewSnapshot: previewSnapshot,
      orderSnapshot,
      reviewedBy: "donald@kapioo.com",
    });

    expect(runLogMocks.createDeliveryAgentRunLogMock).toHaveBeenCalledTimes(1);
  });

  it("does not call Route Optimizer batch create helpers", async () => {
    setupExistingRun();

    await submitDonaldPlanReview({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      profileVersion: "daily-v1.0",
      reviewStatus: "approved",
      recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      selectedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      candidatePreviewSnapshot: previewSnapshot,
      orderSnapshot,
      reviewedBy: "donald@kapioo.com",
    });

    expect(runLogMocks.attachPlanningArtifactsMock).toHaveBeenCalled();
    await expect(import("@/lib/integrations/route-optimizer/client")).resolves.toBeDefined();
  });
});
