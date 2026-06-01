import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { selectBestCandidatePlan } from "@/lib/agents/delivery/best-plan/select-best-candidate-plan";
import {
  buildCandidatePreview,
  buildLateCandidatePreview,
  buildSelfCandidatePreview,
  EARLY_FINISH,
  ON_TIME_FINISH,
} from "./test-fixtures";

describe("lib/agents/delivery/best-plan/select-best-candidate-plan", () => {
  const profile = getDefaultDeliveryPlanningProfile();

  function select(candidates: Parameters<typeof selectBestCandidatePlan>[0]["candidates"]) {
    return selectBestCandidatePlan({ profile, candidates });
  }

  it("sets recommendedCandidateId to the eligible top-ranked candidate", () => {
    const result = select([
      buildCandidatePreview({ candidateId: "baseline:2026-06-09", name: "Baseline" }),
      buildSelfCandidatePreview(),
    ]);

    expect(result.recommendedCandidateId).toBe("baseline:2026-06-09");
    expect(result.recommendedPlanSummary?.candidateId).toBe("baseline:2026-06-09");
    expect(result.rankedCandidates[0].recommendationStatus).toBe("recommended");
    expect(result.rankedCandidates[0].rank).toBe(1);
    expect(result.rankedCandidates.every((candidate) => candidate.score > 0)).toBe(true);
  });

  it("ranks Self ahead of late two-driver when only Self meets deadline", () => {
    const result = select([
      buildLateCandidatePreview("baseline:2026-06-09", "Late baseline"),
      buildSelfCandidatePreview({
        summary: {
          allRunsFinishBeforeDeadline: true,
          minutesBeforeOrAfterDeadline: 20,
          latestEstimatedFinishTime: ON_TIME_FINISH,
        },
      }),
    ]);

    expect(result.recommendedCandidateId).toBe("self_fallback_light:2026-06-09");
    expect(result.rankedCandidates[0].strategyType).toBe("self_fallback_light");
    expect(result.rankedCandidates[0].recommendationStatus).toBe("recommended");
  });

  it("prefers no-Self baseline when both candidates meet deadline", () => {
    const result = select([
      buildSelfCandidatePreview({
        summary: {
          allRunsFinishBeforeDeadline: true,
          minutesBeforeOrAfterDeadline: 30,
          latestEstimatedFinishTime: ON_TIME_FINISH,
        },
      }),
      buildCandidatePreview({
        candidateId: "baseline:2026-06-09",
        name: "Baseline",
        summary: {
          allRunsFinishBeforeDeadline: true,
          minutesBeforeOrAfterDeadline: 30,
          latestEstimatedFinishTime: ON_TIME_FINISH,
        },
      }),
    ]);

    expect(result.recommendedCandidateId).toBe("baseline:2026-06-09");
    expect(result.rankedCandidates[0].summary.selfUsed).toBe(false);
  });

  it("marks top candidate risky with warning when all candidates are late", () => {
    const result = select([
      buildCandidatePreview({
        candidateId: "late-a:2026-06-09",
        name: "Late A",
        summary: {
          allRunsFinishBeforeDeadline: false,
          minutesBeforeOrAfterDeadline: -20,
          latestEstimatedFinishTime: "2026-06-09T17:20:00.000Z",
        },
      }),
      buildCandidatePreview({
        candidateId: "late-b:2026-06-09",
        name: "Late B",
        summary: {
          allRunsFinishBeforeDeadline: false,
          minutesBeforeOrAfterDeadline: -45,
          latestEstimatedFinishTime: "2026-06-09T17:45:00.000Z",
        },
      }),
    ]);

    expect(result.recommendedCandidateId).toBe("late-a:2026-06-09");
    expect(result.rankedCandidates[0].recommendationStatus).toBe("risky");
    expect(result.rankedCandidates[1].recommendationStatus).toBe("not_recommended");
    expect(result.selectionWarnings.some((warning) => warning.includes("No candidate finishes before 1 PM"))).toBe(
      true
    );
  });

  it("clears recommendation when best all-late option is infeasible (30+ min late)", () => {
    const result = select([
      buildLateCandidatePreview("late-a:2026-06-09", "Late A"),
      buildCandidatePreview({
        candidateId: "late-b:2026-06-09",
        name: "Late B",
        summary: {
          allRunsFinishBeforeDeadline: false,
          minutesBeforeOrAfterDeadline: -45,
          latestEstimatedFinishTime: "2026-06-09T17:45:00.000Z",
        },
      }),
    ]);

    expect(result.recommendedCandidateId).toBeNull();
    expect(result.rankedCandidates[0].recommendationStatus).toBe("infeasible");
    expect(result.selectionWarnings.some((warning) => warning.includes("No candidate finishes before 1 PM"))).toBe(
      true
    );
  });

  it("tie-breaks near-equal scores by larger deadline buffer", () => {
    const result = select([
      buildCandidatePreview({
        candidateId: "tight:2026-06-09",
        name: "Tight buffer",
        summary: {
          allRunsFinishBeforeDeadline: true,
          minutesBeforeOrAfterDeadline: 5,
          latestEstimatedFinishTime: ON_TIME_FINISH,
        },
      }),
      buildCandidatePreview({
        candidateId: "wide:2026-06-09",
        name: "Wide buffer",
        summary: {
          allRunsFinishBeforeDeadline: true,
          minutesBeforeOrAfterDeadline: 60,
          latestEstimatedFinishTime: EARLY_FINISH,
        },
      }),
    ]);

    expect(result.recommendedCandidateId).toBe("wide:2026-06-09");
    expect(result.rankedCandidates[0].summary.minutesBeforeOrAfterDeadline).toBe(60);
  });

  it("returns null recommendation when all previews failed", () => {
    const result = select([
      buildCandidatePreview({
        candidateId: "failed-a:2026-06-09",
        status: "failed",
        summary: { latestEstimatedFinishTime: undefined, allRunsFinishBeforeDeadline: false },
        errors: ["Preview failed"],
      }),
      buildCandidatePreview({
        candidateId: "failed-b:2026-06-09",
        status: "failed",
        summary: { latestEstimatedFinishTime: undefined, allRunsFinishBeforeDeadline: false },
        errors: ["Preview failed"],
      }),
    ]);

    expect(result.recommendedCandidateId).toBeNull();
    expect(result.recommendedPlanSummary).toBeNull();
    expect(result.selectionWarnings.some((warning) => warning.includes("All candidate previews failed"))).toBe(
      true
    );
  });
});
