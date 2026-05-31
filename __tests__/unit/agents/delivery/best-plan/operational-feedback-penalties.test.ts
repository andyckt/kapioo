import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { applyFeedbackPenalties } from "@/lib/agents/delivery/best-plan/operational";
import { scoreCandidatePlan } from "@/lib/agents/delivery/best-plan/score-candidate-plan";
import { buildCandidatePreview } from "./test-fixtures";

describe("operational feedback penalties", () => {
  const profile = getDefaultDeliveryPlanningProfile();
  const prefs = profile.handoffRules.meetupSelectionPreferences;

  it("meetup_too_far_for_receiver reduces score", () => {
    const candidate = buildCandidatePreview({
      handoffPlan: {
        providerRunSlot: "A",
        receiverRunSlot: "B",
        selectedMeetup: {
          meetupAddress: "Far south meet-up",
          meetupFixedStopPosition: 1,
          variant: "meetup_stop_1",
          sourceOrderId: "far-south",
          syntheticHandoffStopUsed: true,
        },
      },
    });

    const withPenaltyInput = {
      candidate,
      assignedRuns: [
        {
          runSlot: "B",
          role: "uptown",
          stops: [{ orderId: "far-south", area: "North York", lat: 43.64, lng: -79.38, totalMealQuantity: 1 }],
        },
      ],
      preferredDeadlineBufferMinutes: 10,
      scoringWeights: profile.scoringWeights,
      operationalScoringRules: profile.operationalScoringRules,
      meetupSelectionPreferences: prefs,
      feedbackPenalties: ["receiver_meetup_too_far"],
    };

    const without = scoreCandidatePlan({
      candidate,
      preferredDeadlineBufferMinutes: 10,
      scoringWeights: profile.scoringWeights,
      operationalScoringRules: profile.operationalScoringRules,
      meetupSelectionPreferences: prefs,
    });

    const withPenalty = scoreCandidatePlan(withPenaltyInput);

    expect(withPenalty.score).toBeLessThan(without.score);
  });

  it("wrong_order_split rewards matching preferred assignments", () => {
    const candidate = buildCandidatePreview();
    const overrides = new Map([["order-1", "A"]]);

    const adjustment = applyFeedbackPenalties({
      scoringInput: {
        candidate,
        assignedRuns: [
          {
            runSlot: "A",
            role: "downtown",
            stops: [{ orderId: "order-1", area: "North York", totalMealQuantity: 1 }],
          },
        ],
        preferredDeadlineBufferMinutes: 10,
        scoringWeights: profile.scoringWeights,
      },
      penalties: ["wrong_order_split"],
      preferredOrderRunOverrides: overrides,
      meetupPrefs: prefs,
    });

    expect(adjustment.scoreDelta).toBeGreaterThan(0);
  });

  it("provider_route_shape_wrong adds extra penalty when shape issues exist", () => {
    const candidate = buildCandidatePreview({
      candidateRepairSummary: {
        repairAttempted: true,
        repairSucceeded: false,
        issuesDetected: [
          {
            issueType: "north_york_after_downtown",
            severity: "warning",
            message: "Ping-pong",
            runSlot: "A",
            driverName: "DT",
            evidence: {},
          },
        ],
        repairActionsApplied: [],
        warnings: [],
      },
    });

    const adjustment = applyFeedbackPenalties({
      scoringInput: {
        candidate,
        preferredDeadlineBufferMinutes: 10,
        scoringWeights: profile.scoringWeights,
      },
      penalties: ["provider_route_shape_wrong"],
      meetupPrefs: prefs,
    });

    expect(adjustment.scoreDelta).toBeLessThan(0);
    expect(adjustment.notes.some((n) => n.includes("route shape"))).toBe(true);
  });
});
