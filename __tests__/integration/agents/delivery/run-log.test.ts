import { clearCollections, setupTestDb, teardownTestDb } from "../../../helpers/db";

const { connectToDatabaseMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}));

import {
  LEARNING_ARTIFACTS_VERSION,
  LOCATION_ARTIFACTS_VERSION,
  PLANNING_ARTIFACTS_VERSION,
  type CreateDeliveryAgentRunLogInput,
} from "@/lib/agents/delivery/run-log-types";
import type { RoutingIssueCode } from "@/lib/agents/delivery/types";
import {
  attachLearningArtifacts,
  attachLocationArtifacts,
  attachPlanningArtifacts,
  attachRouteOptimizerRuns,
  buildDeliveryAgentDuplicateKey,
  createDeliveryAgentRunLog,
  findDeliveryAgentRunByDuplicateKey,
  markDeliveryAgentRunFailed,
  markDeliveryAgentRunReadyForReview,
  recordDonaldReview,
} from "@/lib/agents/delivery/run-log";
import DeliveryAgentRun from "@/models/DeliveryAgentRun";

const baseCreateInput: CreateDeliveryAgentRunLogInput = {
  deliveryDate: "2026-05-29",
  profileId: "daily-v1-current-dt-ut",
  triggerSource: "test" as const,
  orderCount: 3,
  validStopCount: 2,
  invalidStopCount: 1,
  warningCount: 1,
  orderIds: ["DD-90000001", "DD-90000002", "DD-90000003"],
  invalidOrders: [
    {
      orderId: "DD-90000003",
      area: "Unknown",
      errors: [{ code: "ROUTING_MISSING_PHONE" as RoutingIssueCode, message: "Missing phone number" }],
    },
  ],
  warnings: [
    {
      orderId: "DD-90000001",
      warnings: [{ code: "ROUTING_MISSING_UNIT" as RoutingIssueCode, message: "Missing unit number" }],
    },
  ],
};

describe("lib/agents/delivery/run-log", () => {
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

  it("creates a run log with draft status, planningSessionId, and duplicate key", async () => {
    const run = await createDeliveryAgentRunLog({
      ...baseCreateInput,
      planningSessionId: "planning-session-123",
    });

    expect(run.deliveryDate).toBe("2026-05-29");
    expect(run.profileId).toBe("daily-v1-current-dt-ut");
    expect(run.status).toBe("draft");
    expect(run.planningSessionId).toBe("planning-session-123");
    expect(run.duplicatePreventionKey).toBe(
      buildDeliveryAgentDuplicateKey({
        deliveryDate: "2026-05-29",
        profileId: "daily-v1-current-dt-ut",
      })
    );
    expect(run.orderCount).toBe(3);
    expect(run.validStopCount).toBe(2);
    expect(run.invalidStopCount).toBe(1);
    expect(run.warningCount).toBe(1);
    expect(run.orderIds).toEqual(["DD-90000001", "DD-90000002", "DD-90000003"]);
    expect(run.version).toBe("m4-v1");
  });

  it("generates planningSessionId when not provided", async () => {
    const run = await createDeliveryAgentRunLog(baseCreateInput);

    expect(run.planningSessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("finds a run by duplicate prevention key", async () => {
    const created = await createDeliveryAgentRunLog(baseCreateInput);

    const found = await findDeliveryAgentRunByDuplicateKey(created.duplicatePreventionKey);

    expect(found?.id).toBe(created.id);
  });

  it("rejects duplicate prevention keys via unique index", async () => {
    await createDeliveryAgentRunLog(baseCreateInput);

    await expect(createDeliveryAgentRunLog(baseCreateInput)).rejects.toMatchObject({
      code: 11000,
    });
  });

  it("marks a run failed with completedAt and appended error", async () => {
    const created = await createDeliveryAgentRunLog(baseCreateInput);

    const failed = await markDeliveryAgentRunFailed(created.id, {
      code: "ROUTE_OPTIMIZER_NETWORK_ERROR",
      message: "Route Optimizer request failed",
      details: { path: "/api/integrations/runs/optimize-preview" },
    });

    expect(failed.status).toBe("failed");
    expect(failed.completedAt).toBeInstanceOf(Date);
    expect(failed.errors).toHaveLength(1);
    expect(failed.errors?.[0]).toMatchObject({
      code: "ROUTE_OPTIMIZER_NETWORK_ERROR",
      message: "Route Optimizer request failed",
      details: { path: "/api/integrations/runs/optimize-preview" },
    });
    expect(failed.errors?.[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("marks a run ready for review with summary fields", async () => {
    const created = await createDeliveryAgentRunLog(baseCreateInput);

    const ready = await markDeliveryAgentRunReadyForReview(created.id, {
      selectedPlanSummary: { drivers: ["DT", "UT"] },
      profileSnapshot: { profileId: "daily-v1-current-dt-ut", version: "1" },
      candidateCount: 2,
      previewCount: 2,
    });

    expect(ready.status).toBe("ready_for_review");
    expect(ready.selectedPlanSummary).toEqual({ drivers: ["DT", "UT"] });
    expect(ready.profileSnapshot).toEqual({
      profileId: "daily-v1-current-dt-ut",
      version: "1",
    });
    expect(ready.candidateCount).toBe(2);
    expect(ready.previewCount).toBe(2);
  });

  it("attaches Route Optimizer runs and optional planning session id", async () => {
    const created = await createDeliveryAgentRunLog(baseCreateInput);

    const updated = await attachRouteOptimizerRuns(
      created.id,
      [
        {
          runId: "ro-run-1",
          driverName: "DT Driver",
          externalId: "ext-1",
          idempotencyKey: "idem-1",
          detailsLink: "https://ro.example.com/runs/ro-run-1",
          totalDurationMinutes: 95,
        },
      ],
      { routeOptimizerPlanningSessionId: "ro-planning-session-1" }
    );

    expect(updated.routeOptimizerPlanningSessionId).toBe("ro-planning-session-1");
    expect(updated.routeOptimizerRuns).toHaveLength(1);
    expect(updated.routeOptimizerRuns?.[0]).toMatchObject({
      runId: "ro-run-1",
      driverName: "DT Driver",
      externalId: "ext-1",
      idempotencyKey: "idem-1",
      detailsLink: "https://ro.example.com/runs/ro-run-1",
      totalDurationMinutes: 95,
    });
  });

  it("persists invalid order and warning snapshots", async () => {
    const created = await createDeliveryAgentRunLog(baseCreateInput);
    const persisted = await DeliveryAgentRun.findById(created.id);

    expect(persisted?.invalidOrders).toHaveLength(1);
    expect(persisted?.invalidOrders?.[0]?.errors[0]?.code).toBe("ROUTING_MISSING_PHONE");
    expect(persisted?.warnings).toHaveLength(1);
    expect(persisted?.warnings?.[0]?.warnings[0]?.code).toBe("ROUTING_MISSING_UNIT");
  });

  it("persists optional profileVersion on create", async () => {
    const run = await createDeliveryAgentRunLog({
      ...baseCreateInput,
      profileVersion: "daily-v1.2",
    });

    expect(run.profileVersion).toBe("daily-v1.2");
    expect(run.version).toBe("m4-v1");
  });

  it("records Donald review with feedback tags", async () => {
    const created = await createDeliveryAgentRunLog(baseCreateInput);

    const reviewed = await recordDonaldReview(created.id, {
      reviewStatus: "approved",
      reviewedBy: "donald@kapioo.com",
      donaldFeedbackText: "Looks good for DT/UT split",
      donaldFeedbackTags: ["split-dt-ut", "finish-before-1pm"],
    });

    expect(reviewed.reviewStatus).toBe("approved");
    expect(reviewed.reviewedBy).toBe("donald@kapioo.com");
    expect(reviewed.reviewedAt).toBeInstanceOf(Date);
    expect(reviewed.donaldFeedbackText).toBe("Looks good for DT/UT split");
    expect(reviewed.donaldFeedbackTags).toEqual(["split-dt-ut", "finish-before-1pm"]);
    expect(reviewed.status).toBe("draft");
  });

  it("persists planning, location, and learning artifact buckets", async () => {
    const created = await createDeliveryAgentRunLog(baseCreateInput);

    await attachPlanningArtifacts(created.id, {
      artifactVersion: PLANNING_ARTIFACTS_VERSION,
      candidatePlansTested: [{ candidateId: "plan-a", score: 0.91 }],
      agentReasoningSummary: "Split North York into DT run",
    });

    const withLocation = await attachLocationArtifacts(created.id, {
      artifactVersion: LOCATION_ARTIFACTS_VERSION,
      stopSnapshots: [
        {
          lat: 43.7615,
          lng: -79.4111,
          normalizedAddress: "123 Main St, North York",
          area: "North York",
          clusterId: "ny-cluster-1",
        },
      ],
      handoffEvents: [
        {
          type: "meet-up",
          location: { lat: 43.7, lng: -79.4 },
          fromRunId: "ro-run-dt",
          toRunId: "ro-run-ut",
        },
      ],
      startLocation: { address: "Kitchen", lat: 43.65, lng: -79.38 },
    });

    const withLearning = await attachLearningArtifacts(created.id, {
      artifactVersion: LEARNING_ARTIFACTS_VERSION,
      actualOutcome: {
        finishTime: "12:45",
        finishBefore1Pm: true,
      },
      manualEdits: [{ type: "move-stop", details: { fromRunId: "ro-run-dt" } }],
    });

    expect(withLocation.planningArtifacts).toMatchObject({
      artifactVersion: PLANNING_ARTIFACTS_VERSION,
      agentReasoningSummary: "Split North York into DT run",
    });
    expect(withLocation.locationArtifacts?.stopSnapshots?.[0]?.clusterId).toBe("ny-cluster-1");
    expect(withLearning.learningArtifacts).toMatchObject({
      artifactVersion: LEARNING_ARTIFACTS_VERSION,
      actualOutcome: { finishBefore1Pm: true },
    });
  });

  it("persists extended Route Optimizer run location fields", async () => {
    const created = await createDeliveryAgentRunLog(baseCreateInput);

    const updated = await attachRouteOptimizerRuns(created.id, [
      {
        runId: "ro-run-2",
        driverName: "UT Driver",
        externalId: "ext-2",
        idempotencyKey: "idem-2",
        repairActionCount: 2,
        startLocation: { address: "Kitchen", lat: 43.65, lng: -79.38 },
        endLocation: { address: "UT depot", lat: 43.78, lng: -79.42 },
        optimizedRoute: [
          { lat: 43.7615, lng: -79.4111, address: "123 Main St" },
          { lat: 43.77, lng: -79.42, address: "456 Side St" },
        ],
      },
    ]);

    expect(updated.routeOptimizerRuns?.[0]).toMatchObject({
      runId: "ro-run-2",
      repairActionCount: 2,
      startLocation: { lat: 43.65, lng: -79.38 },
      endLocation: { lat: 43.78, lng: -79.42 },
    });
    expect(updated.routeOptimizerRuns?.[0]?.optimizedRoute).toHaveLength(2);
  });
});
