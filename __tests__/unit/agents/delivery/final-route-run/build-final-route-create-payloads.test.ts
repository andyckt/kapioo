import { buildFinalRouteCreatePayloads } from "@/lib/agents/delivery/final-route-run/build-final-route-create-payloads";
import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type { DeliveryAgentCandidatePlanPreview } from "@/lib/contracts/delivery-agent";

function routingStop(orderId: string, address: string): RoutingStop {
  return {
    orderId,
    mongoId: orderId,
    customerName: orderId,
    customerPhone: "416-555-0100",
    area: "North York",
    formattedAddress: address,
    totalMealQuantity: 1,
    warnings: [],
    routeOptimizer: {
      name: orderId,
      phone: "416-555-0100",
      address,
      notes: "",
      order_ids: [orderId],
    },
  } as unknown as RoutingStop;
}

const approvedCandidate = {
  candidateId: "candidate:selected",
  name: "Selected candidate",
  strategyType: "baseline_two_run",
  status: "previewed",
  runs: [
    {
      runSlot: "A",
      driverName: "Provider",
      role: "provider",
      stopCount: 1,
      optimizedStopCount: 2,
      optimizedStops: [
        { sequence: 1, orderIds: ["DD-1"], address: "1 Provider St" },
        { sequence: 2, orderIds: [], address: "4000 Yonge St" },
      ],
      routeOptimizerWarnings: [],
      routeOptimizerValidationErrors: [],
      geocodeFailures: [],
      previewStatus: "previewed",
      syntheticMeetupIncluded: true,
      repairActionsApplied: [],
    },
    {
      runSlot: "B",
      driverName: "Receiver",
      role: "receiver",
      stopCount: 1,
      optimizedStopCount: 1,
      optimizedStops: [{ sequence: 1, orderIds: ["DD-2"], address: "2 Receiver St" }],
      routeOptimizerWarnings: [],
      routeOptimizerValidationErrors: [],
      geocodeFailures: [],
      previewStatus: "previewed",
      repairActionsApplied: [],
    },
  ],
  summary: {
    runCount: 2,
    totalStops: 2,
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
    selectedMeetup: {
      meetupAddress: "4000 Yonge St",
      meetupFixedStopPosition: 2,
      variant: "meetup_stop_1",
      syntheticHandoffStopUsed: true,
    },
    receiverStartLocation: "4000 Yonge St",
    receiverStartTime: "11:05",
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
  decisionSummary: "Good route",
} as unknown as DeliveryAgentCandidatePlanPreview;

describe("buildFinalRouteCreatePayloads", () => {
  it("builds create payloads with final ids, idempotency keys, and locked receiver start", () => {
    const payload = buildFinalRouteCreatePayloads({
      candidate: approvedCandidate,
      context: {
        deliveryDate: "2026-06-09",
        deliveryAgentRunId: "run-123",
        profileId: "daily-profile",
        selectedCandidateId: "candidate:selected",
        planningSessionId: "final:run-123",
        kitchenAddress: "Kitchen",
        profile: getDefaultDeliveryPlanningProfile(),
        routingStopByOrderId: new Map([
          ["DD-1", routingStop("DD-1", "1 Provider St")],
          ["DD-2", routingStop("DD-2", "2 Receiver St")],
        ]),
      },
    });

    expect(payload.runs).toHaveLength(2);
    expect(payload.runs[0]?.external_id).toBe(
      "kapioo-final-run:2026-06-09:run-123:candidate:selected:A"
    );
    expect(payload.runs[0]?.idempotency_key).toBe(
      "daily-delivery-agent:2026-06-09:daily-profile:final:candidate:selected:A"
    );
    expect(payload.runs[0]?.customers.some((customer) => customer.is_synthetic)).toBe(true);
    expect(payload.runs[1]?.run.start_location).toBe("4000 Yonge St");
    expect(payload.runs[1]?.run.start_time).toBe("11:05");
  });

  it("rejects mismatched selected candidate identity", () => {
    expect(() =>
      buildFinalRouteCreatePayloads({
        candidate: approvedCandidate,
        context: {
          deliveryDate: "2026-06-09",
          deliveryAgentRunId: "run-123",
          profileId: "daily-profile",
          selectedCandidateId: "wrong-candidate",
          planningSessionId: "final:run-123",
          kitchenAddress: "Kitchen",
          profile: getDefaultDeliveryPlanningProfile(),
          routingStopByOrderId: new Map(),
        },
      })
    ).toThrow(/selectedCandidateId/);
  });
});
