import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { scoreMeetupCandidate } from "@/lib/agents/delivery/candidate-plans/score-meetup-candidate";
import {
  scoreMeetupOperationalBalance,
  scoreOnTheWayBeforeMeetup,
} from "@/lib/agents/delivery/best-plan/operational/score-operational-dimensions";
import { scoreCandidatePlan } from "@/lib/agents/delivery/best-plan/score-candidate-plan";
import { buildCandidatePreview } from "./test-fixtures";
import type { DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";

describe("operational meet-up balance scoring", () => {
  const profile = getDefaultDeliveryPlanningProfile();
  const prefs = profile.handoffRules.meetupSelectionPreferences;

  const marcoRuns: DeliveryAgentCandidateRun[] = [
    {
      runSlot: "A",
      driverName: "DT",
      role: "downtown",
      startType: "kitchen",
      startLocationLabel: "Kitchen",
      stops: [],
      stopCount: 0,
      areaBreakdown: {},
      totalMealQuantity: 0,
      plannedStartTimeSource: "normal",
      constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
    },
    {
      runSlot: "B",
      driverName: "Marco",
      role: "uptown",
      startType: "handoff",
      startLocationLabel: "Handoff",
      stops: [
        {
          orderId: "o-markham",
          customerName: "Marco Stop",
          area: "Markham",
          formattedAddress: "Markham, ON",
          lat: 43.88,
          lng: -79.32,
          totalMealQuantity: 2,
          planningTags: [],
        },
      ],
      stopCount: 1,
      areaBreakdown: { Markham: 1 },
      totalMealQuantity: 2,
      plannedStartTimeSource: "handoff",
      constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
    },
  ];

  it("penalizes meet-up near kitchen when receiver serves Markham/Richmond Hill", () => {
    const nearKitchen = scoreMeetupCandidate({
      candidate: {
        orderId: "meet-near",
        area: "North York",
        formattedAddress: "Near kitchen",
        lat: 43.645,
        lng: -79.39,
        runSlot: "A",
        sourceTier: "run_a_north_york",
      },
      profile,
      runs: marcoRuns,
    });

    const centralNy = scoreMeetupCandidate({
      candidate: {
        orderId: "meet-central",
        area: "North York",
        formattedAddress: "5180 Yonge St",
        lat: 43.7615,
        lng: -79.4111,
        runSlot: "A",
        sourceTier: "run_a_north_york",
      },
      profile,
      runs: marcoRuns,
    });

    const kitchenItemNear = nearKitchen.scoreBreakdown.find((i) => i.key === "kitchenProximityPenalty");
    const kitchenItemCentral = centralNy.scoreBreakdown.find((i) => i.key === "kitchenProximityPenalty");

    expect(kitchenItemNear?.points ?? 100).toBeLessThan(kitchenItemCentral?.points ?? 0);
    expect(centralNy.score).toBeGreaterThan(nearKitchen.score);
  });

  it("rewards central North York meet-up at plan level for uptown receiver burden", () => {
    const candidate = buildCandidatePreview({
      handoffPlan: {
        providerRunSlot: "A",
        receiverRunSlot: "B",
        selectedMeetup: {
          meetupAddress: "5180 Yonge St, North York",
          meetupFixedStopPosition: 2,
          variant: "meetup_stop_2_with_one_before",
          sourceOrderId: "meet-central",
          syntheticHandoffStopUsed: true,
        },
      },
    });

    const result = scoreMeetupOperationalBalance(
      {
        candidate,
        assignedRuns: [
          {
            runSlot: "B",
            role: "uptown",
            stops: [{ orderId: "o-markham", area: "Markham", lat: 43.88, lng: -79.32, totalMealQuantity: 2 }],
          },
          {
            runSlot: "A",
            role: "downtown",
            stops: [
              {
                orderId: "meet-central",
                area: "North York",
                lat: 43.7615,
                lng: -79.4111,
                totalMealQuantity: 0,
              },
            ],
          },
        ],
        preferredDeadlineBufferMinutes: 10,
        scoringWeights: profile.scoringWeights,
        meetupSelectionPreferences: prefs,
      },
      prefs
    );

    expect(result.points).toBeGreaterThanOrEqual(70);
  });

  it("rewards on-the-way North York stops before meet-up in optimized sequence", () => {
    const candidate = buildCandidatePreview({
      handoffPlan: {
        providerRunSlot: "A",
        receiverRunSlot: "B",
        selectedMeetup: {
          meetupAddress: "5180 Yonge St",
          meetupFixedStopPosition: 2,
          variant: "meetup_stop_2_with_one_before",
          sourceOrderId: "meet-central",
          syntheticHandoffStopUsed: true,
        },
      },
      runs: [
        {
          runSlot: "A",
          driverName: "DT",
          role: "downtown",
          stopCount: 3,
          optimizedStopCount: 3,
          optimizedStops: [
            { sequence: 1, orderIds: ["on-way-1"], address: "NY stop 1" },
            { sequence: 2, orderIds: ["meet-central"], address: "Meet-up" },
            { sequence: 3, orderIds: ["dt-1"], address: "DT stop" },
          ],
          routeOptimizerWarnings: [],
          routeOptimizerValidationErrors: [],
          geocodeFailures: [],
          previewStatus: "previewed",
        },
        {
          runSlot: "B",
          driverName: "Marco",
          role: "uptown",
          stopCount: 1,
          optimizedStopCount: 1,
          optimizedStops: [],
          routeOptimizerWarnings: [],
          routeOptimizerValidationErrors: [],
          geocodeFailures: [],
          previewStatus: "previewed",
        },
      ],
    });

    const onTheWay = scoreOnTheWayBeforeMeetup(
      {
        candidate,
        assignedRuns: [
          {
            runSlot: "A",
            role: "downtown",
            stops: [
              {
                orderId: "on-way-1",
                area: "North York",
                lat: 43.75,
                lng: -79.42,
                totalMealQuantity: 1,
              },
              {
                orderId: "meet-central",
                area: "North York",
                lat: 43.7615,
                lng: -79.4111,
                totalMealQuantity: 0,
              },
            ],
          },
        ],
        preferredDeadlineBufferMinutes: 10,
        scoringWeights: profile.scoringWeights,
        meetupSelectionPreferences: prefs,
      },
      prefs
    );

    expect(onTheWay.points).toBeGreaterThanOrEqual(85);

    const fullScore = scoreCandidatePlan({
      candidate,
      assignedRuns: [
        {
          runSlot: "A",
          role: "downtown",
          stops: [
            {
              orderId: "on-way-1",
              area: "North York",
              lat: 43.75,
              lng: -79.42,
              totalMealQuantity: 1,
            },
          ],
        },
      ],
      preferredDeadlineBufferMinutes: 10,
      scoringWeights: profile.scoringWeights,
      operationalScoringRules: profile.operationalScoringRules,
      meetupSelectionPreferences: prefs,
    });

    const onTheWayDim = fullScore.scoreBreakdown.find((i) => i.key === "onTheWayBeforeMeetup");
    expect(onTheWayDim?.points).toBeGreaterThanOrEqual(85);
  });
});
