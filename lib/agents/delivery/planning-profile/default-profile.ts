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
      preferredHandoffZoneLabel: "Central North York",
      preferredHandoffAreaLabels: ["North York"],
      avoidHandoffAreaLabels: ["Downtown Toronto", "Midtown", "Markham", "Richmond Hill"],
      receiverDriverReferenceArea: "Markham / Richmond Hill direction",
      receiverDriverConvenienceWeight: 85,
      dtDetourPenaltyWeight: 90,
      centralNorthYorkFitWeight: 95,
      meetupEtaWeight: 40,
      routeFinishImpactWeight: 50,
      fallbackAllowed: true,
      preferredHandoffCenterLat: 43.7615,
      preferredHandoffCenterLng: -79.4111,
      receiverReferenceLat: 43.856,
      receiverReferenceLng: -79.337,
      dtReferenceLat: DOWNTOWN_REFERENCE.lat,
      dtReferenceLng: DOWNTOWN_REFERENCE.lng,
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
    maxPreferredStops: 3,
    reasons: [
      "Paid drivers cannot finish before the hard delivery deadline.",
      "Route shape cannot be repaired safely within constraints.",
      "Too little buffer before 1:00 PM deadline.",
    ],
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
