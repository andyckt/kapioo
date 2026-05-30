import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { detectRouteShapeIssues } from "@/lib/agents/delivery/candidate-plans/detect-route-shape-issues";
import type {
  DeliveryAgentCandidateHandoffPreviewPlan,
  DeliveryAgentCandidatePlan,
  DeliveryAgentCandidateRunPreview,
} from "@/lib/contracts/delivery-agent";
import { buildMixedAreaRoutingStops } from "./test-fixtures";

const profile = getDefaultDeliveryPlanningProfile();

function buildHandoffPlan(
  overrides: Partial<DeliveryAgentCandidateHandoffPreviewPlan> = {}
): DeliveryAgentCandidateHandoffPreviewPlan {
  return {
    providerRunSlot: "A",
    receiverRunSlot: "B",
    selectedMeetup: {
      meetupAddress: "4000 Yonge St, North York M2N 5N8",
      meetupFixedStopPosition: 1,
      variant: "meetup_stop_1",
      syntheticHandoffStopUsed: true,
    },
    handoffSkipped: false,
    ...overrides,
  };
}

function buildCandidate(): DeliveryAgentCandidatePlan {
  return {
    candidateId: "baseline_two_run:2026-06-09",
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
        stopCount: 3,
        totalMealQuantity: 6,
        areaBreakdown: { "Downtown Toronto": 2, "North York": 1 },
        plannedStartTimeSource: "profile.timeRules.normalKitchenStartTime",
        constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
        stops: [
          {
            orderId: "DD-90000001",
            customerName: "Alice",
            area: "Downtown Toronto",
            formattedAddress: "123 Main St",
            totalMealQuantity: 2,
            planningTags: [],
          },
          {
            orderId: "DD-90000002",
            customerName: "Bob",
            area: "Midtown",
            formattedAddress: "456 Midtown Ave",
            totalMealQuantity: 2,
            planningTags: [],
          },
          {
            orderId: "DD-90000004",
            customerName: "Dan",
            area: "North York",
            formattedAddress: "4000 Yonge St",
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
        areaBreakdown: { Markham: 1, "Richmond Hill": 1 },
        plannedStartTimeSource: "profile.handoffRules.receiverStartTimeSource",
        constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
        stops: [
          {
            orderId: "DD-90000003",
            customerName: "Carol",
            area: "Markham",
            formattedAddress: "789 Markham Rd",
            totalMealQuantity: 2,
            planningTags: [],
          },
          {
            orderId: "DD-90000006",
            customerName: "Eve",
            area: "Richmond Hill",
            formattedAddress: "9000 Yonge St",
            totalMealQuantity: 2,
            planningTags: [],
          },
        ],
      },
    ],
    summary: {
      totalStops: 5,
      totalMeals: 10,
      runCount: 2,
      selfUsed: false,
      selfStopCount: 0,
      byRun: { A: 3, B: 2 },
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

function buildRunPreview(
  runSlot: string,
  optimizedStops: DeliveryAgentCandidateRunPreview["optimizedStops"],
  extra: Partial<DeliveryAgentCandidateRunPreview> = {}
): DeliveryAgentCandidateRunPreview {
  return {
    runSlot,
    driverName: runSlot === "A" ? "DT" : "Marco",
    role: runSlot === "A" ? "downtown" : "uptown",
    stopCount: 3,
    optimizedStopCount: optimizedStops.length,
    optimizedStops,
    routeOptimizerWarnings: [],
    routeOptimizerValidationErrors: [],
    geocodeFailures: [],
    previewStatus: "previewed",
    ...extra,
  };
}

describe("lib/agents/delivery/candidate-plans/detect-route-shape-issues", () => {
  const routingStopByOrderId = new Map(
    buildMixedAreaRoutingStops().map((stop) => [stop.orderId, stop])
  );

  it("detects meet-up too late", () => {
    const issues = detectRouteShapeIssues({
      candidate: buildCandidate(),
      runPreviews: [
        buildRunPreview("A", [], {
          syntheticMeetupIncluded: true,
          meetupSequence: 5,
        }),
      ],
      profile,
      handoffPlan: buildHandoffPlan(),
      routingStopByOrderId,
    });

    expect(issues.some((issue) => issue.issueType === "meetup_too_late")).toBe(true);
  });

  it("detects downtown before meet-up", () => {
    const issues = detectRouteShapeIssues({
      candidate: buildCandidate(),
      runPreviews: [
        buildRunPreview("A", [
          { sequence: 1, name: "Alice", orderIds: ["DD-90000001"] },
          { sequence: 2, name: "Bob", orderIds: ["DD-90000002"] },
          {
            sequence: 3,
            name: "Today's Meet up point",
            orderIds: [],
          },
        ], { syntheticMeetupIncluded: true, meetupSequence: 3 }),
      ],
      profile,
      handoffPlan: buildHandoffPlan(),
      routingStopByOrderId,
    });

    expect(issues.some((issue) => issue.issueType === "downtown_before_meetup")).toBe(true);
  });

  it("detects North York after downtown ping-pong", () => {
    const issues = detectRouteShapeIssues({
      candidate: buildCandidate(),
      runPreviews: [
        buildRunPreview("A", [
          { sequence: 1, name: "Dan", orderIds: ["DD-90000004"] },
          { sequence: 2, name: "Alice", orderIds: ["DD-90000001"] },
          { sequence: 3, name: "Bob", orderIds: ["DD-90000002"] },
          { sequence: 4, name: "Dan again", orderIds: ["DD-90000004"] },
        ]),
      ],
      profile,
      handoffPlan: buildHandoffPlan(),
      routingStopByOrderId,
    });

    expect(issues.some((issue) => issue.issueType === "north_york_after_downtown")).toBe(true);
  });

  it("detects DT wrong endpoint", () => {
    const issues = detectRouteShapeIssues({
      candidate: buildCandidate(),
      runPreviews: [
        buildRunPreview("A", [
          { sequence: 1, name: "Alice", orderIds: ["DD-90000001"] },
          { sequence: 2, name: "Bob", orderIds: ["DD-90000002"] },
          { sequence: 3, name: "Dan", orderIds: ["DD-90000004"] },
        ]),
      ],
      profile,
      handoffPlan: buildHandoffPlan({ handoffSkipped: true, selectedMeetup: null }),
      routingStopByOrderId,
    });

    expect(issues.some((issue) => issue.issueType === "dt_wrong_endpoint")).toBe(true);
  });

  it("detects Marco wrong endpoint", () => {
    const issues = detectRouteShapeIssues({
      candidate: buildCandidate(),
      runPreviews: [
        buildRunPreview("B", [
          { sequence: 1, name: "Carol", orderIds: ["DD-90000003"] },
          { sequence: 2, name: "Alice", orderIds: ["DD-90000001"] },
        ]),
      ],
      profile,
      handoffPlan: buildHandoffPlan(),
      routingStopByOrderId,
    });

    expect(issues.some((issue) => issue.issueType === "marco_wrong_endpoint")).toBe(true);
  });

  it("returns no issues for a clean route shape", () => {
    const issues = detectRouteShapeIssues({
      candidate: buildCandidate(),
      runPreviews: [
        buildRunPreview("A", [
          {
            sequence: 1,
            name: "Today's Meet up point",
            orderIds: [],
          },
          { sequence: 2, name: "Alice", orderIds: ["DD-90000001"] },
          { sequence: 3, name: "Bob", orderIds: ["DD-90000002"] },
        ], { syntheticMeetupIncluded: true, meetupSequence: 1 }),
        buildRunPreview("B", [
          { sequence: 1, name: "Carol", orderIds: ["DD-90000003"] },
          { sequence: 2, name: "Eve", orderIds: ["DD-90000006"] },
        ]),
      ],
      profile,
      handoffPlan: buildHandoffPlan(),
      routingStopByOrderId,
    });

    expect(issues).toHaveLength(0);
  });
});
