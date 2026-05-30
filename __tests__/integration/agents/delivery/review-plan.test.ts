import { clearCollections, setupTestDb, teardownTestDb } from "../../../helpers/db";

const { connectToDatabaseMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}));

import { PLANNING_ARTIFACTS_VERSION } from "@/lib/agents/delivery/run-log-types";
import { findDeliveryAgentRunByDuplicateKey } from "@/lib/agents/delivery/run-log";
import { getDonaldPlanReview } from "@/lib/agents/delivery/review-plan/get-donald-plan-review";
import { submitDonaldPlanReview } from "@/lib/agents/delivery/review-plan/submit-donald-plan-review";
import type { DeliveryAgentPreviewCandidatePlansResponse } from "@/lib/contracts/delivery-agent";

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

describe("lib/agents/delivery/review-plan integration", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    connectToDatabaseMock.mockReset();
    connectToDatabaseMock.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("updates the same run log on duplicate key instead of creating a second record", async () => {
    const first = await submitDonaldPlanReview({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      profileVersion: "daily-v1.0",
      reviewStatus: "rejected",
      feedbackText: "Route too risky",
      feedbackTags: ["route_too_risky"],
      recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      selectedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      candidatePreviewSnapshot: previewSnapshot,
      orderSnapshot,
      reviewedBy: "donald@kapioo.com",
    });

    const second = await submitDonaldPlanReview({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
      profileVersion: "daily-v1.0",
      reviewStatus: "approved",
      recommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      selectedCandidateId: "baseline:2026-06-09:meetup-b:pos2",
      feedbackTags: ["preferred_another_candidate"],
      candidatePreviewSnapshot: previewSnapshot,
      orderSnapshot,
      reviewedBy: "donald@kapioo.com",
    });

    expect(second.deliveryAgentRunId).toBe(first.deliveryAgentRunId);
    expect(second.didDonaldOverrideRecommendation).toBe(true);

    const stored = await findDeliveryAgentRunByDuplicateKey(
      "daily-delivery-agent:2026-06-09:daily-v1-current-dt-marco-self"
    );

    expect(stored?.reviewStatus).toBe("approved");
    expect(stored?.planningArtifacts).toMatchObject({
      artifactVersion: PLANNING_ARTIFACTS_VERSION,
      systemRecommendedCandidateId: "baseline:2026-06-09:meetup-a:pos1",
      donaldSelectedCandidateId: "baseline:2026-06-09:meetup-b:pos2",
      didDonaldOverrideRecommendation: true,
    });
    expect(stored?.learningArtifacts?.rejectionHistory?.length).toBe(1);
    expect(stored?.learningArtifacts?.overrideHistory?.length).toBe(1);
  });

  it("returns saved review via getDonaldPlanReview", async () => {
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

    const result = await getDonaldPlanReview({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1-current-dt-marco-self",
    });

    expect(result.review?.reviewStatus).toBe("approved");
    expect(result.review?.recommendedCandidateId).toBe("baseline:2026-06-09:meetup-a:pos1");
    expect(result.review?.selectedCandidateId).toBe("baseline:2026-06-09:meetup-a:pos1");
    expect(result.review?.didDonaldOverrideRecommendation).toBe(false);
  });
});
