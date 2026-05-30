import type { DeliveryAgentPlanningProfileSummary } from "@/lib/contracts/delivery-agent";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";

export function toDeliveryPlanningProfileSummary(
  profile: DeliveryPlanningProfile
): DeliveryAgentPlanningProfileSummary {
  return {
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    name: profile.name,
    description: profile.description,
    enabled: profile.enabled,
    timezone: profile.timeRules.timezone,
    normalStartTime: profile.timeRules.normalKitchenStartTime,
    earliestStartTime: profile.timeRules.earliestKitchenStartTime,
    hardDeliveryDeadline: profile.timeRules.hardDeliveryDeadline,
    preferredDeadlineBufferMinutes: profile.timeRules.preferredDeadlineBufferMinutes,
    drivers: profile.drivers.map((driver) => ({
      runSlot: driver.runSlot,
      defaultDriverName: driver.defaultDriverName,
      role: driver.role,
      startsFrom: driver.startsFrom,
      preferredEndRole: driver.preferredEndRole,
      isBackupOnly: driver.isBackupOnly,
    })),
  };
}
