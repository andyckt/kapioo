import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { planRouteShapeRepairs } from "@/lib/agents/delivery/candidate-plans/plan-route-shape-repairs";
import type {
  DeliveryAgentCandidateHandoffPreviewPlan,
  DeliveryAgentCandidatePlan,
  DeliveryAgentRouteShapeIssuePreview,
} from "@/lib/contracts/delivery-agent";
import { buildMixedAreaRoutingStops } from "./test-fixtures";

const profile = getDefaultDeliveryPlanningProfile();

function buildHandoffPlan(): DeliveryAgentCandidateHandoffPreviewPlan {
  return {
    providerRunSlot: "A",
    receiverRunSlot: "B",
    selectedMeetup: {
      meetupAddress: "4000 Yonge St",
      meetupFixedStopPosition: 1,
      variant: "meetup_stop_1",
      syntheticHandoffStopUsed: true,
    },
  };
}

function buildCandidate(): DeliveryAgentCandidatePlan {
  return {
    candidateId: "baseline:2026-06-09",
    name: "Baseline",
    description: "Baseline",
    strategyType: "baseline_two_run",
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
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
        areaBreakdown: {},
        plannedStartTimeSource: "profile.timeRules.normalKitchenStartTime",
        constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
        stops: [
          {
            orderId: "DD-90000001",
            customerName: "Alice",
            area: "Downtown Toronto",
            formattedAddress: "123 Main St",
            lat: 43.64,
            lng: -79.38,
            totalMealQuantity: 2,
            planningTags: [],
          },
          {
            orderId: "DD-90000004",
            customerName: "Dan",
            area: "North York",
            formattedAddress: "4000 Yonge St",
            lat: 43.76,
            lng: -79.41,
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
        startLocationLabel: "Handoff",
        stopCount: 2,
        totalMealQuantity: 4,
        areaBreakdown: {},
        plannedStartTimeSource: "profile.handoffRules.receiverStartTimeSource",
        constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
        stops: [
          {
            orderId: "DD-90000003",
            customerName: "Carol",
            area: "Markham",
            formattedAddress: "789 Markham Rd",
            lat: 43.85,
            lng: -79.33,
            totalMealQuantity: 2,
            planningTags: [],
          },
          {
            orderId: "DD-90000001",
            customerName: "Alice misplaced",
            area: "Downtown Toronto",
            formattedAddress: "123 Main St",
            lat: 43.64,
            lng: -79.38,
            totalMealQuantity: 2,
            planningTags: [],
          },
        ],
      },
    ],
    summary: {
      totalStops: 4,
      totalMeals: 8,
      runCount: 2,
      selfUsed: false,
      selfStopCount: 0,
      byRun: { A: 2, B: 2 },
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

function buildIssue(
  issueType: DeliveryAgentRouteShapeIssuePreview["issueType"],
  runSlot: string
): DeliveryAgentRouteShapeIssuePreview {
  return {
    issueType,
    runSlot,
    driverName: runSlot === "A" ? "DT" : "Marco",
    severity: "warning",
    message: issueType,
    evidence: {},
  };
}

describe("lib/agents/delivery/candidate-plans/plan-route-shape-repairs", () => {
  const routingStopByOrderId = new Map(
    buildMixedAreaRoutingStops().map((stop) => [stop.orderId, stop])
  );

  it("applies fixed stop to synthetic meet-up for downtown_before_meetup", () => {
    const plan = planRouteShapeRepairs({
      issues: [buildIssue("downtown_before_meetup", "A")],
      candidate: buildCandidate(),
      profile,
      handoffPlan: buildHandoffPlan(),
      routingStopByOrderId,
    });

    expect(plan.syntheticMeetupFixedPosition).toBe(1);
    expect(plan.actions.some((action) => action.actionType === "apply_fixed_stop_position")).toBe(
      true
    );
    expect(plan.requiresDtRepreview).toBe(true);
  });

  it("applies DT end point for dt_wrong_endpoint", () => {
    const plan = planRouteShapeRepairs({
      issues: [buildIssue("dt_wrong_endpoint", "A")],
      candidate: buildCandidate(),
      profile,
      handoffPlan: buildHandoffPlan(),
      routingStopByOrderId,
    });

    const endPointAction = plan.actions.find((action) => action.actionType === "apply_end_point");
    expect(endPointAction?.runSlot).toBe("A");
    expect(endPointAction?.targetOrderIds).toContain("DD-90000001");
    expect(plan.dtCustomerConstraints.get("DD-90000001")?.isEndPoint).toBe(true);
  });

  it("applies Marco end point for marco_wrong_endpoint", () => {
    const plan = planRouteShapeRepairs({
      issues: [buildIssue("marco_wrong_endpoint", "B")],
      candidate: buildCandidate(),
      profile,
      handoffPlan: buildHandoffPlan(),
      routingStopByOrderId,
    });

    const endPointAction = plan.actions.find(
      (action) => action.actionType === "apply_end_point" && action.runSlot === "B"
    );
    expect(endPointAction?.targetOrderIds).toContain("DD-90000003");
    expect(plan.requiresMarcoRepreview).toBe(true);
  });

  it("does not apply repair when no issue exists", () => {
    const plan = planRouteShapeRepairs({
      issues: [],
      candidate: buildCandidate(),
      profile,
      handoffPlan: buildHandoffPlan(),
      routingStopByOrderId,
    });

    expect(plan.actions).toHaveLength(0);
    expect(plan.requiresDtRepreview).toBe(false);
    expect(plan.requiresMarcoRepreview).toBe(false);
  });

  it("avoids duplicate fixed_stop_position when meet-up and NY stop collide", () => {
    const candidate = buildCandidate();
    const plan = planRouteShapeRepairs({
      issues: [
        buildIssue("north_york_after_downtown", "A"),
        buildIssue("meetup_too_late", "A"),
      ],
      candidate,
      profile,
      handoffPlan: buildHandoffPlan(),
      routingStopByOrderId,
    });

    const fixedPositions = [
      plan.syntheticMeetupFixedPosition,
      ...Array.from(plan.dtCustomerConstraints.values())
        .map((constraint) => constraint.fixedStopPosition)
        .filter((value): value is number => value !== undefined),
    ];

    expect(new Set(fixedPositions).size).toBe(fixedPositions.length);
  });
});
