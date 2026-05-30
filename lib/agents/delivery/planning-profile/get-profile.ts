import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import { DeliveryPlanningProfileNotFoundError } from "@/lib/agents/delivery/planning-profile/errors";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import { DEFAULT_PLANNING_PROFILE_ID } from "@/lib/agents/delivery/planning-profile/types";
import { assertDeliveryPlanningProfileValid } from "@/lib/agents/delivery/planning-profile/validate-profile";
import { DEFAULT_ROUTING_PROFILE_ID } from "@/lib/agents/delivery/types";

const PROFILE_ALIASES: Record<string, string> = {
  [DEFAULT_ROUTING_PROFILE_ID]: DEFAULT_PLANNING_PROFILE_ID,
};

const PROFILE_REGISTRY: Record<string, DeliveryPlanningProfile> = {
  [DEFAULT_PLANNING_PROFILE_ID]: DEFAULT_DELIVERY_PLANNING_PROFILE,
};

function resolveProfileId(profileId?: string): string {
  const trimmed = profileId?.trim();
  if (!trimmed) {
    return DEFAULT_PLANNING_PROFILE_ID;
  }

  return PROFILE_ALIASES[trimmed] ?? trimmed;
}

export function getDefaultDeliveryPlanningProfile(): DeliveryPlanningProfile {
  return getDeliveryPlanningProfile();
}

export function getDeliveryPlanningProfile(profileId?: string): DeliveryPlanningProfile {
  const resolvedId = resolveProfileId(profileId);
  const profile = PROFILE_REGISTRY[resolvedId];

  if (!profile) {
    throw new DeliveryPlanningProfileNotFoundError(profileId?.trim() || resolvedId);
  }

  return profile;
}

assertDeliveryPlanningProfileValid(DEFAULT_DELIVERY_PLANNING_PROFILE);
