import { expandFullCandidateVariants } from "@/lib/agents/delivery/candidate-plans/expand-full-candidate-variants";
import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import type { DeliveryAgentCandidatePlan, DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";

function buildRun(
  runSlot: string,
  stops: Array<{ orderId: string; area: string; formattedAddress: string; planningTags?: string[] }>
): DeliveryAgentCandidateRun {
  return {
    runSlot,
    driverName: runSlot === "A" ? "DT" : "Marco",
    role: runSlot === "A" ? "downtown" : "uptown",
    startType: runSlot === "A" ? "kitchen" : "handoff",
    startLocationLabel: runSlot === "A" ? "Kitchen" : "Handoff",
    stopCount: stops.length,
    totalMealQuantity: stops.length * 2,
    areaBreakdown: Object.fromEntries(stops.map((stop) => [stop.area, 1])),
    plannedStartTimeSource: "profile",
    constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
    stops: stops.map((stop) => ({
      orderId: stop.orderId,
      customerName: stop.orderId,
      area: stop.area,
      formattedAddress: stop.formattedAddress,
      totalMealQuantity: 2,
      planningTags: stop.planningTags ?? [],
    })),
  };
}

function buildSplit(candidateId: string): DeliveryAgentCandidatePlan {
  return {
    candidateId,
    name: "Baseline two-run split",
    description: "Test split",
    strategyType: "baseline_two_run",
    profileId: "daily-v1-current-dt-marco-self",
    profileVersion: "daily-v1.0",
    deliveryDate: "2026-06-09",
    runs: [
      buildRun("A", [
        { orderId: "DD-1", area: "Downtown Toronto", formattedAddress: "123 Main St" },
        {
          orderId: "DD-2",
          area: "North York",
          formattedAddress: "4000 Yonge St",
          planningTags: ["flexible_north_york"],
        },
      ]),
      buildRun("B", [{ orderId: "DD-3", area: "Markham", formattedAddress: "789 Markham Rd" }]),
    ],
    summary: {
      totalStops: 3,
      totalMeals: 6,
      runCount: 2,
      selfUsed: false,
      selfStopCount: 0,
      byRun: { A: 2, B: 1 },
      byArea: {},
      northYorkSplit: { dt: 0, marco: 0 },
      warnings: [],
    },
    warnings: [],
    assumptions: [],
    handoffPlan: {
      providerRunSlot: "A",
      receiverRunSlot: "B",
      mode: "synthetic_handoff_stop_later",
      note: "Meet-up later.",
    },
    constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
  };
}

describe("lib/agents/delivery/candidate-plans/expand-full-candidate-variants", () => {
  const profile = getDefaultDeliveryPlanningProfile();

  it("expands a handoff split into meet-up position variants", () => {
    const result = expandFullCandidateVariants({
      splits: [buildSplit("baseline_two_run:2026-06-09")],
      profile,
    });

    expect(result.variants.length).toBeGreaterThan(0);
    expect(result.variants.every((variant) => variant.combination.baseSplitCandidateId === "baseline_two_run:2026-06-09")).toBe(
      true
    );
    expect(result.variants.some((variant) => variant.combination.meetupFixedStopPosition === 1)).toBe(true);
    expect(result.variants.every((variant) => variant.plan.candidateId.startsWith("baseline_two_run:2026-06-09:"))).toBe(
      true
    );
    expect(result.variants.every((variant) => variant.meetupSelection?.handoffSkipped === false)).toBe(true);
  });

  it("dedupes identical meet-up variants", () => {
    const result = expandFullCandidateVariants({
      splits: [buildSplit("baseline_two_run:2026-06-09")],
      profile,
    });

    const ids = result.variants.map((variant) => variant.plan.candidateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns no-handoff variant when handoff is disabled", () => {
    const disabledProfile = {
      ...profile,
      handoffRules: { ...profile.handoffRules, enabled: false },
    };

    const result = expandFullCandidateVariants({
      splits: [buildSplit("baseline_two_run:2026-06-09")],
      profile: disabledProfile,
    });

    expect(result.variants).toHaveLength(1);
    expect(result.variants[0]?.combination.meetupVariantId).toBe("no-handoff");
    expect(result.variants[0]?.meetupSelection).toBeUndefined();
  });

  it("caps variants at maxFullCandidateVariants", () => {
    const cappedProfile = {
      ...profile,
      candidateExpansionRules: {
        ...profile.candidateExpansionRules,
        maxFullCandidateVariants: 1,
      },
    };

    const result = expandFullCandidateVariants({
      splits: [buildSplit("baseline_two_run:2026-06-09"), buildSplit("other_split:2026-06-09")],
      profile: cappedProfile,
    });

    expect(result.variants).toHaveLength(1);
    expect(result.expansionWarnings.some((warning) => warning.includes("Variant limit reached"))).toBe(true);
  });
});
