const mocks = vi.hoisted(() => ({
  batchCreateMock: vi.fn(),
  getDeliveryOrdersForRoutingMock: vi.fn(),
  getKitchenMock: vi.fn(),
  getProfileMock: vi.fn(),
  findByDuplicateKeyMock: vi.fn(),
  findByIdMock: vi.fn(),
  saveFailureMock: vi.fn(),
  saveResultMock: vi.fn(),
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

vi.mock("@/lib/agents/delivery/run-log", () => ({
  buildDeliveryAgentDuplicateKey: (input: { deliveryDate: string; profileId: string }) =>
    `daily-delivery-agent:${input.deliveryDate}:${input.profileId}`,
  findDeliveryAgentRunByDuplicateKey: mocks.findByDuplicateKeyMock,
  findDeliveryAgentRunById: mocks.findByIdMock,
  saveFinalRouteOptimizerFailure: mocks.saveFailureMock,
  saveFinalRouteOptimizerResult: mocks.saveResultMock,
}));

import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import {
  createFinalRouteRunFromApprovedPlan,
  FinalRouteRunStateError,
} from "@/lib/agents/delivery/final-route-run/create-final-route-run-from-approved-plan";
import type { IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

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

function buildRun(overrides: Partial<IDeliveryAgentRun> = {}): IDeliveryAgentRun {
  return {
    id: "run-123",
    deliveryDate: "2026-06-09",
    profileId: "daily-profile",
    planningSessionId: "planning-123",
    duplicatePreventionKey: "daily-delivery-agent:2026-06-09:daily-profile",
    triggerSource: "manual",
    status: "ready_for_review",
    orderCount: 1,
    validStopCount: 1,
    invalidStopCount: 0,
    warningCount: 0,
    orderIds: ["DD-1"],
    reviewStatus: "approved",
    planningArtifacts: {
      artifactVersion: "planning-artifacts-v1",
      systemRecommendedCandidateId: "candidate:selected",
      donaldSelectedCandidateId: "candidate:selected",
      didDonaldOverrideRecommendation: false,
      finalAcceptedPlan,
    },
    routeOptimizerRuns: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as IDeliveryAgentRun;
}

function setupSuccess(run: IDeliveryAgentRun = buildRun()) {
  mocks.findByDuplicateKeyMock.mockResolvedValue(run);
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
  mocks.saveResultMock.mockImplementation(async (_id, input) => ({
    ...run,
    id: "run-123",
    status: "created",
    routeOptimizerRuns: input.routeOptimizerRuns,
    finalRouteOptimizerMetadata: input.finalRouteOptimizerMetadata,
  }));
}

describe("createFinalRouteRunFromApprovedPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when reviewStatus is not approved", async () => {
    mocks.findByDuplicateKeyMock.mockResolvedValue(buildRun({ reviewStatus: "rejected" }));

    await expect(
      createFinalRouteRunFromApprovedPlan({
        deliveryDate: "2026-06-09",
        profileId: "daily-profile",
        createdBy: "donald@kapioo.com",
      })
    ).rejects.toThrow(FinalRouteRunStateError);
    expect(mocks.batchCreateMock).not.toHaveBeenCalled();
  });

  it("rejects when finalAcceptedPlan is missing", async () => {
    mocks.findByDuplicateKeyMock.mockResolvedValue(
      buildRun({ planningArtifacts: { artifactVersion: "planning-artifacts-v1" } })
    );

    await expect(
      createFinalRouteRunFromApprovedPlan({
        deliveryDate: "2026-06-09",
        profileId: "daily-profile",
        createdBy: "donald@kapioo.com",
      })
    ).rejects.toThrow(/finalAcceptedPlan is missing/);
  });

  it("creates final RO run from approved recommended candidate", async () => {
    setupSuccess();

    const result = await createFinalRouteRunFromApprovedPlan({
      deliveryDate: "2026-06-09",
      profileId: "daily-profile",
      createdBy: "donald@kapioo.com",
    });

    expect(result.idempotentReplay).toBe(false);
    expect(result.finalRouteOptimizerMetadata.finalRouteOptimizerStatus).toBe("created");
    expect(result.finalRouteOptimizerMetadata.selectedCandidateId).toBe("candidate:selected");
    expect(result.finalRouteOptimizerMetadata.didDonaldOverrideRecommendation).toBe(false);
    expect(mocks.batchCreateMock).toHaveBeenCalledTimes(1);
    expect(mocks.saveResultMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        routeOptimizerRuns: expect.arrayContaining([
          expect.objectContaining({ runId: "ro-run-1" }),
        ]),
      })
    );
  });

  it("preserves Donald-selected override candidate", async () => {
    const overridePlan = { ...finalAcceptedPlan, candidateId: "candidate:override" };
    setupSuccess(
      buildRun({
        planningArtifacts: {
          artifactVersion: "planning-artifacts-v1",
          systemRecommendedCandidateId: "candidate:recommended",
          donaldSelectedCandidateId: "candidate:override",
          didDonaldOverrideRecommendation: true,
          finalAcceptedPlan: overridePlan,
        },
      })
    );

    const result = await createFinalRouteRunFromApprovedPlan({
      deliveryDate: "2026-06-09",
      profileId: "daily-profile",
      createdBy: "donald@kapioo.com",
    });

    expect(result.finalRouteOptimizerMetadata.systemRecommendedCandidateId).toBe(
      "candidate:recommended"
    );
    expect(result.finalRouteOptimizerMetadata.selectedCandidateId).toBe("candidate:override");
    expect(result.finalRouteOptimizerMetadata.didDonaldOverrideRecommendation).toBe(true);
  });

  it("returns existing metadata without duplicate batch create", async () => {
    mocks.findByDuplicateKeyMock.mockResolvedValue(
      buildRun({
        routeOptimizerRuns: [
          {
            runId: "ro-existing",
            driverName: "Provider",
            externalId: "external-existing",
            idempotencyKey: "idem-existing",
          },
        ],
        finalRouteOptimizerMetadata: {
          finalRouteOptimizerStatus: "created",
          systemRecommendedCandidateId: "candidate:selected",
          selectedCandidateId: "candidate:selected",
          didDonaldOverrideRecommendation: false,
          finalRouteOptimizerRunIds: ["ro-existing"],
          routeSummaries: [{ runSlot: "A", driverName: "Provider", stopCount: 1 }],
        },
      })
    );

    const result = await createFinalRouteRunFromApprovedPlan({
      deliveryDate: "2026-06-09",
      profileId: "daily-profile",
      createdBy: "donald@kapioo.com",
    });

    expect(result.idempotentReplay).toBe(true);
    expect(mocks.batchCreateMock).not.toHaveBeenCalled();
  });

  it("saves failure metadata and allows retry later", async () => {
    setupSuccess();
    mocks.batchCreateMock.mockRejectedValueOnce(new Error("RO unavailable"));
    mocks.saveFailureMock.mockResolvedValue(buildRun());

    await expect(
      createFinalRouteRunFromApprovedPlan({
        deliveryDate: "2026-06-09",
        profileId: "daily-profile",
        createdBy: "donald@kapioo.com",
      })
    ).rejects.toThrow(/RO unavailable/);

    expect(mocks.saveFailureMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        finalRouteOptimizerMetadata: expect.objectContaining({
          finalRouteOptimizerStatus: "failed",
          creationError: expect.objectContaining({ message: "RO unavailable" }),
        }),
      })
    );
  });
});
