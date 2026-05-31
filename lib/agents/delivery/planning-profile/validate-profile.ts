import { DeliveryPlanningProfileValidationError } from "@/lib/agents/delivery/planning-profile/errors";
import type {
  DeliveryPlanningProfile,
  DeliveryPlanningRepairAction,
  DeliveryPlanningRunSlot,
} from "@/lib/agents/delivery/planning-profile/types";
import { ORDER_DATA_TIMEZONE } from "@/lib/order-data/types";

const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const REQUIRED_REPAIR_ACTIONS: DeliveryPlanningRepairAction[] = [
  "apply_fixed_stop_position",
  "apply_end_point",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function assertTimeField(value: unknown, fieldPath: string, errors: string[]): void {
  if (!isNonEmptyString(value) || !HH_MM_PATTERN.test(value.trim())) {
    errors.push(fieldPath);
  }
}

function findDriverByRunSlot(
  profile: DeliveryPlanningProfile,
  runSlot: DeliveryPlanningRunSlot
) {
  return profile.drivers.find((driver) => driver.runSlot === runSlot);
}

export function assertDeliveryPlanningProfileValid(profile: DeliveryPlanningProfile): void {
  const errors: string[] = [];

  if (!isNonEmptyString(profile.profileId)) {
    errors.push("profileId");
  }

  if (!isNonEmptyString(profile.profileVersion)) {
    errors.push("profileVersion");
  }

  if (!isNonEmptyString(profile.name)) {
    errors.push("name");
  }

  if (!isNonEmptyString(profile.description)) {
    errors.push("description");
  }

  if (typeof profile.enabled !== "boolean") {
    errors.push("enabled");
  }

  if (typeof profile.createdBySystem !== "boolean") {
    errors.push("createdBySystem");
  }

  if (profile.timeRules.timezone !== ORDER_DATA_TIMEZONE) {
    errors.push("timeRules.timezone");
  }

  assertTimeField(
    profile.timeRules.normalKitchenStartTime,
    "timeRules.normalKitchenStartTime",
    errors
  );
  assertTimeField(
    profile.timeRules.earliestKitchenStartTime,
    "timeRules.earliestKitchenStartTime",
    errors
  );
  assertTimeField(profile.timeRules.hardDeliveryDeadline, "timeRules.hardDeliveryDeadline", errors);

  if (
    typeof profile.timeRules.preferredDeadlineBufferMinutes !== "number" ||
    profile.timeRules.preferredDeadlineBufferMinutes < 0
  ) {
    errors.push("timeRules.preferredDeadlineBufferMinutes");
  }

  if (!Array.isArray(profile.drivers) || profile.drivers.length === 0) {
    errors.push("drivers");
  } else {
    const runSlots = new Set<string>();
    let backupCount = 0;

    for (const driver of profile.drivers) {
      if (!isNonEmptyString(driver.defaultDriverName)) {
        errors.push(`drivers.${driver.runSlot}.defaultDriverName`);
      }

      if (runSlots.has(driver.runSlot)) {
        errors.push(`drivers.${driver.runSlot}`);
      } else {
        runSlots.add(driver.runSlot);
      }

      if (driver.isBackupOnly) {
        backupCount += 1;
      }
    }

    if (backupCount !== 1) {
      errors.push("drivers.isBackupOnly");
    }
  }

  if (profile.locationRules.planningMode !== "lat_lng_first_area_second") {
    errors.push("locationRules.planningMode");
  }

  if (
    !Array.isArray(profile.locationRules.helperAreaLabels) ||
    profile.locationRules.helperAreaLabels.length === 0
  ) {
    errors.push("locationRules.helperAreaLabels");
  }

  if (profile.handoffRules.enabled) {
    if (!findDriverByRunSlot(profile, profile.handoffRules.providerRunSlot)) {
      errors.push("handoffRules.providerRunSlot");
    }

    for (const receiverRunSlot of profile.handoffRules.receiverRunSlots) {
      if (!findDriverByRunSlot(profile, receiverRunSlot)) {
        errors.push(`handoffRules.receiverRunSlots.${receiverRunSlot}`);
      }
    }

    if (profile.handoffRules.futureMeetupMode !== "synthetic_handoff_stop") {
      errors.push("handoffRules.futureMeetupMode");
    }

    if (profile.handoffRules.receiverStartTimeSource !== "provider_meetup_eta") {
      errors.push("handoffRules.receiverStartTimeSource");
    }

    const meetupPrefs = profile.handoffRules.meetupSelectionPreferences;
    if (!meetupPrefs || typeof meetupPrefs !== "object") {
      errors.push("handoffRules.meetupSelectionPreferences");
    } else {
      if (!isNonEmptyString(meetupPrefs.preferredHandoffZoneLabel)) {
        errors.push("handoffRules.meetupSelectionPreferences.preferredHandoffZoneLabel");
      }

      if (
        !Array.isArray(meetupPrefs.preferredHandoffAreaLabels) ||
        meetupPrefs.preferredHandoffAreaLabels.length === 0
      ) {
        errors.push("handoffRules.meetupSelectionPreferences.preferredHandoffAreaLabels");
      }

      if (
        !Array.isArray(meetupPrefs.avoidHandoffAreaLabels) ||
        meetupPrefs.avoidHandoffAreaLabels.length === 0
      ) {
        errors.push("handoffRules.meetupSelectionPreferences.avoidHandoffAreaLabels");
      }

      if (!isNonEmptyString(meetupPrefs.receiverDriverReferenceArea)) {
        errors.push("handoffRules.meetupSelectionPreferences.receiverDriverReferenceArea");
      }

      const weightFields = [
        "receiverDriverConvenienceWeight",
        "dtDetourPenaltyWeight",
        "centralNorthYorkFitWeight",
        "meetupEtaWeight",
        "routeFinishImpactWeight",
        "kitchenProximityPenaltyWeight",
      ] as const;

      for (const field of weightFields) {
        if (typeof meetupPrefs[field] !== "number" || meetupPrefs[field] < 0) {
          errors.push(`handoffRules.meetupSelectionPreferences.${field}`);
        }
      }

      if (typeof meetupPrefs.fallbackAllowed !== "boolean") {
        errors.push("handoffRules.meetupSelectionPreferences.fallbackAllowed");
      }
    }
  }

  const expansion = profile.candidateExpansionRules;
  if (!expansion || typeof expansion !== "object") {
    errors.push("candidateExpansionRules");
  } else {
    const positiveIntFields = [
      "maxSplitCandidatesToExpand",
      "maxMeetupOptionsPerSplit",
      "maxFullCandidateVariants",
    ] as const;

    for (const field of positiveIntFields) {
      if (typeof expansion[field] !== "number" || expansion[field] <= 0) {
        errors.push(`candidateExpansionRules.${field}`);
      }
    }

    if (
      !Array.isArray(expansion.allowedMeetupFixedPositions) ||
      expansion.allowedMeetupFixedPositions.length === 0 ||
      expansion.allowedMeetupFixedPositions.some((position) => position !== 1 && position !== 2)
    ) {
      errors.push("candidateExpansionRules.allowedMeetupFixedPositions");
    }

    if (typeof expansion.allowEarlyStartVariant !== "boolean") {
      errors.push("candidateExpansionRules.allowEarlyStartVariant");
    }

    if (typeof expansion.allowEndpointVariants !== "boolean") {
      errors.push("candidateExpansionRules.allowEndpointVariants");
    }
  }

  if (
    !Array.isArray(profile.routeShapeRules.rules) ||
    profile.routeShapeRules.rules.length === 0
  ) {
    errors.push("routeShapeRules.rules");
  }

  if (
    !Array.isArray(profile.allowedRepairActions) ||
    profile.allowedRepairActions.length === 0
  ) {
    errors.push("allowedRepairActions");
  } else {
    for (const action of REQUIRED_REPAIR_ACTIONS) {
      if (!profile.allowedRepairActions.includes(action)) {
        errors.push(`allowedRepairActions.${action}`);
      }
    }
  }

  const weights = profile.scoringWeights;
  if (
    typeof weights.mealQuantityBalance !== "number" ||
    typeof weights.latLngClusterFit !== "number" ||
    weights.mealQuantityBalance > weights.latLngClusterFit
  ) {
    errors.push("scoringWeights.mealQuantityBalance");
  }

  const learning = profile.learningSettings;
  if (typeof learning.locationFirstLearning !== "boolean") {
    errors.push("learningSettings.locationFirstLearning");
  }

  if (typeof learning.useOrderIdsAsJoinKeysOnly !== "boolean") {
    errors.push("learningSettings.useOrderIdsAsJoinKeysOnly");
  }

  if (typeof learning.useCustomerIdentityForPlanning !== "boolean") {
    errors.push("learningSettings.useCustomerIdentityForPlanning");
  }

  if (typeof learning.allowHistoricalPatternSuggestions !== "boolean") {
    errors.push("learningSettings.allowHistoricalPatternSuggestions");
  }

  if (typeof learning.requireDonaldApprovalForRuleChanges !== "boolean") {
    errors.push("learningSettings.requireDonaldApprovalForRuleChanges");
  }

  if (learning.ruleChangeMode !== "draft_then_test_then_active") {
    errors.push("learningSettings.ruleChangeMode");
  }

  if (typeof learning.backtestRequiredBeforeActive !== "boolean") {
    errors.push("learningSettings.backtestRequiredBeforeActive");
  }

  if (errors.length > 0) {
    throw new DeliveryPlanningProfileValidationError(
      `Delivery planning profile is invalid: ${errors.join(", ")}`,
      errors
    );
  }
}
