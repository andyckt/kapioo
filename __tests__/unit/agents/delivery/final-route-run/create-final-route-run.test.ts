const mocks = vi.hoisted(() => ({
  batchCreateMock: vi.fn(),
  getDeliveryOrdersForRoutingMock: vi.fn(),
  getKitchenMock: vi.fn(),
  getProfileMock: vi.fn(),
  findByDuplicateKeyMock: vi.fn(),
  findByIdMock: vi.fn(),
  saveFailureMock: vi.fn(),
  savePartialMock: vi.fn(),
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
  saveFinalRouteOptimizerPartialResult: mocks.savePartialMock,
  saveFinalRouteOptimizerResult: mocks.saveResultMock,
  appendFinalRouteCreationHistory: vi.fn().mockResolvedValue({ id: "run-123" }),
}));

import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import {
  createFinalRouteRunFromApprovedPlan,
  FinalRouteRunStateError,
} from "@/lib/agents/delivery/final-route-run/create-final-route-run-from-approved-plan";
import {
  RouteOptimizerRateLimitError,
  RouteOptimizerResponseError,
  RouteOptimizerValidationError,
} from "@/lib/integrations/route-optimizer/errors";
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

const twoRunFinalAcceptedPlan = {
  ...finalAcceptedPlan,
  runs: [
    {
      runSlot: "A",
      driverName: "DT",
      role: "provider",
      stopCount: 14,
      optimizedStopCount: 14,
      optimizedStops: [{ sequence: 1, orderIds: ["DD-1"], address: "1 DT St" }],
      routeOptimizerWarnings: [],
      routeOptimizerValidationErrors: [],
      geocodeFailures: [],
      previewStatus: "previewed",
      repairActionsApplied: [],
    },
    {
      runSlot: "B",
      driverName: "Marco",
      role: "receiver",
      stopCount: 11,
      optimizedStopCount: 11,
      optimizedStops: [{ sequence: 1, orderIds: ["DD-2"], address: "2 Marco St" }],
      routeOptimizerWarnings: [],
      routeOptimizerValidationErrors: [],
      geocodeFailures: [],
      previewStatus: "previewed",
      repairActionsApplied: [],
    },
  ],
  summary: {
    ...finalAcceptedPlan.summary,
    runCount: 2,
    totalStops: 25,
  },
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
  mocks.savePartialMock.mockImplementation(async (_id, input) => ({
    ...run,
    id: "run-123",
    routeOptimizerRuns: input.routeOptimizerRuns,
    finalRouteOptimizerMetadata: input.finalRouteOptimizerMetadata,
  }));
}

function setupTwoRunSuccess(run: IDeliveryAgentRun = buildRun({ planningArtifacts: {
  artifactVersion: "planning-artifacts-v1",
  systemRecommendedCandidateId: "candidate:selected",
  donaldSelectedCandidateId: "candidate:selected",
  didDonaldOverrideRecommendation: false,
  finalAcceptedPlan: twoRunFinalAcceptedPlan,
} })) {
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
          address: "1 DT St",
          order_ids: ["DD-1"],
        },
      },
      {
        orderId: "DD-2",
        routeOptimizer: {
          name: "DD-2",
          phone: "416-555-0101",
          address: "2 Marco St",
          order_ids: ["DD-2"],
        },
      },
    ],
  });
  mocks.batchCreateMock.mockResolvedValue({
    status: "completed",
    total_requested: 2,
    total_succeeded: 2,
    total_failed: 0,
    runs: [
      {
        run_id: "ro-run-dt",
        external_id: "kapioo-final-run:2026-06-09:run-123:candidate:selected:A",
        idempotency_key: "idem-dt",
        details_link: "https://ro.example/runs/dt",
      },
      {
        run_id: "ro-run-marco",
        external_id: "kapioo-final-run:2026-06-09:run-123:candidate:selected:B",
        idempotency_key: "idem-marco",
        details_link: "https://ro.example/runs/marco",
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
  mocks.savePartialMock.mockImplementation(async (_id, input) => ({
    ...run,
    id: "run-123",
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
    expect(result.finalRouteOptimizerMetadata.planningSessionId).toBe("planning-123");
    expect(result.finalRouteOptimizerMetadata.planningSessionSource).toBe(
      "delivery_agent_planning_session"
    );
    expect(result.finalRouteOptimizerMetadata.didDonaldOverrideRecommendation).toBe(false);
    expect(mocks.batchCreateMock).toHaveBeenCalledTimes(1);
    expect(mocks.batchCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        planning_session_id: "planning-123",
        runs: expect.arrayContaining([
          expect.objectContaining({
            planning_session_id: "planning-123",
            external_id: expect.stringContaining("kapioo-final-run"),
          }),
        ]),
      })
    );
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

  it("retries downstream 429 with the same final create payload", async () => {
    setupSuccess();
    mocks.batchCreateMock.mockRejectedValueOnce(
      new RouteOptimizerRateLimitError("RATE_LIMITED", {
        status: 429,
        path: "/api/integrations/runs/batch-create-and-optimize",
        rawBody: JSON.stringify({ error: "RATE_LIMITED" }),
      })
    );

    const result = await createFinalRouteRunFromApprovedPlan({
      deliveryDate: "2026-06-09",
      profileId: "daily-profile",
      createdBy: "donald@kapioo.com",
    });

    expect(result.finalRouteOptimizerMetadata.finalRouteOptimizerStatus).toBe("created");
    expect(mocks.batchCreateMock).toHaveBeenCalledTimes(2);
    expect(mocks.batchCreateMock.mock.calls[0][0]).toEqual(mocks.batchCreateMock.mock.calls[1][0]);
    expect(mocks.saveFailureMock).not.toHaveBeenCalled();
  });

  it("saves clear downstream 502 failure metadata", async () => {
    setupSuccess();
    mocks.batchCreateMock.mockRejectedValueOnce(
      new RouteOptimizerResponseError("Upstream unavailable", {
        status: 502,
        path: "/api/integrations/runs/batch-create-and-optimize",
        rawBody: JSON.stringify({ error: "UPSTREAM_UNAVAILABLE" }),
      })
    );
    mocks.saveFailureMock.mockResolvedValue(buildRun());

    await expect(
      createFinalRouteRunFromApprovedPlan({
        deliveryDate: "2026-06-09",
        profileId: "daily-profile",
        createdBy: "donald@kapioo.com",
      })
    ).rejects.toThrow(/Route Optimizer service failed/);

    expect(mocks.batchCreateMock).toHaveBeenCalledTimes(1);
    expect(mocks.saveFailureMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        routeOptimizerPlanningSessionId: "planning-123",
        finalRouteOptimizerMetadata: expect.objectContaining({
          finalRouteOptimizerStatus: "failed",
          planningSessionId: "planning-123",
          creationError: expect.objectContaining({
            code: "ROUTE_OPTIMIZER_CREATE_FAILED",
            message: expect.stringContaining("Route Optimizer service failed"),
            details: expect.objectContaining({
              downstreamEndpoint: "/api/integrations/runs/batch-create-and-optimize",
              downstreamStatusCode: 502,
              downstreamResponseBodyPreview: expect.stringContaining("UPSTREAM_UNAVAILABLE"),
              planningSessionId: "planning-123",
            }),
          }),
        }),
      })
    );
  });

  it("saves validation failure metadata and reuses planning session on retry", async () => {
    setupSuccess();
    mocks.batchCreateMock.mockRejectedValueOnce(
      new RouteOptimizerValidationError("Batch validation failed", {
        status: 422,
        path: "/api/integrations/runs/batch-create-and-optimize",
        rawBody: JSON.stringify({
          planning_session_id: "",
          code: "VALIDATION_ERROR",
          error: "Batch validation failed",
        }),
      })
    );
    mocks.saveFailureMock.mockResolvedValue(buildRun());

    await expect(
      createFinalRouteRunFromApprovedPlan({
        deliveryDate: "2026-06-09",
        profileId: "daily-profile",
        createdBy: "donald@kapioo.com",
      })
    ).rejects.toMatchObject({
      code: "ROUTE_OPTIMIZER_VALIDATION_ERROR",
      message: expect.stringContaining("planning_session_id"),
    });

    expect(mocks.batchCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ planning_session_id: "planning-123" })
    );
    expect(mocks.saveFailureMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        routeOptimizerPlanningSessionId: "planning-123",
        finalRouteOptimizerMetadata: expect.objectContaining({
          planningSessionId: "planning-123",
          planningSessionSource: "delivery_agent_planning_session",
          creationError: expect.objectContaining({
            code: "ROUTE_OPTIMIZER_VALIDATION_ERROR",
          }),
        }),
      })
    );

    mocks.batchCreateMock.mockClear();
    setupSuccess(
      buildRun({
        routeOptimizerPlanningSessionId: "planning-123",
        finalRouteOptimizerMetadata: {
          finalRouteOptimizerStatus: "failed",
          systemRecommendedCandidateId: "candidate:selected",
          selectedCandidateId: "candidate:selected",
          didDonaldOverrideRecommendation: false,
          planningSessionId: "planning-123",
          planningSessionSource: "delivery_agent_planning_session",
        },
      })
    );

    const retryResult = await createFinalRouteRunFromApprovedPlan({
      deliveryDate: "2026-06-09",
      profileId: "daily-profile",
      createdBy: "donald@kapioo.com",
    });

    expect(retryResult.finalRouteOptimizerMetadata.planningSessionId).toBe("planning-123");
    expect(mocks.batchCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ planning_session_id: "planning-123" })
    );
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

  it("creates all runs when downstream returns runs instead of results", async () => {
    setupTwoRunSuccess();

    const result = await createFinalRouteRunFromApprovedPlan({
      deliveryDate: "2026-06-09",
      profileId: "daily-profile",
      createdBy: "donald@kapioo.com",
    });

    expect(result.finalRouteOptimizerMetadata.finalRouteOptimizerStatus).toBe("created");
    expect(result.finalRouteOptimizerMetadata.requestedRunCount).toBe(2);
    expect(result.finalRouteOptimizerMetadata.succeededRunCount).toBe(2);
    expect(result.routeSummaries).toHaveLength(2);
    expect(mocks.saveResultMock).toHaveBeenCalled();
    expect(mocks.savePartialMock).not.toHaveBeenCalled();
  });

  it("saves partial_created when only one of two runs is returned", async () => {
    setupTwoRunSuccess();
    mocks.batchCreateMock.mockResolvedValue({
      status: "partial",
      total_requested: 2,
      total_succeeded: 1,
      total_failed: 1,
      planning_session_id: "planning-123",
      runs: [
        {
          run_id: "ro-run-marco",
          external_id: "kapioo-final-run:2026-06-09:run-123:candidate:selected:B",
          idempotency_key: "idem-marco",
          driver_name: "Marco",
          details_link: "https://ro.example/runs/marco",
        },
      ],
      errors: [
        {
          external_id: "kapioo-final-run:2026-06-09:run-123:candidate:selected:A",
          driver_name: "DT",
          code: "VALIDATION_ERROR",
          message: "DT run validation failed",
        },
      ],
    });

    await expect(
      createFinalRouteRunFromApprovedPlan({
        deliveryDate: "2026-06-09",
        profileId: "daily-profile",
        createdBy: "donald@kapioo.com",
      })
    ).rejects.toMatchObject({
      code: "ROUTE_OPTIMIZER_PARTIAL_CREATED",
      finalRouteOptimizerMetadata: expect.objectContaining({
        failedRouteSummaries: expect.arrayContaining([
          expect.objectContaining({
            driverName: "DT",
            errorMessage: "DT run validation failed",
          }),
        ]),
      }),
    });
  });

  it("surfaces validation_errors from failed run entries in failedRouteSummaries", async () => {
    setupTwoRunSuccess();
    mocks.batchCreateMock.mockResolvedValue({
      status: "partial",
      total_requested: 2,
      total_succeeded: 1,
      total_failed: 1,
      runs: [
        {
          external_id: "kapioo-final-run:2026-06-09:run-123:candidate:selected:A",
          driver_name: "DT",
          validation_errors: [{ code: "ENDPOINT_REQUIRED", message: "DT route needs an end point" }],
        },
        {
          run_id: "ro-run-marco",
          external_id: "kapioo-final-run:2026-06-09:run-123:candidate:selected:B",
          driver_name: "Marco",
        },
      ],
    });

    await expect(
      createFinalRouteRunFromApprovedPlan({
        deliveryDate: "2026-06-09",
        profileId: "daily-profile",
        createdBy: "donald@kapioo.com",
      })
    ).rejects.toMatchObject({
      finalRouteOptimizerMetadata: expect.objectContaining({
        failedRouteSummaries: expect.arrayContaining([
          expect.objectContaining({
            driverName: "DT",
            errorCode: "ENDPOINT_REQUIRED",
            errorMessage: "DT route needs an end point",
          }),
        ]),
      }),
    });
  });

  it("retries only missing runs without duplicating successful runs", async () => {
    const partialRun = buildRun({
      planningArtifacts: {
        artifactVersion: "planning-artifacts-v1",
        systemRecommendedCandidateId: "candidate:selected",
        donaldSelectedCandidateId: "candidate:selected",
        didDonaldOverrideRecommendation: false,
        finalAcceptedPlan: twoRunFinalAcceptedPlan,
      },
      routeOptimizerPlanningSessionId: "planning-123",
      routeOptimizerRuns: [
        {
          runId: "ro-run-marco",
          driverName: "Marco",
          externalId: "kapioo-final-run:2026-06-09:run-123:candidate:selected:B",
          idempotencyKey: "idem-marco",
        },
      ],
      finalRouteOptimizerMetadata: {
        finalRouteOptimizerStatus: "partial_created",
        systemRecommendedCandidateId: "candidate:selected",
        selectedCandidateId: "candidate:selected",
        didDonaldOverrideRecommendation: false,
        planningSessionId: "planning-123",
        planningSessionSource: "delivery_agent_planning_session",
        requestedRunCount: 2,
        succeededRunCount: 1,
        failedRunCount: 1,
        routeSummaries: [{ runSlot: "B", driverName: "Marco", stopCount: 11 }],
        failedRouteSummaries: [
          {
            runSlot: "A",
            driverName: "DT",
            stopCount: 14,
            externalId: "kapioo-final-run:2026-06-09:run-123:candidate:selected:A",
            idempotencyKey: "idem-dt",
            errorMessage: "DT run validation failed",
          },
        ],
      },
    });

    setupTwoRunSuccess(partialRun);
    mocks.batchCreateMock.mockResolvedValue({
      status: "completed",
      total_requested: 1,
      total_succeeded: 1,
      total_failed: 0,
      runs: [
        {
          run_id: "ro-run-dt",
          external_id: "kapioo-final-run:2026-06-09:run-123:candidate:selected:A",
          idempotency_key: "idem-dt",
          driver_name: "DT",
          details_link: "https://ro.example/runs/dt",
        },
      ],
    });

    const result = await createFinalRouteRunFromApprovedPlan({
      deliveryDate: "2026-06-09",
      profileId: "daily-profile",
      createdBy: "donald@kapioo.com",
    });

    expect(result.finalRouteOptimizerMetadata.finalRouteOptimizerStatus).toBe("created");
    expect(mocks.batchCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        planning_session_id: "planning-123",
        runs: expect.arrayContaining([
          expect.objectContaining({
            external_id: "kapioo-final-run:2026-06-09:run-123:candidate:selected:A",
          }),
        ]),
      })
    );
    expect(mocks.batchCreateMock.mock.calls[0][0].runs).toHaveLength(1);
    expect(mocks.saveResultMock).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        routeOptimizerRuns: expect.arrayContaining([
          expect.objectContaining({ driverName: "Marco" }),
          expect.objectContaining({ driverName: "DT" }),
        ]),
      })
    );
  });

  it("blocks DT payload validation before Route Optimizer when meet-up phone is missing", async () => {
    const partialRun = buildRun({
      planningArtifacts: {
        artifactVersion: "planning-artifacts-v1",
        systemRecommendedCandidateId: "candidate:selected",
        donaldSelectedCandidateId: "candidate:selected",
        didDonaldOverrideRecommendation: false,
        finalAcceptedPlan: {
          ...twoRunFinalAcceptedPlan,
          handoffPlan: {
            providerRunSlot: "A",
            receiverRunSlot: "B",
            selectedMeetup: {
              meetupAddress: "4000 Yonge St",
              meetupFixedStopPosition: 2,
              variant: "meetup_stop_1",
              syntheticHandoffStopUsed: true,
            },
            receiverStartLocation: "4000 Yonge St",
            receiverStartTime: "11:05",
          },
        },
      },
      routeOptimizerRuns: [
        {
          runId: "ro-run-marco",
          driverName: "Marco",
          externalId: "kapioo-final-run:2026-06-09:run-123:candidate:selected:B",
          idempotencyKey: "idem-marco",
        },
      ],
      finalRouteOptimizerMetadata: {
        finalRouteOptimizerStatus: "partial_created",
        systemRecommendedCandidateId: "candidate:selected",
        selectedCandidateId: "candidate:selected",
        didDonaldOverrideRecommendation: false,
        planningSessionId: "planning-123",
        planningSessionSource: "delivery_agent_planning_session",
        requestedRunCount: 2,
        succeededRunCount: 1,
        failedRunCount: 1,
        routeSummaries: [{ runSlot: "B", driverName: "Marco", stopCount: 11 }],
      },
    });

    setupTwoRunSuccess(partialRun);

    await expect(
      createFinalRouteRunFromApprovedPlan({
        deliveryDate: "2026-06-09",
        profileId: "daily-profile",
        createdBy: "donald@kapioo.com",
      })
    ).rejects.toMatchObject({
      code: "ROUTE_OPTIMIZER_PARTIAL_CREATED",
      finalRouteOptimizerMetadata: expect.objectContaining({
        finalRouteOptimizerStatus: "partial_created",
        failedRouteSummaries: expect.arrayContaining([
          expect.objectContaining({
            driverName: "DT",
            field: "phone",
            errorCode: "ROUTE_OPTIMIZER_PAYLOAD_VALIDATION",
            errorMessage: expect.stringContaining("synthetic meet-up/handoff stop"),
          }),
        ]),
      }),
    });

    expect(mocks.batchCreateMock).not.toHaveBeenCalled();
    expect(mocks.savePartialMock).toHaveBeenCalled();
  });
});
