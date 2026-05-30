import { clearCollections, setupTestDb, teardownTestDb } from "../../../helpers/db";

const mocks = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  batchCreateMock: vi.fn(),
  getDeliveryOrdersForRoutingMock: vi.fn(),
  getKitchenMock: vi.fn(),
  getProfileMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: mocks.connectToDatabaseMock,
}));

vi.mock("@/lib/integrations/route-optimizer/client", () => ({
  batchCreateAndOptimizeRouteOptimizerRuns: mocks.batchCreateMock,
}));

vi.mock("@/lib/agents/delivery/get-delivery-orders-for-routing", () => ({
  getDeliveryOrdersForRouting: mocks.getDeliveryOrdersForRoutingMock,
}));

vi.mock("@/lib/agents/delivery/kitchen-start-location", () => ({
  getKapiooKitchenStartLocation: mocks.getKitchenMock,
}));

vi.mock("@/lib/agents/delivery/planning-profile/get-profile", () => ({
  getDeliveryPlanningProfile: mocks.getProfileMock,
}));

import { createFinalRouteRunFromApprovedPlan } from "@/lib/agents/delivery/final-route-run";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import {
  attachPlanningArtifacts,
  buildDeliveryAgentDuplicateKey,
  createDeliveryAgentRunLog,
  findDeliveryAgentRunByDuplicateKey,
  recordDonaldReview,
} from "@/lib/agents/delivery/run-log";

const finalAcceptedPlan = {
  candidateId: "candidate:selected",
  name: "Selected candidate",
  strategyType: "baseline",
  status: "previewed",
  runs: [
    {
      runSlot: "A",
      driverName: "Provider",
      role: "provider",
      stopCount: 1,
      optimizedStopCount: 1,
      optimizedStops: [{ sequence: 1, orderIds: ["DD-1"], address: "1 Provider St" }],
      routeOptimizerWarnings: [],
      routeOptimizerValidationErrors: [],
      geocodeFailures: [],
      previewStatus: "previewed",
      repairActionsApplied: [],
    },
  ],
  summary: {
    runCount: 1,
    totalStops: 1,
    selfUsed: false,
    selfStopCount: 0,
    allRunsFinishBeforeDeadline: true,
    runFinishTimes: {},
    blockingIssues: [],
    comparisonNotes: "",
  },
  handoffPlan: {
    providerRunSlot: "A",
    receiverRunSlot: "B",
    selectedMeetup: null,
    handoffSkipped: true,
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
  score: 90,
  rank: 1,
  recommendationStatus: "recommended",
  scoreBreakdown: [],
  pros: [],
  cons: [],
  blockingIssues: [],
  decisionSummary: "Approved",
};

async function createApprovedRun() {
  const run = await createDeliveryAgentRunLog({
    deliveryDate: "2026-06-09",
    profileId: "daily-profile",
    profileVersion: "daily-v1.0",
    triggerSource: "test",
    orderCount: 1,
    validStopCount: 1,
    invalidStopCount: 0,
    warningCount: 0,
    orderIds: ["DD-1"],
  });
  await attachPlanningArtifacts(run.id, {
    artifactVersion: "planning-artifacts-v1",
    systemRecommendedCandidateId: "candidate:selected",
    donaldSelectedCandidateId: "candidate:selected",
    didDonaldOverrideRecommendation: false,
    finalAcceptedPlan,
  });
  await recordDonaldReview(run.id, {
    reviewStatus: "approved",
    reviewedBy: "donald@kapioo.com",
  });
  return run;
}

describe("final route run integration", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    mocks.connectToDatabaseMock.mockReset();
    mocks.connectToDatabaseMock.mockResolvedValue(undefined);
    mocks.batchCreateMock.mockReset();
    mocks.getDeliveryOrdersForRoutingMock.mockReset();
    mocks.getKitchenMock.mockReset();
    mocks.getProfileMock.mockReset();
    mocks.getKitchenMock.mockReturnValue("Kitchen");
    mocks.getProfileMock.mockReturnValue(DEFAULT_DELIVERY_PLANNING_PROFILE);
    mocks.getDeliveryOrdersForRoutingMock.mockResolvedValue({
      stops: [
        {
          orderId: "DD-1",
          routeOptimizer: {
            name: "DD-1",
            phone: "416-555-0100",
            address: "1 Provider St",
            order_ids: ["DD-1"],
          },
        },
      ],
    });
    mocks.batchCreateMock.mockResolvedValue({
      status: "completed",
      results: [
        {
          run_id: "ro-run-1",
          external_id: "external-1",
          idempotency_key: "idem-1",
          details_link: "https://ro.example/runs/1",
          estimated_finish_time: "2026-06-09T16:00:00.000Z",
          total_duration_minutes: 45,
        },
      ],
    });
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("persists final route metadata and returns existing data on duplicate calls", async () => {
    await createApprovedRun();

    const first = await createFinalRouteRunFromApprovedPlan({
      deliveryDate: "2026-06-09",
      profileId: "daily-profile",
      createdBy: "donald@kapioo.com",
    });
    const second = await createFinalRouteRunFromApprovedPlan({
      deliveryDate: "2026-06-09",
      profileId: "daily-profile",
      createdBy: "donald@kapioo.com",
    });

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(mocks.batchCreateMock).toHaveBeenCalledTimes(1);

    const stored = await findDeliveryAgentRunByDuplicateKey(
      buildDeliveryAgentDuplicateKey({ deliveryDate: "2026-06-09", profileId: "daily-profile" })
    );

    expect(stored?.status).toBe("created");
    expect(stored?.reviewStatus).toBe("approved");
    expect(stored?.planningArtifacts?.finalAcceptedPlan).toBeTruthy();
    expect(stored?.finalRouteOptimizerMetadata).toMatchObject({
      finalRouteOptimizerStatus: "created",
      selectedCandidateId: "candidate:selected",
      didDonaldOverrideRecommendation: false,
    });
    expect(stored?.routeOptimizerRuns).toHaveLength(1);
  });

  it("stores failure metadata without losing review artifacts", async () => {
    await createApprovedRun();
    mocks.batchCreateMock.mockRejectedValueOnce(new Error("RO unavailable"));

    await expect(
      createFinalRouteRunFromApprovedPlan({
        deliveryDate: "2026-06-09",
        profileId: "daily-profile",
        createdBy: "donald@kapioo.com",
      })
    ).rejects.toThrow(/RO unavailable/);

    const stored = await findDeliveryAgentRunByDuplicateKey(
      buildDeliveryAgentDuplicateKey({ deliveryDate: "2026-06-09", profileId: "daily-profile" })
    );

    expect(stored?.status).toBe("draft");
    expect(stored?.planningArtifacts?.finalAcceptedPlan).toBeTruthy();
    expect(stored?.finalRouteOptimizerMetadata).toMatchObject({
      finalRouteOptimizerStatus: "failed",
      creationError: { message: "RO unavailable" },
    });
  });
});
