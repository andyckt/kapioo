const { previewRouteOptimizerRunMock, getKapiooKitchenStartLocationMock } = vi.hoisted(() => ({
  previewRouteOptimizerRunMock: vi.fn(),
  getKapiooKitchenStartLocationMock: vi.fn(),
}));

vi.mock("@/lib/integrations/route-optimizer/client", () => ({
  previewRouteOptimizerRun: previewRouteOptimizerRunMock,
}));

vi.mock("@/lib/agents/delivery/kitchen-start-location", () => ({
  getKapiooKitchenStartLocation: getKapiooKitchenStartLocationMock,
}));

import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { previewCandidateHandoff } from "@/lib/agents/delivery/candidate-plans/preview-candidate-handoff";
import type { DeliveryAgentCandidatePlan } from "@/lib/contracts/delivery-agent";
import { buildMixedAreaRoutingStops } from "./test-fixtures";

function buildCandidateWithNorthYorkHandoff(): DeliveryAgentCandidatePlan {
  return {
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
      note: "Meet-up later.",
    },
    constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
  };
}

function buildDtRouteWithMeetup() {
  return {
    status: "preview",
    total_duration_minutes: 60,
    total_distance_km: 10,
    optimized_route: {
      total_duration_minutes: 60,
      total_distance_km: 10,
      stops: [
        {
          customer_name: "Alice Customer",
          customer_address: "123 Main St",
          duration_from_previous: 15,
          service_time_minutes: 5,
          order_ids: ["DD-90000001"],
        },
        {
          customer_name: "Today's Meet up point",
          customer_address: "4000 Yonge St, North York M2N 5N8",
          duration_from_previous: 10,
          service_time_minutes: 5,
          is_synthetic: true,
          stop_type: "handoff",
          sequence: 2,
          order_ids: [],
        },
      ],
    },
    warnings: [],
    validation_errors: [],
    geocode_failures: [],
  };
}

describe("lib/agents/delivery/candidate-plans/preview-candidate-handoff", () => {
  const profile = getDefaultDeliveryPlanningProfile();
  const routingStopByOrderId = new Map(
    buildMixedAreaRoutingStops().map((stop) => [stop.orderId, stop])
  );

  beforeEach(() => {
    previewRouteOptimizerRunMock.mockReset();
    getKapiooKitchenStartLocationMock.mockReturnValue(
      "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada"
    );
  });

  it("adds synthetic meet-up stop to DT payload and uses meet-up ETA for Marco start", async () => {
    previewRouteOptimizerRunMock
      .mockResolvedValueOnce(buildDtRouteWithMeetup())
      .mockResolvedValueOnce({
        status: "preview",
        total_duration_minutes: 70,
        total_distance_km: 12,
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

    const result = await previewCandidateHandoff({
      deliveryDate: "2026-06-09",
      candidate: buildCandidateWithNorthYorkHandoff(),
      kitchenAddress: "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada",
      profile,
      routingStopByOrderId,
    });

    const dtPayload = previewRouteOptimizerRunMock.mock.calls[0][0];
    const marcoPayload = previewRouteOptimizerRunMock.mock.calls[1][0];
    const syntheticStop = dtPayload.customers.find(
      (customer: { is_synthetic?: boolean }) => customer.is_synthetic
    );

    expect(syntheticStop).toMatchObject({
      name: "Today's Meet up point",
      is_synthetic: true,
      stop_type: "handoff",
      service_time_minutes: 5,
      fixed_stop_position: 1,
    });
    expect(marcoPayload.run.start_location).toBe("4000 Yonge St, North York M2N 5N8");
    expect(marcoPayload.run.start_time).toMatch(/^\d{2}:\d{2}$/);
    expect(result.handoffPlan.selectedMeetup?.syntheticHandoffStopUsed).toBe(true);
    expect(result.handoffPlan.receiverStartLocation).toBe("4000 Yonge St, North York M2N 5N8");
    expect(result.runPreviews[0].syntheticMeetupIncluded).toBe(true);
    expect(result.runPreviews[1].previewStatus).toBe("previewed");
  });

  it("marks Marco failed when DT preview does not return meet-up ETA", async () => {
    previewRouteOptimizerRunMock.mockResolvedValueOnce({
      status: "preview",
      total_duration_minutes: 60,
      optimized_route: {
        stops: [
          {
            customer_name: "Alice Customer",
            duration_from_previous: 15,
            service_time_minutes: 5,
            order_ids: ["DD-90000001"],
          },
        ],
      },
      warnings: [],
      validation_errors: [],
      geocode_failures: [],
    });

    const result = await previewCandidateHandoff({
      deliveryDate: "2026-06-09",
      candidate: buildCandidateWithNorthYorkHandoff(),
      kitchenAddress: "123 Kitchen Rd, Toronto, ON M5V 2B2, Canada",
      profile,
      routingStopByOrderId,
    });

    expect(result.runPreviews[0].previewStatus).toBe("previewed");
    expect(result.runPreviews[1].previewStatus).toBe("failed");
    expect(result.runPreviews[1].previewError).toContain("meet-up ETA");
    expect(previewRouteOptimizerRunMock).toHaveBeenCalledTimes(1);
  });
});
