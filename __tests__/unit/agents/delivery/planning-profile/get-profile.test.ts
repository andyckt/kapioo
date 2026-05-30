import {
  assertDeliveryPlanningProfileValid,
  getDefaultDeliveryPlanningProfile,
  getDeliveryPlanningProfile,
} from "@/lib/agents/delivery/planning-profile";
import {
  DEFAULT_PLANNING_PROFILE_ID,
  DEFAULT_PLANNING_PROFILE_VERSION,
} from "@/lib/agents/delivery/planning-profile/types";
import { DEFAULT_ROUTING_PROFILE_ID } from "@/lib/agents/delivery/types";

describe("lib/agents/delivery/planning-profile/get-profile", () => {
  it("loads the default planning profile", () => {
    const profile = getDefaultDeliveryPlanningProfile();

    expect(profile.profileId).toBe(DEFAULT_PLANNING_PROFILE_ID);
    expect(profile.profileVersion).toBe(DEFAULT_PLANNING_PROFILE_VERSION);
    expect(profile.enabled).toBe(true);
  });

  it("validates the default planning profile", () => {
    expect(() => assertDeliveryPlanningProfileValid(getDefaultDeliveryPlanningProfile())).not.toThrow();
  });

  it("uses America/Toronto timezone in time rules", () => {
    expect(getDefaultDeliveryPlanningProfile().timeRules.timezone).toBe("America/Toronto");
  });

  it("keeps meal quantity weight lower than lat/lng cluster fit", () => {
    const weights = getDefaultDeliveryPlanningProfile().scoringWeights;

    expect(weights.mealQuantityBalance).toBeLessThan(weights.latLngClusterFit);
  });

  it("marks Self as backup-only on run slot C", () => {
    const selfDriver = getDefaultDeliveryPlanningProfile().drivers.find(
      (driver) => driver.runSlot === "C"
    );

    expect(selfDriver?.defaultDriverName).toBe("Self");
    expect(selfDriver?.isBackupOnly).toBe(true);
  });

  it("uses synthetic handoff stop settings for future meet-up", () => {
    const handoffRules = getDefaultDeliveryPlanningProfile().handoffRules;

    expect(handoffRules.futureMeetupMode).toBe("synthetic_handoff_stop");
    expect(handoffRules.receiverStartTimeSource).toBe("provider_meetup_eta");
  });

  it("includes meet-up selection preferences on the default profile", () => {
    const prefs = getDefaultDeliveryPlanningProfile().handoffRules.meetupSelectionPreferences;

    expect(prefs.preferredHandoffZoneLabel).toBe("Central North York");
    expect(prefs.preferredHandoffAreaLabels).toContain("North York");
    expect(prefs.avoidHandoffAreaLabels).toContain("Markham");
    expect(prefs.fallbackAllowed).toBe(true);
    expect(prefs.centralNorthYorkFitWeight).toBeGreaterThan(0);
  });

  it("includes fixed stop and end point repair actions", () => {
    const actions = getDefaultDeliveryPlanningProfile().allowedRepairActions;

    expect(actions).toContain("apply_fixed_stop_position");
    expect(actions).toContain("apply_end_point");
  });

  it("includes candidate expansion rules on the default profile", () => {
    const rules = getDefaultDeliveryPlanningProfile().candidateExpansionRules;

    expect(rules.maxSplitCandidatesToExpand).toBe(5);
    expect(rules.maxMeetupOptionsPerSplit).toBe(3);
    expect(rules.allowedMeetupFixedPositions).toEqual([1, 2]);
    expect(rules.maxFullCandidateVariants).toBe(15);
    expect(rules.allowEarlyStartVariant).toBe(false);
    expect(rules.allowEndpointVariants).toBe(false);
  });

  it("aliases daily-default routing profile id to the default planning profile", () => {
    const aliased = getDeliveryPlanningProfile(DEFAULT_ROUTING_PROFILE_ID);
    const direct = getDefaultDeliveryPlanningProfile();

    expect(aliased).toBe(direct);
  });
});
