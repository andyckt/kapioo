import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import { selectMeetupPoint } from "@/lib/agents/delivery/candidate-plans/select-meetup-point";
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

describe("lib/agents/delivery/candidate-plans/select-meetup-point", () => {
  const profile = getDefaultDeliveryPlanningProfile();

  it("prefers Run A North York stop for meet-up selection", () => {
    const result = selectMeetupPoint({
      profile,
      runs: [
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
          },
        ]),
        buildRun("B", [
          {
            orderId: "DD-90000003",
            area: "Markham",
            formattedAddress: "789 Markham Rd",
          },
        ]),
      ],
    });

    expect(result.handoffSkipped).toBe(false);
    if (!result.handoffSkipped) {
      expect(result.sourceOrderId).toBe("DD-90000004");
      expect(result.meetupAddress).toContain("4000 Yonge St");
      expect(result.meetupFixedStopPosition).toBe(1);
      expect(result.variant).toBe("meetup_stop_1");
    }
  });

  it("skips handoff when no North York stops exist", () => {
    const result = selectMeetupPoint({
      profile,
      runs: [
        buildRun("A", [
          {
            orderId: "DD-90000001",
            area: "Downtown Toronto",
            formattedAddress: "123 Main St",
          },
        ]),
        buildRun("B", [
          {
            orderId: "DD-90000003",
            area: "Markham",
            formattedAddress: "789 Markham Rd",
          },
        ]),
      ],
    });

    expect(result.handoffSkipped).toBe(true);
    if (result.handoffSkipped) {
      expect(result.skipReason).toContain("No North York stop");
    }
  });

  it("uses meet-up stop #2 when an on-the-way DT North York stop exists", () => {
    const result = selectMeetupPoint({
      profile,
      runs: [
        buildRun("A", [
          {
            orderId: "DD-90000001",
            area: "North York",
            formattedAddress: "100 Sheppard Ave W, North York M3H 2A1",
            planningTags: ["flexible_north_york", "address_fallback_lean"],
          },
          {
            orderId: "DD-90000004",
            area: "North York",
            formattedAddress: "4000 Yonge St, North York M2N 5N8",
            planningTags: ["flexible_north_york", "lat_lng_lean_marco"],
            lat: 43.74,
            lng: -79.41,
          },
        ]),
        buildRun("B", [
          {
            orderId: "DD-90000003",
            area: "Markham",
            formattedAddress: "789 Markham Rd",
          },
        ]),
      ],
    });

    expect(result.handoffSkipped).toBe(false);
    if (!result.handoffSkipped) {
      expect(result.variant).toBe("meetup_stop_2_with_one_before");
      expect(result.meetupFixedStopPosition).toBe(2);
      expect(result.stopBeforeMeetupOrderId).toBe("DD-90000001");
    }
  });
});
