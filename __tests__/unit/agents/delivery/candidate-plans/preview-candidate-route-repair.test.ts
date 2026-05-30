const { previewRouteOptimizerRunMock } = vi.hoisted(() => ({
  previewRouteOptimizerRunMock: vi.fn(),
}));

vi.mock("@/lib/integrations/route-optimizer/client", () => ({
  previewRouteOptimizerRun: previewRouteOptimizerRunMock,
}));

import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import type { CandidateHandoffPreviewResult } from "@/lib/agents/delivery/candidate-plans/preview-candidate-handoff";
import { repairCandidateRoutePreview } from "@/lib/agents/delivery/candidate-plans/preview-candidate-route-repair";
import type { DeliveryAgentCandidatePlan } from "@/lib/contracts/delivery-agent";
import { buildMixedAreaRoutingStops } from "./test-fixtures";

function buildCandidate(): DeliveryAgentCandidatePlan {
  return {
    candidateId: "baseline_two_run:2026-06-09",
    name: "Baseline",
    description: "Baseline",
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
        areaBreakdown: { "Downtown Toronto": 1, "North York": 1 },
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
            orderId: "DD-90000004",
            customerName: "Dan Customer",
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
        startLocationLabel: "Handoff",
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
      northYorkSplit: { dt: 1, marco: 0 },
      warnings: [],
    },
    warnings: [],
    assumptions: [],
    handoffPlan: {
      providerRunSlot: "A",
      receiverRunSlot: "B",
      mode: "synthetic_handoff_stop_later",
      note: "placeholder",
    },
    constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
  };
}

function buildDtRouteWithMeetupLate() {
  return {
    status: "preview",
    total_duration_minutes: 60,
    optimized_route: {
      stops: [
        {
          customer_name: "Alice Customer",
          customer_address: "123 Main St",
          duration_from_previous: 15,
          service_time_minutes: 5,
          order_ids: ["DD-90000001"],
        },
        {
          customer_name: "Dan Customer",
          customer_address: "4000 Yonge St",
          duration_from_previous: 10,
          service_time_minutes: 5,
          order_ids: ["DD-90000004"],
        },
        {
          customer_name: "Meet-up / Handoff Point",
          customer_address: "4000 Yonge St, North York M2N 5N8",
          duration_from_previous: 10,
          service_time_minutes: 5,
          is_synthetic: true,
          stop_type: "handoff",
          sequence: 3,
          order_ids: [],
        },
      ],
    },
    warnings: [],
    validation_errors: [],
    geocode_failures: [],
  };
}

function buildRepairedDtRoute() {
  return {
    status: "preview",
    total_duration_minutes: 55,
    optimized_route: {
      stops: [
        {
          customer_name: "Meet-up / Handoff Point",
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
        },
      ],
    },
    warnings: [],
    validation_errors: [],
    geocode_failures: [],
  };
}

describe("lib/agents/delivery/candidate-plans/preview-candidate-route-repair", () => {
  const profile = getDefaultDeliveryPlanningProfile();
  const routingStopByOrderId = new Map(
    buildMixedAreaRoutingStops().map((stop) => [stop.orderId, stop])
  );

  beforeEach(() => {
    previewRouteOptimizerRunMock.mockReset();
  });

  it("re-previews DT and Marco when downtown-before-meetup issue is detected", async () => {
    const handoffResult: CandidateHandoffPreviewResult = {
      runPreviews: [
        {
          runSlot: "A",
          driverName: "DT",
          role: "downtown",
          stopCount: 2,
          optimizedStopCount: 3,
          optimizedStops: [
            { sequence: 1, name: "Alice Customer", orderIds: ["DD-90000001"] },
            { sequence: 2, name: "Dan Customer", orderIds: ["DD-90000004"] },
            { sequence: 3, name: "Meet-up / Handoff Point", orderIds: [] },
          ],
          routeOptimizerWarnings: [],
          routeOptimizerValidationErrors: [],
          geocodeFailures: [],
          previewStatus: "previewed",
          syntheticMeetupIncluded: true,
          meetupSequence: 3,
          meetupEta: "2026-06-09T15:00:00.000Z",
        },
        {
          runSlot: "B",
          driverName: "Marco",
          role: "uptown",
          stopCount: 1,
          optimizedStopCount: 1,
          optimizedStops: [{ sequence: 1, name: "Carol Customer", orderIds: ["DD-90000003"] }],
          routeOptimizerWarnings: [],
          routeOptimizerValidationErrors: [],
          geocodeFailures: [],
          previewStatus: "previewed",
          estimatedFinishTime: "2026-06-09T16:00:00.000Z",
        },
      ],
      handoffPlan: {
        providerRunSlot: "A",
        receiverRunSlot: "B",
        selectedMeetup: {
          meetupAddress: "4000 Yonge St, North York M2N 5N8",
          meetupFixedStopPosition: 1,
          variant: "meetup_stop_1",
          syntheticHandoffStopUsed: true,
        },
        meetupEta: "2026-06-09T15:00:00.000Z",
        receiverStartLocation: "4000 Yonge St, North York M2N 5N8",
        receiverStartTime: "11:00",
      },
      assumptions: [],
    };

    previewRouteOptimizerRunMock
      .mockResolvedValueOnce(buildRepairedDtRoute())
      .mockResolvedValueOnce({
        status: "preview",
        total_duration_minutes: 40,
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

    const result = await repairCandidateRoutePreview({
      deliveryDate: "2026-06-09",
      candidate: buildCandidate(),
      kitchenAddress: "123 Kitchen Rd",
      profile,
      routingStopByOrderId,
      handoffResult,
      planSummary: {
        runCount: 2,
        totalStops: 3,
        selfUsed: false,
        selfStopCount: 0,
      },
    });

    expect(result.candidateRepairSummary.repairAttempted).toBe(true);
    expect(result.candidateRepairSummary.repairSucceeded).toBe(true);
    expect(result.candidateRepairSummary.issuesDetected.some(
      (issue) => issue.issueType === "downtown_before_meetup"
    )).toBe(true);
    expect(previewRouteOptimizerRunMock).toHaveBeenCalledTimes(2);
    expect(result.runPreviews[0].repairStatus).toBe("repaired");
    expect(result.runPreviews[0].wasRepreviewedAfterRepair).toBe(true);

    const dtPayload = previewRouteOptimizerRunMock.mock.calls[0][0];
    const syntheticStop = dtPayload.customers.find(
      (customer: { is_synthetic?: boolean }) => customer.is_synthetic
    );
    expect(syntheticStop?.fixed_stop_position).toBe(1);
  });

  it("keeps original previews when repaired Route Optimizer preview fails", async () => {
    const handoffResult: CandidateHandoffPreviewResult = {
      runPreviews: [
        {
          runSlot: "A",
          driverName: "DT",
          role: "downtown",
          stopCount: 2,
          optimizedStopCount: 2,
          optimizedStops: [
            { sequence: 1, name: "Alice Customer", orderIds: ["DD-90000001"] },
            { sequence: 2, name: "Meet-up / Handoff Point", orderIds: [] },
          ],
          routeOptimizerWarnings: [],
          routeOptimizerValidationErrors: [],
          geocodeFailures: [],
          previewStatus: "previewed",
          syntheticMeetupIncluded: true,
          meetupSequence: 2,
          meetupEta: "2026-06-09T15:00:00.000Z",
        },
        {
          runSlot: "B",
          driverName: "Marco",
          role: "uptown",
          stopCount: 1,
          optimizedStopCount: 1,
          optimizedStops: [{ sequence: 1, name: "Carol Customer", orderIds: ["DD-90000003"] }],
          routeOptimizerWarnings: [],
          routeOptimizerValidationErrors: [],
          geocodeFailures: [],
          previewStatus: "previewed",
        },
      ],
      handoffPlan: {
        providerRunSlot: "A",
        receiverRunSlot: "B",
        selectedMeetup: {
          meetupAddress: "4000 Yonge St",
          meetupFixedStopPosition: 1,
          variant: "meetup_stop_1",
          syntheticHandoffStopUsed: true,
        },
        receiverStartLocation: "4000 Yonge St",
        receiverStartTime: "11:00",
      },
      assumptions: [],
    };

    previewRouteOptimizerRunMock.mockRejectedValueOnce(new Error("RO repair failed"));

    const result = await repairCandidateRoutePreview({
      deliveryDate: "2026-06-09",
      candidate: buildCandidate(),
      kitchenAddress: "123 Kitchen Rd",
      profile,
      routingStopByOrderId,
      handoffResult,
      planSummary: {
        runCount: 2,
        totalStops: 3,
        selfUsed: false,
        selfStopCount: 0,
      },
    });

    expect(result.candidateRepairSummary.repairSucceeded).toBe(false);
    expect(result.runPreviews[0].repairStatus).toBe("repair_failed");
    expect(result.runPreviews[0].meetupSequence).toBe(2);
  });

  it("does not call Route Optimizer when no issues are detected", async () => {
    const handoffResult: CandidateHandoffPreviewResult = {
      runPreviews: [
        {
          runSlot: "A",
          driverName: "DT",
          role: "downtown",
          stopCount: 2,
          optimizedStopCount: 2,
          optimizedStops: [
            { sequence: 1, name: "Meet-up / Handoff Point", orderIds: [] },
            { sequence: 2, name: "Alice Customer", orderIds: ["DD-90000001"] },
          ],
          routeOptimizerWarnings: [],
          routeOptimizerValidationErrors: [],
          geocodeFailures: [],
          previewStatus: "previewed",
          syntheticMeetupIncluded: true,
          meetupSequence: 1,
        },
        {
          runSlot: "B",
          driverName: "Marco",
          role: "uptown",
          stopCount: 1,
          optimizedStopCount: 1,
          optimizedStops: [{ sequence: 1, name: "Carol Customer", orderIds: ["DD-90000003"] }],
          routeOptimizerWarnings: [],
          routeOptimizerValidationErrors: [],
          geocodeFailures: [],
          previewStatus: "previewed",
        },
      ],
      handoffPlan: {
        providerRunSlot: "A",
        receiverRunSlot: "B",
        selectedMeetup: {
          meetupAddress: "4000 Yonge St",
          meetupFixedStopPosition: 1,
          variant: "meetup_stop_1",
          syntheticHandoffStopUsed: true,
        },
      },
      assumptions: [],
    };

    const result = await repairCandidateRoutePreview({
      deliveryDate: "2026-06-09",
      candidate: buildCandidate(),
      kitchenAddress: "123 Kitchen Rd",
      profile,
      routingStopByOrderId,
      handoffResult,
      planSummary: {
        runCount: 2,
        totalStops: 3,
        selfUsed: false,
        selfStopCount: 0,
      },
    });

    expect(previewRouteOptimizerRunMock).not.toHaveBeenCalled();
    expect(result.candidateRepairSummary.repairAttempted).toBe(false);
    expect(result.runPreviews[0].repairStatus).toBe("not_needed");
  });
});
