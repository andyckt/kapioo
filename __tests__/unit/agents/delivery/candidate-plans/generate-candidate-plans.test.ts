const {
  previewDeliveryOrdersForAgentMock,
  getEnrichedDeliveryOrdersForRoutingMock,
} = vi.hoisted(() => ({
  previewDeliveryOrdersForAgentMock: vi.fn(),
  getEnrichedDeliveryOrdersForRoutingMock: vi.fn(),
}));

vi.mock("@/lib/agents/delivery/preview-delivery-orders", () => ({
  previewDeliveryOrdersForAgent: previewDeliveryOrdersForAgentMock,
}));

vi.mock("@/lib/agents/delivery/geocode/get-enriched-delivery-orders-for-routing", () => ({
  getEnrichedDeliveryOrdersForRouting: getEnrichedDeliveryOrdersForRoutingMock,
}));

import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import {
  generateCandidatePlans,
  generateCandidatePlansForAgent,
} from "@/lib/agents/delivery/candidate-plans/generate-candidate-plans";
import { toPlanningStops } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { buildMixedAreaRoutingStops, buildRoutingStop } from "./test-fixtures";

function buildOrderPreview(
  overrides: Partial<Awaited<ReturnType<typeof previewDeliveryOrdersForAgentMock>>> = {}
) {
  return {
    deliveryDate: "2026-06-09",
    queriedAt: "2026-06-08T12:00:00.000Z",
    confirmed: {
      totalStops: 6,
      validStops: 6,
      invalidStops: 0,
      warningStops: 0,
      totalMealQuantity: 12,
      byArea: {
        "Downtown Toronto": 1,
        Midtown: 1,
        "North York": 2,
        Markham: 1,
        "Richmond Hill": 1,
      },
      byStatus: { confirmed: 6 },
      stops: [],
      invalid: [],
      warnings: [],
    },
    pending: {
      count: 0,
      orders: [],
    },
    canContinueToPlanning: true,
    blockingReasons: [],
    notes: "Order preview only.",
    ...overrides,
  };
}

function buildRoutingResult(stops = buildMixedAreaRoutingStops()) {
  return {
    deliveryDate: "2026-06-09",
    profileId: "daily-default",
    queriedAt: "2026-06-08T12:00:00.000Z",
    timezone: "America/Toronto",
    summary: {
      totalOrders: stops.length,
      validStops: stops.length,
      invalidStops: 0,
      warningStops: 0,
      byArea: {},
      byStatus: { confirmed: stops.length },
      totalMealQuantity: stops.length * 2,
    },
    stops,
    invalid: [],
    warnings: [],
    sourceOrderResultSummary: {
      orderCount: stops.length,
      excludedCount: 0,
      itemCount: stops.length,
      totalMealQuantity: stops.length * 2,
      byStatus: { confirmed: stops.length },
      byArea: {},
    },
  };
}

function buildEnrichedRoutingResult(stops = buildMixedAreaRoutingStops()) {
  const routing = buildRoutingResult(stops);
  return {
    routing,
    coordinateCoverage: {
      totalValidStops: stops.length,
      stopsWithCoordinates: stops.length,
      stopsFallback: 0,
      stopsGeocodeFailed: 0,
      coveragePercent: stops.length === 0 ? 0 : 100,
      recommendationConfidence: "high" as const,
    },
    geocodeEnrichment: {
      artifactVersion: "1" as const,
      enrichedAt: "2026-06-08T12:00:00.000Z",
      provider: "route_optimizer" as const,
      stopCoordinates: [],
      coordinateCoverage: {
        totalValidStops: stops.length,
        stopsWithCoordinates: stops.length,
        stopsFallback: 0,
        stopsGeocodeFailed: 0,
        coveragePercent: stops.length === 0 ? 0 : 100,
        recommendationConfidence: "high" as const,
      },
    },
  };
}

describe("lib/agents/delivery/candidate-plans/generate-candidate-plans", () => {
  const profile = getDefaultDeliveryPlanningProfile();

  beforeEach(() => {
    previewDeliveryOrdersForAgentMock.mockReset();
    getEnrichedDeliveryOrdersForRoutingMock.mockReset();
  });

  it("blocks when planning gates fail and does not fetch routing stops", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(
      buildOrderPreview({
        canContinueToPlanning: false,
        blockingReasons: ["1 pending order(s) must be confirmed before planning."],
        pending: { count: 1, orders: [] },
      })
    );

    await expect(generateCandidatePlansForAgent("2026-06-09")).rejects.toBeInstanceOf(
      DeliveryAgentPlanningBlockedError
    );

    expect(getEnrichedDeliveryOrdersForRoutingMock).not.toHaveBeenCalled();
  });

  it("blocks when there are zero valid stops", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(buildOrderPreview());
    getEnrichedDeliveryOrdersForRoutingMock.mockResolvedValue(buildEnrichedRoutingResult([]));

    await expect(generateCandidatePlansForAgent("2026-06-09")).rejects.toBeInstanceOf(
      DeliveryAgentPlanningBlockedError
    );
  });

  it("generates baseline candidate with two runs and no Self usage", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(buildOrderPreview());
    getEnrichedDeliveryOrdersForRoutingMock.mockResolvedValue(buildEnrichedRoutingResult());

    const result = await generateCandidatePlansForAgent("2026-06-09");
    const baseline = result.candidates.find(
      (candidate) => candidate.strategyType === "baseline_two_run"
    );

    expect(baseline).toBeDefined();
    expect(baseline?.runs).toHaveLength(2);
    expect(baseline?.summary.selfUsed).toBe(false);
    expect(baseline?.summary.byRun.A).toBeGreaterThan(0);

    const dtRun = baseline?.runs.find((run) => run.runSlot === "A");
    expect(dtRun?.areaBreakdown["Downtown Toronto"]).toBe(1);
    expect(baseline?.handoffPlan.mode).toBe("synthetic_handoff_stop_later");
    expect(baseline?.summary.byRun).toBeDefined();
  });

  it("reflects dt-heavy and marco-heavy North York ratios", () => {
    const stops = toPlanningStops(
      Array.from({ length: 10 }, (_, index) =>
        buildRoutingStop({
          orderId: `DD-900000${index + 1}`,
          area: "North York",
          lat: 43.7 + index * 0.01,
          lng: -79.38 + index * 0.01,
        })
      )
    );

    const dtHeavy = generateCandidatePlans(stops, profile, "2026-06-09").find(
      (candidate) => candidate.strategyType === "dt_heavy_north_york"
    );
    const marcoHeavy = generateCandidatePlans(stops, profile, "2026-06-09").find(
      (candidate) => candidate.strategyType === "marco_heavy_north_york"
    );

    expect(dtHeavy?.summary.northYorkSplit.dt).toBeGreaterThan(
      dtHeavy?.summary.northYorkSplit.marco ?? 0
    );
    expect(marcoHeavy?.summary.northYorkSplit.marco).toBeGreaterThan(
      marcoHeavy?.summary.northYorkSplit.dt ?? 0
    );
  });

  it("uses Self fallback for 1-3 flexible stops when enough total stops exist", () => {
    const stops = toPlanningStops(buildMixedAreaRoutingStops());
    const selfCandidate = generateCandidatePlans(stops, profile, "2026-06-09").find(
      (candidate) => candidate.strategyType === "self_fallback_light"
    );

    expect(selfCandidate).toBeDefined();
    expect(selfCandidate?.summary.selfUsed).toBe(true);
    expect(selfCandidate?.summary.selfStopCount).toBeGreaterThanOrEqual(1);
    expect(selfCandidate?.summary.selfStopCount).toBeLessThanOrEqual(
      profile.selfFallbackRules.maxPreferredStops
    );
    expect(selfCandidate?.runs.some((run) => run.runSlot === "C")).toBe(true);
  });

  it("omits Self fallback candidate when there are fewer than four stops", () => {
    const stops = toPlanningStops(buildMixedAreaRoutingStops().slice(0, 3));
    const candidates = generateCandidatePlans(stops, profile, "2026-06-09");

    expect(candidates.some((candidate) => candidate.strategyType === "self_fallback_light")).toBe(
      false
    );
  });

  it("keeps core area assignment stable when only meal quantities change", () => {
    const baseStops = buildMixedAreaRoutingStops();
    const highMealStops = baseStops.map((stop, index) => ({
      ...stop,
      totalMealQuantity: index === 0 ? 20 : stop.totalMealQuantity,
    }));

    const baseline = generateCandidatePlans(
      toPlanningStops(baseStops),
      profile,
      "2026-06-09"
    ).find((candidate) => candidate.strategyType === "baseline_two_run");
    const highMealBaseline = generateCandidatePlans(
      toPlanningStops(highMealStops),
      profile,
      "2026-06-09"
    ).find((candidate) => candidate.strategyType === "baseline_two_run");

    expect(baseline?.summary.byRun).toEqual(highMealBaseline?.summary.byRun);
  });

  it("includes fallback assumption when lat/lng are missing", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(buildOrderPreview());
    getEnrichedDeliveryOrdersForRoutingMock.mockResolvedValue(buildEnrichedRoutingResult());

    const result = await generateCandidatePlansForAgent("2026-06-09");

    expect(
      result.candidates.every((candidate) =>
        candidate.assumptions.some((assumption) => assumption.includes("Lat/lng not available"))
      )
    ).toBe(true);
  });

  it("places North York stops in both runs across strategies", () => {
    const stops = toPlanningStops(buildMixedAreaRoutingStops());
    const candidates = generateCandidatePlans(stops, profile, "2026-06-09");

    for (const candidate of candidates.filter(
      (entry) => entry.strategyType !== "self_fallback_light"
    )) {
      expect(candidate.summary.northYorkSplit.dt).toBeGreaterThan(0);
      expect(candidate.summary.northYorkSplit.marco).toBeGreaterThan(0);
    }
  });
});
