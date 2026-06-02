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
      stopBeforeMeetupOrderId: "DD-1",
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
  const meetupPhone = "416-555-0200";

  beforeEach(() => {
    process.env.MEETUP_CONTACT_PHONE = meetupPhone;
  });

  afterEach(() => {
    delete process.env.MEETUP_CONTACT_PHONE;
  });

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

    expect(payload.planning_session_id).toBe("final:run-123");
    expect(payload.runs).toHaveLength(2);
    expect(payload.runs[0]?.planning_session_id).toBe("final:run-123");
    expect(payload.runs[0]?.external_id).toBe(
      "kapioo-final-run:2026-06-09:run-123:candidate:selected:A"
    );
    expect(payload.runs[0]?.idempotency_key).toBe(
      "daily-delivery-agent:2026-06-09:daily-profile:final:candidate:selected:A"
    );
    expect(payload.runs[0]?.customers.some((customer) => customer.is_synthetic)).toBe(true);
    const syntheticStop = payload.runs[0]?.customers.find((customer) => customer.is_synthetic);
    expect(syntheticStop).toMatchObject({
      name: "Meet-up / Handoff Point",
      phone: meetupPhone,
      notes: "Operational handoff point only. Not a customer delivery.",
      order_ids: ["kapioo-handoff-meetup:2026-06-09:A"],
    });
    expect(payload.runs[1]?.run.start_location).toBe("4000 Yonge St");
    expect(payload.runs[1]?.run.start_time).toBe("11:05");
  });

  it("rejects empty planning session id", () => {
    expect(() =>
      buildFinalRouteCreatePayloads({
        candidate: approvedCandidate,
        context: {
          deliveryDate: "2026-06-09",
          deliveryAgentRunId: "run-123",
          profileId: "daily-profile",
          selectedCandidateId: "candidate:selected",
          planningSessionId: "   ",
          kitchenAddress: "Kitchen",
          profile: getDefaultDeliveryPlanningProfile(),
          routingStopByOrderId: new Map([
            ["DD-1", routingStop("DD-1", "1 Provider St")],
            ["DD-2", routingStop("DD-2", "2 Receiver St")],
          ]),
        },
      })
    ).toThrow(/planning_session_id is missing/);
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

  it("applies DT end point when dt_wrong_endpoint was detected but not repaired", () => {
    const dtWrongEndpointCandidate = {
      ...approvedCandidate,
      runs: approvedCandidate.runs.map((run) =>
        run.runSlot === "A"
          ? {
              ...run,
              driverName: "DT",
              routeShapeIssues: [
                {
                  issueType: "dt_wrong_endpoint",
                  runSlot: "A",
                  driverName: "DT",
                  severity: "warning",
                  message: "DT route ends in a northern area",
                  evidence: {},
                },
              ],
            }
          : run
      ),
      candidateRepairSummary: {
        ...approvedCandidate.candidateRepairSummary,
        issuesDetected: [
          {
            issueType: "dt_wrong_endpoint",
            runSlot: "A",
            driverName: "DT",
            severity: "warning",
            message: "DT route ends in a northern area",
            evidence: {},
          },
        ],
      },
    } as unknown as DeliveryAgentCandidatePlanPreview;

    const payload = buildFinalRouteCreatePayloads({
      candidate: dtWrongEndpointCandidate,
      context: {
        deliveryDate: "2026-06-09",
        deliveryAgentRunId: "run-123",
        profileId: "daily-profile",
        selectedCandidateId: "candidate:selected",
        planningSessionId: "final:run-123",
        kitchenAddress: "Kitchen",
        profile: getDefaultDeliveryPlanningProfile(),
        routingStopByOrderId: new Map([
          [
            "DD-1",
            {
              ...routingStop("DD-1", "250 Yonge St, Toronto"),
              area: "Downtown Toronto",
              lat: 43.654,
              lng: -79.38,
            } as RoutingStop,
          ],
          ["DD-2", routingStop("DD-2", "2 Receiver St")],
        ]),
      },
    });

    const dtCustomers = payload.runs[0]?.customers ?? [];
    expect(dtCustomers.some((customer) => customer.order_ids?.includes("DD-1") && customer.is_end_point)).toBe(
      true
    );
  });

  it("blocks DT final create when endpoint cannot be resolved", () => {
    const dtWrongEndpointCandidate = {
      ...approvedCandidate,
      runs: approvedCandidate.runs.map((run) =>
        run.runSlot === "A"
          ? {
              ...run,
              driverName: "DT",
              optimizedStops: [{ sequence: 1, orderIds: ["DD-NORTH"], address: "North York" }],
              routeShapeIssues: [
                {
                  issueType: "dt_wrong_endpoint",
                  runSlot: "A",
                  driverName: "DT",
                  severity: "warning",
                  message: "DT route ends in a northern area",
                  evidence: {},
                },
              ],
            }
          : run
      ),
      candidateRepairSummary: {
        ...approvedCandidate.candidateRepairSummary,
        issuesDetected: [
          {
            issueType: "dt_wrong_endpoint",
            runSlot: "A",
            driverName: "DT",
            severity: "warning",
            message: "DT route ends in a northern area",
            evidence: {},
          },
        ],
      },
      handoffPlan: {
        providerRunSlot: "A",
        receiverRunSlot: "B",
        handoffSkipped: true,
        selectedMeetup: null,
      },
    } as unknown as DeliveryAgentCandidatePlanPreview;

    expect(() =>
      buildFinalRouteCreatePayloads({
        candidate: dtWrongEndpointCandidate,
        context: {
          deliveryDate: "2026-06-09",
          deliveryAgentRunId: "run-123",
          profileId: "daily-profile",
          selectedCandidateId: "candidate:selected",
          planningSessionId: "final:run-123",
          kitchenAddress: "Kitchen",
          profile: getDefaultDeliveryPlanningProfile(),
          routingStopByOrderId: new Map([
            [
              "DD-NORTH",
              {
                ...routingStop("DD-NORTH", "5000 Yonge St, North York"),
                area: "North York",
                lat: 43.76,
                lng: -79.41,
              } as RoutingStop,
            ],
            ["DD-2", routingStop("DD-2", "2 Receiver St")],
          ]),
        },
      })
    ).toThrow(/DT route cannot be created because driver endpoint is unresolved/);
  });

  it("keeps meetup anchor customer off DT route while using meetup address on synthetic stop", () => {
    const mimoOrderId = "DD-MIMO";
    const payload = buildFinalRouteCreatePayloads({
      candidate: {
        ...approvedCandidate,
        handoffPlan: {
          ...approvedCandidate.handoffPlan,
          selectedMeetup: {
            meetupAddress: "4000 Yonge St, North York",
            meetupFixedStopPosition: 1,
            variant: "meetup_stop_1",
            syntheticHandoffStopUsed: true,
            sourceOrderId: mimoOrderId,
            stopBeforeMeetupOrderId: "DD-1",
          },
        },
      } as DeliveryAgentCandidatePlanPreview,
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
          [
            mimoOrderId,
            {
              ...routingStop(mimoOrderId, "4000 Yonge St, North York"),
              customerName: "mimo",
              customerPhone: "416-555-7777",
              routeOptimizer: {
                name: "mimo",
                phone: "416-555-7777",
                address: "4000 Yonge St, North York",
                order_ids: [mimoOrderId],
              },
            } as RoutingStop,
          ],
        ]),
      },
    });

    const dtCustomers = payload.runs[0]?.customers ?? [];
    expect(dtCustomers.some((customer) => customer.order_ids?.includes(mimoOrderId))).toBe(false);
    expect(
      dtCustomers.find((customer) => customer.is_synthetic)?.address
    ).toBe("4000 Yonge St, North York");
    expect(
      dtCustomers.find((customer) => customer.is_synthetic)?.phone
    ).toBe(meetupPhone);

    const marcoCustomers = payload.runs[1]?.customers ?? [];
    expect(marcoCustomers.some((customer) => customer.order_ids?.includes("DD-2"))).toBe(true);
  });

  it("ignores synthetic meetup order ids stored on preview optimized stops", () => {
    const payload = buildFinalRouteCreatePayloads({
      candidate: {
        ...approvedCandidate,
        runs: approvedCandidate.runs.map((run) =>
          run.runSlot === "A"
            ? {
                ...run,
                optimizedStops: [
                  {
                    sequence: 1,
                    orderIds: ["kapioo-handoff-meetup:2026-06-09:A"],
                    address: "4000 Yonge St",
                  },
                  { sequence: 2, orderIds: ["DD-1"], address: "1 Provider St" },
                ],
              }
            : run
        ),
      } as DeliveryAgentCandidatePlanPreview,
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

    const dtCustomers = payload.runs[0]?.customers ?? [];
    expect(
      dtCustomers.filter((customer) => !customer.is_synthetic).map((customer) => customer.order_ids?.[0])
    ).toEqual(["DD-1"]);
    expect(dtCustomers.filter((customer) => customer.is_synthetic)).toHaveLength(1);
  });

  it("includes lat/lng on customer payloads when routing stops are enriched", () => {
    const enrichedStop = {
      ...routingStop("DD-1", "1 Provider St"),
      lat: 43.7615,
      lng: -79.4111,
      routeOptimizer: {
        ...routingStop("DD-1", "1 Provider St").routeOptimizer,
        lat: 43.7615,
        lng: -79.4111,
        geocode_status: "OK",
      },
    };

    const payload = buildFinalRouteCreatePayloads({
      candidate: {
        ...approvedCandidate,
        handoffPlan: {
          ...approvedCandidate.handoffPlan,
          handoffSkipped: true,
          selectedMeetup: null,
        },
        runs: [approvedCandidate.runs[0]!],
      } as DeliveryAgentCandidatePlanPreview,
      context: {
        deliveryDate: "2026-06-09",
        deliveryAgentRunId: "run-123",
        profileId: "daily-profile",
        selectedCandidateId: "candidate:selected",
        planningSessionId: "final:run-123",
        kitchenAddress: "Kitchen",
        profile: getDefaultDeliveryPlanningProfile(),
        routingStopByOrderId: new Map([["DD-1", enrichedStop]]),
      },
    });

    const customer = payload.runs[0]?.customers.find((entry) => !entry.is_synthetic);
    expect(customer).toMatchObject({
      lat: 43.7615,
      lng: -79.4111,
      geocode_status: "OK",
    });
  });

  it("includes meet-up coordinates on synthetic stop when provided", () => {
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
        meetupCoordinates: {
          lat: 43.78,
          lng: -79.43,
        },
      },
    });

    const syntheticStop = payload.runs[0]?.customers.find((customer) => customer.is_synthetic);
    expect(syntheticStop).toMatchObject({
      name: "Meet-up / Handoff Point",
      lat: 43.78,
      lng: -79.43,
      geocode_status: "OK",
    });
  });

  it("appends generation suffix when finalRouteGeneration is greater than 1", () => {
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
        finalRouteGeneration: 2,
      },
    });

    expect(payload.runs[0]?.external_id).toBe(
      "kapioo-final-run:2026-06-09:run-123:candidate:selected:A:v2"
    );
    expect(payload.runs[0]?.idempotency_key).toBe(
      "daily-delivery-agent:2026-06-09:daily-profile:final:candidate:selected:A:v2"
    );
  });
});
