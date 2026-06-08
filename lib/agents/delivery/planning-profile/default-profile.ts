import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import {
  DEFAULT_PLANNING_PROFILE_ID,
  DEFAULT_PLANNING_PROFILE_VERSION,
} from "@/lib/agents/delivery/planning-profile/types";
import { DOWNTOWN_REFERENCE } from "@/lib/agents/delivery/candidate-plans/types";
import { ORDER_DATA_TIMEZONE } from "@/lib/order-data/types";

export const DEFAULT_DELIVERY_PLANNING_PROFILE: DeliveryPlanningProfile = {
  profileId: DEFAULT_PLANNING_PROFILE_ID,
  profileVersion: DEFAULT_PLANNING_PROFILE_VERSION,
  name: "Daily delivery — DT / Marco / Self (current)",
  description:
    "Current Kapioo daily delivery operating profile: DT from kitchen, Marco from handoff, Self as backup only. All routes should finish before 1:00 PM Toronto time.",
  enabled: true,
  createdBySystem: true,
  timeRules: {
    timezone: ORDER_DATA_TIMEZONE,
    normalKitchenStartTime: "10:00",
    earliestKitchenStartTime: "09:45",
    hardDeliveryDeadline: "13:00",
    preferredDeadlineBufferMinutes: 10,
  },
  drivers: [
    {
      runSlot: "A",
      defaultDriverName: "DT",
      role: "downtown",
      startsFrom: "kitchen",
      preferredEndRole: "downtown_or_midtown",
      isBackupOnly: false,
    },
    {
      runSlot: "B",
      defaultDriverName: "Marco",
      role: "uptown",
      startsFrom: "handoff",
      preferredEndRole: "uptown",
      isBackupOnly: false,
    },
    {
      runSlot: "C",
      defaultDriverName: "Self",
      role: "self",
      startsFrom: "kitchen_or_assigned",
      preferredEndRole: "flexible",
      isBackupOnly: true,
    },
  ],
  locationRules: {
    planningMode: "lat_lng_first_area_second",
    helperAreaLabels: [
      "Downtown Toronto",
      "Midtown",
      "North York",
      "Markham",
      "Richmond Hill",
    ],
  },
  handoffRules: {
    enabled: true,
    providerRunSlot: "A",
    receiverRunSlots: ["B"],
    futureMeetupMode: "synthetic_handoff_stop",
    syntheticMeetupStopName: "Meet-up / Handoff Point",
    syntheticStopType: "handoff",
    serviceTimeMinutes: 5,
    receiverStartTimeSource: "provider_meetup_eta",
    allowStopsBeforeMeetup: true,
    maxStopsBeforeMeetup: 2,
    meetupShouldBeEarly: true,
    meetupSelectionPreferences: {
      // The preferred handoff zone is the Don Mills / eastern North York corridor — roughly
      // due north of the kitchen at 105 Vanderhoof Ave. This is confirmed by June 8 2026
      // where Donald used 66 Forest Manor Rd (lat: 43.772, lng: -79.342) as the handoff.
      // The kitchen is at 105 Vanderhoof Ave (lat: ~43.709, lng: ~-79.345). The optimal
      // handoff is almost directly north — minimal east-west detour for DT.
      // INCORRECT HISTORICAL VALUE: preferredHandoffCenterLng was -79.4111 (Yonge/Sheppard,
      // western North York), which is ~7 km too far west and caused all meetup candidates
      // to score poorly, making every route appear infeasible.
      preferredHandoffZoneLabel: "Don Mills / North York (eastern corridor)",
      preferredHandoffAreaLabels: ["North York"],
      avoidHandoffAreaLabels: ["Downtown Toronto", "Midtown", "Markham", "Richmond Hill"],
      receiverDriverReferenceArea: "Markham / Richmond Hill direction",
      receiverDriverConvenienceWeight: 85,
      dtDetourPenaltyWeight: 90,
      centralNorthYorkFitWeight: 95,
      meetupEtaWeight: 40,
      routeFinishImpactWeight: 50,
      kitchenProximityPenaltyWeight: 70,
      fallbackAllowed: true,
      // Preferred handoff center: Don Mills / Sheppard East area — due north of kitchen.
      // Derived from June 8 2026 actual successful handoff at 66 Forest Manor Rd.
      preferredHandoffCenterLat: 43.770,
      preferredHandoffCenterLng: -79.345,
      receiverReferenceLat: 43.856,
      receiverReferenceLng: -79.337,
      dtReferenceLat: DOWNTOWN_REFERENCE.lat,
      dtReferenceLng: DOWNTOWN_REFERENCE.lng,
      // Kitchen: 105 Vanderhoof Ave #8, East York, ON M4G 2B5 (corrected from wrong value).
      // Used to ensure meetup is not too close to kitchen (Marco should start from North York,
      // not from the kitchen area) and not too far east-west from kitchen's longitude.
      kitchenReferenceLat: 43.709,
      kitchenReferenceLng: -79.345,
      maxKitchenProximityDegrees: 0.06,
    },
  },
  candidateExpansionRules: {
    maxSplitCandidatesToExpand: 5,
    maxMeetupOptionsPerSplit: 3,
    allowedMeetupFixedPositions: [1, 2],
    maxFullCandidateVariants: 15,
    allowEarlyStartVariant: false,
    allowEndpointVariants: false,
  },
  routeShapeRules: {
    rules: [
      {
        code: "NO_DOWNTOWN_NORTH_PING_PONG",
        description:
          "DT should not go downtown → north → downtown → north in the same run.",
        severity: "warning",
      },
      {
        code: "HANDOFF_BEFORE_DOWNTOWN_WHEN_NEEDED",
        description:
          "When handoff is needed, DT should usually handle meet-up / North York sequence before going downtown.",
        severity: "warning",
      },
      {
        code: "DT_ENDS_DOWNTOWN_MIDTOWN",
        description:
          "DT should usually end downtown or midtown when the run includes downtown stops.",
        severity: "info",
      },
      {
        code: "UPTOWN_ENDS_UPTOWN",
        description: "Marco (uptown) should usually end uptown.",
        severity: "info",
      },
      {
        code: "MEETUP_NOT_TOO_LATE",
        description:
          "Meet-up should not be so late that the receiver route cannot finish before 1:00 PM.",
        severity: "warning",
      },
    ],
  },
  allowedRepairActions: [
    "apply_fixed_stop_position",
    "apply_end_point",
    "create_synthetic_meetup_stop",
    "move_stop_between_runs",
    "use_self_fallback",
    "suggest_early_start",
  ],
  selfFallbackRules: {
    enabled: true,
    useOnlyWhenNeeded: true,
    preferMinimumStops: true,
    // Light rescue (1–3 stops): normal use when 2-driver plan is slightly over budget.
    // Heavy rescue (up to 8 stops): triggered automatically when total stops ≥ 17,
    // since 2-driver plans genuinely cannot finish before 1 PM on heavy days.
    maxPreferredStops: 8,
    reasons: [
      "Paid drivers cannot finish before the hard delivery deadline.",
      "Route shape cannot be repaired safely within constraints.",
      "Too little buffer before 1:00 PM deadline.",
      "Total stop count exceeds 2-driver capacity for the 1:00 PM deadline.",
    ],
  },
  operationalScoringRules: {
    selfFallbackPolicy: {
      // Aligns with preferredDeadlineBufferMinutes — 2-driver must finish with at least this buffer.
      minTwoDriverBufferMinutes: 10,
      // Self must save ≥15 min on latest finish vs best safe 2-driver, not just score slightly higher.
      minMinutesSavedToJustifySelf: 15,
      selfScorePenaltyWhenTwoDriverSafe: 25,
      capSelfDeadlineBufferAtPreferred: true,
      minTwoDriverBalanceRatio: 0.6,
    },
    deadlineFeasibilityRules: {
      slightlyLateMaxMinutes: 5,
      infeasibleLateMinutes: 30,
    },
  },
  scoringWeights: {
    finishBeforeDeadline: 95,
    deadlineBuffer: 90,
    routeShapeCorrectness: 90,
    correctDriverEndpoint: 85,
    latLngClusterFit: 90,
    historicalPatternSimilarity: 55,
    avoidSelfUsage: 75,
    minimizeSelfStops: 70,
    balanceDriverDuration: 50,
    areaLabelMatch: 40,
    mealQuantityBalance: 15,
    preferTwoDriverPlans: 60,
    meetupOperationalBalance: 65,
    onTheWayBeforeMeetup: 55,
  },
  learningSettings: {
    locationFirstLearning: true,
    useOrderIdsAsJoinKeysOnly: true,
    useCustomerIdentityForPlanning: false,
    allowHistoricalPatternSuggestions: true,
    requireDonaldApprovalForRuleChanges: true,
    ruleChangeMode: "draft_then_test_then_active",
    backtestRequiredBeforeActive: true,
  },
};
