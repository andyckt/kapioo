import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import {
  computeMinutesSavedBySelf,
  evaluateComparativeSelfPolicy,
  findBestSafeTwoDriverCandidate,
  isSafeTwoDriverCandidate,
} from "@/lib/agents/delivery/best-plan/operational";
import { selectBestCandidatePlan } from "@/lib/agents/delivery/best-plan/select-best-candidate-plan";
import {
  buildCandidatePreview,
  buildSelfCandidatePreview,
  EARLY_FINISH,
  LATE_FINISH,
  ON_TIME_FINISH,
} from "./test-fixtures";

describe("operational self policy", () => {
  const profile = getDefaultDeliveryPlanningProfile();
  const policy = profile.operationalScoringRules.selfFallbackPolicy;

  it("identifies safe 2-driver candidate with buffer and balance", () => {
    const candidate = buildCandidatePreview({
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 15,
        latestEstimatedFinishTime: ON_TIME_FINISH,
      },
    });

    expect(isSafeTwoDriverCandidate(candidate, policy)).toBe(true);
  });

  it("Self is penalized when safe 2-driver plan finishes before 1 PM", () => {
    const twoDriver = buildCandidatePreview({
      candidateId: "baseline:2026-06-09",
      summary: {
        allRunsFinishBeforeDeadline: true,
        minutesBeforeOrAfterDeadline: 12,
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

    const result = selectBestCandidatePlan({
      profile,
      candidates: [selfPlan, twoDriver],
    });

    expect(result.recommendedCandidateId).toBe("baseline:2026-06-09");
    expect(result.rankedCandidates[0].summary.selfUsed).toBe(false);
  });

  it("Self can win when all 2-driver plans are late", () => {
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
    expect(result.rankedCandidates[0].selfRecommendationReason).toMatch(/required|meaningful/);
  });

  it("Self does not win for only small finish-time improvement", () => {
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

    const bestSafe = findBestSafeTwoDriverCandidate({ candidates: [twoDriver, selfPlan], policy });
    expect(bestSafe).not.toBeNull();

    const minutesSaved = computeMinutesSavedBySelf({
      selfCandidate: selfPlan,
      bestSafeTwoDriver: bestSafe!,
    });
    expect(minutesSaved).toBeLessThan(policy.minMinutesSavedToJustifySelf);

    const policyResult = evaluateComparativeSelfPolicy({
      candidate: selfPlan,
      bestSafeTwoDriver: bestSafe,
      policy,
    });
    expect(policyResult.selfRecommendationReason).toBe("not_necessary");
    expect(policyResult.scoreDelta).toBeLessThan(0);
  });

  it("2-driver plan is preferred when it has acceptable finish buffer", () => {
    const result = selectBestCandidatePlan({
      profile,
      candidates: [
        buildSelfCandidatePreview({
          summary: {
            allRunsFinishBeforeDeadline: true,
            minutesBeforeOrAfterDeadline: 50,
            latestEstimatedFinishTime: EARLY_FINISH,
          },
        }),
        buildCandidatePreview({
          summary: {
            allRunsFinishBeforeDeadline: true,
            minutesBeforeOrAfterDeadline: 18,
            latestEstimatedFinishTime: ON_TIME_FINISH,
          },
        }),
      ],
    });

    expect(result.rankedCandidates[0].summary.selfUsed).toBe(false);
    expect(result.rankedCandidates[0].decisionSummary.toLowerCase()).toContain("2-driver");
  });
});
