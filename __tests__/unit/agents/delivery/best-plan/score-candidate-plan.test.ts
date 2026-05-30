import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { scoreCandidatePlan } from "@/lib/agents/delivery/best-plan/score-candidate-plan";
import {
  buildCandidatePreview,
  buildSelfCandidatePreview,
  EARLY_FINISH,
  LATE_FINISH,
  ON_TIME_FINISH,
} from "./test-fixtures";

describe("lib/agents/delivery/best-plan/score-candidate-plan", () => {
  const profile = getDefaultDeliveryPlanningProfile();

  function score(
    candidate: ReturnType<typeof buildCandidatePreview>,
    assignedRuns?: Parameters<typeof scoreCandidatePlan>[0]["assignedRuns"]
  ) {
    return scoreCandidatePlan({
      candidate,
      assignedRuns,
      preferredDeadlineBufferMinutes: profile.timeRules.preferredDeadlineBufferMinutes,
      scoringWeights: profile.scoringWeights,
    });
  }

  it("scores on-time candidates higher than late candidates", () => {
    const onTime = score(buildCandidatePreview());
    const late = score(
      buildCandidatePreview({
        summary: {
          allRunsFinishBeforeDeadline: false,
          minutesBeforeOrAfterDeadline: -30,
          latestEstimatedFinishTime: LATE_FINISH,
        },
      })
    );

    expect(onTime.score).toBeGreaterThan(late.score);
    expect(onTime.eligibleForRecommended).toBe(true);
    expect(late.eligibleForRecommended).toBe(false);
  });

  it("penalizes missing finish time and marks not recommendable", () => {
    const result = score(
      buildCandidatePreview({
        summary: {
          latestEstimatedFinishTime: undefined,
          formattedLatestEstimatedFinishTime: undefined,
          allRunsFinishBeforeDeadline: false,
        },
      })
    );

    expect(result.score).toBeLessThanOrEqual(15);
    expect(result.eligibleForRecommended).toBe(false);
    expect(result.missingFinishTime).toBe(true);
    expect(result.cons.some((item) => item.includes("Preview status") || item.includes("deadline"))).toBe(
      true
    );
  });

  it("penalizes unresolved route shape issues", () => {
    const clean = score(buildCandidatePreview());
    const withIssue = score(
      buildCandidatePreview({
        candidateRepairSummary: {
          repairAttempted: true,
          repairSucceeded: false,
          issuesDetected: [
            {
              issueType: "north_york_after_downtown",
              severity: "blocking",
              message: "DT ping-pong unresolved",
              runSlot: "A",
              driverName: "DT",
              evidence: {},
            },
          ],
          repairActionsApplied: [],
          warnings: [],
        },
      })
    );

    expect(withIssue.score).toBeLessThan(clean.score);
    expect(withIssue.hasBlockingRouteShapeIssues).toBe(true);
    expect(withIssue.eligibleForRecommended).toBe(false);
  });

  it("penalizes repair failure on a run", () => {
    const result = score(
      buildCandidatePreview({
        runs: [
          {
            runSlot: "A",
            driverName: "DT",
            role: "downtown",
            stopCount: 2,
            optimizedStopCount: 2,
            optimizedStops: [],
            routeOptimizerWarnings: [],
            routeOptimizerValidationErrors: [],
            geocodeFailures: [],
            previewStatus: "previewed",
            repairStatus: "repair_failed",
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
      })
    );

    expect(result.hasRepairFailure).toBe(true);
    expect(result.cons.some((item) => item.includes("repair"))).toBe(true);
  });

  it("prefers no-Self over Self via avoidSelfUsage and minimizeSelfStops", () => {
    const noSelf = score(buildCandidatePreview());
    const withSelf = score(buildSelfCandidatePreview());

    expect(noSelf.score).toBeGreaterThan(withSelf.score);
    expect(withSelf.cons.some((item) => item.includes("Self"))).toBe(true);
  });

  it("returns labeled score breakdown reasons for each weighted dimension", () => {
    const result = score(buildCandidatePreview());

    expect(result.scoreBreakdown.length).toBeGreaterThan(0);
    for (const item of result.scoreBreakdown) {
      expect(item.label).toBeTruthy();
      expect(item.reason).toBeTruthy();
      expect(item.weight).toBeGreaterThan(0);
      expect(item.points).toBeGreaterThanOrEqual(0);
      expect(item.points).toBeLessThanOrEqual(100);
    }

    const finishDimension = result.scoreBreakdown.find((item) => item.key === "finishBeforeDeadline");
    expect(finishDimension?.points).toBe(100);
    expect(finishDimension?.reason).toContain("before");
  });

  it("rewards larger deadline buffer when finish is early", () => {
    const tightBuffer = score(
      buildCandidatePreview({
        summary: {
          latestEstimatedFinishTime: ON_TIME_FINISH,
          allRunsFinishBeforeDeadline: true,
          minutesBeforeOrAfterDeadline: 5,
        },
      })
    );
    const wideBuffer = score(
      buildCandidatePreview({
        summary: {
          latestEstimatedFinishTime: EARLY_FINISH,
          allRunsFinishBeforeDeadline: true,
          minutesBeforeOrAfterDeadline: 60,
        },
      })
    );

    const tightBufferPoints = tightBuffer.scoreBreakdown.find((item) => item.key === "deadlineBuffer")
      ?.points;
    const wideBufferPoints = wideBuffer.scoreBreakdown.find((item) => item.key === "deadlineBuffer")
      ?.points;

    expect(wideBufferPoints).toBeGreaterThan(tightBufferPoints ?? 0);
  });
});
