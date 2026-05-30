import { toDeliveryPlanningProfileSummary } from "@/lib/agents/delivery/planning-profile/summary";
import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";

describe("lib/agents/delivery/planning-profile/summary", () => {
  it("maps the full profile to an admin summary shape", () => {
    const summary = toDeliveryPlanningProfileSummary(getDefaultDeliveryPlanningProfile());

    expect(summary.profileId).toBe("daily-v1-current-dt-marco-self");
    expect(summary.profileVersion).toBe("daily-v1.0");
    expect(summary.normalStartTime).toBe("10:00");
    expect(summary.hardDeliveryDeadline).toBe("13:00");
    expect(summary.drivers).toHaveLength(3);
    expect(summary.drivers[0]?.runSlot).toBe("A");
  });
});
