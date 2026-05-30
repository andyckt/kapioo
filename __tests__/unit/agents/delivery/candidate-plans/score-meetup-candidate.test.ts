import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { scoreMeetupCandidate } from "@/lib/agents/delivery/candidate-plans/score-meetup-candidate";
import type { DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";

const CENTRAL_NY = { lat: 43.7615, lng: -79.4111 };
const FAR_WEST_NY = { lat: 43.74, lng: -79.55 };
const MARKHAM = { lat: 43.85, lng: -79.33 };

function buildRun(
  runSlot: string,
  stops: Array<{
    orderId: string;
    area: string;
    formattedAddress: string;
    planningTags?: string[];
    lat?: number;
    lng?: number;
  }>
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
      lat: stop.lat,
      lng: stop.lng,
    })),
  };
}

describe("lib/agents/delivery/candidate-plans/score-meetup-candidate", () => {
  const profile = getDefaultDeliveryPlanningProfile();
  const runs = [
    buildRun("A", [
      {
        orderId: "DD-90000001",
        area: "Downtown Toronto",
        formattedAddress: "123 Main St",
      },
      {
        orderId: "DD-90000004",
        area: "North York",
        formattedAddress: "4000 Yonge St, North York M2N 5N8",
        planningTags: ["flexible_north_york"],
        ...CENTRAL_NY,
      },
    ]),
    buildRun("B", [
      {
        orderId: "DD-90000003",
        area: "Markham",
        formattedAddress: "789 Markham Rd",
        ...MARKHAM,
      },
    ]),
  ];

  it("scores central North York higher than far-west North York", () => {
    const central = scoreMeetupCandidate({
      profile,
      runs,
      candidate: {
        orderId: "central",
        area: "North York",
        formattedAddress: "4000 Yonge St, North York M2N 5N8",
        runSlot: "A",
        sourceTier: "run_a_north_york",
        ...CENTRAL_NY,
      },
    });
    const farWest = scoreMeetupCandidate({
      profile,
      runs,
      candidate: {
        orderId: "west",
        area: "North York",
        formattedAddress: "100 Sheppard Ave W, North York M3H 2A1",
        runSlot: "A",
        sourceTier: "run_a_north_york",
        ...FAR_WEST_NY,
      },
    });

    expect(central.score).toBeGreaterThan(farWest.score);
    expect(central.scoreBreakdown.find((item) => item.key === "centralNorthYorkFit")?.points).toBeGreaterThan(
      farWest.scoreBreakdown.find((item) => item.key === "centralNorthYorkFit")?.points ?? 0
    );
  });

  it("penalizes downtown and markham areas in preferred area fit", () => {
    const downtown = scoreMeetupCandidate({
      profile,
      runs,
      candidate: {
        orderId: "dt",
        area: "Downtown Toronto",
        formattedAddress: "123 Main St",
        runSlot: "A",
        sourceTier: "fallback",
        lat: 43.653,
        lng: -79.383,
      },
    });
    const markham = scoreMeetupCandidate({
      profile,
      runs,
      candidate: {
        orderId: "markham",
        area: "Markham",
        formattedAddress: "789 Markham Rd",
        runSlot: "B",
        sourceTier: "fallback",
        ...MARKHAM,
      },
    });

    expect(downtown.hasAvoidAreaPenalty).toBe(true);
    expect(markham.hasAvoidAreaPenalty).toBe(true);
    expect(downtown.scoreBreakdown.find((item) => item.key === "preferredAreaFit")?.points).toBeLessThanOrEqual(
      20
    );
    expect(markham.scoreBreakdown.find((item) => item.key === "preferredAreaFit")?.points).toBeLessThanOrEqual(
      20
    );
  });

  it("adds fallback warning when lat/lng is missing", () => {
    const result = scoreMeetupCandidate({
      profile,
      runs,
      candidate: {
        orderId: "no-coords",
        area: "North York",
        formattedAddress: "4000 Yonge St, North York M2N 5N8",
        runSlot: "A",
        sourceTier: "run_a_north_york",
      },
    });

    expect(result.usedLatLngFallback).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("Lat/lng unavailable"))).toBe(true);
  });

  it("returns labeled score breakdown reasons", () => {
    const result = scoreMeetupCandidate({
      profile,
      runs,
      candidate: {
        orderId: "central",
        area: "North York",
        formattedAddress: "4000 Yonge St, North York M2N 5N8",
        runSlot: "A",
        sourceTier: "run_a_north_york",
        ...CENTRAL_NY,
      },
    });

    expect(result.scoreBreakdown.length).toBeGreaterThan(0);
    for (const item of result.scoreBreakdown) {
      expect(item.label).toBeTruthy();
      expect(item.reason).toBeTruthy();
    }

    expect(result.scoreBreakdown.find((item) => item.key === "meetupEta")?.reason).toContain(
      "Route Optimizer preview"
    );
  });
});
