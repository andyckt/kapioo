import {
  buildSyntheticMeetupOrderId,
  buildSyntheticMeetupStop,
  isSyntheticMeetupOrderId,
  SYNTHETIC_MEETUP_NOTES,
  SYNTHETIC_MEETUP_STOP_NAME,
} from "@/lib/agents/delivery/candidate-plans/synthetic-meetup-stop";
import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";

describe("synthetic meetup stop builder", () => {
  const profile = getDefaultDeliveryPlanningProfile();

  it("creates a synthetic meetup stop with operational identity", () => {
    process.env.MEETUP_CONTACT_PHONE = "416-555-0300";

    const stop = buildSyntheticMeetupStop({
      profile,
      deliveryDate: "2026-06-09",
      runSlot: "A",
      contactPhone: "416-555-0300",
      selection: {
        handoffSkipped: false,
        meetupAddress: "4000 Yonge St, North York M2N 5N8",
        meetupFixedStopPosition: 1,
        variant: "meetup_stop_1",
        sourceOrderId: "DD-MIMO",
        stopBeforeMeetupOrderId: "DD-OTHER",
      } as Extract<
        import("@/lib/agents/delivery/candidate-plans/select-meetup-point").MeetupSelectionResult,
        { handoffSkipped: false }
      >,
    });

    expect(stop).toMatchObject({
      name: SYNTHETIC_MEETUP_STOP_NAME,
      phone: "416-555-0300",
      address: "4000 Yonge St, North York M2N 5N8",
      notes: SYNTHETIC_MEETUP_NOTES,
      is_synthetic: true,
      stop_type: "handoff",
      fixed_stop_position: 1,
      order_ids: [buildSyntheticMeetupOrderId({ deliveryDate: "2026-06-09", runSlot: "A" })],
    });
    expect(stop.order_ids?.[0]).not.toBe("DD-MIMO");
    expect(stop.name).not.toContain("mimo");
  });

  it("does not embed real customer phone or name", () => {
    const stop = buildSyntheticMeetupStop({
      profile,
      deliveryDate: "2026-06-09",
      runSlot: "A",
      contactPhone: "416-555-0400",
      selection: {
        handoffSkipped: false,
        meetupAddress: "4000 Yonge St",
        meetupFixedStopPosition: 2,
        variant: "meetup_stop_1",
        sourceOrderId: "DD-MIMO",
      } as Extract<
        import("@/lib/agents/delivery/candidate-plans/select-meetup-point").MeetupSelectionResult,
        { handoffSkipped: false }
      >,
    });

    expect(stop.phone).toBe("416-555-0400");
    expect(stop.name).toBe(SYNTHETIC_MEETUP_STOP_NAME);
    expect(stop.order_ids).toEqual(["kapioo-handoff-meetup:2026-06-09:A"]);
  });

  it("recognizes synthetic meetup order ids", () => {
    expect(isSyntheticMeetupOrderId("kapioo-handoff-meetup:2026-06-09:A")).toBe(true);
    expect(isSyntheticMeetupOrderId("DD-90000001")).toBe(false);
  });
});
