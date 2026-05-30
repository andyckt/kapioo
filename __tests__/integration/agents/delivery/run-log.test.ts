import { clearCollections, setupTestDb, teardownTestDb } from "../../../helpers/db";

const { connectToDatabaseMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}));

import type { CreateDeliveryAgentRunLogInput } from "@/lib/agents/delivery/run-log-types";
import type { RoutingIssueCode } from "@/lib/agents/delivery/types";
import {
  attachRouteOptimizerRuns,
  buildDeliveryAgentDuplicateKey,
  createDeliveryAgentRunLog,
  findDeliveryAgentRunByDuplicateKey,
  markDeliveryAgentRunFailed,
  markDeliveryAgentRunReadyForReview,
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
});
