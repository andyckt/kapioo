import type { DeliveryAgentCandidateRunPreview } from "@/lib/contracts/delivery-agent";
import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { compareCandidateDeadline } from "@/lib/agents/delivery/candidate-plans/compare-candidate-deadline";

function buildRunPreview(
  overrides: Partial<DeliveryAgentCandidateRunPreview> = {}
): DeliveryAgentCandidateRunPreview {
  return {
    runSlot: "A",
    driverName: "DT",
    role: "downtown",
    stopCount: 2,
    totalDurationMinutes: 90,
    totalDistanceKm: 12,
    estimatedFinishTime: "2026-06-09T16:30:00.000Z",
    formattedEstimatedFinishTime: "Jun 9, 2026, 12:30 PM",
    optimizedStopCount: 2,
    optimizedStops: [],
    routeOptimizerWarnings: [],
    routeOptimizerValidationErrors: [],
    geocodeFailures: [],
    previewStatus: "previewed",
    ...overrides,
  };
}

describe("lib/agents/delivery/candidate-plans/compare-candidate-deadline", () => {
  const profile = getDefaultDeliveryPlanningProfile();

  it("marks candidate on time when latest finish is before the hard deadline", () => {
    const result = compareCandidateDeadline({
      deliveryDate: "2026-06-09",
      profile,
      runPreviews: [
        buildRunPreview({
          runSlot: "A",
          estimatedFinishTime: "2026-06-09T16:00:00.000Z",
        }),
        buildRunPreview({
          runSlot: "B",
          estimatedFinishTime: "2026-06-09T16:30:00.000Z",
        }),
      ],
      planSummary: {
        runCount: 2,
        totalStops: 4,
        selfUsed: false,
        selfStopCount: 0,
      },
    });

    expect(result.allRunsFinishBeforeDeadline).toBe(true);
    expect(result.minutesBeforeOrAfterDeadline).toBeGreaterThan(0);
    expect(result.runFinishTimes.A).toBeDefined();
    expect(result.runFinishTimes.B).toBeDefined();
    expect(result.totalDurationMinutes).toBe(180);
    expect(result.totalDistanceKm).toBe(24);
    expect(result.comparisonNotes).toContain("before");
  });

  it("marks candidate late and records blocking issue when finish is after deadline", () => {
    const result = compareCandidateDeadline({
      deliveryDate: "2026-06-09",
      profile,
      runPreviews: [
        buildRunPreview({
          runSlot: "A",
          estimatedFinishTime: "2026-06-09T17:30:00.000Z",
        }),
      ],
      planSummary: {
        runCount: 1,
        totalStops: 2,
        selfUsed: false,
        selfStopCount: 0,
      },
    });

    expect(result.allRunsFinishBeforeDeadline).toBe(false);
    expect(result.minutesBeforeOrAfterDeadline).toBeLessThan(0);
    expect(result.blockingIssues.some((issue) => issue.includes("after the hard deadline"))).toBe(
      true
    );
    expect(result.comparisonNotes).toContain("after");
  });

  it("includes failed run preview errors in blocking issues", () => {
    const result = compareCandidateDeadline({
      deliveryDate: "2026-06-09",
      profile,
      runPreviews: [
        buildRunPreview({
          runSlot: "A",
          previewStatus: "failed",
          previewError: "Invalid address",
          estimatedFinishTime: undefined,
        }),
      ],
    });

    expect(result.allRunsFinishBeforeDeadline).toBe(false);
    expect(result.blockingIssues).toContain("Run A preview failed: Invalid address");
  });
});
