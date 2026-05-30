import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";

function readEnvPhone(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function resolveOperationalMeetupContactPhone(input?: {
  profile?: DeliveryPlanningProfile;
}): string | undefined {
  const fromEnv = readEnvPhone("MEETUP_CONTACT_PHONE", "KAPIOO_HANDOFF_CONTACT_PHONE");
  if (fromEnv) {
    return fromEnv;
  }

  const receiverDriverName =
    input?.profile?.drivers.find(
      (driver) =>
        input.profile?.handoffRules.receiverRunSlots.includes(driver.runSlot) &&
        !driver.isBackupOnly
    )?.defaultDriverName ?? input?.profile?.handoffRules.receiverRunSlots[0];

  if (receiverDriverName) {
    const driverPhone = readEnvPhone(
      `KAPIOO_DRIVER_${receiverDriverName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_PHONE`
    );
    if (driverPhone) {
      return driverPhone;
    }
  }

  return undefined;
}

/** @deprecated Use resolveOperationalMeetupContactPhone — never reads customer order phones. */
export function resolveMeetupContactPhone(_input?: unknown): string | undefined {
  return resolveOperationalMeetupContactPhone();
}
