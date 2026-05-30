import {
  meetupOptionDedupeKey,
  meetupVariantDedupeKey,
  rankMeetupOptions,
} from "@/lib/agents/delivery/candidate-plans/rank-meetup-options";
import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import type { DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";

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

describe("lib/agents/delivery/candidate-plans/rank-meetup-options", () => {
  const profile = getDefaultDeliveryPlanningProfile();

  it("ranks North York provider stops ahead of fallback options", () => {
    const runs = [
      buildRun("A", [
        { orderId: "DD-1", area: "Downtown Toronto", formattedAddress: "123 Main St" },
        {
          orderId: "DD-2",
          area: "North York",
          formattedAddress: "4000 Yonge St",
          planningTags: ["flexible_north_york"],
          lat: 43.7615,
          lng: -79.4111,
        },
      ]),
      buildRun("B", [{ orderId: "DD-3", area: "Markham", formattedAddress: "789 Markham Rd" }]),
    ];

    const ranked = rankMeetupOptions({ runs, profile, limit: 3 });

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]?.orderId).toBe("DD-2");
    expect(ranked[0]?.score).toBeGreaterThan(0);
  });

  it("dedupes meet-up options by address and coordinates", () => {
    const candidate = {
      orderId: "DD-2",
      formattedAddress: "4000 Yonge St",
      lat: 43.7615,
      lng: -79.4111,
    };

    const keyA = meetupOptionDedupeKey(candidate);
    const keyB = meetupOptionDedupeKey({ ...candidate, formattedAddress: "  4000 Yonge St  " });
    expect(keyA).toBe(keyB);
  });

  it("builds stable variant dedupe keys", () => {
    const key = meetupVariantDedupeKey({
      baseSplitCandidateId: "baseline:2026-06-09",
      meetupDedupeKey: "DD-2|4000 yonge st|43.76150|-79.41110",
      fixedPosition: 2,
    });

    expect(key).toBe("baseline:2026-06-09|DD-2|4000 yonge st|43.76150|-79.41110|pos2");
  });
});
