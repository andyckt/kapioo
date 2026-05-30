import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import {
  resolveMeetupContactPhone,
  resolveOperationalMeetupContactPhone,
} from "@/lib/agents/delivery/final-route-run/resolve-meetup-contact-phone";

describe("resolveOperationalMeetupContactPhone", () => {
  const profile = getDefaultDeliveryPlanningProfile();

  afterEach(() => {
    delete process.env.MEETUP_CONTACT_PHONE;
    delete process.env.KAPIOO_HANDOFF_CONTACT_PHONE;
    delete process.env.KAPIOO_DRIVER_MARCO_PHONE;
    delete process.env.KAPIOO_DRIVER_DT_PHONE;
  });

  it("prefers MEETUP_CONTACT_PHONE", () => {
    process.env.MEETUP_CONTACT_PHONE = "416-555-0101";
    process.env.KAPIOO_DRIVER_MARCO_PHONE = "416-555-9999";

    expect(resolveOperationalMeetupContactPhone({ profile })).toBe("416-555-0101");
  });

  it("falls back to KAPIOO_HANDOFF_CONTACT_PHONE", () => {
    process.env.KAPIOO_HANDOFF_CONTACT_PHONE = "416-555-0200";

    expect(resolveOperationalMeetupContactPhone({ profile })).toBe("416-555-0200");
  });

  it("uses receiver driver env phone when configured", () => {
    process.env.KAPIOO_DRIVER_MARCO_PHONE = "416-555-0300";

    expect(resolveOperationalMeetupContactPhone({ profile })).toBe("416-555-0300");
  });

  it("does not read customer order phones", () => {
    expect(
      resolveMeetupContactPhone({
        handoffPlan: {
          providerRunSlot: "A",
          receiverRunSlot: "B",
          selectedMeetup: {
            meetupAddress: "4000 Yonge St",
            meetupFixedStopPosition: 1,
            variant: "meetup_stop_1",
            syntheticHandoffStopUsed: true,
            stopBeforeMeetupOrderId: "DD-MEET",
          },
        },
        routingStopByOrderId: new Map(),
        fallbackOrderIds: ["DD-MEET", "DD-MIMO"],
      } as never)
    ).toBeUndefined();
  });
});
