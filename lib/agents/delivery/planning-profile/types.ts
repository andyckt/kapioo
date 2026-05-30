import { ORDER_DATA_TIMEZONE } from "@/lib/order-data/types";

export const DEFAULT_PLANNING_PROFILE_ID = "daily-v1-current-dt-marco-self" as const;
export const DEFAULT_PLANNING_PROFILE_VERSION = "daily-v1.0" as const;

export type DeliveryPlanningProfileTimezone = typeof ORDER_DATA_TIMEZONE;

export type DeliveryPlanningDriverRole = "downtown" | "uptown" | "self";

export type DeliveryPlanningDriverStartsFrom =
  | "kitchen"
  | "handoff"
  | "kitchen_or_assigned";

export type DeliveryPlanningDriverPreferredEndRole =
  | "downtown_or_midtown"
  | "uptown"
  | "flexible";

export type DeliveryPlanningRunSlot = "A" | "B" | "C";

export type DeliveryPlanningDriverConfig = {
  runSlot: DeliveryPlanningRunSlot;
  defaultDriverName: string;
  role: DeliveryPlanningDriverRole;
  startsFrom: DeliveryPlanningDriverStartsFrom;
  preferredEndRole: DeliveryPlanningDriverPreferredEndRole;
  isBackupOnly: boolean;
};

/**
 * Time rules for daily delivery planning.
 * Historical planned start times in past runs are weak signals only.
 * Future agent logic should treat normalKitchenStartTime as the default
 * and earliestKitchenStartTime as an emergency option that warns Donald.
 */
export type DeliveryPlanningTimeRules = {
  timezone: DeliveryPlanningProfileTimezone;
  normalKitchenStartTime: string;
  earliestKitchenStartTime: string;
  hardDeliveryDeadline: string;
  preferredDeadlineBufferMinutes: number;
};

/**
 * Location-first planning: lat/lng clusters and route shape are primary.
 * Area labels are helper metadata only; meal quantity is low-weight because
 * drivers use cars.
 */
export type DeliveryPlanningLocationRules = {
  planningMode: "lat_lng_first_area_second";
  helperAreaLabels: string[];
};

export type DeliveryPlanningMeetupSelectionPreferences = {
  preferredHandoffZoneLabel: string;
  preferredHandoffAreaLabels: string[];
  avoidHandoffAreaLabels: string[];
  receiverDriverReferenceArea: string;
  receiverDriverConvenienceWeight: number;
  dtDetourPenaltyWeight: number;
  centralNorthYorkFitWeight: number;
  meetupEtaWeight: number;
  routeFinishImpactWeight: number;
  fallbackAllowed: boolean;
  preferredHandoffCenterLat?: number;
  preferredHandoffCenterLng?: number;
  receiverReferenceLat?: number;
  receiverReferenceLng?: number;
  dtReferenceLat?: number;
  dtReferenceLng?: number;
};

export type DeliveryPlanningHandoffRules = {
  enabled: boolean;
  providerRunSlot: DeliveryPlanningRunSlot;
  receiverRunSlots: DeliveryPlanningRunSlot[];
  futureMeetupMode: "synthetic_handoff_stop";
  syntheticMeetupStopName: string;
  syntheticStopType: "handoff";
  serviceTimeMinutes: number;
  receiverStartTimeSource: "provider_meetup_eta";
  allowStopsBeforeMeetup: boolean;
  maxStopsBeforeMeetup: number;
  meetupShouldBeEarly: boolean;
  meetupSelectionPreferences: DeliveryPlanningMeetupSelectionPreferences;
};

export type DeliveryPlanningRouteShapeRule = {
  code: string;
  description: string;
  severity?: "info" | "warning" | "error";
};

export type DeliveryPlanningRouteShapeRules = {
  rules: DeliveryPlanningRouteShapeRule[];
};

export type DeliveryPlanningRepairAction =
  | "apply_fixed_stop_position"
  | "apply_end_point"
  | "create_synthetic_meetup_stop"
  | "move_stop_between_runs"
  | "use_self_fallback"
  | "suggest_early_start";

export type DeliveryPlanningSelfFallbackRules = {
  enabled: boolean;
  useOnlyWhenNeeded: boolean;
  preferMinimumStops: boolean;
  maxPreferredStops: number;
  reasons: string[];
};

export type DeliveryPlanningScoringWeights = {
  finishBeforeDeadline: number;
  deadlineBuffer: number;
  routeShapeCorrectness: number;
  correctDriverEndpoint: number;
  latLngClusterFit: number;
  historicalPatternSimilarity: number;
  avoidSelfUsage: number;
  minimizeSelfStops: number;
  balanceDriverDuration: number;
  areaLabelMatch: number;
  mealQuantityBalance: number;
};

export type DeliveryPlanningRuleChangeMode = "draft_then_test_then_active";

export type DeliveryPlanningLearningSettings = {
  locationFirstLearning: boolean;
  useOrderIdsAsJoinKeysOnly: boolean;
  useCustomerIdentityForPlanning: boolean;
  allowHistoricalPatternSuggestions: boolean;
  requireDonaldApprovalForRuleChanges: boolean;
  ruleChangeMode: DeliveryPlanningRuleChangeMode;
  backtestRequiredBeforeActive: boolean;
};

export type DeliveryPlanningProfile = {
  profileId: string;
  profileVersion: string;
  name: string;
  description: string;
  enabled: boolean;
  createdBySystem: boolean;
  timeRules: DeliveryPlanningTimeRules;
  drivers: DeliveryPlanningDriverConfig[];
  locationRules: DeliveryPlanningLocationRules;
  handoffRules: DeliveryPlanningHandoffRules;
  routeShapeRules: DeliveryPlanningRouteShapeRules;
  allowedRepairActions: DeliveryPlanningRepairAction[];
  selfFallbackRules: DeliveryPlanningSelfFallbackRules;
  scoringWeights: DeliveryPlanningScoringWeights;
  learningSettings: DeliveryPlanningLearningSettings;
};
