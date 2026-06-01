import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import {
  assignFeasibilityTier,
  buildOperationalExplanation,
} from "@/lib/agents/delivery/best-plan/operational";
import { selectBestCandidatePlan } from "@/lib/agents/delivery/best-plan/select-best-candidate-plan";
import {
  buildCandidatePreview,
  buildSelfCandidatePreview,
  EARLY_FINISH,
  LATE_FINISH,
  ON_TIME_FINISH,
} from "./test-fixtures";

/** 1:37 PM Toronto on 2026-06-09 (38 min late). */
const VERY_LATE_FINISH = "2026-06-09T17:37:00.000Z";

describe("deadline feasibility priority", () => {
  const profile = getDefaultDeliveryPlanningProfile();
  const policy = profile.operationalScoringRules.selfFallbackPolicy;
  const feasibilityRules = profile.operationalScoringRules.deadlineFeasibilityRules;

  it("on-time safe 2-driver beats on-time Self when Self saves less than 15 min", () => {
    const twoDriver = buildCandidatePreview({
      candidateId: "baseline:2026-06-09",
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 20,
        latestEstimatedFinishTime: ON_TIME_FINISH,
      },
    });
    const selfPlan = buildSelfCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 25,
        latestEstimatedFinishTime: ON_TIME_FINISH,
      },
    });

    const result = selectBestCandidatePlan({
      profile,
      candidates: [selfPlan, twoDriver],
    });

    expect(result.rankedCandidates[0].candidateId).toBe("baseline:2026-06-09");
    expect(result.rankedCandidates[0].feasibilityTier).toBe(1);
    expect(result.recommendedCandidateId).toBe("baseline:2026-06-09");
  });

  it("on-time Self beats late 2-driver (38 min late)", () => {
    const lateTwoDriver = buildCandidatePreview({
      candidateId: "late:2026-06-09",
      name: "Late 2-driver plan",
      summary: {
        allRunsFinishBeforeDeadline: false,
        minutesBeforeOrAfterDeadline: -38,
        latestEstimatedFinishTime: VERY_LATE_FINISH,
        formattedLatestEstimatedFinishTime: "Jun 9, 2026, 1:37 PM",
      },
      runs: [
        buildCandidatePreview().runs[0],
        {
          ...buildCandidatePreview().runs[1],
          estimatedFinishTime: VERY_LATE_FINISH,
        },
      ],
    });
    const selfPlan = buildSelfCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 10,
        latestEstimatedFinishTime: ON_TIME_FINISH,
      },
    });

    const result = selectBestCandidatePlan({
      profile,
      candidates: [lateTwoDriver, selfPlan],
    });

    expect(result.rankedCandidates[0].candidateId).toBe("self_fallback_light:2026-06-09");
    expect(result.rankedCandidates[0].feasibilityTier).toBe(2);
    expect(result.rankedCandidates[1].feasibilityTier).toBe(4);
  });

  it("on-time Self is eligible when all 2-driver plans are late", () => {
    const lateTwoDriver = buildCandidatePreview({
      candidateId: "late:2026-06-09",
      summary: {
        allRunsFinishBeforeDeadline: false,
        minutesBeforeOrAfterDeadline: -20,
        latestEstimatedFinishTime: LATE_FINISH,
      },
    });
    const selfPlan = buildSelfCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 10,
        latestEstimatedFinishTime: ON_TIME_FINISH,
      },
    });

    const result = selectBestCandidatePlan({
      profile,
      candidates: [lateTwoDriver, selfPlan],
    });

    expect(result.recommendedCandidateId).toBe("self_fallback_light:2026-06-09");
    expect(result.rankedCandidates[0].recommendationStatus).toBe("recommended");
  });

  it("late 2-driver cannot rank above on-time Self", () => {
    const lateTwoDriver = buildCandidatePreview({
      candidateId: "late:2026-06-09",
      summary: {
        allRunsFinishBeforeDeadline: false,
        minutesBeforeOrAfterDeadline: -15,
        latestEstimatedFinishTime: LATE_FINISH,
      },
    });
    const selfPlan = buildSelfCandidatePreview({
      candidateId: "self:2026-06-09",
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 5,
        latestEstimatedFinishTime: ON_TIME_FINISH,
      },
    });

    const result = selectBestCandidatePlan({
      profile,
      candidates: [lateTwoDriver, selfPlan],
    });

    expect(result.rankedCandidates[0].summary.selfUsed).toBe(true);
    expect(result.rankedCandidates[1].summary.selfUsed).toBe(false);
  });

  it("late plan is top-ranked only when no on-time candidate exists", () => {
    const lateTwoDriver = buildCandidatePreview({
      candidateId: "late-a:2026-06-09",
      summary: {
        allRunsFinishBeforeDeadline: false,
        minutesBeforeOrAfterDeadline: -10,
        latestEstimatedFinishTime: LATE_FINISH,
      },
    });
    const laterTwoDriver = buildCandidatePreview({
      candidateId: "late-b:2026-06-09",
      name: "Later 2-driver plan",
      summary: {
        allRunsFinishBeforeDeadline: false,
        minutesBeforeOrAfterDeadline: -25,
        latestEstimatedFinishTime: VERY_LATE_FINISH,
      },
    });

    const result = selectBestCandidatePlan({
      profile,
      candidates: [laterTwoDriver, lateTwoDriver],
    });

    expect(result.rankedCandidates[0].candidateId).toBe("late-a:2026-06-09");
    expect(result.rankedCandidates[0].recommendationStatus).toBe("risky");
  });

  it("38-min-late plan is infeasible and not recommended", () => {
    const veryLate = buildCandidatePreview({
      candidateId: "very-late:2026-06-09",
      summary: {
        allRunsFinishBeforeDeadline: false,
        minutesBeforeOrAfterDeadline: -38,
        latestEstimatedFinishTime: VERY_LATE_FINISH,
      },
    });

    const tier = assignFeasibilityTier({
      candidate: veryLate,
      rules: feasibilityRules,
      policy,
    });
    expect(tier.feasibilityTier).toBe(4);
    expect(tier.feasibilityLabel).toBe("infeasible_late");

    const result = selectBestCandidatePlan({
      profile,
      candidates: [veryLate],
    });

    expect(result.rankedCandidates[0].recommendationStatus).toBe("infeasible");
    expect(result.recommendedCandidateId).toBeNull();
  });

  it("all-late pool explanation mentions extra driver or manual help", () => {
    const latePlan = buildCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: false,
        minutesBeforeOrAfterDeadline: -10,
        latestEstimatedFinishTime: LATE_FINISH,
      },
    });

    const result = selectBestCandidatePlan({
      profile,
      candidates: [latePlan],
    });

    expect(result.rankedCandidates[0].decisionSummary).toMatch(/extra driver|manual help/i);
    expect(result.selectionWarnings.some((w) => w.includes("No candidate finishes before 1 PM"))).toBe(
      true
    );
  });

  it("Self explanation when no 2-driver plan meets deadline", () => {
    const lateTwoDriver = buildCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: false,
        minutesBeforeOrAfterDeadline: -20,
        latestEstimatedFinishTime: LATE_FINISH,
      },
    });
    const selfPlan = buildSelfCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 12,
        latestEstimatedFinishTime: ON_TIME_FINISH,
      },
    });

    const result = selectBestCandidatePlan({
      profile,
      candidates: [lateTwoDriver, selfPlan],
    });

    const top = result.rankedCandidates[0];
    expect(top.summary.selfUsed).toBe(true);
    expect(top.decisionSummary).toMatch(/Self recommended|no 2-driver plan/i);
  });

  it("2-driver preferred explanation only when plan is on-time", () => {
    const onTimeTwoDriver = buildCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 15,
        latestEstimatedFinishTime: ON_TIME_FINISH,
      },
    });

    const onTimeExplanation = buildOperationalExplanation({
      candidate: onTimeTwoDriver,
      score: 85,
      eligibleForRecommended: true,
      selfRecommendationReason: "not_applicable",
      operationalNotes: [],
      anyOnTimeExists: true,
      feasibilityLabel: "on_time_safe_2driver",
      isSafeTwoDriver: true,
    });
    expect(onTimeExplanation.decisionSummary).toMatch(/2-driver plan recommended/i);
    expect(onTimeExplanation.decisionSummary).not.toMatch(/least-bad/i);

    const lateTwoDriver = buildCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: false,
        minutesBeforeOrAfterDeadline: -38,
        latestEstimatedFinishTime: VERY_LATE_FINISH,
      },
    });

    const lateExplanation = buildOperationalExplanation({
      candidate: lateTwoDriver,
      score: 66,
      eligibleForRecommended: false,
      selfRecommendationReason: "not_applicable",
      operationalNotes: [],
      anyOnTimeExists: false,
      feasibilityLabel: "infeasible_late",
      isSafeTwoDriver: false,
    });
    expect(lateExplanation.decisionSummary).not.toMatch(/2-driver plan preferred/i);
    expect(lateExplanation.decisionSummary).toMatch(/extra driver|manual help|No feasible plan/i);
  });

  it("assigns tier 1 to on-time safe 2-driver and tier 2 to on-time Self", () => {
    const twoDriver = buildCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 15,
        latestEstimatedFinishTime: ON_TIME_FINISH,
      },
    });
    const selfPlan = buildSelfCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 45,
        latestEstimatedFinishTime: EARLY_FINISH,
      },
    });

    expect(
      assignFeasibilityTier({ candidate: twoDriver, rules: feasibilityRules, policy }).feasibilityTier
    ).toBe(1);
    expect(
      assignFeasibilityTier({ candidate: selfPlan, rules: feasibilityRules, policy }).feasibilityTier
    ).toBe(2);
  });
});
