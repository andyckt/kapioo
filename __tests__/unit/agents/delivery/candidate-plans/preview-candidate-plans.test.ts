const {
  generateCandidatePlansForAgentMock,
  getDeliveryOrdersForRoutingMock,
  getKapiooKitchenStartLocationMock,
  previewRouteOptimizerRunMock,
} = vi.hoisted(() => ({
  generateCandidatePlansForAgentMock: vi.fn(),
  getDeliveryOrdersForRoutingMock: vi.fn(),
  getKapiooKitchenStartLocationMock: vi.fn(),
  previewRouteOptimizerRunMock: vi.fn(),
}));

vi.mock("@/lib/agents/delivery/candidate-plans/generate-candidate-plans", () => ({
  generateCandidatePlansForAgent: generateCandidatePlansForAgentMock,
}));

vi.mock("@/lib/agents/delivery/get-delivery-orders-for-routing", () => ({
  getDeliveryOrdersForRouting: getDeliveryOrdersForRoutingMock,
}));

vi.mock("@/lib/agents/delivery/kitchen-start-location", () => ({
  getKapiooKitchenStartLocation: getKapiooKitchenStartLocationMock,
  KitchenStartLocationConfigError: class KitchenStartLocationConfigError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "KitchenStartLocationConfigError";
    }
  },
}));

vi.mock("@/lib/integrations/route-optimizer/client", () => ({
  previewRouteOptimizerRun: previewRouteOptimizerRunMock,
}));

import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { KitchenStartLocationConfigError } from "@/lib/agents/delivery/kitchen-start-location";
import { previewCandidatePlansForAgent } from "@/lib/agents/delivery/candidate-plans/preview-candidate-plans";
import {
  RouteOptimizerConfigError,
  RouteOptimizerRateLimitError,
} from "@/lib/integrations/route-optimizer/errors";
import { buildMixedAreaRoutingStops } from "./test-fixtures";

function buildRouteOptimizerSuccess(overrides: Record<string, unknown> = {}) {
  return {
    status: "preview",
    total_duration_minutes: 90,
    total_distance_km: 14,
    estimated_finish_time: "2026-06-09T16:30:00.000Z",
    optimized_route: {
      total_duration_minutes: 90,
      total_distance_km: 14,
      stops: [
        {
          customer_name: "Today's Meet up point",
          customer_address: "4000 Yonge St, North York M2N 5N8",
          duration_from_previous: 10,
          service_time_minutes: 5,
          is_synthetic: true,
          stop_type: "handoff",
          sequence: 1,
          order_ids: [],
        },
        {
          customer_name: "Alice Customer",
          customer_address: "123 Main St",
          duration_from_previous: 12,
          service_time_minutes: 5,
          order_ids: ["DD-90000001"],
          sequence: 2,
        },
      ],
    },
    warnings: [],
    validation_errors: [],
    geocode_failures: [],
    ...overrides,
  };
}

function buildGenerationResponse() {
  return {
    deliveryDate: "2026-06-09",
    profileId: "daily-v1-current-dt-marco-self",
    profileVersion: "daily-v1.0",
    notes: "Draft candidates only.",
    candidates: [
      {
        candidateId: "baseline_two_run:2026-06-09",
        name: "Baseline two-run split",
        description: "Baseline split",
        strategyType: "baseline_two_run",
        profileId: "daily-v1-current-dt-marco-self",
        profileVersion: "daily-v1.0",
        deliveryDate: "2026-06-09",
        runs: [
          {
            runSlot: "A",
            driverName: "DT",
            role: "downtown",
            startType: "kitchen",
            startLocationLabel: "Kitchen",
            stopCount: 2,
            totalMealQuantity: 4,
            areaBreakdown: { "Downtown Toronto": 1, Midtown: 1 },
            plannedStartTimeSource: "profile.timeRules.normalKitchenStartTime",
            constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
            stops: [
              {
                orderId: "DD-90000001",
                customerName: "Alice Customer",
                area: "Downtown Toronto",
                formattedAddress: "123 Main St",
                totalMealQuantity: 2,
                planningTags: [],
              },
              {
                orderId: "DD-90000002",
                customerName: "Bob Customer",
                area: "North York",
                formattedAddress: "4000 Yonge St, North York M2N 5N8",
                totalMealQuantity: 2,
                planningTags: ["flexible_north_york"],
              },
            ],
          },
          {
            runSlot: "B",
            driverName: "Marco",
            role: "uptown",
            startType: "handoff",
            startLocationLabel: "Handoff (meet-up later)",
            stopCount: 1,
            totalMealQuantity: 2,
            areaBreakdown: { Markham: 1 },
            plannedStartTimeSource: "profile.handoffRules.receiverStartTimeSource",
            constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
            stops: [
              {
                orderId: "DD-90000003",
                customerName: "Carol Customer",
                area: "Markham",
                formattedAddress: "789 Markham Rd",
                totalMealQuantity: 2,
                planningTags: [],
              },
            ],
          },
        ],
        summary: {
          totalStops: 3,
          totalMeals: 6,
          runCount: 2,
          selfUsed: false,
          selfStopCount: 0,
          byRun: { A: 2, B: 1 },
          byArea: {},
          northYorkSplit: { dt: 0, marco: 0 },
          warnings: [],
        },
        warnings: [],
        assumptions: ["Lat/lng not available; using area/address fallback for North York."],
        handoffPlan: {
          providerRunSlot: "A",
          receiverRunSlot: "B",
          mode: "synthetic_handoff_stop_later",
          note: "Meet-up later.",
        },
        constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
      },
      {
        candidateId: "self_fallback_light:2026-06-09",
        name: "Self fallback — light",
        description: "Self fallback",
        strategyType: "self_fallback_light",
        profileId: "daily-v1-current-dt-marco-self",
        profileVersion: "daily-v1.0",
        deliveryDate: "2026-06-09",
        runs: [
          {
            runSlot: "A",
            driverName: "DT",
            role: "downtown",
            startType: "kitchen",
            startLocationLabel: "Kitchen",
            stopCount: 1,
            totalMealQuantity: 2,
            areaBreakdown: { "Downtown Toronto": 1 },
            plannedStartTimeSource: "profile.timeRules.normalKitchenStartTime",
            constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
            stops: [
              {
                orderId: "DD-90000001",
                customerName: "Alice Customer",
                area: "Downtown Toronto",
                formattedAddress: "123 Main St",
                totalMealQuantity: 2,
                planningTags: [],
              },
            ],
          },
          {
            runSlot: "B",
            driverName: "Marco",
            role: "uptown",
            startType: "handoff",
            startLocationLabel: "Handoff (meet-up later)",
            stopCount: 1,
            totalMealQuantity: 2,
            areaBreakdown: { Markham: 1 },
            plannedStartTimeSource: "profile.handoffRules.receiverStartTimeSource",
            constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
            stops: [
              {
                orderId: "DD-90000003",
                customerName: "Carol Customer",
                area: "Markham",
                formattedAddress: "789 Markham Rd",
                totalMealQuantity: 2,
                planningTags: [],
              },
            ],
          },
          {
            runSlot: "C",
            driverName: "Self",
            role: "self",
            startType: "kitchen_or_assigned",
            startLocationLabel: "Self / assigned",
            stopCount: 1,
            totalMealQuantity: 2,
            areaBreakdown: { "North York": 1 },
            plannedStartTimeSource: "self_fallback",
            constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
            stops: [
              {
                orderId: "DD-90000004",
                customerName: "Dan Customer",
                area: "North York",
                formattedAddress: "4000 Yonge St",
                totalMealQuantity: 2,
                planningTags: [],
              },
            ],
          },
        ],
        summary: {
          totalStops: 3,
          totalMeals: 6,
          runCount: 3,
          selfUsed: true,
          selfStopCount: 1,
          byRun: { A: 1, B: 1, C: 1 },
          byArea: {},
          northYorkSplit: { dt: 0, marco: 0 },
          warnings: [],
        },
        warnings: [],
        assumptions: [],
        handoffPlan: {
          providerRunSlot: "A",
          receiverRunSlot: "B",
          mode: "synthetic_handoff_stop_later",
          note: "Meet-up later.",
        },
        constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
      },
    ],
  };
}

function buildRoutingResult() {
  return {
    deliveryDate: "2026-06-09",
    profileId: "daily-default",
    queriedAt: "2026-06-08T12:00:00.000Z",
    timezone: "America/Toronto",
    summary: {
      totalOrders: 4,
      validStops: 4,
      invalidStops: 0,
      warningStops: 0,
      byArea: {},
      byStatus: { confirmed: 4 },
      totalMealQuantity: 8,
    },
    stops: buildMixedAreaRoutingStops().slice(0, 4),
    invalid: [],
    warnings: [],
    sourceOrderResultSummary: {
      orderCount: 4,
      excludedCount: 0,
      itemCount: 4,
      totalMealQuantity: 8,
      byStatus: { confirmed: 4 },
      byArea: {},
    },
  };
}

describe("lib/agents/delivery/candidate-plans/preview-candidate-plans", () => {
  beforeEach(() => {
    generateCandidatePlansForAgentMock.mockReset();
    getDeliveryOrdersForRoutingMock.mockReset();
    getKapiooKitchenStartLocationMock.mockReset();
    previewRouteOptimizerRunMock.mockReset();
  });

  it("propagates planning gate failures and does not call Route Optimizer", async () => {
    generateCandidatePlansForAgentMock.mockRejectedValue(
      new DeliveryAgentPlanningBlockedError(["1 pending order(s) must be confirmed before planning."])
    );

    await expect(previewCandidatePlansForAgent("2026-06-09")).rejects.toBeInstanceOf(
      DeliveryAgentPlanningBlockedError
    );

    expect(previewRouteOptimizerRunMock).not.toHaveBeenCalled();
  });

  it("previews baseline candidate with one Route Optimizer call per non-empty run", async () => {
    generateCandidatePlansForAgentMock.mockResolvedValue(buildGenerationResponse());
    getDeliveryOrdersForRoutingMock.mockResolvedValue(buildRoutingResult());
    getKapiooKitchenStartLocationMock.mockReturnValue(
      "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada"
    );
    previewRouteOptimizerRunMock.mockImplementation((payload: { run: { driver_name: string } }) => {
      if (payload.run.driver_name === "Marco") {
        return Promise.resolve({
          status: "preview",
          total_duration_minutes: 45,
          total_distance_km: 8,
          optimized_route: {
            stops: [
              {
                customer_name: "Carol Customer",
                customer_address: "789 Markham Rd",
                duration_from_previous: 10,
                service_time_minutes: 5,
                order_ids: ["DD-90000003"],
              },
            ],
          },
          warnings: [],
          validation_errors: [],
          geocode_failures: [],
        });
      }

      return Promise.resolve(buildRouteOptimizerSuccess());
    });

    const result = await previewCandidatePlansForAgent("2026-06-09");
    const baseline = result.candidates.find(
      (candidate) =>
        candidate.combination?.splitStrategyType === "baseline_two_run" ||
        candidate.strategyType === "baseline_two_run"
    );

    expect(baseline?.status).toBe("previewed");
    expect(baseline?.runs).toHaveLength(2);
    expect(baseline?.runs.every((run) => run.previewStatus === "previewed")).toBe(true);
    expect(previewRouteOptimizerRunMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(previewRouteOptimizerRunMock.mock.calls[0][0].run.driver_name).toBe("DT");
    expect(previewRouteOptimizerRunMock.mock.calls[0][0].external_id).toContain(":A");
    expect(baseline?.combination?.baseSplitCandidateId).toContain("baseline_two_run:2026-06-09");
    expect(baseline?.summary.allRunsFinishBeforeDeadline).toBeDefined();
    expect(baseline?.handoffPlan.selectedMeetup?.syntheticHandoffStopUsed).toBe(true);
    expect(baseline?.candidateRepairSummary.repairAttempted).toBe(false);
    expect(
      baseline?.handoffPlan.receiverStartLocation ?? baseline?.handoffPlan.skipReason
    ).toBeTruthy();

    expect(result.recommendedCandidateId).toBeTruthy();
    expect(result.recommendedPlanSummary?.candidateId).toBe(result.recommendedCandidateId);
    expect(result.selectionNotes).toBeTruthy();
    expect(result.candidates.every((candidate) => candidate.rank >= 1 && candidate.score >= 0)).toBe(true);
    expect(baseline?.rank).toBeGreaterThanOrEqual(1);
    expect(baseline?.score).toBeGreaterThan(0);
    expect(baseline?.scoreBreakdown.length).toBeGreaterThan(0);
    expect(result.notes).toContain("full route combination");

    const dtPayload = previewRouteOptimizerRunMock.mock.calls[0][0];
    const syntheticStop = dtPayload.customers.find(
      (customer: { is_synthetic?: boolean }) => customer.is_synthetic
    );
    expect(syntheticStop).toMatchObject({
      is_synthetic: true,
      stop_type: "handoff",
      service_time_minutes: 5,
    });
  });

  it("includes Self run preview for self fallback candidate", async () => {
    generateCandidatePlansForAgentMock.mockResolvedValue(buildGenerationResponse());
    getDeliveryOrdersForRoutingMock.mockResolvedValue(buildRoutingResult());
    getKapiooKitchenStartLocationMock.mockReturnValue(
      "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada"
    );
    previewRouteOptimizerRunMock.mockImplementation((payload: { run: { driver_name: string } }) => {
      if (payload.run.driver_name === "Marco") {
        return Promise.resolve({
          status: "preview",
          total_duration_minutes: 45,
          total_distance_km: 8,
          optimized_route: {
            stops: [
              {
                customer_name: "Carol Customer",
                customer_address: "789 Markham Rd",
                duration_from_previous: 10,
                service_time_minutes: 5,
                order_ids: ["DD-90000003"],
              },
            ],
          },
          warnings: [],
          validation_errors: [],
          geocode_failures: [],
        });
      }

      return Promise.resolve(buildRouteOptimizerSuccess());
    });

    const result = await previewCandidatePlansForAgent("2026-06-09");
    const selfCandidate = result.candidates.find(
      (candidate) =>
        candidate.combination?.splitStrategyType === "self_fallback_light" ||
        candidate.strategyType === "self_fallback_light"
    );

    expect(selfCandidate?.summary.selfUsed).toBe(true);
    expect(selfCandidate?.runs.some((run) => run.runSlot === "C" && run.previewStatus === "previewed")).toBe(
      true
    );
  });

  it("marks candidate partial_failed when one run preview fails", async () => {
    generateCandidatePlansForAgentMock.mockResolvedValue({
      ...buildGenerationResponse(),
      candidates: [buildGenerationResponse().candidates[0]],
    });
    getDeliveryOrdersForRoutingMock.mockResolvedValue(buildRoutingResult());
    getKapiooKitchenStartLocationMock.mockReturnValue(
      "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada"
    );
    previewRouteOptimizerRunMock
      .mockResolvedValueOnce(buildRouteOptimizerSuccess())
      .mockRejectedValueOnce(new Error("Invalid customer address"));

    const result = await previewCandidatePlansForAgent("2026-06-09");
    const baseline = result.candidates[0];

    expect(baseline.status).toBe("partial_failed");
    expect(baseline.runs[0].previewStatus).toBe("previewed");
    expect(baseline.runs[1].previewStatus).toBe("failed");
    expect(baseline.errors.length).toBeGreaterThan(0);
  });

  it("stops previewing additional candidates after Route Optimizer rate limiting", async () => {
    generateCandidatePlansForAgentMock.mockResolvedValue(buildGenerationResponse());
    getDeliveryOrdersForRoutingMock.mockResolvedValue(buildRoutingResult());
    getKapiooKitchenStartLocationMock.mockReturnValue(
      "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada"
    );
    previewRouteOptimizerRunMock.mockRejectedValue(
      new RouteOptimizerRateLimitError("RATE_LIMITED", {
        status: 429,
        path: "/api/integrations/runs/optimize-preview",
        rawBody: JSON.stringify({ error: "RATE_LIMITED" }),
      })
    );

    const result = await previewCandidatePlansForAgent("2026-06-09");

    expect(previewRouteOptimizerRunMock).toHaveBeenCalledTimes(1);
    expect(result.candidates.length).toBe(1);
    expect(result.selectionWarnings).toEqual(
      expect.arrayContaining([expect.stringContaining("rate limited")])
    );
    expect(result.candidates[0].errors).toEqual(
      expect.arrayContaining([expect.stringContaining("RATE_LIMITED")])
    );
  });

  it("throws when kitchen start location is missing", async () => {
    generateCandidatePlansForAgentMock.mockResolvedValue(buildGenerationResponse());
    getKapiooKitchenStartLocationMock.mockImplementation(() => {
      throw new KitchenStartLocationConfigError("KAPIOO_KITCHEN_START_LOCATION is not configured");
    });

    await expect(previewCandidatePlansForAgent("2026-06-09")).rejects.toBeInstanceOf(
      KitchenStartLocationConfigError
    );
    expect(previewRouteOptimizerRunMock).not.toHaveBeenCalled();
  });

  it("throws when Route Optimizer config is missing", async () => {
    generateCandidatePlansForAgentMock.mockResolvedValue({
      ...buildGenerationResponse(),
      candidates: [buildGenerationResponse().candidates[0]],
    });
    getDeliveryOrdersForRoutingMock.mockResolvedValue(buildRoutingResult());
    getKapiooKitchenStartLocationMock.mockReturnValue(
      "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada"
    );
    previewRouteOptimizerRunMock.mockRejectedValue(
      new RouteOptimizerConfigError("ROUTE_OPTIMIZER_BASE_URL is not configured")
    );

    await expect(previewCandidatePlansForAgent("2026-06-09")).rejects.toBeInstanceOf(
      RouteOptimizerConfigError
    );
  });

  it("reports on-time and late deadline comparisons from run finish times", async () => {
    generateCandidatePlansForAgentMock.mockResolvedValue({
      ...buildGenerationResponse(),
      candidates: [buildGenerationResponse().candidates[0]],
    });
    getDeliveryOrdersForRoutingMock.mockResolvedValue(buildRoutingResult());
    getKapiooKitchenStartLocationMock.mockReturnValue(
      "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada"
    );
    previewRouteOptimizerRunMock
      .mockResolvedValueOnce(
        buildRouteOptimizerSuccess({
          total_duration_minutes: 90,
          estimated_finish_time: "2026-06-09T16:00:00.000Z",
        })
      )
      .mockResolvedValueOnce(
        buildRouteOptimizerSuccess({
          total_duration_minutes: 210,
          optimized_route: {
            total_duration_minutes: 210,
            total_distance_km: 20,
            stops: [
              {
                customer_name: "Carol Customer",
                customer_address: "789 Markham Rd",
                duration_from_previous: 30,
                service_time_minutes: 5,
                order_ids: ["DD-90000003"],
              },
            ],
          },
        })
      );

    const result = await previewCandidatePlansForAgent("2026-06-09");
    const baseline = result.candidates[0];

    expect(baseline.summary.allRunsFinishBeforeDeadline).toBe(false);
    expect(baseline.summary.minutesBeforeOrAfterDeadline).toBeLessThan(0);
  });
});
